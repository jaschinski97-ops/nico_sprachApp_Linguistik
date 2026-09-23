// PHASE 16: `VOCABULARY` umfasst jetzt alle drei Sprachen. Was diese Datei
// zusichert, gilt dem Thai-Grundstock aus Phase 2 - deshalb hier
// ausdruecklich der. Unterhalb dieser Zeile hat sich nichts geaendert.
import { VOCABULARY_TH as VOCABULARY } from '@/test-fixtures/legacy-vocabulary';

import { DAY_MS, NEW_CARDS_PER_SESSION } from './fsrs/fsrs';
import { loadCardStatesForDirection, rateCard } from './repository';
import { dayKey, lastDays, loadReviewLog, recordDrill, recordReview } from './review-log';
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

  it('verliert keine Wiederholung, wenn Antworten schnell parallel ankommen', async () => {
    // Der Code-Review 2026-09-07 hatte Lesen-Ändern-Schreiben ohne
    // Serialisierung gefunden: alle Aufrufe lasen denselben leeren
    // Tageszaehler, und am Ende haette "1" statt "20" gezaehlt.
    const store = await freshStore();
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        recordReview(i % 2 === 0 ? 'th_to_de' : 'de_to_th', ((i % 4) + 1) as 1 | 2 | 3 | 4, T0, store)
      )
    );

    const log = await loadReviewLog(store);
    expect(log).toHaveLength(1);
    expect(log[0].total).toBe(20);
    expect(log[0].byDirection).toEqual({ th_to_de: 10, de_to_th: 10 });
    expect(Object.values(log[0].byRating).reduce((sum, n) => sum + n, 0)).toBe(20);
  });

  it('zaehlt auch parallele uebungsaufgaben voll mit', async () => {
    // Dieselbe Lesen-Aendern-Schreiben-Luecke wie bei recordReview.
    const store = await freshStore();
    await Promise.all(
      Array.from({ length: 12 }, (_, i) => recordDrill(i % 3 !== 0, T0, store))
    );

    const log = await loadReviewLog(store);
    expect(log).toHaveLength(1);
    expect(log[0].drills).toBe(12);
    // i % 3 !== 0: 8 von 12 richtig.
    expect(log[0].drillsCorrect).toBe(8);
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
  it('trennt Deutsch als Lernziel vom Thai-Ziel, ohne bestehende Karten zu ändern', async () => {
    const store = await freshStore();
    const { cards } = await ensureCardStates('th_to_de', store, T0);
    await rateCard(cards[0], 3, store, T0);
    await recordDrill(true, T0, store);

    const german = await loadLearningStats(store, T0, 14, 'th_to_de');
    const thai = await loadLearningStats(store, T0, 14, 'de_to_th');
    expect(german.perDirection.map(s => s.direction)).toEqual(['th_to_de']);
    expect(german.totalCards - german.cardStates.new).toBe(1);
    expect(thai.totalCards - thai.cardStates.new).toBe(0);
    // Die sprachübergreifende Aktivität bleibt oberhalb der Zielauswahl.
    expect(german.reviewsToday).toBe(1);
    expect(thai.reviewsToday).toBe(1);
    expect(german.drillsToday).toBe(1);
    expect(thai.days).toEqual(german.days);
    const retained = await loadCardStatesForDirection('th_to_de', store);
    expect(retained.find(card => card.vocabId === cards[0].vocabId)?.state).toBe('review');
  });

  it('wertet eine englische Brücke zum Spanisch-Ziel als eigene Richtung aus', async () => {
    const store = await freshStore();
    const { cards } = await ensureCardStates('en_to_es', store, T0);
    expect(cards.length).toBeGreaterThan(0);
    await rateCard(cards[0], 3, store, T0);
    const stats = await loadLearningStats(store, T0, 14, 'en_to_es');
    expect(stats.perDirection.map(s => s.direction)).toEqual(['en_to_es']);
    expect(stats.totalCards).toBe(cards.length);
    expect(stats.totalCards - stats.cardStates.new).toBe(1);
  });

  it('zaehlt zu Beginn alles als neu, die Faelligkeit aber nur bis zum Sitzungsdeckel', async () => {
    const store = await freshStore();
    const stats = await loadLearningStats(store, T0);

    // Thai hat seit dem Sprach-Umbau genau EINE Inhalts-Richtung (de_to_th);
    // th_to_de ist das Deutsch-Ziel und zählt nicht mehr zu Thai.
    expect(stats.totalCards).toBe(VOCABULARY.length);
    expect(stats.cardStates.new).toBe(VOCABULARY.length);
    expect(stats.cardStates.mastered).toBe(0);
    // Neue Karten zaehlen zur Faelligkeit nur bis NEW_CARDS_PER_SESSION je
    // Richtung — sonst wuerde die Zahl eine Sitzung versprechen, die die
    // Zusammenstellung (siehe dueCards) gar nicht mehr liefert.
    expect(stats.totalDue).toBe(NEW_CARDS_PER_SESSION);
    expect(stats.perDirection).toHaveLength(1);
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
    await ensureCardStates('de_to_th', store, T0);
    const cards = await loadCardStatesForDirection('de_to_th', store);

    await rateCard(cards[0], 3, store, T0);
    await rateCard(cards[1], 1, store, T0);

    const stats = await loadLearningStats(store, T0);
    expect(stats.cardStates.new).toBe(VOCABULARY.length - 2);
    expect(stats.cardStates.review).toBe(1);
    expect(stats.cardStates.learning).toBe(1);
  });

  it('liefert genau so viele Tage wie angefragt', async () => {
    const store = await freshStore();
    const stats = await loadLearningStats(store, T0, 7);
    expect(stats.days).toHaveLength(7);
  });

  it('kappt eine laenger als zwei Wochen laufende Lernserie nicht mehr bei 14', async () => {
    // Vor dem Streak-Fenster von 365 Tagen lief computeStreak ueber dasselbe
    // 14-Tage-Fenster wie das Balkendiagramm — eine fuenfwoechige Serie
    // haette ab Tag 15 einfach "14" gesagt.
    const store = await freshStore();
    for (let tag = 0; tag < 30; tag++) {
      await recordReview('th_to_de', 3, T0 - tag * DAY_MS, store);
    }

    const stats = await loadLearningStats(store, T0);
    expect(stats.streak).toBe(30);
    // Das Diagrammfenster bleibt davon unberuehrt.
    expect(stats.days).toHaveLength(14);
  });
});

describe('Fortschritt je Lernziel (Sprach-Umbau 23.09.2026)', () => {
  it('ordnet Übungen ihrem Lernziel zu und nennt die schwächste Übung zuerst', async () => {
    const store = await freshStore();
    // Thai auf deutscher Oberfläche: Töne 1 von 3, Diktat 3 von 3.
    for (const richtig of [true, false, false]) await recordDrill(richtig, T0, store, 'tone', 'de_to_th');
    for (let i = 0; i < 3; i++) await recordDrill(true, T0, store, 'dictation', 'de_to_th');
    // Anderes Lernziel und zu kleine Stichprobe zählen nicht mit.
    for (let i = 0; i < 5; i++) await recordDrill(false, T0, store, 'tone', 'en_to_th');
    await recordDrill(false, T0, store, 'toneRule', 'de_to_th');

    const stats = await loadLearningStats(store, T0, 14, 'de_to_th');
    expect(stats.weakAreas.map((area) => [area.art, area.correct, area.total])).toEqual([
      ['tone', 1, 3],
      ['dictation', 3, 3],
    ]);
    expect(stats.directionWindow).toEqual({ total: 7, correct: 4 });
    // Die Tageszahl bleibt sprachübergreifend.
    expect(stats.accuracyToday).toEqual({ total: 12, correct: 4 });
  });

  it('zeigt die Fälligkeiten der nächsten sieben Tage — Überfälliges zählt zu heute, Neues nicht', async () => {
    const store = await freshStore();
    await ensureCardStates('de_to_th', store, T0);
    const cards = await loadCardStatesForDirection('de_to_th', store);
    await store.put('cards', `${cards[0].vocabId}:de_to_th`, { ...cards[0], state: 'review', due: T0 - 3 * DAY_MS });
    await store.put('cards', `${cards[1].vocabId}:de_to_th`, { ...cards[1], state: 'review', due: T0 + 2 * DAY_MS });

    const stats = await loadLearningStats(store, T0, 14, 'de_to_th');
    expect(stats.forecast).toHaveLength(7);
    expect(stats.forecast[0]).toEqual({ date: dayKey(T0), due: 1 });
    expect(stats.forecast[2].due).toBe(1);
    expect(stats.forecast.reduce((sum, tag) => sum + tag.due, 0)).toBe(2);
  });

  it('rechnet Meilensteine über die ersten Wörter des Bestands', async () => {
    const store = await freshStore();
    await ensureCardStates('de_to_th', store, T0);
    const cards = await loadCardStatesForDirection('de_to_th', store);
    await rateCard(cards[0], 3, store, T0);

    const stats = await loadLearningStats(store, T0, 14, 'de_to_th');
    // 84 Test-Wörter: nur der erste Meilenstein (250) — er fasst den ganzen Bestand.
    expect(stats.milestones).toEqual([{ size: 250, total: VOCABULARY.length, started: 1 }]);
  });
});
