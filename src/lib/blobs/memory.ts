import { BlobStore, BlobStoreConfig } from './types';

/**
 * Ablage im Arbeitsspeicher — für Tests und als Notnagel, wenn das
 * Plattform-Backend nicht startet. Verhält sich wie die echten Backends, nur
 * dass beim Schließen der App alles weg ist.
 */
export class MemoryBlobStore implements BlobStore {
  private blobs = new Map<string, string>();

  constructor(private readonly config: BlobStoreConfig) {}

  async init(): Promise<void> {}

  async has(key: string): Promise<boolean> {
    return this.blobs.has(key);
  }

  async put(key: string, base64: string): Promise<void> {
    this.blobs.set(key, base64);
  }

  async uri(key: string): Promise<string | null> {
    const base64 = this.blobs.get(key);
    if (base64 === undefined) return null;
    return `data:${this.config.mimeOf(key)};base64,${base64}`;
  }

  async remove(key: string): Promise<void> {
    this.blobs.delete(key);
  }

  async clear(): Promise<void> {
    this.blobs.clear();
  }
}

export const MEMORY_BLOB_BACKEND_NAME = 'memory';
