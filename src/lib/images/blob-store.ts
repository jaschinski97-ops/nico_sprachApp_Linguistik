import { MemoryImageBlobStore } from './blob-memory';
import { ImageBlobStore } from './types';

/**
 * Liefert die Bildablage der Plattform. Metro wählt `blob-backend.ts`
 * (expo-file-system, nativ) oder `blob-backend.web.ts` (IndexedDB) — die
 * Aufrufer merken davon nichts.
 *
 * Dasselbe Muster wie beim Dokumentspeicher (`lib/storage/index.ts`):
 * schlägt die Initialisierung fehl, läuft die App mit einem Speicher im
 * Arbeitsspeicher weiter, statt gar nicht zu starten. Dann sind die Bilder
 * nach dem Schließen weg — das ist ärgerlich, aber besser als eine App, die
 * sich nicht öffnen lässt. `getActiveBlobBackend()` sagt, was tatsächlich
 * läuft.
 *
 * Das Plattform-Backend wird **verzögert** geladen (`await import`), nicht am
 * Modulkopf. Dasselbe Vorgehen wie bei `lib/audio.ts`: `expo-file-system` ist
 * ein natives Modul und lässt sich im Jest-Prozess nicht ohne Weiteres
 * importieren. So bleiben alle Aufrufer testbar, die die Bildablage gar nicht
 * anfassen.
 */

let storePromise: Promise<ImageBlobStore> | null = null;
let activeBackend = 'noch nicht geladen';

export function getImageBlobStore(): Promise<ImageBlobStore> {
  if (!storePromise) {
    storePromise = (async () => {
      let backendName = 'unbekannt';
      try {
        const backend = await import('./blob-backend');
        backendName = backend.BLOB_BACKEND_NAME;
        const store = backend.createImageBlobStore();
        await store.init();
        activeBackend = backendName;
        return store;
      } catch (error) {
        console.warn(
          `[images] Bildablage "${backendName}" konnte nicht initialisiert werden, ` +
            'weiter im Arbeitsspeicher.',
          error
        );
        const fallback = new MemoryImageBlobStore();
        await fallback.init();
        activeBackend = 'memory (fallback)';
        return fallback;
      }
    })();
  }
  return storePromise;
}

export function getActiveBlobBackend(): string {
  return activeBackend;
}

/** Nur für Tests: erzwingt beim nächsten Aufruf eine neue Instanz. */
export function resetImageBlobStoreForTests(): void {
  storePromise = null;
  activeBackend = 'noch nicht geladen';
}
