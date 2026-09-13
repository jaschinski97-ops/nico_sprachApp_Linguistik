import { VocabEntry } from '@/data/vocab-types';

import { DrillId } from '../drills/types';

import { LANGUAGES } from './registry';
import {
  pairLanguageOf,
  PairDirection,
  SyllableAnnotation,
  Lang,
  TargetLanguage,
} from './types';

/**
 * Der einhängbare Teil des Sprachmerkmals (Phase 15, Pflicht 3).
 *
 * `types.ts` beschreibt ein Merkmal (Name, Art, Quelle). Hier steht, was es
 * **tut** — und zwar genau zweierlei, weil die App genau zweierlei davon
 * braucht:
 *
 *   1. `annotate` — die Silbenaufteilung mit ihrer Auszeichnung. Bei Thai sind
 *      das Umschrift und Ton je Silbe, und daraus baut `ThaiWord` seine
 *      Farben. Für Spanisch wäre es später Silbe und Betonung, für Englisch
 *      die Lautschrift.
 *   2. `drills` — welche Übungen zum Merkmal gehören, im Unterschied zu den
 *      deutschen Grammatikübungen, die zu jedem Paar gehören (Pflicht 6).
 *
 * WAS HIER BEWUSST NICHT STEHT: Farben, Glyphen, Schriftregeln. Die bleiben
 * in `constants/tones.ts` und `data/thai-script.ts`. Ein Merkmal liefert die
 * **Auszeichnung**, nicht ihre Darstellung — sonst entstünde ein zweites
 * Darstellungssystem neben dem in Phase 9 kontrastgeprüften, und genau das
 * verbietet Pflicht 3.
 *
 * NACHWEIS AM BESTAND: Thai läuft unverändert hier durch. `syllablesOf` in
 * `data/vocab-helpers.ts` ruft `annotate`, und alle Thai-Tests aus den Phasen
 * 3, 6 und 13 blieben ohne eine einzige Änderung grün.
 */

// Der Typ steht seit Phase 16 in `types.ts` - der Vokabeltyp braucht ihn,
// und von hier aus waere es ein Zirkel.
export type { SyllableAnnotation };

export type LanguageFeatureRuntime = {
  /**
   * Wie ein Eintrag in ausgezeichnete Silben zerfällt. Fällt auf eine einzige
   * Silbe zurück, wenn das Merkmal für diesen Eintrag nichts hergibt.
   */
  annotate(entry: VocabEntry): SyllableAnnotation[];
  /** Die Übungen, die zum Merkmal gehören (nicht die deutschen). */
  drills: DrillId[];
};

/**
 * Thai: Töne je Silbe (AE-7) und die beiden Ton-Übungen aus Phase 6 und 13.
 *
 * `syllables` ist maßgeblich; das einzelne Feld `tone` bleibt der Notnagel für
 * Datensätze aus der Zeit vor AE-7.
 */
const THAI_RUNTIME: LanguageFeatureRuntime = {
  annotate(entry) {
    if (entry.syllables && entry.syllables.length > 0) return entry.syllables;
    return [{ roman: entry.romanization, tone: entry.tone }];
  },
  // Seit dem Lern-Reiter-Ausbau (13.09.) auch eine GRAMMATIK-Übung: Vorher
  // war die Kategorie den deutschen Zielen vorbehalten, und der Paritäts-
  // Test durfte Thai dort leer lassen. ครับ/ค่ะ ist die erste, ehrlich aus
  // geprüftem Satzstoff baubare thai-Grammatikübung.
  drills: ['tone', 'toneRule', 'polite', 'zaehlerwort', 'konsonantenklasse'],
};

/**
 * Spanisch: Betonung je Silbe (Phase 16) und die Herleitungsübung.
 *
 * Die Silben stehen im Eintrag, sind aber **abgeleitet** und nicht
 * abgeschrieben: `lib/stress` erzeugt sie aus der Schreibung, und ein Test
 * fährt den ganzen Grundstock durch, um zu belegen, dass Daten und Regel
 * übereinstimmen. Hier gelesen zu werden statt gerechnet, ist reine
 * Anzeigeökonomie.
 */
const SPANISH_RUNTIME: LanguageFeatureRuntime = {
  annotate(entry) {
    if (entry.syllables && entry.syllables.length > 0) return entry.syllables;
    return [{ roman: entry.romanization || entry.term }];
  },
  drills: ['stressHear', 'stressRule', 'serEstar', 'praesensEndung'],
};

/**
 * Englisch: die Lautschrift am ganzen Wort, nicht je Silbe.
 *
 * Das ist keine Lücke, sondern der Befund aus AE-44: Die Aussprache lässt
 * sich nicht aus der Schreibung ableiten, also gibt es auch nichts, was man
 * Silbe für Silbe zeigen könnte. Die eine Auszeichnung ist die Lautschrift.
 */
const ENGLISH_RUNTIME: LanguageFeatureRuntime = {
  annotate: (entry) => [{ roman: entry.ipa ?? entry.romanization ?? entry.term }],
  drills: ['soundSpelling', 'spelling', 'irregularPast', 'partizip'],
};

/**
 * Deutsch als ZIEL-Sprache (Nutzerentscheidung 10.09.): keine
 * silbenspezifische Auszeichnung — das deutsche Wort steht, wie es
 * geschrieben wird. Keine Merkmalsübungen: Die deutschen Übungen sind die
 * Grammatik-Drills (Genus, Stammformen), und die hängen an der RICHTUNG
 * (`_to_de`), nicht am Sprachmerkmal — siehe `drillsForDirectionViaFeature`.
 *
 * Der Schlüssel `de` steht hier, obwohl Deutsch kein `TargetLanguage` ist:
 * Einträge des abgeleiteten de-Pools (vocabulary-de.ts) tragen zur Laufzeit
 * `language: 'de'`, und `featureFor` liest genau dieses Feld.
 */
const GERMAN_RUNTIME: LanguageFeatureRuntime = {
  annotate: (entry) => [{ roman: entry.romanization || entry.term }],
  drills: [],
};

const RUNTIMES: Record<Lang, LanguageFeatureRuntime> = {
  th: THAI_RUNTIME,
  en: ENGLISH_RUNTIME,
  es: SPANISH_RUNTIME,
  de: GERMAN_RUNTIME,
};

export function featureRuntime(language: TargetLanguage): LanguageFeatureRuntime {
  return RUNTIMES[language];
}

/** Das Merkmal des Eintrags — über seine Sprache, nicht über eine Annahme. */
export function featureFor(entry: VocabEntry): LanguageFeatureRuntime {
  return featureRuntime(entry.language);
}

/**
 * Welche Übungen gehören zu dieser Richtung?
 *
 * `X → Deutsch` bekommt die deutschen Grammatikübungen — sie prüfen Genus und
 * Stammformen und gelten damit für **jedes** Paar (Pflicht 6). `Deutsch → X`
 * bekommt die Merkmalsübungen der Zielsprache; hat die Sprache noch keine,
 * ist die Liste leer statt falsch gefüllt.
 *
 * SEIT DEN KREUZRICHTUNGEN AUF `PairDirection`: Eine Kreuzrichtung erbt die
 * Merkmalsübungen ihrer **Ziel**-Sprache — `en_to_es` übt die spanische
 * Betonung, `es_to_th` die Thai-Töne. Die Übungen fragen den Stoff der
 * Zielsprache ab und hängen nicht an der Brücke; nur die de-geankerten
 * Regeln (`_to_de`) bleiben beim Bestand.
 */
export function drillsForDirectionViaFeature(direction: PairDirection): DrillId[] {
  // „X → Deutsch“ liest seit dem Lern-Reiter-Ausbau (13.09.) auch: Das
  // deutsche Wort steht sichtbar, die Bedeutung wird gewählt. Vorher hatte
  // das Deutsch-Ziel in der Kategorie Lesen nichts — der Paritäts-Test
  // verlangt jetzt in jeder Kategorie mindestens eine Übung.
  if (direction.endsWith('_to_de')) return ['article', 'verbForms', 'deutschLesen'];
  // pairLanguageOf liefert die ZIELsprache (en_to_es → 'es', ar_to_th → 'th')
  // und für de-geankerte Richtungen exakt das Bestandsverhalten. Die Brücke
  // 'ar' darf hier nie ankommen — die Registry kennt sie nicht.
  const language = pairLanguageOf(direction);
  // Ein entschiedenes Merkmal ist noch kein gebautes. Solange
  // `implemented: false` steht, gibt es hier keine Uebung - lieber eine
  // leere Liste als eine Uebung ohne Stoff (Pflicht 5 aus Phase 15).
  if (!LANGUAGES[language].feature.implemented) return [];
  return featureRuntime(language).drills;
}

/** Ob das Merkmal dieser Sprache gebaut ist — für die Anzeige in der Auswahl. */
export function featureIsImplemented(language: TargetLanguage): boolean {
  return LANGUAGES[language].feature.implemented;
}
