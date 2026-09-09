import { dictationConfigFor } from '@/data/dictation-config';

import { SENTENCE_FOOTNOTE_BY_LANGUAGE, SENTENCE_TASKS_BY_LANGUAGE } from '@/data/sentence-tasks';

import { seededRandom, shuffled } from '@/lib/drills/random';

import { type Direction, type LanguageCode } from '@/lib/languages/types';

/**
 * Diktat-Aufgaben aus den geprüften Satz-Daten — NICHT aus einem zweiten
 * Satzbestand. `SENTENCE_TASKS_BY_LANGUAGE` enthält genau die Satzlesarten,
 * die das Audit in `data/sentence-tasks.ts` für vollständig und belegt
 * gehalten hat, inklusive Ton-geprüfter Clips; das Diktat erbt sie und damit
 * auch deren Ehrlichkeit: Es gibt heute nur Thai-Sätze, für Englisch und
 * Spanisch bleibt die Liste **leer** — und die Übung sagt das, statt Stoff zu
 * erfinden (dieselbe Regel wie AE-66).
 *
 * Die Richtung ist `de_to_<Sprache>`: Diktat heißt, die **Zielsprache
 * hervorbringen** — dasselbe vermögen, das Karteikarte und freies Schreiben
 * in dieser Richtung abfragen. Deshalb darf das Diktat bei Erfolg dieselbe
 * Karte fortschreiben (AE-16: eine Erinnerungsspur je Item, kein zweiter
 * Schlüssel `vocabId:direction`).
 */

export type DictationTask = {
  /** `dictation-<vocabId>` — eindeutig je Vokabel. */
  id: string;
  /** Die Vokabel, aus deren Satzlesart das Diktat entstand — Schlüssel der FSRS-Karte. */
  vocabId: string;
  /** Zielsprache, die getippt wird. */
  language: LanguageCode;
  /** Immer `de_to_<language>`: die Zielsprache wird produziert. */
  direction: Direction;
  /** Der Satz, den es zu hören und zu tippen gilt — die Lösung. */
  text: string;
  /** Bedeutung auf Deutsch — erst NACH der Auswertung gezeigt, sonst liest man die Lösung vor dem Hören. */
  german: string;
  /** Umschrift — ebenfalls erst nach der Auswertung (sie wäre die halbe Lösung). */
  roman: string;
  /** Der Satzregel-Hinweis aus dem Audit, nach der Auswertung gezeigt. */
  focus: string;
};

/** Sprachen ohne geprüfte Sätze liefern ehrlich nichts — der Runner zeigt einen Hinweis. */
export function dictationTasksFor(language: LanguageCode): DictationTask[] {
  // Der Konfigurationseintrag ist die Fachlichkeit-Prüfung: Eine Sprache
  // ohne Diktat-Regeln kann keine Diktate urteilen.
  dictationConfigFor(language);
  return SENTENCE_TASKS_BY_LANGUAGE[language]
    .filter((task) => task.text.trim().length > 0)
    .map((task) => ({
      id: `dictation-${task.vocabId}`,
      vocabId: task.vocabId,
      language,
      direction: `de_to_${language}` as Direction,
      text: task.text,
      german: task.german,
      roman: task.roman,
      focus: task.focus,
    }));
}

/** Wie eine Runde freies Schreiben — kurz genug, dass sie zu Ende geübt wird. */
export const DICTATION_SESSION_SIZE = 10;

/**
 * Eine Diktat-Runde: gemischt, mit Aussaat reproduzierbar (dieselbe Bauart
 * wie die Sitzungen der Übungen — Tests stellen sie exakt nach).
 */
export function buildDictationSession(
  language: LanguageCode,
  seed: number = Date.now(),
  size: number = DICTATION_SESSION_SIZE
): DictationTask[] {
  return shuffled(dictationTasksFor(language), seededRandom(seed)).slice(0, size);
}

/** Der ehrliche Fußtext je Sprache — geerbt von den Satzübungen. */
export function dictationFootnote(language: LanguageCode): string {
  return SENTENCE_FOOTNOTE_BY_LANGUAGE[language];
}
