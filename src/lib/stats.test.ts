// PHASE 16: `VOCABULARY` umfasst jetzt alle drei Sprachen. Was diese Datei
// zusichert, gilt dem Thai-Grundstock aus Phase 2 - deshalb hier
// ausdruecklich der. Unterhalb dieser Zeile hat sich nichts geaendert.
import { VOCABULARY_TH as VOCABULARY } from '@/data/vocabulary';

import { DAY_MS } from './fsrs/fsrs';
import { loadCardStatesForDirection, rateCard } from './repository';
import { dayKey, lastDays, loadReviewLog, recordReview } from './review-log';
import { ensureCardStates } from './review-session';
import { computeStreak, loadLearningStats } from './stats';
import { DataStore, MemoryDataStore } from './storage';

/** Mittags gewaehlt, damit lokale Zeitzonen den Tag nicht kippen. */
const T0 = new Date(2026, 7, 30, 12, 0, 0).getTime();

async function freshStore(): Promise<DataStore> {
  const store = new MemoryDataStore();
  await store.init();
  return store;
}

describe('dayKey', () => {
  it('bildet den lokalen Kalendertag ab, nicht UTC', () => {
    // 23:30 Ortszeit gehoert zum laufenden Tag - mit UTC waere es je nach
    // Zeitzone schon der naechste.
    const late = new Date(2026, 7, 30, 23, 30, 0).getTime();
    expect(dayKey(late)).toBe('2026-08-30');
  });

  it('fuellt Monat und Tag auf zwei Stellen auf', () => {
    expect(dayKey(new Date(2026, 0, 5, 9, 0, 0).getTime())).toBe('2026-01-05');
  });
});

describe('recordReview', () => {
  it('legt fuer den ersten Eintrag des Tages ein Dokument an', async () => {
    const store = await freshStore();
    const entry = await recordReview('th_to_de', 3, T0, store);

    expect(entry.date).toBe('2026-08-30');
    expect(entry.total).toBe(1);
    expect(entry.byDirection.th_to_de).toBe(1);
    expect(entry.byDirection.de_to_th).toBe(0);
    expect(entry.byRating['3']).toBe(1);
  });

  it('zaehlt weitere Wiederholungen desselben Tages hoch', async () => {
    const store = await freshStore();
    await recordReview('th_to_de', 3, T0, store);
    await recordReview('th_to_de', 1, T0 + 60_000, store);
    const entry = await recordReview('de_to_th', 4, T0 + 120_000, store);

    expect(entry.total).toBe(3);
    expect(entry.byDirection).toEqual({ th_to_de: 2, de_to_th: 1 });
    expect(entry.byRating).toEqual({ '1': 1, '2': 0, '3': 1, '4': 1 });
  });

  it('trennt verschiedene Tage', async () => {
    const store = await freshStore();
    await recordReview('th_to_de', 3, T0, store);
    await recordReview('th_to_de', 3, T0 + DAY_MS, store);

    const log = await loadReviewLog(store);
    expect(log).toHaveLength(2);
    expect(log.map((e) => e.date)).toEqual(['2026-08-30', '2026-08-31']);
  });

  it('gibt das Protokoll nach Datum sortiert zurueck', async () => {
    const store = await freshStore();
    await recordReview('th_to_de', 3, T0 + 2 * DAY_MS, store);
    await recordReview('th_to_de', 3, T0, store);
    await recordReview('th_to_de', 3, T0 + DAY_MS, store);

    const log = await loadReviewLog(store);
    expect(log.map((e) => e.date)).toEqual(['2026-08-30', '2026-08-31', '2026-09-01']);
  });
});

describe('lastDays', () => {
  it('fuellt Tage ohne Wiederholung mit Nullen auf', async () => {
    const store = await freshStore();
    await recordReview('th_to_de', 3, T0 - 3 * DAY_MS, store);
    await recordReview('th_to_de', 3, T0, store);

    const days = lastDays(await loadReviewLog(store), 5, T0);

    expect(days).toHaveLength(5);
    // Fenster: T0-4 .. T0. Wiederholungen liegen auf T0-3 und T0.
    expect(days.map((d) => d.total)).toEqual([0, 1, 0, 0, 1]);
    // Luecken duerfen nicht zusammengeschoben werden - sonst taeuscht das
    // Diagramm eine durchgehende Lernserie vor.
    expect(days[days.length - 1].date).toBe(dayKey(T0));
  });

  it('endet immer beim heutigen Tag', () => {
    const days = lastDays([], 7, T0);
    expect(days).toHaveLength(7);
    expect(days[6].date).toBe('2026-08-30');
    expect(days[0].date).toBe('2026-08-24');
  });
});

describe('computeStreak', () => {
  it('zaehlt aufeinanderfolgende Lerntage bis heute', () => {
    const days = lastDays([], 5, T0).map((d, i) => ({ ...d, total: i >= 2 ? 4 : 0 }));
    expect(computeStreak(days)).toBe(3);
  });

  it('bricht die Serie nicht ab, nur weil heute noch nichts gelernt wurde', () => {
    // Sonst stuende jeden Morgen 0, obwohl gestern gelernt wurde.
    const days = lastDays([], 4, T0).map((d, i) => ({ ...d, total: i === 3 ? 0 : 5 }));
    expect(computeStreak(days)).toBe(3);
  });

  it('ist 0, wenn gar nichts protokolliert ist', () => {
    expect(computeStreak(lastDays([], 7, T0))).toBe(0);
  });

  it('zaehlt nur bis zur ersten echten Luecke', () => {
    const days = lastDays([], 6, T0).map((d, i) => ({ ...d, total: i === 2 ? 0 : 3 }));
    // Tage 3,4,5 haben Wiederholungen -> Serie 3, Tag 2 bricht sie ab.
    expect(computeStreak(days)).toBe(3);
  });
});

describe('rateCard schreibt das Tagesprotokoll fort', () => {
  it('protokolliert jede Bewertung', async () => {
    const store = await freshStore();
    await ensureCardStates('th_to_de', store, T0);
    const cards = await loadCardStatesForDirection('th_to_de', store);

    await rateCard(cards[0], 3, store, T0);
    await rateCard(cards[1], 1, store, T0);

    const log = await loadReviewLog(store);
    expect(log).toHaveLength(1);
    expect(log[0].total).toBe(2);
    expect(log[0].byRating['3']).toBe(1);
    expect(log[0].byRating['1']).toBe(1);
  });

  it('haelt fest, welche Richtung geuebt wurde', async () => {
    const store = await freshStore();
    await ensureCardStates('th_to_de', store, T0);
    await ensureCardStates('de_to_th', store, T0);

    const th = await loadCardStatesForDirection('th_to_de', store);
    const de = await loadCardStatesForDirection('de_to_th', store);
    await rateCard(th[0], 3, store, T0);
    await rateCard(de[0], 3, store, T0);
    await rateCard(de[1], 3, store, T0);

    const log = await loadReviewLog(store);
    expect(log[0].byDirection).toEqual({ th_to_de: 1, de_to_th: 2 });
  });
});

describe('loadLearningStats', () => {
  it('zaehlt zu Beginn alles als neu und faellig', async () => {
    const store = await freshStore();
    const stats = await loadLearningStats(store, T0);

    expect(stats.totalCards).toBe(VOCABULARY.length * 2);
    expect(stats.cardStates.new).toBe(VOCABULARY.length * 2);
    expect(stats.cardStates.mastered).toBe(0);
    expect(stats.totalDue).toBe(VOCABULARY.length * 2);
    expect(stats.perDirection).toHaveLength(2);
  });

  it('meldet ehrlich, dass noch keine Historie existiert', async () => {
    const store = await freshStore();
    const stats = await loadLearningStats(store, T0);

    expect(stats.loggedSince).toBeNull();
    expect(stats.totalReviews).toBe(0);
    expect(stats.reviewsToday).toBe(0);
  });

  it('nennt den ersten protokollierten Tag, sobald es einen gibt', async () => {
    const store = await freshStore();
    await ensureCardStates('th_to_de', store, T0);
    const cards = await loadCardStatesForDirection('th_to_de', store);

    await rateCard(cards[0], 3, store, T0 - DAY_MS);
    await rateCard(cards[1], 3, store, T0);

    const stats = await loadLearningStats(store, T0);
    expect(stats.loggedSince).toBe(dayKey(T0 - DAY_MS));
    expect(stats.totalReviews).toBe(2);
    expect(stats.reviewsToday).toBe(1);
  });

  it('verschiebt bewertete Karten aus dem Zustand neu heraus', async () => {
    const store = await freshStore();
    await ensureCardStates('th_to_de', store, T0);
    const cards = await loadCardStatesForDirection('th_to_de', store);

    await rateCard(cards[0], 3, store, T0);
    await rateCard(cards[1], 1, store, T0);

    const stats = await loadLearningStats(store, T0);
    expect(stats.cardStates.new).toBe(VOCABULARY.length * 2 - 2);
    expect(stats.cardStates.review).toBe(1);
    expect(stats.cardStates.learning).toBe(1);
  });

  it('liefert genau so viele Tage wie angefragt', async () => {
    const store = await freshStore();
    const stats = await loadLearningStats(store, T0, 7);
    expect(stats.days).toHaveLength(7);
  });
});
