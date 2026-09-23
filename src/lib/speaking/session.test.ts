// PHASE 16: `VOCABULARY` umfasst jetzt alle drei Sprachen. Was diese Datei
// zusichert, gilt dem Thai-Grundstock aus Phase 2 - deshalb hier
// ausdruecklich der. Unterhalb dieser Zeile hat sich nichts geaendert.
import { VOCABULARY_TH as VOCABULARY } from '@/test-fixtures/legacy-vocabulary';
import { MemoryDataStore } from '@/lib/storage/memory-store';

import { canBuildSpeakingPrompt } from './domain';
import { buildSpeakingSession } from './session';

describe('Sprechsitzung und FSRS', () => {
  it('liest Kartenzustände höchstens zur Auswahl und legt oder bewertet keine FSRS-Karte', async () => {
    const store = new MemoryDataStore();
    await store.init();
    // Der Wortschatz kommt aus dem (Test-)Katalog; der Speicher bekommt dieselben Einträge.
    const entries = VOCABULARY.filter(canBuildSpeakingPrompt);
    await store.putMany(
      'vocab',
      entries.map((entry) => ({ id: entry.id, value: entry }))
    );

    const before = await store.getAll('cards');
    const session = await buildSpeakingSession({ store, size: 4, seed: 12, now: 1_000 });
    const after = await store.getAll('cards');

    expect(session.available).toBe(entries.length);
    expect(session.prompts).toHaveLength(4);
    expect(session.prompts.every((prompt) => prompt.targetSource === 'verified-vocabulary-syllables')).toBe(
      true
    );
    expect(before).toEqual([]);
    expect(after).toEqual([]);
  });
});
