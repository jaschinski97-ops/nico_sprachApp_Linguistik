import { MemoryDataStore } from '../storage';

import { buildWordSpeakingSession, WORD_SPEAKING_SIZE } from './word-session';

const T0 = Date.UTC(2026, 8, 1, 10);

describe('Wort-Nachsprechen (en/es)', () => {
  it('stellt eine Runde aus dem Bestand der Richtung', async () => {
    const store = new MemoryDataStore();
    await store.init();
    const session = await buildWordSpeakingSession({ direction: 'de_to_es', store, now: T0 });
    expect(session.available).toBeGreaterThan(0);
    expect(session.tasks.length).toBe(Math.min(WORD_SPEAKING_SIZE, session.available));
    for (const task of session.tasks) {
      expect(task.term.length).toBeGreaterThan(0);
      expect(task.meaning.length).toBeGreaterThan(0);
      expect(task.roman.length).toBeGreaterThan(0);
    }
  });

  it('lässt dieselbe Richtung zweimal dieselbe Runde bauen (deterministischer Seed)', async () => {
    const store = new MemoryDataStore();
    await store.init();
    const a = await buildWordSpeakingSession({ direction: 'de_to_en', store, now: T0, seed: 7 });
    const b = await buildWordSpeakingSession({ direction: 'de_to_en', store, now: T0, seed: 7 });
    expect(a.tasks.map((task) => task.id)).toEqual(b.tasks.map((task) => task.id));
  });
});
