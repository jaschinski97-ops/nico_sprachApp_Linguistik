import { VOCABULARY_EN, VOCABULARY_ES } from '@/data/vocabulary';

import { seedVocabulary } from '../repository';
import { MemoryDataStore } from '../storage';

import {
  buildSpellingQuestion,
  buildStressQuestion,
  canBuildSpellingQuestion,
  canBuildStressQuestion,
} from './questions';
import { buildDrillSession } from './session';
import { directionForDrill, DRILL_META } from './types';

/**
 * Die beiden neuen Übungen (Phase 16).
 *
 * SIE SIND VERSCHIEDEN GEBAUT, UND DAS IST DER PUNKT. Spanisch bekommt eine
 * Herleitung nach dem Muster von Phase 13, weil die Quelle sagt, die Betonung
 * sei aus der Schreibung eindeutig ableitbar. Englisch bekommt ausdrücklich
 * **keine**, weil dieselbe Art Quelle das Gegenteil sagt. Wer beide Übungen
 * nebeneinander sieht, sieht den Befund aus AE-44.
 */

const T0 = Date.UTC(2026, 8, 4);

async function frischerSpeicher() {
  const store = new MemoryDataStore();
  await store.init();
  await seedVocabulary(store);
  return store;
}

describe('Betonung herleiten (Spanisch)', () => {
  it('nimmt nur mehrsilbige Wörter', () => {
    const medico = VOCABULARY_ES.find((entry) => entry.id === 'es_medico')!;
    const dos = VOCABULARY_ES.find((entry) => entry.id === 'es_dos')!;
    expect(canBuildStressQuestion(medico)).toBe(true);
    // Bei einem einsilbigen Wort haette die Frage genau eine Antwort.
    expect(canBuildStressQuestion(dos)).toBe(false);
  });

  it('nimmt kein Wort aus einer anderen Sprache', () => {
    for (const entry of VOCABULARY_EN) expect(canBuildStressQuestion(entry)).toBe(false);
  });

  it('macht die Silben selbst zu den Antworten', () => {
    const question = buildStressQuestion(
      VOCABULARY_ES.find((entry) => entry.id === 'es_medico')!
    );
    expect(question.options.map((option) => option.label)).toEqual(['mé', 'di', 'co']);
    expect(question.correctIndex).toBe(0);
    // Die Anzahl der Antworten haengt am Wort - anders als bei den fuenf
    // Toenen, die ein festes Inventar sind.
    const comer = buildStressQuestion(VOCABULARY_ES.find((entry) => entry.id === 'es_comer')!);
    expect(comer.options).toHaveLength(2);
    expect(comer.correctIndex).toBe(1);
  });

  it('zeigt die Schreibung, aber nicht die Silbentrennung', () => {
    const question = buildStressQuestion(
      VOCABULARY_ES.find((entry) => entry.id === 'es_profesor')!
    );
    // Die Trennung waere der halbe Weg zur Antwort - genau wie in Phase 13 die
    // Umschrift bei der Ton-Herleitung.
    expect(question.visible).toBe('profesor');
    expect(question.visible).not.toContain('-');
    expect(question.speak).toBeNull();
  });

  it('liefert die Herleitung Schritt für Schritt', () => {
    const question = buildStressQuestion(VOCABULARY_ES.find((entry) => entry.id === 'es_comer')!);
    expect(question.derivation?.map((step) => step.label)).toEqual([
      'Silben',
      'Wortende',
      'Grundregel',
    ]);
    expect(question.explanation).toContain('letzte Silbe');
  });

  it('gibt den Vorbehalt weiter, wo der Akut nicht die Betonung meint', () => {
    const donde = VOCABULARY_ES.find((entry) => entry.id === 'es_donde')!;
    expect(buildStressQuestion(donde).uncertain).toContain('Unterscheidung');
  });

  it('lässt sich für den halben Grundstock bauen', () => {
    const moeglich = VOCABULARY_ES.filter(canBuildStressQuestion);
    expect(moeglich.length).toBeGreaterThanOrEqual(VOCABULARY_ES.length / 2);
  });
});

describe('Gleiche Schreibung, anderer Laut (Englisch)', () => {
  it('nimmt nur Wörter mit einem Gegenstück', () => {
    const enough = VOCABULARY_EN.find((entry) => entry.id === 'en_enough')!;
    const cat = VOCABULARY_EN.find((entry) => entry.id === 'en_cat')!;
    expect(canBuildSpellingQuestion(enough)).toBe(true);
    expect(canBuildSpellingQuestion(cat)).toBe(false);
  });

  it('stellt als Antworten echte Lesarten desselben Schriftstücks auf', () => {
    const question = buildSpellingQuestion(
      VOCABULARY_EN.find((entry) => entry.id === 'en_enough')!
    );
    expect(question.options.map((option) => option.label)).toContain('/ʌf/');
    expect(question.options.map((option) => option.label)).toContain('/uː/');
    expect(question.options[question.correctIndex].label).toBe('/ʌf/');
    // Jede falsche Antwort ist die echte Aussprache eines anderen Wortes aus
    // demselben Grundstock - und der Hinweis nennt es.
    const falsche = question.options.filter((_, index) => index !== question.correctIndex);
    for (const option of falsche) expect(option.hint).toBeTruthy();
    // Als Beispiel steht dort NIE das gefragte Wort - das waere die Antwort.
    for (const option of question.options) expect(option.hint).not.toBe('enough');
  });

  it('spielt das Wort NICHT vor — das wäre die Antwort', () => {
    const question = buildSpellingQuestion(
      VOCABULARY_EN.find((entry) => entry.id === 'en_though')!
    );
    expect(question.speak).toBeNull();
    expect(question.visible).toBe('though');
    expect(question.visibleHint).toContain('ough');
  });

  it('nennt in der Auflösung die anderen Lesarten', () => {
    const question = buildSpellingQuestion(
      VOCABULARY_EN.find((entry) => entry.id === 'en_through')!
    );
    expect(question.explanation).toContain('enough');
    expect(question.explanation).toContain('thought');
    // „Anders gesprochen" nennt nur, was wirklich anders klingt.
    expect(question.explanation).not.toContain('through /uː/');
  });

  it('trägt keine Herleitung — es gibt keine Regel, die sie zeigen könnte', () => {
    // Das ist kein Versäumnis, sondern AE-44: Fuer Englisch waere eine
    // Herleitung sachlich falsch.
    const question = buildSpellingQuestion(
      VOCABULARY_EN.find((entry) => entry.id === 'en_bread')!
    );
    expect(question.derivation).toBeUndefined();
    expect(DRILL_META.spelling.description).toContain('nicht aus der Schreibung ableiten');
    expect(DRILL_META.stressRule.description).toContain('Wortende und Akut');
  });
});

describe('Die Sitzung kennt ihre Sprache', () => {
  it('rechnet Richtung aus Übung und Sprache statt aus einer Tabelle', () => {
    expect(directionForDrill('stressRule', 'es')).toBe('de_to_es');
    expect(directionForDrill('spelling', 'en')).toBe('de_to_en');
    // Die deutschen Grammatikuebungen laufen fuer JEDES Paar auf "X -> de".
    expect(directionForDrill('article', 'es')).toBe('es_to_de');
    expect(directionForDrill('verbForms', 'en')).toBe('en_to_de');
    expect(directionForDrill('article', 'th')).toBe('th_to_de');
  });

  it('baut eine spanische Betonungssitzung aus spanischen Vokabeln', async () => {
    const store = await frischerSpeicher();
    const session = await buildDrillSession({
      drill: 'stressRule',
      language: 'es',
      store,
      now: T0,
      seed: 1,
    });
    expect(session.questions.length).toBeGreaterThan(0);
    const spanisch = new Set(VOCABULARY_ES.map((entry) => entry.id));
    for (const question of session.questions) {
      expect(spanisch.has(question.vocabId)).toBe(true);
      expect(question.direction).toBe('de_to_es');
    }
  });

  it('baut eine englische Aussprachesitzung aus englischen Vokabeln', async () => {
    const store = await frischerSpeicher();
    const session = await buildDrillSession({
      drill: 'spelling',
      language: 'en',
      store,
      now: T0,
      seed: 1,
    });
    expect(session.available).toBeGreaterThanOrEqual(10);
    const englisch = new Set(VOCABULARY_EN.map((entry) => entry.id));
    for (const question of session.questions) {
      expect(englisch.has(question.vocabId)).toBe(true);
      expect(question.direction).toBe('de_to_en');
    }
  });

  it('mischt in einer spanischen Artikelsitzung keine Thai-Vokabeln', async () => {
    // DER FEHLER, DEN PHASE 16 VERMEIDEN MUSSTE: Der Speicher traegt jetzt
    // drei Grundstoecke. Ohne den Sprachfilter in `ensureCardStates` waeren
    // hier thailaendische Woerter mit deutschem Artikel gelandet.
    const store = await frischerSpeicher();
    const session = await buildDrillSession({
      drill: 'article',
      language: 'es',
      store,
      now: T0,
      seed: 7,
    });
    const spanisch = new Set(VOCABULARY_ES.map((entry) => entry.id));
    expect(session.questions.length).toBeGreaterThan(0);
    for (const question of session.questions) {
      expect(spanisch.has(question.vocabId)).toBe(true);
      expect(question.direction).toBe('es_to_de');
      // Und der Kontexthinweis zeigt das spanische Wort, nicht das
      // thailaendische.
      expect(question.visibleHint).toBeTruthy();
    }
  });

  it('legt in einer spanischen Sitzung nur spanische Karten an', async () => {
    const store = await frischerSpeicher();
    await buildDrillSession({ drill: 'article', language: 'es', store, now: T0, seed: 1 });
    const cards = await store.getAll<{ vocabId: string }>('cards');
    const spanisch = new Set(VOCABULARY_ES.map((entry) => entry.id));
    expect(cards.length).toBe(VOCABULARY_ES.length);
    for (const card of cards) expect(spanisch.has(card.vocabId)).toBe(true);
  });
});
