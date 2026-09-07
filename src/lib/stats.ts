import { CardState } from './fsrs/types';
import { dayIsActive, drillCount, lastDays, loadReviewLog, ReviewDayLog } from './review-log';
import { DirectionSummary, ensureCardStates, summarizeAllDirections } from './review-session';
import { LanguageCode } from './languages/types';
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

/**
 * Eigenes Fenster für die Lernserie, unabhängig vom Diagrammfenster.
 *
 * `days` zeigt dem Nutzer die letzten Tage als Balken — aber die SERIE darf
 * nicht an derselben 14-Tage-Grenze gekappt werden: Wer fünf Wochen durchhält,
 * hätte sonst ab Tag 15 partout „14" gelesen. 365 statt unbegrenzt, weil das
 * Fenster mit leeren Tagen aufgefüllt wird und eine Lernserie über ein Jahr
 * hinaus ohnehin keine realistische Anforderung an diese App ist.
 */
const STREAK_WINDOW_DAYS = 365;

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
  /** Aufeinanderfolgende Tage bis heute, an denen gelernt ODER geübt wurde. */
  streak: number;
  /** Beantwortete Übungsaufgaben heute (Phase 6) — getrennt von `reviewsToday`. */
  drillsToday: number;
  /** Alle jemals protokollierten Übungsaufgaben. */
  totalDrills: number;
  /** Davon richtig beantwortet. */
  totalDrillsCorrect: number;
};

function emptyStateCounts(): Record<CardState, number> {
  return { new: 0, learning: 0, review: 0, mastered: 0 };
}

/**
 * Zählt die Tage in Folge bis **heute**, an denen gelernt wurde.
 *
 * Ein heute noch leerer Tag beendet die Serie nicht — sonst stünde jeden
 * Morgen „0", obwohl gestern gelernt wurde.
 *
 * Übungen zählen mit (`dayIsActive`), obwohl sie bewusst nicht durch FSRS
 * laufen (AE-16): Wer einen Abend lang Töne gehört hat, hat gelernt. Die
 * Serie über eine Rechenentscheidung zur Wiederholungsplanung zerbrechen zu
 * lassen, wäre für die lernende Person schlicht nicht nachvollziehbar.
 */
export function computeStreak(days: ReviewDayLog[]): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (dayIsActive(days[i])) {
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
  windowDays = 14,
  /**
   * Welche Sprache ausgewertet wird (Phase 16). Der Fortschritt gehoert zum
   * Sprachpaar; eine Summe ueber alle drei waere eine Zahl ohne Bedeutung.
   */
  language: LanguageCode = 'th'
): Promise<LearningStats> {
  const db = store ?? (await getStore());

  const perDirection = await summarizeAllDirections(language, db, now);

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
  // max, damit ein künftig größer gewähltes Diagrammfenster die Serie nicht
  // hinter dem Streak-Fenster zurücklässt.
  const streakDays = lastDays(log, Math.max(windowDays, STREAK_WINDOW_DAYS), now);
  const todayKey = days[days.length - 1]?.date;
  const today = log.find((entry) => entry.date === todayKey);

  return {
    perDirection,
    cardStates,
    totalCards,
    totalDue: perDirection.reduce((sum, s) => sum + s.due, 0),
    days,
    totalReviews: log.reduce((sum, entry) => sum + entry.total, 0),
    reviewsToday: today?.total ?? 0,
    loggedSince: log.length > 0 ? log[0].date : null,
    streak: computeStreak(streakDays),
    drillsToday: today ? drillCount(today) : 0,
    totalDrills: log.reduce((sum, entry) => sum + drillCount(entry), 0),
    totalDrillsCorrect: log.reduce((sum, entry) => sum + (entry.drillsCorrect ?? 0), 0),
  };
}
