import { Direction } from '../fsrs/types';
import { directionsFor, LanguageCode } from '../languages/types';

import { Level, LEVELS, situationId, SituationSpec, TopicId, TOPICS } from './types';

/**
 * Der Bauplan eines Laufs.
 *
 * Die Liste steht **vor** dem ersten Netzwerkaufruf fest und ist
 * deterministisch: dieselben Eingaben ergeben dieselben IDs. Genau das macht
 * einen abgebrochenen Lauf fortsetzbar — beim Neustart wird geprüft, welche
 * IDs schon im Speicher liegen, und nur der Rest angefragt.
 */

/**
 * Sprachen, fuer die es einen geprueften Aufgabentext gibt.
 *
 * PHASE 16, PFLICHT 4 - EHRLICH STATT STILL: Der Plan ist sprachparametrisiert,
 * der **Aufgabentext an die KI** ist es nicht. Er verlangt ausdruecklich
 * Paiboon-Umschrift und den konsequenten Gebrauch der thailaendischen
 * Hoeflichkeitspartikel ครับ/ค่ะ (siehe `generator.ts`). Fuer Spanisch oder
 * Englisch braucht es einen eigenen Text mit eigener Recherche - welche
 * Anredeformen dort verbindlich sind, ist eine Frage wie die in Phase 7 und
 * keine Uebersetzungsaufgabe. Bis dahin lehnt der Plan andere Sprachen ab,
 * statt thailaendische Vorgaben unter spanischer Flagge zu erzeugen.
 */
export const SITUATION_LANGUAGES: readonly LanguageCode[] = ['th'];

export type PlanOptions = {
  /** Fuer welche Sprache geplant wird. Ohne Angabe Thai. */
  language?: LanguageCode;
  topics?: readonly TopicId[];
  levels?: readonly Level[];
  directions?: readonly Direction[];
  /** Wie viele Varianten je Kombination aus Thema, Niveau und Richtung. */
  variantsPerCombo?: number;
};

/** Ein kleiner Probelauf: alle Kombinationen einmal — 16 Situationen. */
export const TEST_RUN: PlanOptions = { variantsPerCombo: 1 };

/**
 * Der große Lauf, den der Nutzer später selbst startet: 4 Themen × 2 Niveaus
 * × 2 Richtungen × 32 Varianten = 512 Situationen.
 */
export const FULL_RUN: PlanOptions = { variantsPerCombo: 32 };

export function planSituations(options: PlanOptions = {}): SituationSpec[] {
  const language = options.language ?? 'th';
  if (!SITUATION_LANGUAGES.includes(language)) {
    throw new Error(
      `Fuer "${language}" gibt es noch keinen geprueften Aufgabentext fuer ` +
        'Sprachsituationen (siehe SITUATION_LANGUAGES).'
    );
  }
  const topics = options.topics ?? TOPICS.map((t) => t.id);
  const levels = options.levels ?? LEVELS;
  const directions = options.directions ?? directionsFor(language);
  const variants = Math.max(1, options.variantsPerCombo ?? 1);

  const specs: SituationSpec[] = [];
  // Reihenfolge: erst die Varianten der äußeren Schleifen durchmischen, damit
  // ein abgebrochener Lauf trotzdem schon alle Themen abgedeckt hat statt nur
  // 200 Varianten des ersten.
  for (let variant = 1; variant <= variants; variant++) {
    for (const topic of topics) {
      for (const level of levels) {
        for (const direction of directions) {
          specs.push({
            id: situationId(topic, level, direction, variant),
            topic,
            level,
            direction,
            variant,
          });
        }
      }
    }
  }
  return specs;
}
