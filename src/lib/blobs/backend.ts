import { Directory, File, Paths } from 'expo-file-system';

import { BlobStore, BlobStoreConfig } from './types';

/**
 * Natives Backend (iOS/Android): eine Datei je Eintrag unter
 * `<Dokumentverzeichnis>/<name>/`.
 *
 * NACHGESEHEN, NICHT ANGENOMMEN — `expo-file-system@57.0.6` (Phase 5):
 * - `File.write(inhalt, { encoding: 'base64' })` nimmt Base64 direkt entgegen
 *   und dekodiert nativ. Ein eigener Base64-Dekodierer in JavaScript ist damit
 *   überflüssig.
 * - `Paths.document` ist laut Typdefinition „a place to store files that are
 *   safe from being deleted by the system" — im Gegensatz zu `Paths.cache`,
 *   das das System bei Speichermangel leeren darf. Generierte Inhalte kosten
 *   Geld; sie gehören nicht in einen Cache.
 * - `file.uri` liefert einen `file:///`-Pfad, den `<Image>` und `expo-audio`
 *   direkt entgegennehmen.
 *
 * Metro wählt für Web stattdessen `backend.web.ts` — expo-file-system hat auf
 * Web **gar keine** Umsetzung (siehe AE-14).
 */

class FileSystemBlobStore implements BlobStore {
  private directory: Directory;

  constructor(private readonly config: BlobStoreConfig) {
    this.directory = new Directory(Paths.document, config.name);
  }

  async init(): Promise<void> {
    if (!this.directory.exists) {
      this.directory.create({ intermediates: true });
    }
  }

  private fileFor(key: string): File {
    return new File(this.directory, key);
  }

  async has(key: string): Promise<boolean> {
    return this.fileFor(key).exists;
  }

  async put(key: string, base64: string): Promise<void> {
    const file = this.fileFor(key);
    if (!file.exists) file.create({ intermediates: true, overwrite: true });
    file.write(base64, { encoding: 'base64' });
  }

  async uri(key: string): Promise<string | null> {
    const file = this.fileFor(key);
    return file.exists ? file.uri : null;
  }

  async remove(key: string): Promise<void> {
    const file = this.fileFor(key);
    if (file.exists) file.delete();
  }

  async clear(): Promise<void> {
    if (this.directory.exists) this.directory.delete();
    this.directory = new Directory(Paths.document, this.config.name);
    this.directory.create({ intermediates: true });
  }
}

export function createBlobStore(config: BlobStoreConfig): BlobStore {
  return new FileSystemBlobStore(config);
}

export const BLOB_BACKEND_NAME = 'expo-file-system';
