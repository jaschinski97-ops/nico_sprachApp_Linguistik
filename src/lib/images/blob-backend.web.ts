import { formatOfKey, ImageBlobStore, MIME_BY_FORMAT } from './types';

/**
 * Web-Bild-Backend: IndexedDB.
 *
 * WARUM NICHT DER VORHANDENE DOKUMENTSPEICHER (AE-14, kurz):
 * Dessen Web-Backend schreibt über `@react-native-async-storage/async-storage`,
 * und dessen Web-Umsetzung ist `window.localStorage` — im installierten Paket
 * nachgesehen (`lib/module/AsyncStorage.js`, `window.localStorage.setItem`).
 * localStorage hat je Herkunft rund 5 MB, und zwar für **alle** Sammlungen
 * zusammen: Vokabeln, Kartenzustände, Sprachsituationen, Tagesprotokoll. Ein
 * paar Dutzend Bilder sprengen das.
 *
 * IndexedDB hat dagegen keine feste Kleinstgrenze (Browser vergeben Anteile
 * des freien Plattenplatzes), speichert asynchron und wird nicht bei jedem
 * Schreibvorgang komplett neu serialisiert.
 *
 * Abgelegt wird der **Base64-String**, nicht ein `Blob`. Grund: `<Image>` in
 * React Native Web nimmt eine `data:`-URL direkt entgegen; ein Objekt-URL
 * (`URL.createObjectURL`) müsste dagegen wieder freigegeben werden, und ein
 * vergessenes `revokeObjectURL` hält die Daten für die ganze Sitzung im
 * Speicher. Der Aufschlag von einem Drittel durch Base64 ist der einfachere
 * Tausch.
 */

const DB_NAME = 'thai-lernbegleiter-images';
const STORE_NAME = 'blobs';
const DB_VERSION = 1;

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB-Fehler'));
  });
}

class IndexedDbImageBlobStore implements ImageBlobStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === 'undefined') {
      // Kein IndexedDB (etwa in einer Testumgebung): der Aufrufer fällt auf
      // den Speicher im Arbeitsspeicher zurück.
      throw new Error('IndexedDB steht in dieser Umgebung nicht zur Verfügung.');
    }

    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB-Fehler'));
    });
  }

  private transaction(mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) {
      throw new Error('ImageBlobStore.init() muss vor dem ersten Zugriff aufgerufen werden.');
    }
    return this.db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  async has(key: string): Promise<boolean> {
    const count = await promisify(this.transaction('readonly').count(key));
    return count > 0;
  }

  async put(key: string, base64: string): Promise<void> {
    await promisify(this.transaction('readwrite').put(base64, key));
  }

  async uri(key: string): Promise<string | null> {
    const base64 = await promisify<string | undefined>(this.transaction('readonly').get(key));
    if (typeof base64 !== 'string') return null;
    return `data:${MIME_BY_FORMAT[formatOfKey(key)]};base64,${base64}`;
  }

  async remove(key: string): Promise<void> {
    await promisify(this.transaction('readwrite').delete(key));
  }

  async clear(): Promise<void> {
    await promisify(this.transaction('readwrite').clear());
  }
}

export function createImageBlobStore(): ImageBlobStore {
  return new IndexedDbImageBlobStore();
}

export const BLOB_BACKEND_NAME = 'indexeddb';
