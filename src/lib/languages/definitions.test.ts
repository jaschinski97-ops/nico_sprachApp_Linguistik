import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { dictionaries, UI_LANGUAGES } from '../i18n';
import { DRILL_META } from '../drills/types';

import { dictationPromptKey, hoerDrillFuer, LEARNING_LANGUAGES, writingPromptKey } from './definitions';
import { contentDirectionOf, isPairDirection, LANGUAGE_CODES, targetLanguageOf } from './types';

/**
 * Die Checkliste „neue Lernsprache“ als Test (Sprach-Umbau 23.09.2026):
 * Wer eine Sprache in `LANGUAGE_CODES` einträgt, erfährt hier, was fehlt.
 */
describe('Jede Lernsprache ist vollständig beschrieben', () => {
  it.each(LANGUAGE_CODES)('%s hat eine Definition mit allem, was die App braucht', (code) => {
    const def = LEARNING_LANGUAGES[code];
    expect(def.code).toBe(code);
    expect(def.label.trim()).not.toBe('');
    expect(def.endonym.trim()).not.toBe('');
    expect(def.speechLocale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    expect(def.speechRate).toBeGreaterThan(0);
    expect(def.greeting.word.trim()).not.toBe('');
    expect(def.generatorRules.trim().length).toBeGreaterThan(20);
    expect(def.checkPoint3.trim()).not.toBe('');
    expect(def.dialogRules.trim()).not.toBe('');
    expect(def.placeholders.word.trim()).not.toBe('');
    // Sprachspezifische Übungen gehören genau zu dieser Sprache.
    for (const drill of def.drills) expect(DRILL_META[drill].feature).toBe(code);
    // Eine Hörübung ist optional — wenn es sie gibt, gehört sie zur Sprache.
    const hoer = hoerDrillFuer(code);
    if (hoer) expect(def.drills).toContain(hoer);
  });

  it.each(LANGUAGE_CODES)('%s hat Texte in allen 20 App-Sprachen', (code) => {
    const def = LEARNING_LANGUAGES[code];
    const keys = [def.challenge, def.feature.label, def.feature.description, writingPromptKey(code), dictationPromptKey(code)];
    for (const ui of UI_LANGUAGES) {
      for (const key of keys) expect(dictionaries[ui][key]).toBeTruthy();
    }
  });

  it.each(LANGUAGE_CODES)('%s hat eine gültige Inhalts-Richtung', (code) => {
    const direction = contentDirectionOf(code);
    expect(isPairDirection(direction)).toBe(true);
    expect(targetLanguageOf(direction)).toBe(code);
  });

  it('belegt jedes Sprachmerkmal mit einer Quelle', () => {
    for (const code of LANGUAGE_CODES) {
      const source = LEARNING_LANGUAGES[code].feature.source;
      expect(source?.url).toMatch(/^https:\/\//);
      expect(source?.quote.length ?? 0).toBeGreaterThan(40);
    }
  });
});

describe('Die Testdaten bleiben außerhalb der App', () => {
  const root = path.resolve(__dirname, '../..');
  const dateien = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const voll = path.join(dir, name);
      if (statSync(voll).isDirectory()) return name === 'test-fixtures' ? [] : dateien(voll);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [voll] : [];
    });

  it('kein App-Modul importiert den früheren Grundstock oder den Testkatalog', () => {
    const verstoesse = dateien(root).filter((datei) => /test-fixtures\//.test(readFileSync(datei, 'utf8')));
    expect(verstoesse.map((datei) => path.relative(root, datei))).toEqual([]);
  });
});
