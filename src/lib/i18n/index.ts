import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { Platform } from 'react-native';

import ar from './dictionaries/ar';
import de from './dictionaries/de';
import en from './dictionaries/en';
import es from './dictionaries/es';
import th from './dictionaries/th';
import type { TranslationKey } from './keys';
import { detectSystemLocale } from './detect';
import { loadLanguageSetting, saveLanguageSetting } from './prefs';
import type { LanguageSetting, TParams, UiLanguage } from './types';
import { DEFAULT_UI_LANGUAGE, SYSTEM_LANGUAGE_SETTING } from './types';

export type { LanguageSetting, TParams, UiLanguage } from './types';
export type { TranslationKey } from './keys';
export {
  DEFAULT_UI_LANGUAGE,
  SYSTEM_LANGUAGE_SETTING,
  UI_LANGUAGES,
  normalizeLanguageCode,
  normalizeLanguageSetting,
} from './types';
export { detectSystemLocale } from './detect';
export { loadLanguageSetting, saveLanguageSetting } from './prefs';

/**
 * Internationalisierung der App-UI (Roadmap v2, Phase 1).
 *
 * PRINZIP: Die App erscheint in der SYSTEMSPRACHE des Geräts — sie ist
 * zugleich die künftige „Brückensprache“ des Lerners. In den Einstellungen
 * lässt sie sich fest einschalten; solange nicht, gilt `'system'`.
 *
 * AUFBAU:
 *   `dictionaries`   — de (Referenz) + en/es/th/ar (Übersetzungen; ar ist
 *                       GENERIERT via scripts/content/generate-ui-language.cjs)
 *   `translate()`    — Nachschlagen mit de-Fallback, `{{name}}`-Interpolation
 *   `I18nProvider`   — lädt die Einstellung und hält sie im Context
 *   `useLocale()`    — Zugang für Screens/Komponenten; ohne Provider
 *                      (etwa im Test) gilt die erkannte Systemsprache
 */

export const dictionaries: Record<UiLanguage, Partial<Record<TranslationKey, string>>> = {
  ar,
  de,
  en,
  es,
  th,
};

/**
 * Schlüssel, für die ein deutscher Fallback ausdrücklich zugelassen ist.
 *
 * Der Vollständigkeitstest verlangt: fehlende Keys ⊆ diese Liste. Momentan
 * leer — alle fünf Wörterbücher sind komplett. Neue Übersetzungen tragen
 * sich hier nur ein, wenn eine Übersetzung bewusst zurückgestellt wird.
 */
export const FALLBACK_ALLOWED_KEYS: readonly TranslationKey[] = [];

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Ersetzt `{{name}}` durch die übergebenen Werte. Ein Platzhalter ohne Wert
 * bleibt stehen — eine fehlende Variable soll sichtbar sein, nicht still
 * leeren, was der Nutzer lesen soll.
 */
export function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER_PATTERN, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}

/** Ein Schlüssel in einer Sprache — bei Fehlbestand auf Deutsch zurückfallend. */
export function translate(language: UiLanguage, key: TranslationKey, params?: TParams): string {
  const template =
    language === DEFAULT_UI_LANGUAGE
      ? de[key]
      : (dictionaries[language][key] ?? de[key]);
  return interpolate(template, params);
}

/* ---------- Anzeigename einer Lernsprache ---------- */

/**
 * Jedes Lernziel erscheint in der Sprache der Oberfläche: Ein Deutscher sieht
 * „Thai“, ein Thai sieht „ภาษาเยอรมัน“ (deutsch). Der ERSTE Index ist die
 * Lernsprache, der ZWEITE die UI-Sprache — `…names['de']['th']` ist Deutsch,
 * wie eine thailändische Oberfläche es nennt. Auf der Diagonale stehen die
 * Endonyme („español“, „français“, „ไทย“) — die sichere Selbstbezeichnung.
 */
export const LANGUAGE_DISPLAY_NAMES: Record<UiLanguage, Record<UiLanguage, string>> = {
  ar: { ar: 'العربية', de: 'Arabisch', en: 'Arabic', es: 'árabe', th: 'ภาษาอาหรับ' },
  de: { ar: 'الألمانية', de: 'Deutsch', en: 'German', es: 'alemán', th: 'ภาษาเยอรมัน' },
  en: { ar: 'الإنجليزية', de: 'Englisch', en: 'English', es: 'inglés', th: 'ภาษาอังกฤษ' },
  es: { ar: 'الإسبانية', de: 'Spanisch', en: 'Spanish', es: 'español', th: 'ภาษาสเปน' },
  th: { ar: 'التايلاندية', de: 'Thai', en: 'Thai', es: 'tailandés', th: 'ภาษาไทย' },
};

/** Anzeigename einer Lernsprache in der aktuellen UI-Sprache. */
export function languageDisplayName(target: UiLanguage, ui: UiLanguage): string {
  return LANGUAGE_DISPLAY_NAMES[target][ui];
}

/** Monatsnamen für die Screenreader-Ansagen im Fortschritts-Chart. */
export const MONTH_NAMES: Record<UiLanguage, readonly string[]> = {
  ar: [
    // Ägyptische Monatsnamen: In Ägypten sind die syro-libanesischen Namen
    // (yanaayir … disimbir) üblich, nicht die klassisch-arabischen Ordnungsnamen.
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ],
  de: [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  es: [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ],
  th: [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ],
};

/** Sprachtag für Datumsformatierung (etwa `toLocaleDateString`). */
export function localeTagFor(language: UiLanguage): string {
  switch (language) {
    case 'ar':
      // Ägypten ist die Pilot-Region der arabischen Oberfläche.
      return 'ar-EG';
    case 'de':
      return 'de-DE';
    case 'en':
      return 'en-GB';
    case 'es':
      return 'es-ES';
    case 'th':
      return 'th-TH';
  }
}

/* ---------- React-Anbindung ---------- */

export type I18nValue = {
  /** Was eingestellt ist: eine feste Sprache oder `'system'`. */
  setting: LanguageSetting;
  /** Die Sprache, in der die UI gerade erscheint (aufgelöst). */
  uiLanguage: UiLanguage;
  /** Die erkannte Systemsprache des Geräts. */
  systemLanguage: UiLanguage;
  /** Übersetzen mit Interpolation — nur bekannte Schlüssel. */
  t: (key: TranslationKey, params?: TParams) => string;
  /** Anzeigename einer Lernsprache in der aktuellen UI-Sprache. */
  languageName: (target: UiLanguage) => string;
  /** Einstellung ändern (wird sofort persistiert). */
  setSetting: (setting: LanguageSetting) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

function buildValue(
  setting: LanguageSetting,
  systemLanguage: UiLanguage,
  setSetting?: (setting: LanguageSetting) => void
): I18nValue {
  const uiLanguage = setting === SYSTEM_LANGUAGE_SETTING ? systemLanguage : setting;
  return {
    setting,
    uiLanguage,
    systemLanguage,
    t: (key, params) => translate(uiLanguage, key, params),
    languageName: (target) => languageDisplayName(target, uiLanguage),
    setSetting:
      setSetting ??
      (() => {
        // Ohne Provider (Testumgebung) gibt es nichts zu persistieren.
      }),
  };
}

/**
 * Hängt die App-Sprache an den Komponentenbaum.
 *
 * Beim Mount ist die erkannte Systemsprache aktiv; parallel liest der Effekt
 * die gespeicherte Einstellung und stellt — wenn vorhanden — um. Speicherfehler
 * werden bewusst geschluckt: Fehlt der Speicherstand, ist `'system'` ohnehin
 * der richtige Stand.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [setting, setSettingState] = useState<LanguageSetting>(SYSTEM_LANGUAGE_SETTING);
  const systemLanguage = useMemo(() => detectSystemLocale(), []);

  useEffect(() => {
    let cancelled = false;
    loadLanguageSetting()
      .then((stored) => {
        if (!cancelled) setSettingState(stored);
      })
      .catch(() => {
        // Ohne Speicherstand gilt das System — wie beim Initialwert.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setSetting = useCallback((next: LanguageSetting) => {
    setSettingState(next);
    saveLanguageSetting(next).catch(() => {
      // Fire-and-forget wie die Profil-Setter; der Screen-Zustand stimmt schon.
    });
  }, []);

  const value = useMemo(
    () => buildValue(setting, systemLanguage, setSetting),
    [setting, systemLanguage, setSetting]
  );

  // RTL (Web-Pilot): Die arabische Oberfläche läuft von rechts nach links —
  // gesetzt am Dokument, damit das GANZE Layout (nicht nur Textabsätze) die
  // Laufrichtung erbt. Bewusst nur im Web: I18nManager-RTL auf nativ braucht
  // einen App-Neustart und eine eigene Layout-Prüfung aller Screens (Stufe 2,
  // ausstehend) — nativ bleibt die Laufrichtung LTR.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.dir = value.uiLanguage === 'ar' ? 'rtl' : 'ltr';
  }, [value.uiLanguage]);

  return createElement(I18nContext.Provider, { value }, children);
}

/**
 * Zugang zur App-Sprache.
 *
 * Auch OHNE Provider brauchbar (etwa in Komponententests): Dort gilt die
 * Referenzsprache Deutsch — deterministisch, damit Tests deutscher Beschriftungen
 * nicht von der Sprachauskunft der Testumgebung abhängen. Die App selbst hängt
 * den Provider in `_layout.tsx` ein; die Erkennung der Systemsprache passiert
 * dort und nur dort.
 */
export function useLocale(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) return buildValue(SYSTEM_LANGUAGE_SETTING, DEFAULT_UI_LANGUAGE);
  return ctx;
}
