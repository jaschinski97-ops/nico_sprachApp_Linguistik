import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, ProgressPanel } from '@/components/generator-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createTextClient } from '@/lib/providers/text';
import type { BatchProgress } from '@/lib/generation/batch';
import {
  defaultChoiceFor,
  defaultModelFor,
  loadGeneratorSettings,
  providersForGroup,
  setGeneratorChoice,
  setGeneratorProvider,
  type GeneratorChoice,
} from '@/lib/providers/settings';
import { PROVIDER_INFO, type ProviderId } from '@/lib/providers/types';
import {
  pruefeVocabKreuzBatch,
  PRUEF_BATCH_GROESSE,
  schluesselPruefer,
} from '@/lib/content/kreuzpruefung';
import { loadApiKey } from '@/lib/api-key';
import { estimateRunCost } from './run-cost';
import { studioRequest } from './content-client';
import { loadVocabulary, writeMeta } from '@/lib/repository';
import {
  pruefeVocabDoc,
  vocabSchluessel,
} from '@/lib/content/vocab-schema';
import { listeAusAntwort } from '@/lib/content/ki-json';
import type { VocabEntry } from '@/data/vocab-types';
import { LANGUAGE_CODES, type LanguageCode } from '@/lib/languages/types';

/** Die Vokabel-Sprachen: die drei Registry-Sprachen + Deutsch (KI-Pool). */
type VocabSprache = LanguageCode | 'de';

/**
 * Wortschatz mit festlegbarer Zielgröße (Phase 2, Schritt 4).
 *
 * JE Sprache ein eigenes Ziel (250 / 500 / 1.000 / 2.000 oder freie Zahl) —
 * angezeigt wird vorhanden / Ziel / fehlt, erzeugt werden nur die fehlenden
 * Wörter, in Paketen (z. B. 50) mit optionalem Thema. Keine CEFR-Stufenwahl
 * mehr (Nutzerwunsch 15.09.: „ich will nicht 2.000 Wörter A1 erstellen") —
 * der Prompt verlangt grundlegende, hochfrequente Alltagswörter.
 *
 * Anbieter UND Modell für die ERZEUGUNG sind hier wählbar (eigene Gruppe
 * `vocabulary`, getrennt von den Dialogen); das PRÜF-MODELL ebenfalls — der
 * Prüf-ANBIETER bleibt bei der Kreuzregel „der jeweils andere Anbieter".
 *
 * „Alle Sprachen“ (Nutzerwunsch 15.09., wie bei den anderen Generatoren):
 * EIN Kettenlauf über alle vier Sprachen (th/en/es/de) mit EINER
 * Kostenbestätigung — je Sprache nur die fehlenden Wörter bis zum
 * Sprach-Ziel (im Alle-Modus je Sprache einstellbar), Veröffentlichen
 * einmal am Ende; Sprachen mit erreichtem Ziel werden übersprungen. Der
 * Lauf zeigt den LIVE-Fortschritt (dasselbe ProgressPanel wie die
 * anderen Generatoren).
 *
 * Der Lauf schlägt die neuen Begriffe als Katalog-Art `vocabulary` über
 * Stage UND catalog.json ein (dieselbe Regel wie für Clips); geprüfte
 * Begriffe landen mit dem nächsten App-Bundle im Lernbestand
 * (GEBUENDELTE-Regel).
 *
 * Der Lauf ist KOSTENPFLICHTIG: Anzahl, Anbieter und Kostenschätzung
 * stehen vor dem Start, der erste Knopfdruck bestätigt nur.
 */

// Deutsch ist seit dem Nutzerwunsch vom 15.09. eine VOLLWERTIGE Auswahl:
// eigene Chip, eigenes Ziel, im „Alle Sprachen“-Lauf dabei. de-Nomen
// brauchen im Schema germanNoun — der Prompt verlangt es mit (unten).
const SPRACHEN: { code: VocabSprache; label: string }[] = [
  ...(LANGUAGE_CODES as readonly LanguageCode[]).map((code) => ({
    code,
    label: { th: 'Thai', en: 'Englisch', es: 'Spanisch', de: 'Deutsch' }[code as LanguageCode] ?? code,
  })),
  { code: 'de', label: 'Deutsch' },
];

const ZIEL_PRESETS = [250, 500, 1000, 2000];

type LaufErgebnis = {
  erzeugt: number;
  kreuzGeprueft: number;
  einfachGeprueft: number;
  kreuzAbgelehnt: number;
  duplikate: number;
  aussortiert: number;
  /** Einträge, die aus einer am Token-Limit abgeschnittenen Antwort gerettet wurden. */
  gerettet: number;
};

/** Sieben Zeichen stabiler Hash für KI-Vokabel-IDs. */
function kurzHash(text: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h1 ^= text.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  return h1.toString(16).padStart(8, '0').slice(0, 8);
}

/** Der Erzeugungs-Prompt: Vertrags-JSON mit sprachspezifischen Pflichten. */
function baueWortschatzPrompt(options: {
  sprache: VocabSprache;
  anzahl: number;
  thema: string;
  bekannte: string[];
}): string {
  const { sprache, anzahl, thema, bekannte } = options;
  const sprachRegeln: Record<string, string> = {
    th: '- "term" in thailändischer Schrift; "syllables" mit JEDER Silbe als { "roman": Umschrift, "tone": "mid"|"low"|"falling"|"high"|"rising" }; "romanization" als Paiboon-artige Umschrift des ganzen Wortes.',
    en: '- "ipa" mit IPA-Lautschrift (RP); "syllables" als [{ "roman": "/" + IPA + "/" }].',
    es: '- "syllables" mit Silbentrennung und "stressed": true auf der betonten Silbe; spanische Nomen mit "spanishNoun" { "gender": "m"|"f", "article": "el"|"la", "plural": "…" }, Verben mit "spanishVerb" { "conjugation": "ar"|"er"|"ir", "irregular": true|false }.',
    de: '- "term" ist das deutsche Wort; Nomen mit "germanNoun" { "article": "der"|"die"|"das", "plural": "…" } (Pflichtfeld des Schemas); "german" ist die kurze deutsche Bedeutung (Synonym oder Klarstellung), niemals Thai-Schrift.',
  };
  return [
    `Erzeuge genau ${anzahl} Einträge eines grundlegenden Alltags-Wortschatzes für Lernende, die ${sprache.toUpperCase()} lernen.`,
    thema ? `Thema: „${thema}".` : 'Thema: grundlegende, hochfrequente Wörter und feste Wendungen des Alltags — häufige Wörter zuerst.',
    'Keine Eigennamen, keine Markennamen, keine vulgären Ausdrücke, keine Duplikate innerhalb der Liste.',
    '',
    'Antworte NUR mit JSON:',
    '{ "woerter": [',
    '  {',
    '    "term": "Wort in der Zielsprache",',
    '    "romanization": "Lesehilfe",',
    '    "german": "deutsche Bedeutung",',
    '    "partOfSpeech": "noun|verb|adjective|adverb|pronoun|numeral|particle|preposition|conjunction|interjection",',
    '    "register": "neutral"|"formal"|"informal",',
    '    "isConcrete": true|false,',
    '    "exampleTerm": "Beispielsatz in der Zielsprache",',
    '    "exampleRoman": "Umschrift des Beispielsatzes",',
    '    "exampleGerman": "deutsche Übersetzung des Beispielsatzes",',
    '    "syllables": [ … ],',
    '    … sprachspezifische Felder siehe unten …',
    '  }',
    '] }',
    '',
    `Sprachregeln für ${sprache}:`,
    sprachRegeln[sprache] ?? '',
    '',
    `Ausschlussliste — diese Begriffe existieren bereits und dürfen NICHT vorkommen:`,
    bekannte.slice(0, 300).join(' | '),
  ].join('\n');
}

export function VocabZieleCard({ onFinished }: { onFinished: () => void }) {
  const theme = useTheme();
  const [sprache, setSprache] = useState<VocabSprache>('th');
  const [alleSprachen, setAlleSprachen] = useState(false);
  const [ziele, setZiele] = useState<Partial<Record<string, number>>>({});
  const [bestand, setBestand] = useState<Partial<Record<string, number>> | null>(null);
  const [paketText, setPaketText] = useState('50');
  const [thema, setThema] = useState('');
  const [wahl, setWahl] = useState<GeneratorChoice>(() => defaultChoiceFor('vocabulary'));
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'confirm'>('idle');
  const [meldung, setMeldung] = useState('');
  const [ergebnis, setErgebnis] = useState<LaufErgebnis | null>(null);
  /** Live-Fortschritt während des Laufs — bleibt nach dem Lauf stehen (wie bei den anderen Karten). */
  const [fortschritt, setFortschritt] = useState<BatchProgress | null>(null);

  useEffect(() => {
    // Gespeicherte Wahl der Gruppe `vocabulary` — ohne Stand bleibt die
    // Werksvorgabe (Gemini + dessen Text-Vorschlag) stehen.
    loadGeneratorSettings()
      .then((s) => setWahl(s.vocabulary))
      .catch(() => {});
  }, []);

  /** Anbieterwechsel zieht das Modell mit (Regel wie bei allen Gruppen). */
  const wahlAendern = useCallback(async (change: Partial<GeneratorChoice>) => {
    const next =
      change.provider !== undefined
        ? await setGeneratorProvider('vocabulary', change.provider)
        : await setGeneratorChoice('vocabulary', change);
    setWahl(next.vocabulary);
  }, []);

  const ladeBestand = useCallback(async () => {
    const alle = await loadVocabulary();
    const zahlen: Partial<Record<string, number>> = {};
    for (const code of LANGUAGE_CODES) zahlen[code] = alle.filter((e) => e.language === code).length;
    // Deutsch: der abgeleitete Pool trägt language 'de' (KI) — zählen, wenn da.
    zahlen.de = alle.filter((e) => (e as { language: string }).language === 'de').length;
    setBestand(zahlen);
    return zahlen;
  }, []);

  useEffect(() => {
    void ladeBestand();
  }, [ladeBestand]);

  const ziel = ziele[sprache] ?? 250;
  const vorhanden = bestand?.[sprache] ?? 0;
  const fehlt = Math.max(0, ziel - vorhanden);

  /** Im „Alle Sprachen“-Lauf zählt jede Sprache mit ihrem eigenen Ziel. */
  const aktiveSprachen: readonly VocabSprache[] = alleSprachen
    ? SPRACHEN.map((eintrag) => eintrag.code)
    : [sprache];
  const gesamtFehlt = aktiveSprachen.reduce(
    (summe, code) => summe + Math.max(0, (ziele[code] ?? 250) - (bestand?.[code] ?? 0)),
    0
  );

  const zielSetzenFuer = (code: VocabSprache, wert: number) => {
    setZiele((alt) => ({ ...alt, [code]: wert }));
    void writeMeta(`vocabZiel-${code}`, wert).catch(() => {});
  };
  const zielSetzen = (wert: number) => zielSetzenFuer(sprache, wert);

  const paket = Math.max(1, Number.parseInt(paketText, 10) || 50);
  /** Der nächste Lauf je Sprache — vom Paket und vom Sprach-Ziel begrenzt. */
  const mengeFuer = (code: VocabSprache) =>
    Math.min(paket, Math.max(0, (ziele[code] ?? 250) - (bestand?.[code] ?? 0)));
  const gesamtMenge = aktiveSprachen.reduce((summe, code) => summe + mengeFuer(code), 0);

  /**
   * EIN Sprachlauf: lädt Bestand und Stage, erzeugt das Paket, prüft und
   * legt es auf die Stage. `null` heißt „nichts zu tun“ (Ziel erreicht).
   * Veröffentlichen tut der Aufrufer — der „Alle Sprachen“-Kettenlauf
   * published einmal am Ende statt je Sprache.
   */
  const laufeFuer = useCallback(async (
    code: VocabSprache,
    tick: (term: string, ausgang: 'ok' | 'failed' | 'skipped') => void
  ): Promise<LaufErgebnis | null> => {
      const bestandJetzt = await ladeBestand();
      const vorhandenJetzt = bestandJetzt[code] ?? 0;
      const zielJetzt = ziele[code] ?? 250;
      const anzahl = Math.min(paket, Math.max(0, zielJetzt - vorhandenJetzt));
      if (anzahl <= 0) return null;

      const settings = await loadGeneratorSettings();
      const { provider, model, checkModel } = settings.vocabulary;
      const apiKey = (await loadApiKey(provider)) ?? '';
      const client = createTextClient(provider, apiKey, model);
      // Kreuzprüfung vorbereiten (Phase 2, Schritt 5): der ANDERE Anbieter
      // prüft; fehlt dessen Schlüssel, prüft der Erzeuger selbst zweimal
      // („einfach geprüft“). Das Prüf-Modell ist wählbar (checkModel); ohne
      // Eintrag gilt der Text-Vorschlag des jeweiligen Prüfers.
      const schluessel: Partial<Record<string, string | null>> = {
        gemini: await loadApiKey('gemini'),
        chatgpt: await loadApiKey('chatgpt'),
        'chatgpt-helper': 'serverseitig',
      };
      const hatSchluessel = (anbieter: string): boolean => Boolean(schluessel[anbieter]);
      const pruefModellFuer = (anbieter: ProviderId) =>
        checkModel?.trim() || defaultModelFor(anbieter, 'text');
      const clientFuer = (anbieter: ReturnType<typeof defaultModelFor> extends never ? never : Parameters<typeof defaultModelFor>[0]) =>
        createTextClient(
          anbieter,
          (schluessel[anbieter] ?? '') as string,
          pruefModellFuer(anbieter)
        );

      const alle = await loadVocabulary();
      const bekannte = alle
        .filter((e) => (e as { language: string }).language === code)
        .map((e) => e.term);

      const antwort = await client.complete({
        system:
          'Du erzeugst Lernwortschatz als JSON und hältst dich EXAKT an das geforderte Schema. Keine Duplikate, keine Eigennamen, häufige Wörter zuerst.',
        user: baueWortschatzPrompt({ sprache: code, anzahl, thema, bekannte }),
        maxTokens: 32768,
      });

      const vorhandenSchluessel = new Set(
        alle.filter((e) => (e as { language: string }).language === code)
          .map((e) => vocabSchluessel(e.term, code))
      );
      // Phase 2, Schritt 6: auch der STAGE zählt als vorhanden — Einträge,
      // die im nächsten Export ohnehin übernommen würden, sind Duplikate.
      try {
        const zustand = await studioRequest<{
          stage: { entries: { kind: string; document: { term?: string } }[] };
        }>('/state');
        for (const eintrag of zustand.stage.entries) {
          if (eintrag.kind === 'vocabulary' && typeof eintrag.document?.term === 'string') {
            vorhandenSchluessel.add(vocabSchluessel(eintrag.document.term, code));
          }
        }
      } catch {
        // Ohne Helper bleibt der Vergleich beim lokalen Bestand.
      }
      const laufSchluessel = new Set<string>();
      const resultat: LaufErgebnis = { erzeugt: 0, kreuzGeprueft: 0, einfachGeprueft: 0, kreuzAbgelehnt: 0, duplikate: 0, aussortiert: 0, gerettet: 0 };

      // 32700 statt 8000: 50 reiche Einträge (Thai-Schrift, Silben, Beispiele)
      // sprengten das alte Limit — die Antwort brach mitten im JSON ab
      // („Unterminated string", erster Kettenlauf 15.09.). Die Nutzerwahl
      // (gemini-3.8-flash, gpt-5.6-luna) trägt Ausgabe-Caps weit darüber;
      // der Saldo ist eine Obergrenze pro Aufruf, kein Verbrauchsziel.
      const { woerter, abgeschnitten } = listeAusAntwort(antwort.text);
      if (abgeschnitten) resultat.gerettet = woerter.length;

      // Phase A — sammeln: Duplikate und Schemamängel fliegen sofort raus,
      // die übrigen Kandidaten gehen als PAKET in die Kreuzprüfung.
      const kandidaten: { eintrag: VocabEntry; schluessel: string }[] = [];
      for (const rohEintrag of woerter) {
        const kandidat = rohEintrag as Record<string, unknown>;
        const term = String(kandidat.term ?? '');
        const schluessel = vocabSchluessel(term, code);
        if (!term || vorhandenSchluessel.has(schluessel) || laufSchluessel.has(schluessel)) {
          resultat.duplikate += 1;
          tick(term, 'skipped');
          continue;
        }
        const eintrag: VocabEntry = {
          ...(kandidat as unknown as VocabEntry),
          id: `ki-${code}-${kurzHash(schluessel)}`,
          // 'de' trägt die Laufzeit längst (de-Pool; vocab-schema liest die
          // Sprache als string) — nur der Typ kennt es noch nicht: Cast.
          language: code as VocabEntry['language'],
          concept: `ki-${code}-${kurzHash(schluessel)}`,
          register: (kandidat.register as VocabEntry['register']) ?? 'neutral',
          isConcrete: Boolean(kandidat.isConcrete),
          sourceVerified: false,
          verificationNote: 'KI-Erzeugung, einfach geprüft (Schema + Schrift + Regeln).',
          syllables: Array.isArray(kandidat.syllables) ? (kandidat.syllables as VocabEntry['syllables']) : [],
        };
        const pruefung = pruefeVocabDoc(eintrag);
        if (!pruefung.ok) {
          resultat.aussortiert += 1;
          tick(term, 'skipped');
          continue;
        }
        kandidaten.push({ eintrag, schluessel });
      }

      // Phase B — Phase 2, Schritt 5 als PAKETprüfung (15.09.): EIN
      // Prüfaufruf je ~10 Einträge statt einem je Wort; der erste Kettenlauf
      // verbrachte die Zeit mit 200 nacheinander laufenden Reasoning-Aufrufen.
      // Der ANDERE Anbieter prüft Übersetzung, Grammatik, Umschrift/Ton,
      // Natürlichkeit und Passung; ohne zweiten Schlüssel läuft die
      // Selbstprüfung (zweite Runde nur über die Bestandenen) und der
      // Eintrag bleibt „einfach geprüft“ — Durchgefallene werden verworfen.
      for (let start = 0; start < kandidaten.length; start += PRUEF_BATCH_GROESSE) {
        const paket = kandidaten.slice(start, start + PRUEF_BATCH_GROESSE);
        const resultate = await pruefeVocabKreuzBatch(
          paket.map((kandidat) => kandidat.eintrag),
          undefined,
          provider,
          hatSchluessel,
          clientFuer
        );
        for (const [position, kandidat] of paket.entries()) {
          const kreuz = resultate[position];
          const eintrag = kandidat.eintrag;
          if (kreuz.kreuz && kreuz.geprueft) {
            eintrag.sourceVerified = true;
            eintrag.verificationNote = `KI-Kreuzprüfung bestanden (${provider} erzeugt, zweiter Anbieter geprüft).`;
            resultat.kreuzGeprueft += 1;
          } else if (kreuz.geprueft || kreuz.urteile.every((urteil) => urteil.bestanden)) {
            eintrag.verificationNote =
              'KI-Erzeugung, einfach geprüft (zweiter Durchlauf desselben Anbieters bestanden).';
            resultat.einfachGeprueft += 1;
          } else {
            resultat.kreuzAbgelehnt += 1;
            tick(eintrag.term, 'failed');
            continue;
          }
          await studioRequest('/stage', { kind: 'vocabulary', document: { ...eintrag } });
          laufSchluessel.add(kandidat.schluessel);
          resultat.erzeugt += 1;
          tick(eintrag.term, 'ok');
        }
      }
      return resultat;
  }, [ziele, paket, thema, ladeBestand]);

  const erzeugen = useCallback(async () => {
    setRunning(true);
    setMeldung('');
    setPhase('idle');
    setFortschritt({
      total: Math.max(1, gesamtMenge), processed: 0, ok: 0, failed: 0, skipped: 0,
      current: null, errors: [], done: false, cancelled: false,
    });
    const tick = (term: string, ausgang: 'ok' | 'failed' | 'skipped') => {
      setFortschritt((alt) => {
        if (!alt) return alt;
        const processed = alt.processed + 1;
        return {
          ...alt,
          processed,
          total: Math.max(alt.total, processed),
          current: term,
          ok: alt.ok + (ausgang === 'ok' ? 1 : 0),
          failed: alt.failed + (ausgang === 'failed' ? 1 : 0),
          skipped: alt.skipped + (ausgang === 'skipped' ? 1 : 0),
        };
      });
    };
    try {
      const codes = alleSprachen ? [...aktiveSprachen] : [sprache];
      const teile: Partial<Record<string, LaufErgebnis>> = {};
      const gesamt: LaufErgebnis = { erzeugt: 0, kreuzGeprueft: 0, einfachGeprueft: 0, kreuzAbgelehnt: 0, duplikate: 0, aussortiert: 0, gerettet: 0 };
      const fehler: string[] = [];
      let uebersprungen = 0;
      for (const code of codes) {
        try {
          const teil = await laufeFuer(code, tick);
          if (!teil) {
            uebersprungen += 1;
            continue;
          }
          teile[code] = teil;
          for (const feld of Object.keys(gesamt) as (keyof LaufErgebnis)[]) gesamt[feld] += teil[feld];
        } catch (error) {
          // Ein Sprachlauf reißt die Kette nicht mit — der Fehler wird
          // gemeldet, die restlichen Sprachen laufen weiter.
          fehler.push(error instanceof Error ? error.message : String(error));
        }
      }
      if (gesamt.erzeugt > 0) {
        await studioRequest('/publish', {});
        await ladeBestand();
        onFinished();
      }
      setErgebnis(gesamt);
      const gerettetHinweis = (zahl: number) =>
        zahl > 0
          ? ` Antwort war am Token-Limit abgeschnitten — ${zahl} Einträge gerettet; beim nächsten Lauf Paketgröße senken.`
          : '';
      if (!alleSprachen) {
        const teil = teile[sprache];
        if (fehler.length > 0) {
          setMeldung(fehler[0]);
        } else if (teil) {
          setMeldung(
            `Lauf beendet: ${teil.erzeugt} erzeugt · ${teil.kreuzGeprueft} kreuzgeprüft · ${teil.einfachGeprueft} einfach geprüft · ${teil.kreuzAbgelehnt} von der Kreuzprüfung abgelehnt · ${teil.duplikate} Duplikate verworfen · ${teil.aussortiert} aussortiert.${gerettetHinweis(teil.gerettet)}`
          );
        } else {
          setMeldung('Nichts zu erzeugen — das Ziel ist erreicht.');
        }
      } else {
        const verteilung = codes
          .map((code) => `${SPRACHEN.find((eintrag) => eintrag.code === code)?.label ?? code} ${teile[code]?.erzeugt ?? 0}`)
          .join(' · ');
        const zusatz = [
          uebersprungen > 0 ? `${uebersprungen} Sprache(n) mit erreichtem Ziel übersprungen` : '',
          gesamt.gerettet > 0 ? `${gesamt.gerettet} Einträge aus abgeschnittenen Antworten gerettet` : '',
          fehler.length > 0 ? `Fehler: ${fehler[0]}${fehler.length > 1 ? ` (+${fehler.length - 1} weitere)` : ''}` : '',
        ].filter(Boolean).join(' · ');
        setMeldung(
          `Kettenlauf beendet: ${verteilung} — ${gesamt.erzeugt} erzeugt · ${gesamt.kreuzGeprueft} kreuzgeprüft · ${gesamt.einfachGeprueft} einfach geprüft · ${gesamt.kreuzAbgelehnt} abgelehnt · ${gesamt.duplikate} Duplikate verworfen · ${gesamt.aussortiert} aussortiert${zusatz ? ` · ${zusatz}` : ''}.`
        );
      }
    } catch (error) {
      setMeldung(error instanceof Error ? error.message : String(error));
    } finally {
      setFortschritt((alt) => (alt ? { ...alt, done: true, current: null } : alt));
      setRunning(false);
    }
  }, [alleSprachen, aktiveSprachen, sprache, gesamtMenge, laufeFuer, ladeBestand, onFinished]);

  const prueferAnbieter: ProviderId = wahl.provider === 'gemini' ? 'chatgpt' : 'gemini';
  const pruefModellFuer = (anbieter: ProviderId) =>
    wahl.checkModel?.trim() || defaultModelFor(anbieter, 'text');
  const kostenSchätzung =
    estimateRunCost('vocabulary', wahl.provider, wahl.model, Array.from({ length: Math.max(1, gesamtMenge) }, () => ({ text: '' })));
  const wahlText = `Erzeugung: ${PROVIDER_INFO[wahl.provider].label} (${wahl.model}) · Prüfer: ${prueferAnbieter} · Prüfmodell: ${pruefModellFuer(prueferAnbieter)} · geschätzte Kosten ${
    kostenSchätzung.usd === null ? 'ohne Tarif hinterlegt' : `≈ ${kostenSchätzung.usd.toFixed(4)} $`
  }`;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Wortschatz — Zielgröße je Sprache</ThemedText>

      <View style={styles.zeile}>
        {SPRACHEN.map(({ code, label }) => (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: !alleSprachen && sprache === code }}
            onPress={() => {
              setSprache(code);
              setAlleSprachen(false);
            }}
            disabled={running}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.pressed,
              !alleSprachen && sprache === code && { borderColor: theme.accent, borderWidth: 1 },
            ]}>
            <ThemedText type="small" themeColor={!alleSprachen && sprache === code ? 'text' : 'textSecondary'}>
              {label}
            </ThemedText>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: alleSprachen }}
          onPress={() => setAlleSprachen(true)}
          disabled={running}
          style={({ pressed }) => [
            styles.chip,
            pressed && styles.pressed,
            alleSprachen && { borderColor: theme.accent, borderWidth: 1 },
          ]}>
          <ThemedText type="small" themeColor={alleSprachen ? 'text' : 'textSecondary'}>
            Alle Sprachen
          </ThemedText>
        </Pressable>
      </View>

      {!alleSprachen && (
      <View style={styles.zeile}>
        {ZIEL_PRESETS.map((preset) => (
          <Pressable
            key={preset}
            accessibilityRole="button"
            accessibilityState={{ selected: ziel === preset }}
            onPress={() => zielSetzen(preset)}
            disabled={running}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.pressed,
              ziel === preset && { borderColor: theme.accent, borderWidth: 1 },
            ]}>
            <ThemedText type="small" themeColor={ziel === preset ? 'text' : 'textSecondary'}>
              {preset.toLocaleString('de-DE')}
            </ThemedText>
          </Pressable>
        ))}
        <TextInput
          value={String(ziel)}
          onChangeText={(text) => {
            const zahl = Number.parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (Number.isFinite(zahl) && zahl > 0) zielSetzen(zahl);
          }}
          keyboardType="number-pad"
          accessibilityLabel={`Freies Ziel für ${sprache}`}
          style={[styles.input, styles.kurz, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
        />
      </View>
      )}

      <ThemedText type="smallBold">
        {alleSprachen
          ? `Alle Sprachen: ${gesamtFehlt.toLocaleString('de-DE')} fehlen gegenüber den Sprach-Zielen`
          : `${sprache}: ${vorhanden.toLocaleString('de-DE')} vorhanden · Ziel ${ziel.toLocaleString('de-DE')} · ${fehlt.toLocaleString('de-DE')} fehlt`}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {SPRACHEN.map(({ code, label }) => `${label} ${bestand?.[code] ?? '…'}`).join(' · ')}
      </ThemedText>

      {alleSprachen && (
        <View style={styles.field}>
          <ThemedText type="small">Ziel je Sprache (im Alle-Sprachen-Lauf)</ThemedText>
          <View style={styles.zeile}>
            {SPRACHEN.map(({ code, label }) => (
              <View key={code} style={styles.zielFeld}>
                <TextInput
                  value={String(ziele[code] ?? 250)}
                  onChangeText={(text) => {
                    const zahl = Number.parseInt(text.replace(/[^0-9]/g, ''), 10);
                    if (Number.isFinite(zahl) && zahl > 0) zielSetzenFuer(code, zahl);
                  }}
                  keyboardType="number-pad"
                  accessibilityLabel={`Ziel für ${label}`}
                  style={[styles.input, styles.kurz, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
                />
                <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.field}>
        <ThemedText type="small">Paketgröße (Wörter je Lauf)</ThemedText>
        <TextInput
          value={paketText}
          onChangeText={(text) => setPaketText(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          accessibilityLabel="Paketgröße"
          style={[styles.input, styles.kurz, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
        />
        <ThemedText type="small">Thema (optional)</ThemedText>
        <TextInput
          value={thema}
          onChangeText={setThema}
          accessibilityLabel="Thema des Pakets"
          placeholder="z. B. Im Restaurant"
          placeholderTextColor={theme.textSecondary}
          editable={!running}
          style={[styles.input, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="small">KI — Erzeugung</ThemedText>
        <View style={styles.zeile}>
          {providersForGroup('vocabulary').map((info) => (
            <Pressable
              key={info.id}
              accessibilityRole="button"
              accessibilityState={{ selected: wahl.provider === info.id }}
              onPress={() => void wahlAendern({ provider: info.id })}
              disabled={running}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.pressed,
                wahl.provider === info.id && { borderColor: theme.accent, borderWidth: 1 },
              ]}>
              <ThemedText type="small" themeColor={wahl.provider === info.id ? 'text' : 'textSecondary'}>
                {info.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={wahl.model}
          onChangeText={(wert) => void wahlAendern({ model: wert })}
          placeholder={PROVIDER_INFO[wahl.provider].modelPlaceholder.text}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!running}
          accessibilityLabel="Modellname für die Wortschatz-Erzeugung"
          style={[styles.input, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
        />
        <ThemedText type="small">KI — Prüfung (Modell des Prüfers)</ThemedText>
        <TextInput
          value={wahl.checkModel ?? ''}
          onChangeText={(wert) => void wahlAendern({ checkModel: wert })}
          placeholder={defaultModelFor(prueferAnbieter, 'text')}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!running}
          accessibilityLabel="Modellname für die Wortschatz-Prüfung"
          style={[styles.input, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Freitext, leer lassen nimmt den Vorschlag des Anbieters. Der Prüf-Anbieter
          ist per Kreuzregel automatisch der jeweils andere ({prueferAnbieter}); fehlt
          dessen Schlüssel, prüft der Erzeuger sich selbst zweimal („einfach geprüft“).
        </ThemedText>
      </View>

      {phase === 'idle' ? (
        <View style={styles.zeile}>
          <Button
            label={alleSprachen ? 'Alle Sprachen erzeugen …' : 'Fehlende Wörter erzeugen …'}
            onPress={() => setPhase('confirm')}
            disabled={running || (alleSprachen ? gesamtMenge === 0 : fehlt === 0)}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {alleSprachen
              ? gesamtMenge === 0
                ? 'Alle Ziele erreicht.'
                : `${gesamtMenge} Wörter im nächsten Lauf (alle Sprachen)`
              : fehlt === 0
                ? 'Ziel erreicht.'
                : `${Math.min(paket, fehlt)} Wörter im nächsten Lauf`}
          </ThemedText>
        </View>
      ) : (
        <ThemedView type="backgroundSelected" style={styles.confirmBox}>
          <ThemedText selectable type="small">
            {alleSprachen
              ? `Alle Sprachen: ${aktiveSprachen.map((code) => `${SPRACHEN.find((eintrag) => eintrag.code === code)?.label ?? code} ${mengeFuer(code)}`).join(' · ')} (Σ ${gesamtMenge}) · ${wahlText}`
              : `Sprache: ${sprache} · Menge: ${Math.min(paket, fehlt)} · ${wahlText}`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{kostenSchätzung.basis}</ThemedText>
          <View style={styles.zeile}>
            <Button label="Kosten bestätigen und erzeugen" onPress={erzeugen} disabled={running} />
            <Button label="Abbrechen" onPress={() => setPhase('idle')} disabled={running} />
          </View>
        </ThemedView>
      )}

      {fortschritt ? <ProgressPanel progress={fortschritt} /> : null}

      {ergebnis ? (
        <ThemedText type="smallBold" accessibilityLiveRegion="polite">
          {`Ergebnis: ${ergebnis.erzeugt} erzeugt · ${ergebnis.kreuzGeprueft} kreuzgeprüft · ${ergebnis.einfachGeprueft} einfach geprüft · ${ergebnis.kreuzAbgelehnt} abgelehnt · ${ergebnis.duplikate} Duplikate verworfen · ${ergebnis.aussortiert} aussortiert.`}
        </ThemedText>
      ) : null}

      <ThemedText accessibilityLiveRegion="polite" type="small" themeColor="textSecondary">
        {meldung}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        Erzeugte Wörter sind einfach geprüft (Schema + Schrift + Regeln) und
        gekennzeichnet. Die KI-Kreuzprüfung (zweiter Anbieter) hebt sie auf
        „geprüft“ — Brücken-Anker der 20 App-Sprachen ziehen separat nach.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  zeile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: Colors.dark.backgroundSelected,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    fontSize: 13,
  },
  kurz: {
    width: 90,
  },
  zielFeld: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  field: {
    gap: Spacing.one,
  },
  confirmBox: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
