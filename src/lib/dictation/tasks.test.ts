import { setCurrentCatalog } from '@/lib/content/catalog-state';
import { SENTENCE_TASKS_BY_LANGUAGE, sentenceFootnote } from '@/data/sentence-tasks';

const SENTENCE_TASKS = SENTENCE_TASKS_BY_LANGUAGE.th;

import {
  DICTATION_SESSION_SIZE,
  buildDictationSession,
  dictationFootnote,
  dictationTasksFor,
} from './tasks';

/**
 * Das Diktat ERBT seinen Stoff — es erfindet keinen. Diese Datei sichert zu,
 * dass die Ableitung aus den Satz-Daten stimmt: identischer Bestand in Thai
 * (Legacy-Katalog, wie ihn das Jest-Setup stellt), ehrliche Leere in
 * Englisch/Spanisch/Deutsch, reproduzierbare Runden — und seit dem 18.09.2026
 * die durchgereichte Richtung (gleiche FSRS-Karte wie Karteikarte/Schreiben).
 */

describe('Ableitung aus den Satz-Daten', () => {
  it('Thai: genau die Satzaufgaben, keine eigenen', () => {
    const tasks = dictationTasksFor('th', 'de_to_th');
    expect(tasks.length).toBe(SENTENCE_TASKS.length);
    expect(tasks.length).toBeGreaterThan(0);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(tasks.length);
  });

  it('jede Sprache diktiert genau ihre Satzaufgaben — ohne Beispielsätze bleibt sie leer', () => {
    expect(dictationTasksFor('en', 'de_to_en')).toHaveLength(SENTENCE_TASKS_BY_LANGUAGE.en.length);
    expect(dictationTasksFor('es', 'de_to_es')).toHaveLength(SENTENCE_TASKS_BY_LANGUAGE.es.length);
    // Die deutschen Test-Wörter tragen keine Beispielsätze.
    expect(dictationTasksFor('de', 'th_to_de')).toEqual([]);
  });

  it('jede Aufgabe zeigt auf ihre Vokabel und die MITGEGEBENE Richtung', () => {
    for (const task of dictationTasksFor('th', 'de_to_th')) {
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
    const task = dictationTasksFor('th', 'de_to_th').find((entry) => entry.vocabId === quelle.vocabId);
    expect(task).toBeDefined();
    expect(task!.text).toBe(quelle.text);
    expect(task!.german).toBe(quelle.german);
  });
});

describe('Eine Runde', () => {
  it('fasst höchstens zehn Aufgaben zusammen und zieht keine doppelt', () => {
    const session = buildDictationSession('th', 'de_to_th', 42);
    expect(session.length).toBe(Math.min(DICTATION_SESSION_SIZE, SENTENCE_TASKS.length));
    expect(new Set(session.map((task) => task.id)).size).toBe(session.length);
    for (const task of session) expect(task.direction).toBe('de_to_th');
  });

  it('ist mit derselben Aussaat reproduzierbar, mit anderer anders', () => {
    const erste = buildDictationSession('th', 'de_to_th', 7);
    const zweite = buildDictationSession('th', 'de_to_th', 7);
    const dritte = buildDictationSession('th', 'de_to_th', 8);
    expect(erste.map((task) => task.id)).toEqual(zweite.map((task) => task.id));
    expect(erste.map((task) => task.id)).not.toEqual(dritte.map((task) => task.id));
  });

  it('gibt für stofflose Sprachen eine leere Runde, nicht einen Absturz', () => {
    expect(buildDictationSession('de', 'th_to_de', 1)).toEqual([]);
  });
});

describe('Der ehrliche Fußtext', () => {
  it('wird von den Satzübungen geerbt, nicht neu erfunden', () => {
    for (const language of ['th', 'en', 'es'] as const) {
      expect(dictationFootnote(language)).toBe(sentenceFootnote(language));
      expect(dictationFootnote(language).length).toBeGreaterThan(0);
    }
  });
});

/** Minimaler generierter Katalog: eine es- und eine de-Vokabel mit Beispielsatz. */
function generierterKatalog() {
  const eintrag = (id: string, language: string, term: string, beispiel: string, bedeutung: string) => ({
    id: `vokabular:${language}:${id}`,
    kind: 'vocabulary',
    check: { status: 'unchecked' },
    document: {
      id, language, term, german: bedeutung, romanization: term,
      partOfSpeech: 'noun', register: 'neutral', isConcrete: true,
      sourceVerified: false, verificationNote: 'KI-Kreuzprüfung bestanden (Test)',
      syllables: [], exampleTerm: beispiel, exampleRoman: beispiel, exampleGerman: bedeutung,
    },
  });
  return {
    version: 1,
    vocabularySource: 'generated',
    entries: [
      eintrag('es-eins', 'es', 'diez', 'Tengo diez euros.', 'Ich habe zehn Euro.'),
      eintrag('es-zwei', 'es', 'mesa', 'La mesa es nueva.', 'Der Tisch ist neu.'),
      eintrag('es-drei', 'es', 'agua', 'Bebo agua.', 'Ich trinke Wasser.'),
      eintrag('de-eins', 'de', 'Bahnhof', 'Der Bahnhof ist groß.', 'Der Bahnhof ist groß.'),
      eintrag('de-zwei', 'de', 'Fenster', 'Das Fenster ist offen.', 'Das Fenster ist offen.'),
      eintrag('de-drei', 'de', 'Zug', 'Der Zug kommt spät.', 'Der Zug kommt spät.'),
    ],
  };
}

describe('Generierter Katalog (18.09.2026): alle vier Sprachen liefern Diktat-Stoff', () => {
  afterEach(() => {
    // Das Jest-Setup stellt den leeren Legacy-Katalog; ihn wiederherstellen.
    setCurrentCatalog({ version: 1, entries: [], vocabularySource: undefined } as never);
  });

  it('baut Diktate aus den Beispielsätzen der Vokabeln — auch für Deutsch mit Richtung th_to_de', () => {
    setCurrentCatalog(generierterKatalog() as never);
    const es = dictationTasksFor('es', 'de_to_es');
    expect(es.map((task) => task.vocabId).sort()).toEqual(['es-drei', 'es-eins', 'es-zwei']);
    for (const task of es) expect(task.direction).toBe('de_to_es');

    const de = dictationTasksFor('de', 'th_to_de');
    expect(de.map((task) => task.vocabId).sort()).toEqual(['de-drei', 'de-eins', 'de-zwei']);
    for (const task of de) expect(task.direction).toBe('th_to_de');
    expect(de[0].text).toMatch(/^(Der Bahnhof ist groß|Das Fenster ist offen|Der Zug kommt spät)\./);
  });

  it('der Fußtext zählt den generierten Bestand statt des Grundstock-Textes', () => {
    setCurrentCatalog(generierterKatalog() as never);
    expect(dictationFootnote('es')).toBe(sentenceFootnote('es'));
    expect(dictationFootnote('es')).toContain('Bestand: 3');
    expect(dictationFootnote('es')).not.toContain('KI-Stimme');
  });
});
