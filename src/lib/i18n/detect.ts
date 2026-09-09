import { getLocales } from 'expo-localization';

import { DEFAULT_UI_LANGUAGE, UiLanguage, normalizeLanguageCode } from './types';

/**
 * Systemsprache des Geräts, normiert auf den Kanon.
 *
 * expo-localization (SDK 57): `getLocales()` liefert die Sprachen in der
 * Reihenfolge, wie der Nutzer sie im System gesetzt hat — das erste Element
 * ist die Systemsprache. iOS friert das Ergebnis beim App-Start ein, Android
 * kann zur Laufzeit wechseln; für die Erkennung reicht hier der erste Eintrag
 * beim Rendern (der Provider liest ihn einmal pro Start).
 *
 * Der try/catch ist Teil des Vertrags: Auf einer Plattform ohne Sprachauskunft
 * (oder im Testlauf ohne natives Modul) startet die App in der Vorgabesprache,
 * statt beim Hochfahren zu scheitern.
 */
export function detectSystemLocale(): UiLanguage {
  try {
    const first = getLocales()?.[0];
    return normalizeLanguageCode(first?.languageCode);
  } catch {
    return DEFAULT_UI_LANGUAGE;
  }
}
