/**
 * Typisierte Zugriffe auf den Dokumentspeicher.
 *
 * Die Screens sollen weder Sammlungsnamen noch Schlüsselformate kennen — sie
 * rufen hier ab. Der Speicher selbst kommt aus `lib/storage` und ist je nach
 * Plattform SQLite oder AsyncStorage (AE-3).
 */

import { VOCABULARY, VocabEntry } from '@/data/vocabulary';

import { ConversationSituation } from './conversation/types';

import { createCardState, reviewCard } from './fsrs/fsrs';
import { cardKey, Direction, FSRSCardState, Rating } from './fsrs/types';
import { recordReview } from './review-log';
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

/**
 * Wendet eine Bewertung an und schreibt das Ergebnis fort.
 *
 * Die Rechnung selbst macht `reviewCard` aus dem FSRS-Modul — hier wird sie
 * nur mit der Persistenz verbunden, damit die Screens weder die Formeln noch
 * den Speicher direkt anfassen.
 */
export async function rateCard(
  card: FSRSCardState,
  rating: Rating,
  store?: DataStore,
  now: number = Date.now()
): Promise<FSRSCardState> {
  const updated = reviewCard(card, rating, now);
  await saveCardState(updated, store);
  // Einziger Ort, an dem bewertet wird - deshalb auch der einzige Ort, an dem
  // das Tagesprotokoll fortgeschrieben werden muss.
  await recordReview(card.direction, rating, now, store);
  return updated;
}

export async function loadCardStatesForDirection(
  direction: Direction,
  store?: DataStore
): Promise<FSRSCardState[]> {
  const all = await loadAllCardStates(store);
  return all.filter((card) => card.direction === direction);
}

/* ---------- Sprachsituationen ---------- */

export async function loadSituations(store?: DataStore): Promise<ConversationSituation[]> {
  const db = store ?? (await getStore());
  const situations = await db.getAll<ConversationSituation>('situations');
  return situations.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadSituation(
  id: string,
  store?: DataStore
): Promise<ConversationSituation | null> {
  const db = store ?? (await getStore());
  return db.get<ConversationSituation>('situations', id);
}

export async function countSituations(store?: DataStore): Promise<number> {
  return (await loadSituations(store)).length;
}

export async function clearSituations(store?: DataStore): Promise<void> {
  const db = store ?? (await getStore());
  await db.clear('situations');
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
