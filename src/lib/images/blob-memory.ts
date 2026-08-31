import { ImageBlobStore, MIME_BY_FORMAT, formatOfKey } from './types';

/**
 * Bildablage im Arbeitsspeicher — für Tests und als Notnagel, wenn das
 * Plattform-Backend nicht startet. Verhält sich wie die echten Backends, nur
 * dass beim Schließen der App alles weg ist.
 */
export class MemoryImageBlobStore implements ImageBlobStore {
  private blobs = new Map<string, string>();

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
    return `data:${MIME_BY_FORMAT[formatOfKey(key)]};base64,${base64}`;
  }

  async remove(key: string): Promise<void> {
    this.blobs.delete(key);
  }

  async clear(): Promise<void> {
    this.blobs.clear();
  }
}

export const MEMORY_BLOB_BACKEND_NAME = 'memory';
