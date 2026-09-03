import { VocabEntry } from '@/data/vocabulary';

import { createCardState, dueCards, retrievability } from './fsrs/fsrs';
import { Direction, FSRSCardState } from './fsrs/types';
import { directionLabel, directionPrompt } from './languages/registry';
import { directionsFor } from './languages/types';
import { loadCardStatesForDirection, loadVocabulary, seedVocabulary } from './repository';
import { DataStore, getStore } from './storage';

/**
 * Zusammenstellung einer Lernsitzung.
 *
 * Die beiden Lernrichtungen werden strikt getrennt gehalten: eine Sitzung
 * fragt entweder Deutsch -> Thai oder Thai -> Deutsch ab, nie beides
 * durcheinander. Jede Vokabel hat deshalb zwei eigene Karten mit eigenem
 * FSRS-Zustand.
 */

/**
 * Die Richtungen der aktuell gewaehlten Sprache.
 *
 * Seit Phase 15 keine Konstante mehr: Welche zwei Richtungen es gibt, haengt
 * an der Sprache (AE-42). `DIRECTIONS` bleibt als Thai-Vorgabe erhalten, damit
 * bestehende Aufrufer unveraendert weiterlaufen.
 */
export const DIRECTIONS: Direction[] = directionsFor('th');

export { directionLabel, directionPrompt, directionsFor };

export type ReviewItem = {
  entry: VocabEntry;
  card: FSRSCardState;
};

/**
 * Sorgt dafür, dass zu jeder Vokabel eine Karte in dieser Richtung existiert.
 *
 * Neue Karten werden in EINEM Schreibvorgang angelegt, nicht einzeln: beim
 * allerersten Start sind das 84 Karten je Richtung, und `putMany` fasst das
 * nativ in einer Transaktion zusammen.
 */
export async function ensureCardStates(
  direction: Direction,
  store?: DataStore,
  now: number = Date.now()
): Promise<{ entries: VocabEntry[]; cards: FSRSCardState[] }> {
  const db = store ?? (await getStore());

  let entries = await loadVocabulary(db);
  if (entries.length === 0) {
    // Erster Start: Grundstock ist noch nicht im Speicher.
    await seedVocabulary(db);
    entries = await loadVocabulary(db);
  }

  const existing = await loadCardStatesForDirection(direction, db);
  const byVocabId = new Map(existing.map((card) => [card.vocabId, card]));

  const missing = entries
    .filter((entry) => !byVocabId.has(entry.id))
    .map((entry) => createCardState(entry.id, direction, now));

  if (missing.length > 0) {
    await db.putMany(
      'cards',
      missing.map((card) => ({ id: `${card.vocabId}:${card.direction}`, value: card }))
    );
    missing.forEach((card) => byVocabId.set(card.vocabId, card));
  }

  return {
    entries,
    cards: entries.map((entry) => byVocabId.get(entry.id)!),
  };
}

/**
 * Die fälligen Karten einer Richtung, am ehesten Vergessenes zuerst.
 *
 * Die Sortierung nach aufsteigender Retrievability kommt aus `dueCards` und
 * deckt beide Fälle ohne Sonderlogik ab: im Alltag stehen die schwächsten
 * Karten vorn, und nach einer längeren Pause zuerst das, was am tiefsten
 * abgesackt ist.
 */
export async function buildReviewQueue(
  direction: Direction,
  store?: DataStore,
  now: number = Date.now()
): Promise<ReviewItem[]> {
  const { entries, cards } = await ensureCardStates(direction, store, now);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  return dueCards(cards, now)
    .map((card) => {
      const entry = byId.get(card.vocabId);
      return entry ? { entry, card } : null;
    })
    .filter((item): item is ReviewItem => item !== null);
}

export type DirectionSummary = {
  direction: Direction;
  due: number;
  total: number;
  /** Karten, die noch nie bewertet wurden. */
  fresh: number;
  /** Stabilität über 21 Tage. */
  mastered: number;
};

/** Kennzahlen je Richtung — das Dashboard zeigt sie bewusst getrennt. */
export async function summarizeDirection(
  direction: Direction,
  store?: DataStore,
  now: number = Date.now()
): Promise<DirectionSummary> {
  const { cards } = await ensureCardStates(direction, store, now);
  return {
    direction,
    due: dueCards(cards, now).length,
    total: cards.length,
    fresh: cards.filter((card) => card.state === 'new').length,
    mastered: cards.filter((card) => card.state === 'mastered').length,
  };
}

export async function summarizeAllDirections(
  store?: DataStore,
  now: number = Date.now()
): Promise<DirectionSummary[]> {
  const summaries: DirectionSummary[] = [];
  for (const direction of DIRECTIONS) {
    summaries.push(await summarizeDirection(direction, store, now));
  }
  return summaries;
}

/** Nur für Anzeige: wie gut die Karte gerade sitzt, in Prozent. */
export function retrievabilityPercent(card: FSRSCardState, now: number = Date.now()): number {
  return Math.round(retrievability(card, now) * 100);
}
