import AsyncStorage from '@react-native-async-storage/async-storage';

import { createDataStore as createWebStore } from './storage/backend.web';
import { DataStore, MemoryDataStore, TransactionalDataStore } from './storage';
import { createCardState } from './fsrs/fsrs';
import { loadCardState, rateCard } from './repository';
import { loadReviewLog, recordReview } from './review-log';

const T0 = Date.UTC(2026, 8, 7, 12);

/**
 * `rateCard` unter Nebenläufigkeit und im Fehlerfall.
 *
 * Die zwei Eigenschaften, die der Code-Review 2026-09-07 festgestellt hat:
 * Kartenzustand und Tagesprotokoll müssen zusammen entstehen (oder gar nicht),
 * und parallele Bewertungen derselben Karte dürfen sich nicht gegenseitig den
 * gerade gelesenen Stand überschreiben.
 *
 * Für die Atomicitätsprüfung steht der AsyncStorage-Store herbei: Er bringt
 * eine rollback-fähige Transaktion mit und läuft im Jest-Prozess echt (der
 * AsyncStorage-Mock bildet nur das natives Modul nach), während SQLite ein
 * natives Modul bräuchte.
 */

async function freshMemoryStore(): Promise<DataStore> {
  const store = new MemoryDataStore();
  await store.init();
  return store;
}

describe('rateCard unter Nebenläufigkeit', () => {
  it('verliert keine Bewertung, wenn dieselbe Karte parallel zweimal bewertet wird', async () => {
    const store = await freshMemoryStore();
    const card = createCardState('gai', 'th_to_de', T0);

    // Beide Aufrufer halten denselben (veralteten) Snapshot — das ist der
    // gemessene Fall: schnell getippte Antworten in derselben Karte.
    await Promise.all([rateCard(card, 3, store, T0), rateCard(card, 4, store, T0)]);

    const after = await loadCardState('gai', 'th_to_de', store);
    expect(after!.reps).toBe(2);

    const log = await loadReviewLog(store);
    expect(log).toHaveLength(1);
    expect(log[0].total).toBe(2);
    expect(log[0].byRating['3']).toBe(1);
    expect(log[0].byRating['4']).toBe(1);
  });

  it('rechnet auf dem gespeicherten Stand weiter, nicht auf dem übergebenen Snapshot', async () => {
    const store = await freshMemoryStore();
    const stale = createCardState('gai', 'th_to_de', T0);
    await rateCard(stale, 3, store, T0); // jetzt liegt reps 1 im Speicher

    // Der Aufrufer bewertet SEINEN alten Stand weiter ...
    const updated = await rateCard(stale, 3, store, T0);
    // ... gerechnet wird aber auf dem Stand im Speicher.
    expect(updated.reps).toBe(2);
  });

  it('hält Kartenzustand und Tagesprotokoll zusammen: ein Fehler wirft beide zurück', async () => {
    await AsyncStorage.clear();
    const store = createWebStore() as TransactionalDataStore;
    await store.init();
    // Ein Zustand VOR der Transaktion — er muss auch im Fehlerfall bleiben.
    await store.put('cards', 'alt:th_to_de', { ...createCardState('alt', 'th_to_de', T0) });

    const originalPut = store.put.bind(store);
    store.put = async (collection, id, value) => {
      if (collection === 'reviewLog') throw new Error('Platte voll');
      return originalPut(collection, id, value);
    };

    const card = createCardState('gai', 'th_to_de', T0);
    await expect(rateCard(card, 3, store, T0)).rejects.toThrow('Platte voll');

    // Weder im Cache ...
    expect(await store.get('cards', 'gai:th_to_de')).toBeNull();
    // ... noch im Persistierten ist die Bewertung gelandet.
    const nachNeustart = createWebStore() as TransactionalDataStore;
    await nachNeustart.init();
    expect(await nachNeustart.get('cards', 'gai:th_to_de')).toBeNull();
    expect(await nachNeustart.getAll('reviewLog')).toEqual([]);
    // Der Zustand von vor der Transaktion ist unangetastet.
    expect(await nachNeustart.get<{ reps: number }>('cards', 'alt:th_to_de')).toMatchObject({
      reps: 0,
    });
  });

  it('schreibt Kartenzustand und Tagesprotokoll gemeinsam, wenn nichts dazwischenkommt', async () => {
    await AsyncStorage.clear();
    const store = createWebStore() as TransactionalDataStore;
    await store.init();

    const card = createCardState('gai', 'th_to_de', T0);
    await rateCard(card, 3, store, T0);

    const nachNeustart = createWebStore() as TransactionalDataStore;
    await nachNeustart.init();
    expect(await nachNeustart.get<{ reps: number }>('cards', 'gai:th_to_de')).toMatchObject({
      reps: 1,
    });
    expect((await nachNeustart.getAll<{ total: number }>('reviewLog'))[0].total).toBe(1);
  });
});

describe('Zusammenspiel rateCard und einzelnes recordReview', () => {
  it('zählt Bewertungen und Einzelaufzeichnungen desselben Tages zusammen, nicht übereinander', async () => {
    const store = await freshMemoryStore();
    const card = createCardState('gai', 'th_to_de', T0);

    // Eine Übung zeichnet direkt ins Protokoll, während die Karte bewertet
    // wird — beides schreibt denselben Tageszähler.
    await Promise.all([rateCard(card, 3, store, T0), recordReview('de_to_th', 2, T0, store)]);

    const log = await loadReviewLog(store);
    expect(log).toHaveLength(1);
    expect(log[0].total).toBe(2);
  });
});
