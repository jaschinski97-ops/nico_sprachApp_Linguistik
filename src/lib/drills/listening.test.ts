import { GEMINI_VOICES, OPENAI_VOICES, defaultVoiceForGender, describeVoice, documentsGender, voicesFor } from '@/data/tts-voices';
import { VOCABULARY_EN, VOCABULARY_ES } from '@/data/vocabulary';

import { graphemeGroups } from '../spelling/graphemes';

import {
  buildSoundSpellingQuestion,
  buildStressHearQuestion,
  canBuildSoundSpellingQuestion,
  canBuildStressHearQuestion,
  withoutAccent,
} from './questions';
import { DRILL_META, DRILLS } from './types';

/**
 * Die beiden Hörübungen für Spanisch und Englisch (Phase 18).
 *
 * WAS SIE SCHLIESSEN: Bis hierher hatte nur Thai eine Hörübung. Spanisch und
 * Englisch bekamen in Phase 16 je eine Leseübung ihres Merkmals — die
 * Betonungsherleitung und den Schreibungsvergleich — aber nichts fürs Ohr.
 * Das war eine Lücke, keine Entscheidung: Betonung ist hörbar, und englische
 * Wörter mit gleicher Schreibung auseinanderzuhalten ist genau die Übung, an
 * der man im Alltag scheitert.
 */

describe('Betonung hören (Spanisch)', () => {
  it('nimmt der Antwort das Akzentzeichen weg', () => {
    // OHNE DIESE ZEILE WÄRE DIE ÜBUNG SINNLOS: Stünde „mé" in der Auswahl,
    // wäre die Antwort abzulesen statt zu hören.
    expect(withoutAccent('mé')).toBe('me');
    expect(withoutAccent('dí')).toBe('di');
    expect(withoutAccent('ño')).toBe('ño');
  });

  it('zeigt die Silben ohne Akut und spricht das Wort mit', () => {
    const medico = VOCABULARY_ES.find((entry) => entry.id === 'es_medico')!;
    const question = buildStressHearQuestion(medico);
    expect(question.options.map((option) => option.label)).toEqual(['me', 'di', 'co']);
    expect(question.correctIndex).toBe(0);
    expect(question.visible).toBeNull();
    expect(question.visibleHint).toBeNull();
    expect(question.speak).toEqual({ text: 'médico', language: 'es' });
  });

  it('nennt in der Auflösung die geschriebene Form mit Akzent', () => {
    const question = buildStressHearQuestion(
      VOCABULARY_ES.find((entry) => entry.id === 'es_cafe')!
    );
    expect(question.solution).toContain('café');
    expect(question.explanation).toContain('Akut');
  });

  it('sagt bei einem Wort ohne Zeichen, dass die Grundregel greift', () => {
    const question = buildStressHearQuestion(
      VOCABULARY_ES.find((entry) => entry.id === 'es_casa')!
    );
    expect(question.explanation).toContain('Grundregel');
  });

  it('nimmt keine einsilbigen Wörter und keine andere Sprache', () => {
    expect(canBuildStressHearQuestion(VOCABULARY_ES.find((e) => e.id === 'es_dos')!)).toBe(false);
    for (const entry of VOCABULARY_EN) expect(canBuildStressHearQuestion(entry)).toBe(false);
  });

  it('hat für den halben Grundstock Stoff', () => {
    expect(VOCABULARY_ES.filter(canBuildStressHearQuestion).length).toBeGreaterThanOrEqual(
      VOCABULARY_ES.length / 2
    );
  });
});

describe('Wort hören (Englisch)', () => {
  it('stellt die Wörter derselben Schriftstück-Gruppe zur Wahl', () => {
    const question = buildSoundSpellingQuestion(
      VOCABULARY_EN.find((entry) => entry.id === 'en_though')!
    );
    expect(question.options.map((option) => option.label).sort()).toEqual([
      'enough',
      'though',
      'thought',
      'through',
    ]);
    expect(question.options[question.correctIndex].label).toBe('though');
  });

  it('zeigt nichts und spielt das Wort vor — hier ist Hören die Aufgabe', () => {
    const question = buildSoundSpellingQuestion(
      VOCABULARY_EN.find((entry) => entry.id === 'en_through')!
    );
    expect(question.visible).toBeNull();
    // Die deutsche Bedeutung waere hier die Antwort: „durch" gibt es nur
    // einmal in der Gruppe.
    expect(question.visibleHint).toBeNull();
    expect(question.speak).toEqual({ text: 'through', language: 'en' });
  });

  it('nennt zu jeder Antwort den Laut, den sie hat', () => {
    const question = buildSoundSpellingQuestion(
      VOCABULARY_EN.find((entry) => entry.id === 'en_bread')!
    );
    for (const option of question.options) expect(option.hint).toMatch(/^\/.+\/$/);
  });

  it('braucht mindestens drei Wörter in der Gruppe', () => {
    // Bei zweien waere es ein Muenzwurf.
    for (const entry of VOCABULARY_EN) {
      const gruppe = graphemeGroups().find(
        (group) => group.grapheme === entry.englishSpelling?.grapheme
      );
      expect(canBuildSoundSpellingQuestion(entry)).toBe(Boolean(gruppe && gruppe.members.length >= 3));
    }
  });

  it('nimmt keine andere Sprache', () => {
    for (const entry of VOCABULARY_ES) expect(canBuildSoundSpellingQuestion(entry)).toBe(false);
  });
});

describe('Die Fertigkeiten sind vollständig zugeordnet', () => {
  it('gibt jeder Übung genau eine Fertigkeit', () => {
    for (const drill of DRILLS) {
      expect(['hoeren', 'lesen', 'grammatik']).toContain(DRILL_META[drill].skill);
    }
  });

  it('gibt jeder Zielsprache eine Hör- und eine Leseübung', () => {
    // Der Punkt dieser Phase: Vorher hatte nur Thai beides.
    for (const language of ['th', 'es', 'en'] as const) {
      const eigene = DRILLS.filter((drill) => DRILL_META[drill].feature === language);
      expect(eigene.map((drill) => DRILL_META[drill].skill).sort()).toEqual(['hoeren', 'lesen']);
    }
  });
});

describe('Die Stimmen der Anbieter (Phase 18)', () => {
  it('führt für Gemini dreißig Stimmen, jede mit belegtem Geschlecht', () => {
    expect(GEMINI_VOICES).toHaveLength(30);
    for (const voice of GEMINI_VOICES) {
      expect(['female', 'male']).toContain(voice.gender);
      expect(voice.style).toBeTruthy();
    }
    expect(documentsGender('gemini')).toBe(true);
  });

  it('behauptet für OpenAI KEIN Geschlecht — die Quelle sagt dazu nichts', () => {
    // Das ist die eigentliche Aussage: Eine Auswahl „weiblich/männlich" waere
    // hier geraten. Lieber keine Angabe als eine erfundene.
    expect(OPENAI_VOICES.length).toBeGreaterThan(0);
    for (const voice of OPENAI_VOICES) expect(voice.gender).toBeNull();
    expect(documentsGender('chatgpt')).toBe(false);
    expect(defaultVoiceForGender('chatgpt', 'female')).toBeNull();
  });

  it('liefert je Geschlecht eine belegte Gemini-Stimme', () => {
    expect(defaultVoiceForGender('gemini', 'female')).toBe('Kore');
    expect(defaultVoiceForGender('gemini', 'male')).toBe('Charon');
    expect(describeVoice('gemini', 'Kore')).toContain('weiblich');
    expect(describeVoice('gemini', 'Charon')).toContain('männlich');
    expect(describeVoice('chatgpt', 'nova')).toContain('nicht dokumentiert');
  });

  it('meldet einen Namen, den der Anbieter nicht führt', () => {
    expect(describeVoice('gemini', 'Erfunden')).toContain('Unbekannter Name');
  });

  it('kennt für Anbieter ohne Stimmliste keine Stimmen', () => {
    // Der Studio-Helper spricht zwar (über OpenAI), führt aber keine eigene
    // Stimmliste — die Stimme kommt serverseitig.
    expect(voicesFor('chatgpt-helper')).toEqual([]);
  });
});
