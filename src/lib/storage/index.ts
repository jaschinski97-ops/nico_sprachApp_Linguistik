import { BACKEND_NAME, createDataStore } from './backend';
import { MemoryDataStore } from './memory-store';
import { DataStore } from './types';

export * from './types';
export { MemoryDataStore } from './memory-store';

let storePromise: Promise<DataStore> | null = null;
let activeBackend: string = BACKEND_NAME;

/** Kennung des Notfall-Speichers — siehe `isStorageDegraded()`. */
const MEMORY_FALLBACK_BACKEND = 'memory (fallback)';

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
        activeBackend = MEMORY_FALLBACK_BACKEND;
        return fallback;
      }
    })();
  }
  return storePromise;
}

/**
 * Welches Backend läuft tatsächlich.
 *
 * Synchron und damit nur aussagekräftig, NACHDEM `getStore()` erstmals
 * aufgelöst wurde — davor meldet es das angestrebte Backend.
 */
export function getActiveBackend(): string {
  return activeBackend;
}

/**
 * Läuft die App gerade auf dem Notfall-Speicher, dessen Inhalt beim Schließen
 * verloren geht?
 *
 * Das ist eine LAUFZEIT-Frage und bewusst keine im Speicher abgelegte Flagge:
 * der RAM-Speicher kann genau solche Flags logisch nicht dauerhaft ablegen.
 * Wartet auf die Backend-Wahl, damit ein Einstellungs-Screen sie direkt beim
 * ersten Rendern stellen kann.
 */
export async function isStorageDegraded(): Promise<boolean> {
  await getStore();
  return activeBackend === MEMORY_FALLBACK_BACKEND;
}

/**
 * Ein Store mit optionaler Transaktionsfähigkeit. SQLite und AsyncStorage
 * bringen sie mit (siehe ihre Backends); der Memory-Store nicht — für ihn
 * serialisiert `transact` allein, was Lost Updates verhindert, aber bei einem
 * Absturz mitten in der Arbeit keine Rückgabe versprechen kann.
 */
export type TransactionalDataStore = DataStore & {
  withTransactionAsync<T>(work: () => Promise<T>): Promise<T>;
};

const storeLocks = new WeakMap<DataStore, Promise<unknown>>();

/**
 * Serialisiert Arbeiten am selben Store: Lesen-Ändern-Schreiben-Ketten
 * (`recordReview`, Profil-Schreibzugriffe, …) laufen geordnet, statt sich
 * gegenseitig den gerade gelesenen Stand zu überschreiben.
 *
 * NICHT verschachtelbar — eine Arbeit, die selbst `withStoreLock` nimmt,
 * wartet auf sich selbst. Wer mehrere Einheiten zusammenfassen will, nimmt
 * `transact` und ruft die unserialisierten Varianten der Beteiligten.
 */
export function withStoreLock<T>(db: DataStore, work: () => Promise<T>): Promise<T> {
  const previous = storeLocks.get(db) ?? Promise.resolve();
  const result = previous.then(work, work);
  storeLocks.set(
    db,
    result.then(
      () => undefined,
      () => undefined
    )
  );
  return result;
}

/**
 * Führt die Arbeit ATOMAR am Store aus, soweit das Backend es kann:
 *
 * - mit Transaktionsfähigkeit: unter der Store-Sperre in EINER Transaktion —
 *   ein Absturz mitten darin lässt weder Kartenzustand noch Protokolleintrag
 *   zurück, und ein Fehler rollt beide zurück.
 * - ohne (Memory-Store): nur unter der Store-Sperre — Lost Updates sind
 *   ausgeschlossen, eine Rückgabe bei Absturz gibt es nicht.
 *
 * Die Sperre ist auch für Backend-Transaktionen nötig, weil SQLites
 * `withTransactionAsync` konkurrierende Aufrufe eben NICHT serialisiert.
 */
export function transact<T>(db: DataStore, work: () => Promise<T>): Promise<T> {
  return withStoreLock(db, () => {
    const tx = db as TransactionalDataStore;
    return tx.withTransactionAsync ? tx.withTransactionAsync(work) : work();
  });
}

/** Nur für Tests: erzwingt beim nächsten `getStore()` eine neue Instanz. */
export function resetStoreForTests(): void {
  storePromise = null;
  activeBackend = BACKEND_NAME;
}

