import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SENTENCE_AUDIT, SENTENCE_FOOTNOTE_BY_LANGUAGE, SENTENCE_TASKS, SENTENCE_TASKS_BY_LANGUAGE } from '@/data/sentence-tasks';
import { VOCABULARY_TH } from '@/data/vocabulary';
import { measureSentence, preparationRemaining, sentenceAnswers, sentenceSession, SENTENCE_WINDOWS_MS } from './sentence-session';

test('all 84 examples have an explicit audit; tasks inherit no blanket sentence-verification flag', () => {
  expect(SENTENCE_AUDIT).toHaveLength(VOCABULARY_TH.length);
  expect(new Set(SENTENCE_AUDIT.map(entry => entry.vocabId)).size).toBe(84);
  for (const task of SENTENCE_TASKS) {
    const original = VOCABULARY_TH.find(word => word.id === task.vocabId)!;
    expect(task.text).toBe(original.exampleTerm);
    expect(task.german).toBe(original.exampleGerman);
    expect(task.lexicalSources.length).toBeGreaterThan(0);
    expect(task.ruleSource).toMatch(/^https:\/\/seasite\.niu\.edu\//);
    expect(task.reviewMethod).toContain('not verbatim');
    expect(new Set(task.answers).size).toBe(3);
    expect(task.answers.filter(answer => answer === task.german)).toHaveLength(1);
  }
  for (const id of ['soong', 'nam', 'sawatdii', 'bpai', 'raan', 'noon']) {
    expect(SENTENCE_AUDIT.find(entry => entry.vocabId === id)?.eligible).toBe(false);
  }
});
test('whole-sentence contrasts, stable randomised rounds and mandatory time windows', () => {
  const task = SENTENCE_TASKS.find(task => task.vocabId === 'rak')!;
  expect(task.answers).toContain('Du liebst mich.');
  expect(sentenceSession('th', 3)).toEqual(sentenceSession('th', 3));
  expect(sentenceSession('th', 3)).toHaveLength(SENTENCE_TASKS.length);
  expect(new Set(sentenceAnswers(task, 2))).toEqual(new Set(task.answers));
  expect(preparationRemaining(100, 101)).toBe(14999);
  expect(preparationRemaining(100, 15100)).toBe(0);
  expect(SENTENCE_WINDOWS_MS).toEqual([12000, 9000, 6000]);
});
test('measurement is local descriptive F0, with no speech-recognition or learning-state writes', () => {
  const measurement = measureSentence({ samples: new Float32Array(8000), sampleRate: 8000, durationMs: 1000, reachedLimit: true });
  expect(measurement).toMatchObject({ durationMs: 1000, reachedLimit: true, voicedFramePercent: 0, contour: { status: 'unmeasurable' } });
  for (const file of ['src/lib/speaking/sentence-session.ts', 'src/components/sentence-runner.tsx']) {
    const source = readFileSync(path.resolve(file), 'utf8');
    expect(source).not.toMatch(/\bfetch\s*\(|saveAudioClip|rateCard|writeMeta|SpeechRecognition|createClipGenerationClient/);
  }
});
test('sentence registry serves every language honestly (AE-66): Thai full, others empty instead of invented', () => {
  expect(SENTENCE_TASKS_BY_LANGUAGE.th).toBe(SENTENCE_TASKS);
  expect(SENTENCE_TASKS_BY_LANGUAGE.th.length).toBeGreaterThan(0);
  // Spanisch führt 30 Beispiele, aber nur Wortgruppen — die bleiben draußen.
  expect(SENTENCE_TASKS_BY_LANGUAGE.es).toEqual([]);
  // Englisch hat bewusst keine Beispiele (Phase 16).
  expect(SENTENCE_TASKS_BY_LANGUAGE.en).toEqual([]);
  // Die Sitzung einer leeren Sprache ist leer, nicht fehlerhaft.
  expect(sentenceSession('es', 1)).toEqual([]);
  expect(sentenceSession('en', 1)).toEqual([]);
  // Jede Sprache hat einen Fußtext, der Bestand oder Fehlendes benennt.
  for (const code of ['th', 'es', 'en'] as const) {
    expect(SENTENCE_FOOTNOTE_BY_LANGUAGE[code].length).toBeGreaterThan(10);
  }
});
