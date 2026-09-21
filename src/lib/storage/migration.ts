import { activeVocabulary } from '@/data/active-vocabulary';

import { DataStore, getStore } from './index';

/**
 * Migration des Gerätespeichers (Phase 15, AE-43).
 *
 * WAS SICH GEÄNDERT HAT UND WAS NICHT — das ist der ganze Punkt:
 *
 *   **Kartenzustände bleiben unangetastet.** Der Schlüssel ist weiterhin
 *   `vocabId:direction`, und `'de_to_th'`/`'th_to_de'` sind im neuen Typ
 *   wörtlich dieselben Werte (AE-42). Es gibt hier also nichts umzuschreiben,
 *   und genau deshalb kann auch nichts verloren gehen. Der Test belegt das an
 *   einer Karte mit echtem Lernfortschritt, nicht an einer frischen.
 *
 *   **Der Vokabel-Grundstock wird neu eingespielt.** Er hat mit Phase 15 eine
 *   andere Form bekommen (`thai` → `term`, `exampleThai` → `exampleTerm`, neu
 *   `language`). Das ist unbedenklich, weil er **Auslieferungsdaten** sind und
 *   keine Nutzerdaten: Was der Nutzer erarbeitet hat, steht in den Karten, im
 *   Tagesprotokoll und im Profil — nicht in den Vokabeln.
 *
 * WARUM NEU EINSPIELEN UND NICHT FELDWEISE UMBAUEN: Ein feldweiser Umbau
 * müsste für jede künftige Schemaänderung nachgezogen werden und wäre bei
 * jedem Sprung fehleranfällig. Der Grundstock kommt mit der App; ihn zu
 * ersetzen ist die kürzere und sicherere Bewegung. Was dabei nicht passieren
 * darf, ist ein Nebeneffekt auf die Karten — und genau das prüft der Test.
 */

const VERSION_KEY = 'schemaVersion';

/**
 * 1 — bis Phase 14: Vokabeln mit `thai`/`exampleThai`, ohne `language`.
 * 2 — ab Phase 15: `term`/`exampleTerm`/`language`, sprachpaar-fähiges Modell.
 */
export const CURRENT_SCHEMA_VERSION = 2;

export type MigrationResult = {
  from: number;
  to: number;
  /** Wurde etwas getan? Bei einem aktuellen Speicher nicht. */
  migrated: boolean;
  /** Wie viele Vokabeln neu eingespielt wurden. */
  reseeded: number;
  /** Wie viele Kartenzustände der Lauf angefasst hat — muss null sein. */
  cardsTouched: number;
};

export async function readSchemaVersion(store: DataStore): Promise<number> {
  const stored = await store.get<{ version?: unknown }>('meta', VERSION_KEY);
  const version = stored?.version;
  // Ein Speicher ohne Eintrag stammt aus der Zeit vor Phase 15 - es sei denn,
  // er ist ganz leer, was der Aufrufer unterscheidet.
  return typeof version === 'number' && Number.isFinite(version) ? version : 1;
}

/**
 * Bringt einen vorhandenen Speicher auf den aktuellen Stand.
 *
 * Läuft beim Start und ist **idempotent**: Ein zweiter Aufruf tut nichts. Auf
 * einem leeren Speicher wird nur die Version gesetzt; das Einspielen des
 * Grundstocks übernimmt wie bisher `ensureCardStates`.
 */
export async function migrateStore(store?: DataStore): Promise<MigrationResult> {
  const db = store ?? (await getStore());
  const from = await readSchemaVersion(db);

  if (from >= CURRENT_SCHEMA_VERSION) {
    return { from, to: from, migrated: false, reseeded: 0, cardsTouched: 0 };
  }

  const existing = await db.getAll<unknown>('vocab');
  let reseeded = 0;

  if (existing.length > 0) {
    // Der Grundstock kommt mit der App: ersetzen statt umbauen.
    await db.putMany(
      'vocab',
      activeVocabulary().map((entry) => ({ id: entry.id, value: entry }))
    );
    reseeded = activeVocabulary().length;
  }

  await db.put('meta', VERSION_KEY, { version: CURRENT_SCHEMA_VERSION });

  return {
    from,
    to: CURRENT_SCHEMA_VERSION,
    migrated: true,
    reseeded,
    // Hier steht bewusst eine Null und kein Kommentar: Der Lauf fasst
    // Kartenzustaende nicht an, und der Test rechnet nach.
    cardsTouched: 0,
  };
}
