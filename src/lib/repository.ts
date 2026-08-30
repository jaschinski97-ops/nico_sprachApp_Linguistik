/**
 * Typisierte Zugriffe auf den Dokumentspeicher.
 *
 * Die Screens sollen weder Sammlungsnamen noch Schlüsselformate kennen — sie
 * rufen hier ab. Der Speicher selbst kommt aus `lib/storage` und ist je nach
 * Plattform SQLite oder AsyncStorage (AE-3).
 */

import { VOCABULARY, VocabEntry } from '@/data/vocabulary';

import { createCardState } from './fsrs/fsrs';
import { cardKey, Direction, FSRSCardState } from './fsrs/types';
import { DataStore, getStore } from './storage';

/* ---------- Vokabeln ---------- */

/**
 * Schreibt den mitgelieferten Grundstock in den Speicher.
 *
 * Bewusst idempotent und ueberschreibend: der Grundstock ist Teil der App,
 * nicht Nutzerdaten. Nutzerfortschritt liegt in der Sammlung `cards` und wird
 * hiervon nicht angefasst.
 */
export async function seedVocabulary(
  store?: DataStore,
  entries: VocabEntry[] = VOCABULARY
): Promise<number> {
  const db = store ?? (await getStore());
  await db.putMany(
    'vocab',
    entries.map((entry) => ({ id: entry.id, value: entry }))
  );
  return entries.length;
}

export async function loadVocabulary(store?: DataStore): Promise<VocabEntry[]> {
  const db = store ?? (await getStore());
  return db.getAll<VocabEntry>('vocab');
}

export async function loadVocabEntry(
  id: string,
  store?: DataStore
): Promise<VocabEntry | null> {
  const db = store ?? (await getStore());
  return db.get<VocabEntry>('vocab', id);
}

/* ---------- Kartenzustände ---------- */

export async function loadCardState(
  vocabId: string,
  direction: Direction,
  store?: DataStore
): Promise<FSRSCardState | null> {
  const db = store ?? (await getStore());
  return db.get<FSRSCardState>('cards', cardKey(vocabId, direction));
}

/**
 * Lädt den Kartenzustand oder legt ihn an, falls die Vokabel in dieser
 * Richtung noch nie gelernt wurde. Die neu angelegte Karte wird sofort
 * gespeichert, damit sie auch nach einem Neustart existiert.
 */
export async function loadOrCreateCardState(
  vocabId: string,
  direction: Direction,
  store?: DataStore,
  now: number = Date.now()
): Promise<FSRSCardState> {
  const db = store ?? (await getStore());
  const existing = await loadCardState(vocabId, direction, db);
  if (existing) return existing;

  const fresh = createCardState(vocabId, direction, now);
  await saveCardState(fresh, db);
  return fresh;
}

export async function saveCardState(card: FSRSCardState, store?: DataStore): Promise<void> {
  const db = store ?? (await getStore());
  await db.put('cards', cardKey(card.vocabId, card.direction), card);
}

export async function loadAllCardStates(store?: DataStore): Promise<FSRSCardState[]> {
  const db = store ?? (await getStore());
  return db.getAll<FSRSCardState>('cards');
}

export async function loadCardStatesForDirection(
  direction: Direction,
  store?: DataStore
): Promise<FSRSCardState[]> {
  const all = await loadAllCardStates(store);
  return all.filter((card) => card.direction === direction);
}

/* ---------- Einstellungen / Lernprofil ---------- */

export async function readMeta<T>(key: string, fallback: T, store?: DataStore): Promise<T> {
  const db = store ?? (await getStore());
  const value = await db.get<T>('meta', key);
  return value === null ? fallback : value;
}

export async function writeMeta<T>(key: string, value: T, store?: DataStore): Promise<void> {
  const db = store ?? (await getStore());
  await db.put('meta', key, value);
}
