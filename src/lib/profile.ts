import { Direction } from './fsrs/types';
import { defaultLanguage, hasContent } from './languages/registry';
import { isLanguageCode, LanguageCode } from './languages/types';
import { readMeta, writeMeta } from './repository';
import { DataStore } from './storage';

/**
 * Lernprofil — bislang nur die Standard-Lernrichtung.
 *
 * WARUM ES DAS GIBT (AE-17): Die App bedient zwei verschiedene Zielgruppen.
 * Für die meisten Menschen ist die Lernrichtung eine Eigenschaft der Person
 * und keine Entscheidung je Sitzung: wer Thai lernt, lernt beim nächsten Mal
 * wieder Thai. Die Richtung jedes Mal neu zu wählen ist Reibung mit
 * vorhersehbarer Antwort.
 *
 * WARUM AUSDRÜCKLICH UND NICHT AUTOMATISCH: Bidirektionalität ist ein
 * Kernversprechen (AE-11) — dieselbe Person kann beide Richtungen lernen, und
 * ein Gerät kann geteilt werden. Die zuletzt gewählte Richtung still als
 * Standard festzuschreiben, würde die App nach einem einzigen Tippen auf eine
 * Richtung festlegen, ohne dass jemand das gewollt hätte. Deshalb wird der
 * Standard nur gesetzt, wenn er ausdrücklich gesetzt wird, er ist überall
 * sichtbar, wo er wirkt, und lässt sich an derselben Stelle wieder aufheben.
 *
 * Abgelegt in der Sammlung `meta`, die seit Phase 1 genau dafür vorgesehen
 * ist („Einstellungen, Lernprofil, Zähler") und bisher ungenutzt war.
 */

const PROFILE_KEY = 'profile';

export type LearnerProfile = {
  /** `null` heißt: bei jeder Sitzung fragen. */
  defaultDirection: Direction | null;
  /**
   * Welche Sprache gerade gelernt wird (Phase 15). Steuert den Lernen-Bereich.
   * Ein unbekannter oder inhaltsloser Wert ergibt die Standardsprache statt
   * einer leeren App - dieselbe Nachsicht wie bei der Richtung (AE-17).
   */
  language: LanguageCode;
};

const EMPTY_PROFILE: LearnerProfile = { defaultDirection: null, language: defaultLanguage() };

function isDirection(value: unknown): value is Direction {
  return value === 'de_to_th' || value === 'th_to_de';
}

export async function loadProfile(store?: DataStore): Promise<LearnerProfile> {
  const stored = await readMeta<Partial<LearnerProfile>>(PROFILE_KEY, {}, store);
  // Bewusst nachsichtig gelesen: ein Profil aus einer aelteren Version darf
  // die App nicht in die Richtungsauswahl sperren oder gar abstuerzen lassen.
  const language =
    isLanguageCode(stored?.language) && hasContent(stored.language)
      ? stored.language
      : defaultLanguage();
  return {
    defaultDirection: isDirection(stored?.defaultDirection) ? stored.defaultDirection : null,
    language,
  };
}

export async function setDefaultDirection(
  direction: Direction | null,
  store?: DataStore
): Promise<LearnerProfile> {
  const current = await loadProfile(store);
  const profile: LearnerProfile = { ...current, defaultDirection: direction };
  await writeMeta(PROFILE_KEY, profile, store);
  return profile;
}

/**
 * Sprache wechseln.
 *
 * Die Standard-Lernrichtung wird dabei zurueckgesetzt: Sie gehoerte zur alten
 * Sprache, und ein gespeichertes `de_to_th` waere nach einem Wechsel auf
 * Spanisch schlicht falsch.
 */
export async function setLanguage(
  language: LanguageCode,
  store?: DataStore
): Promise<LearnerProfile> {
  const current = await loadProfile(store);
  if (current.language === language) return current;
  const profile: LearnerProfile = { defaultDirection: null, language };
  await writeMeta(PROFILE_KEY, profile, store);
  return profile;
}

export async function clearDefaultDirection(store?: DataStore): Promise<LearnerProfile> {
  return setDefaultDirection(null, store);
}
