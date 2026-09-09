/**
 * Grundbegriffe der Internationalisierung (Roadmap v2, Phase 1).
 *
 * Die App erscheint in der SYSTEMSPRACHE des Geräts — dieselbe Sprache ist
 * zugleich die künftige „Brückensprache“ des Lerners. Ein Deutscher sieht
 * Deutsch deshalb nie als eigenes Lernziel; seine Auswahl ist EN/ES/FR/TH.
 *
 * Bewusst EIN flacher Sprachkanon für UI und Brücke: dieselben fünf Codes.
 */

/** Die fünf Sprachen des Kerns (Roadmap v2: „Kern 5“) — als UI- wie als Zielsprache. */
export const UI_LANGUAGES = ['de', 'en', 'es', 'fr', 'th'] as const;

export type UiLanguage = (typeof UI_LANGUAGES)[number];

/** Die Sprache, die gilt, solange nichts anderes gewählt ist. */
export const DEFAULT_UI_LANGUAGE: UiLanguage = 'de';

/** Einstellung in den Einstellungen: eine feste Sprache oder das System. */
export type LanguageSetting = UiLanguage | 'system';

export const SYSTEM_LANGUAGE_SETTING = 'system' as const;

/** Werte, die `t(key, params)` in `{{name}}`-Platzhalter einsetzt. */
export type TParams = Record<string, string | number>;

function isUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === 'string' && (UI_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Ein roher Sprachcode (etwa `getLocales()[0].languageCode`) wird auf den
 * Kanon normiert; alles Unbekannte fällt auf die Vorgabe zurück.
 *
 * Bewusst nur der SPRACHcode, keine Region: `de-AT` und `de-CH` sind Deutsch.
 */
export function normalizeLanguageCode(value: unknown): UiLanguage {
  return isUiLanguage(value) ? value : DEFAULT_UI_LANGUAGE;
}

/**
 * Eine gespeicherte Einstellung wird nachsichtig gelesen: alles, was nicht
 * `'system'` oder ein Kanon-Code ist, ergibt wieder `'system'` — ein Wert aus
 * einer älteren Version darf die App nie in einer falschen Sprache sperren.
 */
export function normalizeLanguageSetting(value: unknown): LanguageSetting {
  if (value === SYSTEM_LANGUAGE_SETTING) return SYSTEM_LANGUAGE_SETTING;
  return isUiLanguage(value) ? value : SYSTEM_LANGUAGE_SETTING;
}
