import { BACKEND_NAME, createDataStore } from './backend';
import { MemoryDataStore } from './memory-store';
import { DataStore } from './types';

export * from './types';
export { MemoryDataStore } from './memory-store';

let storePromise: Promise<DataStore> | null = null;
let activeBackend: string = BACKEND_NAME;

/**
 * Liefert den Speicher der Plattform. Metro wählt `backend.ts` (SQLite, nativ)
 * oder `backend.web.ts` (AsyncStorage) — die Aufrufer merken davon nichts.
 *
 * Der erste Aufruf initialisiert; alle weiteren bekommen dieselbe Instanz.
 * Schlägt die Initialisierung fehl, fällt die App auf einen Speicher im
 * Arbeitsspeicher zurück: dann geht der Fortschritt beim Schließen verloren,
 * aber die App startet überhaupt. `getActiveBackend()` sagt, was tatsächlich
 * läuft — der Einstellungs-Screen kann das anzeigen.
 */
export function getStore(): Promise<DataStore> {
  if (!storePromise) {
    storePromise = (async () => {
      try {
        const store = createDataStore();
        await store.init();
        activeBackend = BACKEND_NAME;
        return store;
      } catch (error) {
        console.warn(
          `[storage] Backend "${BACKEND_NAME}" konnte nicht initialisiert werden, ` +
            'weiter ohne Persistenz.',
          error
        );
        const fallback = new MemoryDataStore();
        await fallback.init();
        activeBackend = 'memory (fallback)';
        return fallback;
      }
    })();
  }
  return storePromise;
}

export function getActiveBackend(): string {
  return activeBackend;
}

/** Nur für Tests: erzwingt beim nächsten `getStore()` eine neue Instanz. */
export function resetStoreForTests(): void {
  storePromise = null;
  activeBackend = BACKEND_NAME;
}
