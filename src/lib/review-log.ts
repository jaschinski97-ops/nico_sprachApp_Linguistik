import { Direction, Rating } from './fsrs/types';
import { DataStore, getStore } from './storage';

/**
 * Wiederholungs-Protokoll je Kalendertag.
 *
 * WARUM ES DAS GIBT: `FSRSCardState` hält nur `lastReview` — den *letzten*
 * Zeitpunkt je Karte. Daraus lässt sich keine Historie rekonstruieren: wer
 * eine Karte heute zum zehnten Mal wiederholt, überschreibt jede Spur der
 * neun vorherigen Male. Eine Statistik „Wiederholungen pro Tag" aus
 * `lastReview` wäre also keine Historie, sondern nur eine Momentaufnahme
 * („wann wurde welche Karte zuletzt angefasst").
 *
 * WAS HIER GESPEICHERT WIRD: ein Dokument **je Tag**, nicht je Ereignis.
 * Das hält den Speicher beschränkt (365 Dokumente im Jahr statt beliebig
 * vieler Ereignisse) und reicht für die gewünschte Auswertung genau aus.
 * Einzelne Ereignisse mit Zeitstempel gehen dabei verloren — für eine
 * Auswertung nach Tagen ist das kein Verlust.
 *
 * EINSCHRÄNKUNG, die im UI benannt werden muss: Die Historie beginnt an dem
 * Tag, an dem dieses Protokoll eingeführt wurde. Wiederholungen aus früheren
 * Sitzungen tauchen darin nicht auf, weil sie nie festgehalten wurden. Siehe
 * AE-9 in PROGRESS.md.
 */

export type ReviewDayLog = {
  /** Kalendertag in lokaler Zeit, `YYYY-MM-DD`. */
  date: string;
  total: number;
  byDirection: Record<Direction, number>;
  /** Schlüssel sind die Bewertungen 1..4 als Zeichenkette. */
  byRating: Record<string, number>;
};

/**
 * Tagesschlüssel in **lokaler** Zeit.
 *
 * Bewusst nicht UTC: „heute" soll der Tag des Lernenden sein. Mit
 * `toISOString()` läge der Tageswechsel je nach Zeitzone mitten am Abend —
 * in Thailand (UTC+7) wäre eine Wiederholung um 1 Uhr nachts noch dem
 * Vortag zugeschlagen worden.
 */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function emptyDay(date: string): ReviewDayLog {
  return {
    date,
    total: 0,
    byDirection: { de_to_th: 0, th_to_de: 0 },
    byRating: { '1': 0, '2': 0, '3': 0, '4': 0 },
  };
}

/** Zählt eine Wiederholung im Tagesdokument mit. */
export async function recordReview(
  direction: Direction,
  rating: Rating,
  at: number,
  store?: DataStore
): Promise<ReviewDayLog> {
  const db = store ?? (await getStore());
  const date = dayKey(at);

  const existing = await db.get<ReviewDayLog>('reviewLog', date);
  const entry = existing ?? emptyDay(date);

  entry.total += 1;
  entry.byDirection[direction] = (entry.byDirection[direction] ?? 0) + 1;
  entry.byRating[String(rating)] = (entry.byRating[String(rating)] ?? 0) + 1;

  await db.put('reviewLog', date, entry);
  return entry;
}

export async function loadReviewLog(store?: DataStore): Promise<ReviewDayLog[]> {
  const db = store ?? (await getStore());
  const entries = await db.getAll<ReviewDayLog>('reviewLog');
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Die letzten `days` Kalendertage bis einschließlich heute, Tage ohne
 * Wiederholung als Null-Einträge aufgefüllt — sonst würde ein Balkendiagramm
 * Lücken einfach zusammenschieben und eine Lernserie vortäuschen, die es
 * nicht gab.
 */
export function lastDays(
  log: ReviewDayLog[],
  days: number,
  now: number = Date.now()
): ReviewDayLog[] {
  const byDate = new Map(log.map((entry) => [entry.date, entry]));
  const out: ReviewDayLog[] = [];

  for (let offset = days - 1; offset >= 0; offset--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offset);
    const key = dayKey(d.getTime());
    out.push(byDate.get(key) ?? emptyDay(key));
  }
  return out;
}
