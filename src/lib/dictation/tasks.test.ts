import { SENTENCE_FOOTNOTE_BY_LANGUAGE, SENTENCE_TASKS, SENTENCE_TASKS_BY_LANGUAGE } from '@/data/sentence-tasks';

import {
  DICTATION_SESSION_SIZE,
  buildDictationSession,
  dictationFootnote,
  dictationTasksFor,
} from './tasks';

/**
 * Das Diktat ERBT seinen Stoff — es erfindet keinen. Diese Datei sichert zu,
 * dass die Ableitung aus den geprüften Satz-Daten stimmt: identischer Bestand
 * in Thai, ehrliche Leere in Englisch und Spanisch, reproduzierbare Runden.
 */

describe('Ableitung aus den Satz-Daten', () => {
  it('Thai: genau die geprüften Satzlesarten, keine eigenen', () => {
    const tasks = dictationTasksFor('th');
    expect(tasks.length).toBe(SENTENCE_TASKS.length);
    expect(tasks.length).toBeGreaterThan(0);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(tasks.length);
  });

  it('Englisch und Spanisch bleiben ehrlich leer — es gibt dort keinen geprüften Satzstoff', () => {
    expect(dictationTasksFor('en')).toEqual([]);
    expect(dictationTasksFor('es')).toEqual([]);
    // Und das ist keine Diskrepanz zur Quelle, sondern deren Spiegelbild:
    expect(SENTENCE_TASKS_BY_LANGUAGE.en).toEqual([]);
    expect(SENTENCE_TASKS_BY_LANGUAGE.es).toEqual([]);
  });

  it('jede Aufgabe zeigt auf ihre Vokabel und ihre Richtung (de → Ziel)', () => {
    for (const task of dictationTasksFor('th')) {
      expect(task.id).toBe(`dictation-${task.vocabId}`);
      expect(task.direction).toBe('de_to_th');
      expect(task.text.trim().length).toBeGreaterThan(0);
      expect(task.german.trim().length).toBeGreaterThan(0);
      // Die Umschrift wäre beim Diktat die halbe Lösung — sie muss da sein,
      // damit der Runner sie erst NACH der Auswertung zeigen kann.
      expect(task.roman.length).toBeGreaterThan(0);
      expect(task.focus.length).toBeGreaterThan(0);
    }
  });

  it('übernimmt den Satztext unverändert aus der Quelle', () => {
    const quelle = SENTENCE_TASKS[0];
    const task = dictationTasksFor('th').find((entry) => entry.vocabId === quelle.vocabId);
    expect(task).toBeDefined();
    expect(task!.text).toBe(quelle.text);
    expect(task!.german).toBe(quelle.german);
  });
});

describe('Eine Runde', () => {
  it('fasst höchstens zehn Aufgaben zusammen und zieht keine doppelt', () => {
    const session = buildDictationSession('th', 42);
    expect(session.length).toBe(Math.min(DICTATION_SESSION_SIZE, SENTENCE_TASKS.length));
    expect(new Set(session.map((task) => task.id)).size).toBe(session.length);
    for (const task of session) expect(task.direction).toBe('de_to_th');
  });

  it('ist mit derselben Aussaat reproduzierbar, mit anderer anders', () => {
    const erste = buildDictationSession('th', 7);
    const zweite = buildDictationSession('th', 7);
    const dritte = buildDictationSession('th', 8);
    expect(erste.map((task) => task.id)).toEqual(zweite.map((task) => task.id));
    expect(erste.map((task) => task.id)).not.toEqual(dritte.map((task) => task.id));
  });

  it('gibt für stofflose Sprachen eine leere Runde, nicht einen Absturz', () => {
    expect(buildDictationSession('en', 1)).toEqual([]);
    expect(buildDictationSession('es', 1)).toEqual([]);
  });
});

describe('Der ehrliche Fußtext', () => {
  it('wird von den Satzübungen geerbt, nicht neu erfunden', () => {
    for (const language of ['th', 'en', 'es'] as const) {
      expect(dictationFootnote(language)).toBe(SENTENCE_FOOTNOTE_BY_LANGUAGE[language]);
      expect(dictationFootnote(language).length).toBeGreaterThan(0);
    }
  });
});
