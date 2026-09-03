import { Direction } from '../languages/types';

/**
 * Lernrichtung. Bewusst zwei getrennte Karten pro Vokabel, nicht ein Flip.
 *
 * SEIT PHASE 15 sprachpaar-faehig (AE-42): Der Typ kommt aus
 * `lib/languages/types.ts` und deckt alle Paare mit Deutsch als Drehscheibe
 * ab. `'de_to_th'` und `'th_to_de'` bleiben woertlich gueltige Werte -
 * gespeicherte Kartenschluessel muessen deshalb NICHT angefasst werden.
 */
export type { Direction };

/**
 * Bewertung nach dem Aufdecken einer Karte.
 * 1 Nochmal · 2 Schwer · 3 Gut · 4 Leicht
 */
export type Rating = 1 | 2 | 3 | 4;

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Nochmal',
  2: 'Schwer',
  3: 'Gut',
  4: 'Leicht',
};

/** Grober Lebenszyklus einer Karte, nur für Anzeige und Statistik. */
export type CardState = 'new' | 'learning' | 'review' | 'mastered';

export type FSRSCardState = {
  vocabId: string;
  direction: Direction;
  state: CardState;
  /** 1..10; `null`, solange die Karte noch nie bewertet wurde. */
  difficulty: number | null;
  /** Gedächtnisstabilität in Tagen; `null` vor der ersten Bewertung. */
  stability: number | null;
  /** Fälligkeitszeitpunkt als Unix-Millisekunden. */
  due: number;
  /** Zeitpunkt der letzten Bewertung; `null` vor der ersten Bewertung. */
  lastReview: number | null;
  reps: number;
  lapses: number;
};

/** Zusammengesetzter Schlüssel einer Karte: eine Vokabel je Richtung. */
export function cardKey(vocabId: string, direction: Direction): string {
  return `${vocabId}:${direction}`;
}
