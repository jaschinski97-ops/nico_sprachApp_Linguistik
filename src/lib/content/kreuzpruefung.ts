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

/** Der Prüfer-Anbieter: der jeweils andere; wenn dessen Schlüssel fehlt, Selbstprüfung.
 *
 * `wahl` (Nutzerwunsch 15.09.) überschreibt die Kreuzregel: Wer einen
 * Prüf-Anbieter hinterlegt hat, bekommt ihn — sofern dessen Schlüssel
 * vorhanden ist. Wahl = Erzeuger gilt bewusst als Selbstprüfung (zwei
 * Runden, „einfach geprüft"), denn dieselbe KI prüft sich dann selbst.
 */
export function gegenStueck(
  erzeuger: ProviderId,
  hatSchluessel: (anbieter: ProviderId) => boolean,
  wahl?: ProviderId
): { anbieter: ProviderId; selbstpruefung: boolean } {
  if (wahl && wahl !== 'chatgpt-helper' && hatSchluessel(wahl)) {
    return { anbieter: wahl, selbstpruefung: wahl === erzeuger };
  }
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

/**
 * Wie viele Einträge EIN Prüfaufruf auf einmal bekommt (15.09.: die
 * Einzelprüfung machte aus 200 Wörtern 200 nacheinander laufende Aufrufe
 * an ein Reasoning-Modell — das war der Zeitfresser des ersten Kettenlaufs).
 */
export const PRUEF_BATCH_GROESSE = 10;

/** Prüfprompt für EINEN Eintrag (Einzelfall/Tests — der Lauf nutzt den Batch). */
export function baueVocabPruefPrompt(eintrag: VocabEntry, stufe?: string): string {
  return [
    'Prüfe diesen Lern-Vokabeleintrag kritisch in fünf Punkten:',
    '1. Übersetzung: stimmt die deutsche Bedeutung zum Begriff (und umgekehrt)?',
    '2. Grammatik/Rechtschreibung in der Zielsprache und im Deutschen.',
    `3. Umschrift/Ton/Betonung: ${eintrag.language === 'th' ? 'sind Silben und Töne plausibel und konsistent zur thailändischen Schrift?' : eintrag.language === 'es' ? 'ist die Silbentrennung mit korrekter Betonungssilbe?' : 'ist die Lautschrift plausibel?'}`,
    '4. Natürlichkeit: klingt der Beispielsatz wie ein echter Satz der Zielsprache?',
    stufe
      ? `5. Stufe ${stufe}: ist das Wort für diese Stufe typisch und häufig genug?`
      : '5. Passung: ist das Wort ein grundlegender, hochfrequenter Alltagsbegriff (ohne feste Niveaustufe)?',
    '',
    'Eintrag:',
    JSON.stringify(eintrag, null, 2),
    '',
    URTEILS_FORMAT,
  ].join('\n');
}

/** Prüfprompt für ein GANZES Paket — ein Aufruf, ein Urteil je Eintrag. */
export function baueVocabBatchPruefPrompt(eintraege: VocabEntry[], stufe?: string): string {
  const punkte = [
    'Prüfe diese Lern-Vokabeleinträge kritisch — JEDEN in denselben fünf Punkten:',
    '1. Übersetzung: stimmt die deutsche Bedeutung zum Begriff (und umgekehrt)?',
    `2. Grammatik/Rechtschreibung in der Zielsprache und im Deutschen.`,
    `3. Umschrift/Ton/Betonung: ${eintraege[0]?.language === 'th' ? 'sind Silben und Töne plausibel und konsistent zur thailändischen Schrift?' : eintraege[0]?.language === 'es' ? 'ist die Silbentrennung mit korrekter Betonungssilbe?' : 'ist die Lautschrift plausibel?'}`,
    '4. Natürlichkeit: klingt der Beispielsatz wie ein echter Satz der Zielsprache?',
    stufe
      ? `5. Stufe ${stufe}: ist das Wort für diese Stufe typisch und häufig genug?`
      : '5. Passung: ist das Wort ein grundlegender, hochfrequenter Alltagsbegriff (ohne feste Niveaustufe)?',
  ];
  return [
    ...punkte,
    '',
    'Die Einträge (nummeriert):',
    JSON.stringify(eintraege.map((eintrag, index) => ({ index, eintrag })), null, 2),
    '',
    'Antworte NUR mit JSON — GENAU EIN Urteil je index, in derselben Reihenfolge:',
    '{ "urteile": [ { "index": 0, "urteil": "bestehen" | "mangel", "gruende": ["…"] }, … ] }',
    '"bestehen" nur, wenn ALLE Punkte für diesen Eintrag stimmen. Jeder Mangel bekommt einen kurzen Grund.',
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

const KEIN_URTEIL: KreuzUrteil = {
  bestanden: false,
  gruende: ['Kein Urteil für diesen Eintrag erhalten.'],
};

/**
 * Urteile für ein GANZES Paket lesen. Versteht das Batch-Format
 * (`{ "urteile": [ … ] }`) und — tolerant, etwa wenn ein Modell bei einem
 * Eintrag in die Einzelform rutscht — das Einzelurteil. Fehlende Indizes
 * werden NICHT erraten: Sie gelten als Mangel (fail-closed).
 */
export function parseUrteile(roh: string, anzahl: number): KreuzUrteil[] {
  const json = roh.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const geparst = JSON.parse(json) as { urteile?: unknown };
  if (!Array.isArray(geparst.urteile)) {
    // Einzelform: ein Eintrag im Paket, das Modell antwortete wie gehabt.
    if (anzahl === 1) return [parseUrteil(json)];
    throw Error('Prüfer-Antwort enthält keine "urteile"-Liste.');
  }
  const jeIndex = new Map<number, KreuzUrteil>();
  let position = 0;
  for (const rohUrteil of geparst.urteile) {
    if (typeof rohUrteil !== 'object' || rohUrteil === null) continue;
    const eintrag = rohUrteil as Record<string, unknown>;
    const index = typeof eintrag.index === 'number' ? eintrag.index : position;
    if (index < 0 || index >= anzahl || jeIndex.has(index)) continue;
    jeIndex.set(index, {
      bestanden: eintrag.urteil === 'bestehen',
      gruende: Array.isArray(eintrag.gruende)
        ? eintrag.gruende.filter((g): g is string => typeof g === 'string')
        : [],
    });
    position += 1;
  }
  return Array.from({ length: anzahl }, (_, index) => jeIndex.get(index) ?? { ...KEIN_URTEIL });
}

/** Ein Prüf-Durchlauf für ein Paket: Prompt an einen Client, Urteile parsen. */
async function einmalPaket(client: TextClient, prompt: string, anzahl: number): Promise<KreuzUrteil[]> {
  const antwort = await client.complete({
    system:
      'Du bist ein strenger Lektor für Lernmaterialien. Du prüfst inhaltlich und sprachlich und antwortest ausschließlich mit dem geforderten Urteils-JSON.',
    user: prompt,
    maxTokens: 4000,
  });
  return parseUrteile(antwort.text, anzahl);
}

export type KreuzResultat = {
  geprueft: boolean;
  /** true = echte Kreuzprüfung (zweiter Anbieter), false = Selbstprüfung. */
  kreuz: boolean;
  urteile: KreuzUrteil[];
  gruende: string[];
};

/**
 * Ein GANZES Paket kreuzprüfen — ein Prüfaufruf je Runde statt einem je
 * Eintrag. Semantik je Eintrag identisch zum früheren Einzelweg: echte
 * Kreuzprüfung genügt ein Durchlauf; bei der Selbstprüfung (nur ein
 * Schlüssel) bekommen die Bestandenen eine ZWEITE Runde — und zwar nur
 * sie, nicht das ganze Paket noch einmal.
 */
export async function pruefeVocabKreuzBatch(
  eintraege: VocabEntry[],
  stufe: string | undefined,
  erzeuger: ProviderId,
  hatSchluessel: (anbieter: ProviderId) => boolean,
  clientFuer: (anbieter: ProviderId) => TextClient,
  prueferWahl?: ProviderId
): Promise<KreuzResultat[]> {
  if (eintraege.length === 0) return [];
  const { anbieter, selbstpruefung } = gegenStueck(erzeuger, hatSchluessel, prueferWahl);
  const prompt = baueVocabBatchPruefPrompt(eintraege, stufe);
  const erst = await einmalPaket(clientFuer(anbieter), prompt, eintraege.length);

  const resultate: KreuzResultat[] = eintraege.map((_, index) => {
    const urteil = erst[index];
    if (urteil.bestanden) {
      return { geprueft: !selbstpruefung, kreuz: !selbstpruefung, urteile: [urteil], gruende: [] };
    }
    return { geprueft: false, kreuz: !selbstpruefung, urteile: [urteil], gruende: urteil.gruende };
  });

  // Selbstprüfung: nur die Bestandenen der ersten Runde laufen noch einmal.
  const durchgelassen = resultate
    .map((resultat, index) => ({ resultat, index }))
    .filter(({ resultat }) => resultat.urteile[0].bestanden);
  if (selbstpruefung && durchgelassen.length > 0) {
    const wiederholung = await einmalPaket(
      clientFuer(anbieter),
      baueVocabBatchPruefPrompt(durchgelassen.map(({ index }) => eintraege[index]), stufe),
      durchgelassen.length
    );
    for (const [position, { resultat, index }] of durchgelassen.entries()) {
      const zweites = wiederholung[position];
      resultat.urteile = [resultat.urteile[0], zweites];
      if (!zweites.bestanden) {
        resultat.gruende = zweites.gruende;
      }
    }
  }
  return resultate;
}

/** Vokabel-Eintrag kreuzprüfen (Einzelfall — der Lauf nutzt die Batch-Funktion). */
export async function pruefeVocabKreuz(
  eintrag: VocabEntry,
  stufe: string | undefined,
  erzeuger: ProviderId,
  hatSchluessel: (anbieter: ProviderId) => boolean,
  clientFuer: (anbieter: ProviderId) => TextClient,
  prueferWahl?: ProviderId
): Promise<KreuzResultat> {
  const [resultat] = await pruefeVocabKreuzBatch(
    [eintrag],
    stufe,
    erzeuger,
    hatSchluessel,
    clientFuer,
    prueferWahl
  );
  return resultat;
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
