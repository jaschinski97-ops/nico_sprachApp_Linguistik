import { type TextClient } from '../providers/types';
import type { ProviderId } from '../providers/types';
import type { Provider } from '@/lib/api-key';
import type { VocabEntry } from '@/data/vocab-types';

/**
 * KI-Kreuzprüfung (Phase 2, Schritt 5).
 *
 * DIE REGEL: Was ein Anbieter erzeugt, prüft der jeweils ANDERE (Übersetzung,
 * Grammatik, Umschrift/Ton/Betonung, Natürlichkeit, Stufe). Nur was beide
 * Prüfungen bestehen, gilt als „geprüft" (`sourceVerified: true` — die
 * Pipeline stufte es dann als passed ein). Unklare Fälle fallen als
 * „ungeprüft" mit Grund durch.
 *
 * FALLBACK (nur ein Schlüssel): Selbstprüfung mit einem ZWEITEN Durchlauf
 * desselben Anbieters und einem kritischen Prüfprompt — das Ergebnis wird
 * als „einfach geprüft" markiert (`sourceVerified` bleibt false).
 *
 * Der Prüfer sieht den Erzeugungs-Kontext NICHT — er bekommt nur den Eintrag
 * und das geforderte Urteils-JSON, damit er nicht höflich zustimmt.
 */

export type KreuzUrteil = { bestanden: boolean; gruende: string[] };

/** Der Prüfer-Anbieter: der jeweils andere; wenn dessen Schlüssel fehlt, Selbstprüfung. */
export function gegenStueck(
  erzeuger: ProviderId,
  hatSchluessel: (anbieter: ProviderId) => boolean
): { anbieter: ProviderId; selbstpruefung: boolean } {
  const anderer: ProviderId = erzeuger === 'gemini' ? 'chatgpt' : 'gemini';
  if (erzeuger === 'chatgpt-helper' || hatSchluessel(anderer)) {
    return { anbieter: anderer, selbstpruefung: false };
  }
  return { anbieter: erzeuger, selbstpruefung: true };
}

const URTEILS_FORMAT = [
  'Antworte NUR mit JSON:',
  '{ "urteil": "bestehen" | "mangel", "gruende": ["…"] }',
  '"bestehen" nur, wenn ALLE Punkte stimmen. Jeder Mangel bekommt einen kurzen Grund.',
].join('\n');

/** Prüfprompt für einen Vokabel-Eintrag. */
export function baueVocabPruefPrompt(eintrag: VocabEntry, stufe: string): string {
  return [
    'Prüfe diesen Lern-Vokabeleintrag kritisch in fünf Punkten:',
    '1. Übersetzung: stimmt die deutsche Bedeutung zum Begriff (und umgekehrt)?',
    '2. Grammatik/Rechtschreibung in der Zielsprache und im Deutschen.',
    `3. Umschrift/Ton/Betonung: ${eintrag.language === 'th' ? 'sind Silben und Töne plausibel und konsistent zur thailändischen Schrift?' : eintrag.language === 'es' ? 'ist die Silbentrennung mit korrekter Betonungssilbe?' : 'ist die Lautschrift plausibel?'}`,
    '4. Natürlichkeit: klingt der Beispielsatz wie ein echter Satz der Zielsprache?',
    `5. Stufe ${stufe}: ist das Wort für diese Stufe typisch und häufig genug?`,
    '',
    'Eintrag:',
    JSON.stringify(eintrag, null, 2),
    '',
    URTEILS_FORMAT,
  ].join('\n');
}

/** Urteils-JSON lesen — toleriert Code-Zäune, sonst Fehler. */
export function parseUrteil(roh: string): KreuzUrteil {
  const json = roh.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const geparst = JSON.parse(json) as { urteil?: unknown; gruende?: unknown };
  if (
    typeof geparst !== 'object' ||
    geparst === null ||
    (geparst.urteil !== 'bestehen' && geparst.urteil !== 'mangel')
  ) {
    throw Error('Prüfer-Antwort ist kein gültiges Urteils-JSON.');
  }
  const gruende = Array.isArray(geparst.gruende)
    ? geparst.gruende.filter((g): g is string => typeof g === 'string')
    : [];
  return { bestanden: geparst.urteil === 'bestehen', gruende };
}

/** Ein Prüf-Durchlauf: Prompt an einen Client, Urteil parsen. */
async function einmal(client: TextClient, prompt: string): Promise<KreuzUrteil> {
  const antwort = await client.complete({
    system:
      'Du bist ein strenger Lektor für Lernmaterialien. Du prüfst inhaltlich und sprachlich und antwortest ausschließlich mit dem geforderten Urteils-JSON.',
    user: prompt,
    maxTokens: 2000,
  });
  return parseUrteil(antwort.text);
}

export type KreuzResultat = {
  geprueft: boolean;
  /** true = echte Kreuzprüfung (zweiter Anbieter), false = Selbstprüfung. */
  kreuz: boolean;
  urteile: KreuzUrteil[];
  gruende: string[];
};

/** Vokabel-Eintrag kreuzprüfen; bei Selbstprüfung bleiben zwei Durchläufe. */
export async function pruefeVocabKreuz(
  eintrag: VocabEntry,
  stufe: string,
  erzeuger: ProviderId,
  hatSchluessel: (anbieter: ProviderId) => boolean,
  clientFuer: (anbieter: ProviderId) => TextClient
): Promise<KreuzResultat> {
  const { anbieter, selbstpruefung } = gegenStueck(erzeuger, hatSchluessel);
  const prompt = baueVocabPruefPrompt(eintrag, stufe);
  const erst = await einmal(clientFuer(anbieter), prompt);
  if (!erst.bestanden) {
    return { geprueft: false, kreuz: !selbstpruefung, urteile: [erst], gruende: erst.gruende };
  }
  // Bestehen: bei echter Kreuzprüfung genügt ein Durchlauf; bei der
  // Selbstprüfung verlangt die Regel den ZWEITEN Durchlauf desselben
  // Anbieters — erst dann gilt „einfach geprüft".
  const zweiter = await einmal(clientFuer(anbieter), prompt);
  const beide = [erst, zweiter];
  if (!zweiter.bestanden) {
    return {
      geprueft: false,
      kreuz: !selbstpruefung,
      urteile: beide,
      gruende: zweiter.gruende,
    };
  }
  // Semantik von `geprueft`: VOLL kreuzgeprüft. Die bestandene Selbstprüfung
  // ist nur „einfach geprüft" — der Aufrufer markiert den Eintrag dann mit
  // sourceVerified: false und lässt die Pipeline ihn als unchecked führen.
  return {
    geprueft: !selbstpruefung,
    kreuz: !selbstpruefung,
    urteile: beide,
    gruende: [],
  };
}

/** Prüfer als „Provider"-Alias für Anzeigen — der Helper zählt als ChatGPT. */
export function prueferLabel(anbieter: ProviderId): string {
  return anbieter === 'chatgpt-helper' ? 'ChatGPT (Helper)' : anbieter;
}

/** Kleiner Adapter: Provider → API-Schlüssel-Prüfung (im Studio injiziert). */
export function schluesselPruefer(lade: (p: Provider) => Promise<string | null>) {
  return async (anbieter: ProviderId): Promise<boolean> => {
    if (anbieter === 'chatgpt-helper') return true; // Helper hat serverseitig einen
    const key = await lade(anbieter);
    return Boolean(key);
  };
}
