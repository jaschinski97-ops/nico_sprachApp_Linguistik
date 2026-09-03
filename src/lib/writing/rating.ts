import { Rating } from '../fsrs/types';

import { WritingVerdict } from './compare';

/**
 * Vom Ergebnis der freien Eingabe zur FSRS-Bewertung (Phase 14, Pflicht 4).
 *
 * ERSTMALS SPEIST EIN ÜBUNGSTYP FSRS — und zwar genau der, den AE-16 dafür
 * vorgesehen hat. Dort steht wörtlich, der saubere Weg wäre „ein Aufgabentyp
 * mit **freier Eingabe** statt Auswahl (Wort tippen, Artikel schreiben). Dann
 * gäbe es kein Rateproblem, und die Antwort wäre ein echter Abruf." Genau das
 * ist hier gebaut. AE-16 und AE-35 bleiben gültig: die **Auswahl**-Übungen
 * und die Sprechmessung schreiben weiterhin nichts.
 *
 * DIE ABBILDUNG, und warum sie so und nicht anders ist:
 *
 * | Ergebnis                        | Bewertung   | Warum |
 * | ------------------------------- | ----------- | ----- |
 * | genau richtig                   | 3 Gut       | Der Abruf ist gelungen. |
 * | richtig, mit toleriertem Fehler | 2 Schwer    | Abgerufen, aber nicht sicher. |
 * | falsch                          | 1 Nochmal   | Kein Abruf. |
 * | —                               | 4 Leicht    | **wird nie vergeben.** |
 *
 * **Warum „Leicht" nie vergeben wird.** Die Skala misst nicht Richtigkeit,
 * sondern **Mühe**: „Leicht" heißt „kam sofort und ohne Anstrengung". Eine
 * getippte Antwort sagt darüber nichts — sie ist richtig oder nicht, aber ob
 * die Person zehn Sekunden gegrübelt hat, steht nicht darin. Eine Antwortzeit
 * zu messen wäre die naheliegende Krücke und wäre falsch: Tippen auf einem
 * Handy dauert länger als auf einer Tastatur, und die Zeichenpalette (AE-39)
 * dauert noch einmal länger. Ein automatisches „Leicht" würde also die
 * Intervalle bei genau den Lernenden strecken, die am langsamsten tippen.
 * Lieber eine Stufe ungenutzt lassen als sie falsch vergeben.
 *
 * **Warum ein Tippfehler „Schwer" ist und nicht „Gut".** Die Frage stellt
 * Pflicht 4 ausdrücklich. „Gut" würde das Intervall genauso strecken wie eine
 * fehlerfreie Antwort; dann wäre die Toleranz aus `compare.ts` nicht mehr
 * Nachsicht, sondern eine stille Gleichsetzung von sicher und unsicher. „Schwer"
 * lässt die Karte wiederkommen, nur eben nicht von vorn. Das entspricht dem,
 * was die Stufe bedeutet: abgerufen, aber mühsam.
 *
 * **Warum ein Lernzielfehler nicht härter zählt als ein anderer Fehler.**
 * Ein fehlender Artikel und ein völlig anderes Wort ergeben beide „Nochmal".
 * Eine fünfte Stufe „noch mehr nochmal" gibt es in FSRS nicht, und die
 * Unterscheidung gehört in die **Rückmeldung** (die sie benennt), nicht in
 * den Wiederholungsplan.
 */

export const WRITING_RATING = {
  exact: 3,
  typo: 2,
  wrong: 1,
} as const;

export function ratingForVerdict(verdict: WritingVerdict): Rating {
  if (!verdict.correct) return WRITING_RATING.wrong;
  return verdict.exact ? WRITING_RATING.exact : WRITING_RATING.typo;
}

/**
 * Ein Satz für die Oberfläche, der sagt, was die Bewertung mit der Karte
 * macht. Lernende sollen nicht raten müssen, warum eine Vokabel wiederkommt.
 */
export function ratingExplanation(rating: Rating): string {
  switch (rating) {
    case 1:
      return 'Die Vokabel kommt bald wieder.';
    case 2:
      return 'Zählt als richtig, aber unsicher — die Vokabel kommt früher wieder als bei einer fehlerfreien Antwort.';
    default:
      return 'Der Abstand bis zur nächsten Wiederholung wächst.';
  }
}
