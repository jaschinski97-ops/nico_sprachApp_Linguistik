import { Direction } from './fsrs/types';
import { defaultLanguage, hasContent } from './languages/registry';
import { isLanguageCode, LanguageCode, languageOfDirection } from './languages/types';
import { readMeta, writeMeta } from './repository';
import { DataStore, getStore, withStoreLock } from './storage';

/**
 * Lernprofil: welche Sprache gelernt wird — und wo man zuletzt stand.
 *
 * WAS SICH GEGENÜBER AE-17 GEÄNDERT HAT. Bis hierher gab es eine
 * **Standard-Lernrichtung**: eine ausdrücklich gesetzte Vorgabe, mit der der
 * Lernen-Reiter startet, dazu „Immer fragen" als dritte Möglichkeit. Der
 * Gedanke dahinter war richtig — die Richtung jedes Mal neu zu wählen ist
 * Reibung mit vorhersehbarer Antwort — die Umsetzung aber umständlich: Man
 * musste einen Standard **setzen**, um ihn zu haben, und ihn in den
 * Einstellungen wieder aufheben.
 *
 * An seine Stelle tritt das **Weitermachen**: Der Lernen-Reiter merkt sich,
 * welche Richtung und welche Übung zuletzt offen waren, und öffnet sie beim
 * nächsten Mal wieder. Niemand muss dafür etwas einstellen, und es gibt
 * nichts, was man versehentlich festschreibt.
 *
 * DIE SORGE AUS AE-17 BLEIBT BEANTWORTET: Ein Standard darf keine
 * Einbahnstraße werden. Deshalb setzt jede Sprachwahl auf der Übersicht den
 * gemerkten Stand **zurück** — auch wenn dieselbe Sprache noch einmal gewählt
 * wird. Das ist die Geste „von vorn anfangen", und sie ist genau dort, wo man
 * sie sucht. Zusätzlich bleiben Sprache und Richtung im Lernen-Bereich selbst
 * jederzeit wechselbar.
 *
 * Abgelegt in der Sammlung `meta`, die seit Phase 1 dafür vorgesehen ist.
 */

const PROFILE_KEY = 'profile';

/** Wo der Lernen-Reiter zuletzt stand. */
export type ReviewSpot = {
  direction: Direction;
  /** Karteikarten oder eine Übung — als Zeichenkette, damit `lib` die Screens nicht kennt. */
  mode: string;
};

export type LearnerProfile = {
  /**
   * Welche Sprache gerade gelernt wird (Phase 15). Steuert alle Bereiche.
   * Ein unbekannter oder inhaltsloser Wert ergibt die Standardsprache statt
   * einer leeren App.
   */
  language: LanguageCode;
  /**
   * Richtung und Übung, die im Lernen-Reiter zuletzt offen waren, oder `null`.
   * Gehört immer zur aktuellen Sprache — ein Stand aus einer anderen wird beim
   * Lesen verworfen, sonst zeigte der Reiter nach einem Sprachwechsel eine
   * Richtung, die es dort gar nicht gibt.
   */
  review: ReviewSpot | null;
  /** Welche Richtung im Gespräch-Reiter zuletzt offen war, oder `null`. */
  conversation: Direction | null;
};

/**
 * Ist das eine Richtung, die es wirklich gibt?
 *
 * SEIT PHASE 16 AUS DEM SPRACHMODELL. Vorher standen hier zwei Literale, und
 * ein gespeichertes `de_to_es` waere beim naechsten Start still verworfen
 * worden - der Nutzer haette seine gemerkte Richtung ohne Meldung verloren.
 */
function isDirection(value: unknown): value is Direction {
  if (typeof value !== 'string') return false;
  const teile = value.split('_to_');
  if (teile.length !== 2) return false;
  const [von, nach] = teile;
  return (von === 'de' && isLanguageCode(nach)) || (nach === 'de' && isLanguageCode(von));
}

function readSpot(value: unknown, language: LanguageCode): ReviewSpot | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { direction?: unknown; mode?: unknown };
  if (!isDirection(raw.direction) || languageOfDirection(raw.direction) !== language) return null;
  return { direction: raw.direction, mode: typeof raw.mode === 'string' ? raw.mode : 'cards' };
}

export async function loadProfile(store?: DataStore): Promise<LearnerProfile> {
  const stored = await readMeta<Record<string, unknown>>(PROFILE_KEY, {}, store);
  // Bewusst nachsichtig gelesen: ein Profil aus einer aelteren Version darf
  // die App nicht in die Auswahl sperren oder gar abstuerzen lassen. Ein
  // Profil aus der Zeit vor dieser Aenderung traegt `defaultDirection`; das
  // Feld wird schlicht ignoriert, und der Reiter startet mit der Auswahl.
  const language =
    isLanguageCode(stored?.language) && hasContent(stored.language)
      ? stored.language
      : defaultLanguage();
  const conversation = isDirection(stored?.conversation) ? stored.conversation : null;
  return {
    language,
    review: readSpot(stored?.review, language),
    conversation:
      conversation && languageOfDirection(conversation) === language ? conversation : null,
  };
}

async function write(profile: LearnerProfile, store?: DataStore): Promise<LearnerProfile> {
  await writeMeta(PROFILE_KEY, profile, store);
  return profile;
}

/**
 * Lesen-Ändern-Schreiben am EINEN Profildokument, unter der Store-Sperre.
 *
 * Die Setter werden von den Reitern fire-and-forget gerufen, und zwei schnelle
 * Wechsel (etwa Gespräch-Richtung während der Lernen-Reiter seinen Stand
 * merkt) lesen sonst beide denselben Stand — der zweite Write wirft die
 * Änderung des ersten ersatzlos weg. Serialisiert bleibt jedes Feld, das
 * zuletzt gemeint war, auch wirklich gesetzt.
 */
async function update(
  store: DataStore | undefined,
  change: (current: LearnerProfile) => LearnerProfile
): Promise<LearnerProfile> {
  const db = store ?? (await getStore());
  return withStoreLock(db, async () => write(change(await loadProfile(db)), db));
}

/** Merkt sich, wo der Lernen-Reiter steht. `null` vergisst den Stand. */
export async function setReviewSpot(
  spot: ReviewSpot | null,
  store?: DataStore
): Promise<LearnerProfile> {
  return update(store, (current) => ({ ...current, review: spot }));
}

/** Merkt sich die Richtung des Gespräch-Reiters. */
export async function setConversationDirection(
  direction: Direction | null,
  store?: DataStore
): Promise<LearnerProfile> {
  return update(store, (current) => ({ ...current, conversation: direction }));
}

/**
 * Sprache wechseln — und dabei bewusst von vorn anfangen.
 *
 * Der gemerkte Stand gehört zur alten Sprache und fällt weg. Das gilt
 * **auch**, wenn dieselbe Sprache noch einmal gewählt wird: Auf der Übersicht
 * ist das die Geste „neu anfangen", und wer sie macht, will die Auswahl sehen
 * und nicht dort landen, wo er gestern aufgehört hat.
 */
export async function setLanguage(
  language: LanguageCode,
  store?: DataStore
): Promise<LearnerProfile> {
  return update(store, () => ({ language, review: null, conversation: null }));
}
