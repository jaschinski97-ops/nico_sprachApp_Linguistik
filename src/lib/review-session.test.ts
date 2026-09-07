// PHASE 16: `VOCABULARY` umfasst jetzt alle drei Sprachen. Was diese Datei
// zusichert, gilt dem Thai-Grundstock aus Phase 2 - deshalb hier
// ausdruecklich der. Unterhalb dieser Zeile hat sich nichts geaendert.
import { VOCABULARY_TH as VOCABULARY } from '@/data/vocabulary';

import { DAY_MS, NEW_CARDS_PER_SESSION, retrievability } from './fsrs/fsrs';
import { Direction } from './fsrs/types';
import { loadCardStatesForDirection, rateCard } from './repository';
import {
  buildReviewQueue,
  DIRECTIONS,
  ensureCardStates,
  summarizeAllDirections,
  summarizeDirection,
} from './review-session';
import { DataStore, MemoryDataStore } from './storage';

const T0 = Date.UTC(2026, 5, 1);

async function freshStore(): Promise<DataStore> {
  const store = new MemoryDataStore();
  await store.init();
  return store;
}

describe('ensureCardStates', () => {
  it('legt beim ersten Aufruf zu jeder Vokabel eine Karte an', async () => {
    const store = await freshStore();
    const { entries, cards } = await ensureCardStates('th_to_de', store, T0);

    expect(entries).toHaveLength(VOCABULARY.length);
    expect(cards).toHaveLength(VOCABULARY.length);
    cards.forEach((card) => {
      expect(card.direction).toBe('th_to_de');
      expect(card.state).toBe('new');
    });
  });

  it('spielt den Grundstock selbst ein, wenn der Speicher noch leer ist', async () => {
    const store = await freshStore();
    expect(await store.getAll('vocab')).toHaveLength(0);

    await ensureCardStates('de_to_th', store, T0);
    // Eingespielt wird seit Phase 16 der ganze Grundstock (alle Sprachen);
    // Karten bekommt nur die Sprache dieser Richtung - das prueft der
    // naechste Block.
    expect((await store.getAll('vocab')).length).toBeGreaterThanOrEqual(VOCABULARY.length);
  });

  it('legt beim zweiten Aufruf nichts Neues an', async () => {
    const store = await freshStore();
    await ensureCardStates('th_to_de', store, T0);
    const afterFirst = await loadCardStatesForDirection('th_to_de', store);

    await ensureCardStates('th_to_de', store, T0 + DAY_MS);
    const afterSecond = await loadCardStatesForDirection('th_to_de', store);

    expect(afterSecond).toHaveLength(afterFirst.length);
  });

  it('haelt die beiden Richtungen strikt auseinander', async () => {
    const store = await freshStore();
    await ensureCardStates('th_to_de', store, T0);
    await ensureCardStates('de_to_th', store, T0);

    const all = await store.getAll('cards');
    expect(all).toHaveLength(VOCABULARY.length * 2);

    DIRECTIONS.forEach(async (direction) => {
      const forDirection = await loadCardStatesForDirection(direction, store);
      expect(forDirection).toHaveLength(VOCABULARY.length);
    });
  });
});

describe('buildReviewQueue', () => {
  it('deckelt neue Karten am Anfang auf NEW_CARDS_PER_SESSION', async () => {
    // Neue Karten sind zwar alle sofort faellig - aber eine Sitzung nimmt nur
    // NEW_CARDS_PER_SESSION von ihnen auf, sonst flutet der Grundstock jede
    // Sitzung und die faellig wiederholten Karten verhungern dahinter.
    const store = await freshStore();
    const queue = await buildReviewQueue('th_to_de', store, T0);
    expect(queue).toHaveLength(NEW_CARDS_PER_SESSION);
    expect(queue.every((item) => item.card.state === 'new')).toBe(true);
  });

  it('verbindet jede Karte mit ihrem Vokabeleintrag', async () => {
    const store = await freshStore();
    const queue = await buildReviewQueue('de_to_th', store, T0);
    queue.forEach((item) => {
      expect(item.entry.id).toBe(item.card.vocabId);
      expect(item.card.direction).toBe('de_to_th');
    });
  });

  it('stellt bewertete Karten vor neue und sortiert sie nach Retrievability', async () => {
    const store = await freshStore();
    await ensureCardStates('th_to_de', store, T0);

    // Drei Karten unterschiedlich stark bewerten, danach zehn Tage warten.
    const cards = await loadCardStatesForDirection('th_to_de', store);
    const byId = new Map(cards.map((card) => [card.vocabId, card]));
    await rateCard(byId.get('gai')!, 4, store, T0);
    await rateCard(byId.get('khai')!, 3, store, T0);
    await rateCard(byId.get('dii')!, 2, store, T0);

    const later = T0 + 10 * DAY_MS;
    const queue = await buildReviewQueue('th_to_de', store, later);

    // Bereits gelernte Karten zuerst, darunter am ehesten Vergessenes -
    // aufsteigende Retrievability. Die (nur bis zum Deckel aufgefuellten)
    // neuen Karten stehen HINTER ihnen, nicht mehr wie frueher ganz vorn.
    const reviewed = queue.filter((item) => item.card.state !== 'new');
    const values = reviewed.map((item) => retrievability(item.card, later));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
    expect(reviewed).toHaveLength(3);
    expect(retrievability(reviewed[0].card, later)).toBeLessThan(1);

    const fresh = queue.slice(reviewed.length);
    expect(fresh).toHaveLength(NEW_CARDS_PER_SESSION);
    expect(fresh.every((item) => item.card.state === 'new')).toBe(true);
  });

  it('laesst noch nicht faellige Karten weg', async () => {
    const store = await freshStore();
    await ensureCardStates('th_to_de', store, T0);

    const cards = await loadCardStatesForDirection('th_to_de', store);
    // Alles auf "Leicht" - danach ist nichts mehr sofort faellig.
    for (const card of cards) {
      await rateCard(card, 4, store, T0);
    }

    expect(await buildReviewQueue('th_to_de', store, T0)).toHaveLength(0);
  });

  it('bewertet nur die gewaehlte Richtung, die andere bleibt unberuehrt', async () => {
    const store = await freshStore();
    await ensureCardStates('th_to_de', store, T0);
    await ensureCardStates('de_to_th', store, T0);

    const thCards = await loadCardStatesForDirection('th_to_de', store);
    for (const card of thCards) {
      await rateCard(card, 4, store, T0);
    }

    expect(await buildReviewQueue('th_to_de', store, T0)).toHaveLength(0);
    expect(await buildReviewQueue('de_to_th', store, T0)).toHaveLength(NEW_CARDS_PER_SESSION);
  });
});

describe('summarizeDirection', () => {
  it('zaehlt zu Beginn alles als neu, die Faelligkeit bis zum Sitzungsdeckel', async () => {
    const store = await freshStore();
    const summary = await summarizeDirection('th_to_de', store, T0);

    expect(summary.direction).toBe('th_to_de');
    expect(summary.total).toBe(VOCABULARY.length);
    // `due` folgt der Sitzungenzusammenstellung: neue Karten zaehlen nur bis
    // zum Deckel - sonst verspraeche die Zahl eine Sitzung, die es so nicht gibt.
    expect(summary.due).toBe(NEW_CARDS_PER_SESSION);
    expect(summary.fresh).toBe(VOCABULARY.length);
    expect(summary.mastered).toBe(0);
  });

  it('nimmt bewertete Karten aus der Faelligkeit heraus', async () => {
    const store = await freshStore();
    await ensureCardStates('th_to_de', store, T0);
    const cards = await loadCardStatesForDirection('th_to_de', store);
    // So viele Karten bewerten, dass die Zahl der verbliebenen UNTER dem
    // Deckel liegt - nur dann zeigt die Faelligkeitszahl sichtbar, dass
    // bewertete Karten rausgenommen sind (ueber dem Deckel kaeme die Zahl
    // nicht herunter, egal wie viele bewertet waeren).
    const bewertet = VOCABULARY.length - (NEW_CARDS_PER_SESSION - 1);
    for (const card of cards.slice(0, bewertet)) {
      await rateCard(card, 4, store, T0);
    }

    const summary = await summarizeDirection('th_to_de', store, T0);
    expect(summary.due).toBe(NEW_CARDS_PER_SESSION - 1);
    expect(summary.fresh).toBe(NEW_CARDS_PER_SESSION - 1);
  });

  it('liefert beide Richtungen getrennt, nicht als Summe', async () => {
    const store = await freshStore();
    const summaries = await summarizeAllDirections('th', store, T0);

    expect(summaries.map((s) => s.direction).sort()).toEqual(
      ([...DIRECTIONS] as Direction[]).sort()
    );
    summaries.forEach((summary) => {
      expect(summary.total).toBe(VOCABULARY.length);
    });
  });
});
