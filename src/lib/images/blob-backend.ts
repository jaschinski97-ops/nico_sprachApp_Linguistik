import { Directory, File, Paths } from 'expo-file-system';

import { ImageBlobStore } from './types';

/**
 * Natives Bild-Backend (iOS/Android): eine Datei je Bild unter
 * `<Dokumentverzeichnis>/images/`.
 *
 * NACHGESEHEN, NICHT ANGENOMMEN — `expo-file-system@57.0.6`:
 * - `File.write(inhalt, { encoding: 'base64' })` nimmt Base64 direkt entgegen
 *   und dekodiert nativ (`src/File.types.ts`, `encoding?: EncodingType | 'utf8'
 *   | 'base64'`). Ein eigener Base64-Dekodierer in JavaScript ist damit
 *   überflüssig.
 * - `Paths.document` ist laut Typdefinition „a place to store files that are
 *   safe from being deleted by the system" — im Gegensatz zu `Paths.cache`,
 *   das das System bei Speichermangel leeren darf. Generierte Bilder kosten
 *   Geld; sie gehören nicht in einen Cache.
 * - `file.uri` liefert einen `file:///`-Pfad, den `<Image>` direkt anzeigt.
 *
 * Metro wählt für Web stattdessen `blob-backend.web.ts` — expo-file-system hat
 * auf Web **gar keine** Umsetzung (siehe AE-14).
 */

const DIRECTORY_NAME = 'images';

class FileSystemImageBlobStore implements ImageBlobStore {
  private directory = new Directory(Paths.document, DIRECTORY_NAME);

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
    this.directory = new Directory(Paths.document, DIRECTORY_NAME);
    this.directory.create({ intermediates: true });
  }
}

export function createImageBlobStore(): ImageBlobStore {
  return new FileSystemImageBlobStore();
}

export const BLOB_BACKEND_NAME = 'expo-file-system';
