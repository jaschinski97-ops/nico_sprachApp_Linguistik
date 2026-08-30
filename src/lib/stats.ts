import { CardState } from './fsrs/types';
import { lastDays, loadReviewLog, ReviewDayLog } from './review-log';
import { DirectionSummary, ensureCardStates, summarizeAllDirections } from './review-session';
import { DataStore, getStore } from './storage';

/**
 * Kennzahlen für den Fortschritts-Screen.
 *
 * Zwei Datenquellen mit unterschiedlicher Aussagekraft:
 *
 * - **Kartenzustände und Fälligkeiten** kommen aus `FSRSCardState` und sind
 *   vollständig: jede Karte trägt ihren aktuellen Zustand.
 * - **Wiederholungen pro Tag** kommen aus dem Tagesprotokoll und reichen nur
 *   so weit zurück, wie dieses Protokoll existiert (siehe `loggedSince` und
 *   AE-9). Das ist keine Schwäche der Auswertung, sondern eine Tatsache über
 *   die Daten — und der Screen sagt es dem Nutzer.
 */

export const CARD_STATE_LABELS: Record<CardState, string> = {
  new: 'Neu',
  learning: 'Am Lernen',
  review: 'Etabliert',
  mastered: 'Gemeistert',
};

export const CARD_STATE_ORDER: CardState[] = ['new', 'learning', 'review', 'mastered'];

export type LearningStats = {
  perDirection: DirectionSummary[];
  /** Kartenzustände über beide Richtungen zusammen. */
  cardStates: Record<CardState, number>;
  totalCards: number;
  totalDue: number;
  /** Die letzten Tage, Lücken mit Nullen gefüllt. */
  days: ReviewDayLog[];
  /** Alle jemals protokollierten Wiederholungen. */
  totalReviews: number;
  /** Wiederholungen heute. */
  reviewsToday: number;
  /**
   * Erster protokollierte Tag, oder `null`, wenn noch nichts protokolliert
   * wurde. Vor diesem Tag gibt es keine Historie — siehe AE-9.
   */
  loggedSince: string | null;
  /** Aufeinanderfolgende Tage bis heute mit mindestens einer Wiederholung. */
  streak: number;
};

function emptyStateCounts(): Record<CardState, number> {
  return { new: 0, learning: 0, review: 0, mastered: 0 };
}

/**
 * Zählt die Tage in Folge bis **heute**, an denen gelernt wurde.
 *
 * Ein heute noch leerer Tag beendet die Serie nicht — sonst stünde jeden
 * Morgen „0", obwohl gestern gelernt wurde.
 */
export function computeStreak(days: ReviewDayLog[]): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].total > 0) {
      streak++;
    } else if (i === days.length - 1) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export async function loadLearningStats(
  store?: DataStore,
  now: number = Date.now(),
  windowDays = 14
): Promise<LearningStats> {
  const db = store ?? (await getStore());

  const perDirection = await summarizeAllDirections(db, now);

  const cardStates = emptyStateCounts();
  let totalCards = 0;
  for (const summary of perDirection) {
    const { cards } = await ensureCardStates(summary.direction, db, now);
    totalCards += cards.length;
    for (const card of cards) {
      cardStates[card.state] += 1;
    }
  }

  const log = await loadReviewLog(db);
  const days = lastDays(log, windowDays, now);
  const todayKey = days[days.length - 1]?.date;

  return {
    perDirection,
    cardStates,
    totalCards,
    totalDue: perDirection.reduce((sum, s) => sum + s.due, 0),
    days,
    totalReviews: log.reduce((sum, entry) => sum + entry.total, 0),
    reviewsToday: log.find((entry) => entry.date === todayKey)?.total ?? 0,
    loggedSince: log.length > 0 ? log[0].date : null,
    streak: computeStreak(days),
  };
}
