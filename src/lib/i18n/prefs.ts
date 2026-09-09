import { DataStore, getStore } from '@/lib/storage';

import { LanguageSetting, normalizeLanguageSetting } from './types';

/**
 * App-Sprache im bestehenden Speicher.
 *
 * Bewusst dieselbe Infrastruktur wie das Lernprofil (`lib/profile`): die
 * Sammlung `meta` des Dokument-Speichers, der je Plattform SQLite (nativ)
 * oder AsyncStorage (Web) ist. Kein neuer Mechanismus, kein neues Backend.
 */

const UI_LANGUAGE_KEY = 'uiLanguage';

/** Liest die gespeicherte Einstellung; ohne Speicherstand gilt `'system'`. */
export async function loadLanguageSetting(store?: DataStore): Promise<LanguageSetting> {
  const db = store ?? (await getStore());
  const stored = await db.get<string>('meta', UI_LANGUAGE_KEY);
  return normalizeLanguageSetting(stored);
}

/** Speichert die Einstellung. `'system'` entfernt keinen anderen Profilstand. */
export async function saveLanguageSetting(
  setting: LanguageSetting,
  store?: DataStore
): Promise<void> {
  const db = store ?? (await getStore());
  await db.put('meta', UI_LANGUAGE_KEY, setting);
}
