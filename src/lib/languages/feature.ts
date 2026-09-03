import { Tone } from '@/constants/tones';
import { VocabEntry } from '@/data/vocabulary';

import { DrillId } from '../drills/types';

import { LANGUAGES } from './registry';
import { Direction, LanguageCode, languageOfDirection } from './types';

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

/** Eine Silbe mit dem, was das Merkmal über sie sagt. */
export type SyllableAnnotation = {
  /** Die Silbe in Umschrift bzw. Lautschrift. */
  roman: string;
  /**
   * Die Auszeichnung. Bei Thai der Ton — er wird zur Farbe und zur
   * Konturglyphe. Sprachen ohne tonale Auszeichnung lassen das Feld weg.
   */
  tone?: Tone;
};

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
 * Sprachen ohne gebautes Merkmal.
 *
 * Sie zerfallen in genau eine Silbe ohne Auszeichnung und bringen keine
 * eigenen Übungen mit — was ehrlich ist, solange ihr Merkmal nur entschieden
 * und nicht implementiert ist (AE-44).
 */
const PLAIN_RUNTIME: LanguageFeatureRuntime = {
  annotate: (entry) => [{ roman: entry.romanization || entry.term }],
  drills: [],
};

const RUNTIMES: Record<LanguageCode, LanguageFeatureRuntime> = {
  th: THAI_RUNTIME,
  en: PLAIN_RUNTIME,
  es: PLAIN_RUNTIME,
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
  return featureRuntime(languageOfDirection(direction)).drills;
}

/** Ob das Merkmal dieser Sprache gebaut ist — für die Anzeige in der Auswahl. */
export function featureIsImplemented(language: LanguageCode): boolean {
  return LANGUAGES[language].feature.implemented;
}
