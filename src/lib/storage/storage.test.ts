import AsyncStorage from '@react-native-async-storage/async-storage';

import { createDataStore as createWebStore } from './backend.web';
import { MemoryDataStore } from './memory-store';
import { DataStore } from './types';

/**
 * Ein und dieselbe Vertragsprüfung für alle Backends.
 *
 * Der Sinn der Abstraktion aus AE-3 steht und fällt damit, dass sich die
 * Backends gleich verhalten — sonst funktioniert die Geschäftslogik auf einer
 * Plattform und auf der anderen nicht. Das native SQLite-Backend lässt sich
 * hier nicht mitprüfen, weil `expo-sqlite` ein natives Modul braucht; es wird
 * in Expo Go auf dem Gerät verifiziert (siehe PROGRESS.md, Phase 1).
 */
const BACKENDS: { name: string; create: () => DataStore }[] = [
  { name: 'MemoryDataStore', create: () => new MemoryDataStore() },
  { name: 'AsyncStorageDataStore (web)', create: () => createWebStore() },
];

describe.each(BACKENDS)('DataStore-Vertrag: $name', ({ create }) => {
  let store: DataStore;

  beforeEach(async () => {
    await AsyncStorage.clear();
    store = create();
    await store.init();
  });

  it('gibt null zurueck, wenn es den Eintrag nicht gibt', async () => {
    expect(await store.get('cards', 'fehlt')).toBeNull();
  });

  it('gibt eine leere Liste fuer eine unbenutzte Sammlung zurueck', async () => {
    expect(await store.getAll('situations')).toEqual([]);
  });

  it('speichert und liest einen Wert zurueck', async () => {
    await store.put('cards', 'gai:th_to_de', { reps: 3, stability: 4.2 });
    expect(await store.get('cards', 'gai:th_to_de')).toEqual({ reps: 3, stability: 4.2 });
  });

  it('ueberschreibt bei gleicher ID statt zu duplizieren', async () => {
    await store.put('cards', 'gai:th_to_de', { reps: 1 });
    await store.put('cards', 'gai:th_to_de', { reps: 2 });

    expect(await store.get('cards', 'gai:th_to_de')).toEqual({ reps: 2 });
    expect(await store.getAll('cards')).toHaveLength(1);
  });

  it('haelt Sammlungen voneinander getrennt', async () => {
    await store.put('cards', 'gleiche-id', { woher: 'cards' });
    await store.put('vocab', 'gleiche-id', { woher: 'vocab' });

    expect(await store.get('cards', 'gleiche-id')).toEqual({ woher: 'cards' });
    expect(await store.get('vocab', 'gleiche-id')).toEqual({ woher: 'vocab' });
    expect(await store.getAll('cards')).toHaveLength(1);
  });

  it('schreibt viele Eintraege auf einmal', async () => {
    await store.putMany(
      'vocab',
      Array.from({ length: 100 }, (_, i) => ({ id: `v${i}`, value: { index: i } }))
    );

    expect(await store.getAll('vocab')).toHaveLength(100);
    expect(await store.get('vocab', 'v42')).toEqual({ index: 42 });
  });

  it('vertraegt putMany mit leerer Liste', async () => {
    await expect(store.putMany('vocab', [])).resolves.toBeUndefined();
    expect(await store.getAll('vocab')).toEqual([]);
  });

  it('entfernt einen einzelnen Eintrag', async () => {
    await store.put('cards', 'a', { n: 1 });
    await store.put('cards', 'b', { n: 2 });
    await store.remove('cards', 'a');

    expect(await store.get('cards', 'a')).toBeNull();
    expect(await store.getAll('cards')).toEqual([{ n: 2 }]);
  });

  it('leert nur die angegebene Sammlung', async () => {
    await store.put('cards', 'a', { n: 1 });
    await store.put('vocab', 'b', { n: 2 });
    await store.clear('cards');

    expect(await store.getAll('cards')).toEqual([]);
    expect(await store.getAll('vocab')).toEqual([{ n: 2 }]);
  });

  it('haelt verschachtelte Werte und null-Felder unveraendert', async () => {
    const card = {
      vocabId: 'gai',
      direction: 'th_to_de',
      stability: null,
      nested: { tones: ['mid', 'low'], meta: { ok: true } },
    };
    await store.put('cards', 'gai:th_to_de', card);
    expect(await store.get('cards', 'gai:th_to_de')).toEqual(card);
  });

  it('gibt Kopien heraus, sodass Aufrufer den Speicher nicht aus Versehen aendern', async () => {
    await store.put('cards', 'a', { reps: 1 });

    const first = await store.get<{ reps: number }>('cards', 'a');
    first!.reps = 99;

    const second = await store.get<{ reps: number }>('cards', 'a');
    expect(second!.reps).toBe(1);
  });
});

describe('AsyncStorageDataStore (web) - Persistenz ueber einen Neustart', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('findet Daten einer frueheren Instanz wieder', async () => {
    // Erste "App-Sitzung"
    const before = createWebStore();
    await before.init();
    await before.put('cards', 'gai:th_to_de', { reps: 7, stability: 12.5 });

    // Zweite "App-Sitzung": neue Instanz, gleicher AsyncStorage-Inhalt.
    const after = createWebStore();
    await after.init();

    expect(await after.get('cards', 'gai:th_to_de')).toEqual({ reps: 7, stability: 12.5 });
  });

  it('startet mit einer leeren Sammlung, wenn der gespeicherte Blob beschaedigt ist', async () => {
    await AsyncStorage.setItem('thai-lernbegleiter:cards', '{ kein gueltiges JSON');

    const store = createWebStore();
    await store.init();

    expect(await store.getAll('cards')).toEqual([]);
    // Und der Speicher ist danach wieder normal benutzbar.
    await store.put('cards', 'a', { n: 1 });
    expect(await store.get('cards', 'a')).toEqual({ n: 1 });
  });
});
