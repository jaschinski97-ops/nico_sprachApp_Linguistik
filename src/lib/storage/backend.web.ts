import AsyncStorage from '@react-native-async-storage/async-storage';

import { CollectionName, DataStore } from './types';

/**
 * Web-Backend: eine Sammlung = ein JSON-Blob in AsyncStorage
 * (im Browser also ein localStorage-Eintrag).
 *
 * Grund für den eigenen Web-Pfad statt `expo-sqlite`: dessen Web-Pfad legt
 * SharedArrayBuffer an und synchronisiert über Atomics, was
 * Cross-Origin-Isolation (COOP/COEP) voraussetzt. Weder `expo start --web`
 * noch ein statischer Export auf fremdem Hosting liefert diese Header — siehe
 * AE-3 in PROGRESS.md.
 *
 * Die Sammlung wird beim ersten Zugriff in eine Map geladen und danach im
 * Speicher gehalten; Schreibvorgänge aktualisieren Map und Blob gemeinsam.
 * Das ist für die erwarteten Datenmengen (einige tausend Vokabeln und Karten)
 * unkritisch und hält Lesezugriffe schnell.
 */

const KEY_PREFIX = 'thai-lernbegleiter:';

function storageKey(collection: CollectionName): string {
  return `${KEY_PREFIX}${collection}`;
}

/**
 * Der Cache hält ausgepackte Objekte. Ohne Kopie beim Lesen und Schreiben
 * würden Aufrufer eine Referenz auf den Cache-Inhalt bekommen und könnten ihn
 * unbemerkt verändern — der SQLite- und der Memory-Store geben dagegen immer
 * frisch geparste Objekte zurück. Die Kopie hält alle drei Backends bei
 * gleichem Verhalten.
 */
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class AsyncStorageDataStore implements DataStore {
  private cache = new Map<CollectionName, Map<string, unknown>>();

  async init(): Promise<void> {
    // Sammlungen werden verzögert geladen, sobald sie gebraucht werden.
  }

  private async load(collection: CollectionName): Promise<Map<string, unknown>> {
    const cached = this.cache.get(collection);
    if (cached) return cached;

    let parsed: Record<string, unknown> = {};
    try {
      const raw = await AsyncStorage.getItem(storageKey(collection));
      if (raw) parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // Beschädigter oder nicht lesbarer Blob: lieber leer starten als die App
      // blockieren. Der Lernfortschritt dieser Sammlung ist dann verloren,
      // alles andere läuft weiter.
      parsed = {};
    }

    const bucket = new Map<string, unknown>(Object.entries(parsed));
    this.cache.set(collection, bucket);
    return bucket;
  }

  private async flush(collection: CollectionName, bucket: Map<string, unknown>): Promise<void> {
    await AsyncStorage.setItem(
      storageKey(collection),
      JSON.stringify(Object.fromEntries(bucket))
    );
  }

  async get<T>(collection: CollectionName, id: string): Promise<T | null> {
    const bucket = await this.load(collection);
    return bucket.has(id) ? copy(bucket.get(id) as T) : null;
  }

  async getAll<T>(collection: CollectionName): Promise<T[]> {
    const bucket = await this.load(collection);
    return [...bucket.values()].map((value) => copy(value)) as T[];
  }

  async put<T>(collection: CollectionName, id: string, value: T): Promise<void> {
    const bucket = await this.load(collection);
    bucket.set(id, copy(value));
    await this.flush(collection, bucket);
  }

  async putMany<T>(
    collection: CollectionName,
    entries: { id: string; value: T }[]
  ): Promise<void> {
    if (entries.length === 0) return;
    const bucket = await this.load(collection);
    for (const entry of entries) {
      bucket.set(entry.id, copy(entry.value));
    }
    await this.flush(collection, bucket);
  }

  async remove(collection: CollectionName, id: string): Promise<void> {
    const bucket = await this.load(collection);
    bucket.delete(id);
    await this.flush(collection, bucket);
  }

  async clear(collection: CollectionName): Promise<void> {
    const bucket = await this.load(collection);
    bucket.clear();
    await this.flush(collection, bucket);
  }
}

export function createDataStore(): DataStore {
  return new AsyncStorageDataStore();
}

export const BACKEND_NAME = 'async-storage';
