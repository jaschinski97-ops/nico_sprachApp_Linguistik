import { BlobStore, BlobStoreConfig } from './types';

/**
 * Web-Backend: IndexedDB, eine Datenbank je Ablage.
 *
 * WARUM NICHT DER VORHANDENE DOKUMENTSPEICHER (AE-14, kurz):
 * Dessen Web-Backend schreibt über `@react-native-async-storage/async-storage`,
 * und dessen Web-Umsetzung ist `window.localStorage` — im installierten Paket
 * nachgesehen. localStorage hat je Herkunft rund 5 MB, und zwar für **alle**
 * Sammlungen zusammen. Ein paar Dutzend Bilder sprengen das; Hörclips
 * (Phase 11) erst recht — ein einziger Satz als 24-kHz-PCM wiegt so viel wie
 * zwei Bilder.
 *
 * IndexedDB hat dagegen keine feste Kleinstgrenze (Browser vergeben Anteile
 * des freien Plattenplatzes), speichert asynchron und wird nicht bei jedem
 * Schreibvorgang komplett neu serialisiert.
 *
 * Abgelegt wird der **Base64-String**, nicht ein `Blob`: `<Image>` und
 * `<audio>` nehmen eine `data:`-URL direkt entgegen; ein Objekt-URL müsste
 * wieder freigegeben werden, und ein vergessenes `revokeObjectURL` hält die
 * Daten für die ganze Sitzung im Speicher.
 */

const STORE_NAME = 'blobs';
const DB_VERSION = 1;

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB-Fehler'));
  });
}

class IndexedDbBlobStore implements BlobStore {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;

  constructor(private readonly config: BlobStoreConfig) {
    // `thai-lernbegleiter-images` heisst so seit Phase 5 - der Name ist Teil
    // der gespeicherten Daten und darf sich nicht aendern.
    this.dbName = `thai-lernbegleiter-${config.name}`;
  }

  async init(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === 'undefined') {
      // Kein IndexedDB (etwa in einer Testumgebung): der Aufrufer fällt auf
      // den Speicher im Arbeitsspeicher zurück.
      throw new Error('IndexedDB steht in dieser Umgebung nicht zur Verfügung.');
    }

    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);
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
      throw new Error('BlobStore.init() muss vor dem ersten Zugriff aufgerufen werden.');
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
    return `data:${this.config.mimeOf(key)};base64,${base64}`;
  }

  async remove(key: string): Promise<void> {
    await promisify(this.transaction('readwrite').delete(key));
  }

  async clear(): Promise<void> {
    await promisify(this.transaction('readwrite').clear());
  }
}

export function createBlobStore(config: BlobStoreConfig): BlobStore {
  return new IndexedDbBlobStore(config);
}

export const BLOB_BACKEND_NAME = 'indexeddb';
