import { VocabEntry } from '@/data/vocab-types';

import { DrillId } from '../drills/types';

import { LANGUAGES } from './registry';
import { Direction, LanguageCode, languageOfDirection, SyllableAnnotation } from './types';

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
  drills: ['tone', 'toneRule'],
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
  drills: ['stressHear', 'stressRule'],
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
  drills: ['soundSpelling', 'spelling'],
};

const RUNTIMES: Record<LanguageCode, LanguageFeatureRuntime> = {
  th: THAI_RUNTIME,
  en: ENGLISH_RUNTIME,
  es: SPANISH_RUNTIME,
};

export function featureRuntime(language: LanguageCode): LanguageFeatureRuntime {
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
 */
export function drillsForDirectionViaFeature(direction: Direction): DrillId[] {
  if (direction.endsWith('_to_de')) return ['article', 'verbForms'];
  const language = languageOfDirection(direction);
  // Ein entschiedenes Merkmal ist noch kein gebautes. Solange
  // `implemented: false` steht, gibt es hier keine Uebung - lieber eine
  // leere Liste als eine Uebung ohne Stoff (Pflicht 5 aus Phase 15).
  if (!LANGUAGES[language].feature.implemented) return [];
  return featureRuntime(language).drills;
}

/** Ob das Merkmal dieser Sprache gebaut ist — für die Anzeige in der Auswahl. */
export function featureIsImplemented(language: LanguageCode): boolean {
  return LANGUAGES[language].feature.implemented;
}
