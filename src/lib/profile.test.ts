import { loadProfile, setConversationDirection, setLanguage, setReviewSpot } from './profile';
import { DataStore, MemoryDataStore } from './storage';

async function freshStore(): Promise<DataStore> {
  const store = new MemoryDataStore();
  await store.init();
  return store;
}

describe('Profil-Schreibzugriffe', () => {
  it('überschreiben sich gegenseitig nicht, wenn zwei Reiter schnell hintereinander schreiben', async () => {
    const store = await freshStore();

    // Fire-and-forget wie in den Reitern: Lernen-Reiter merkt seinen Stand,
    // Gespräch-Reiter seine Richtung — ohne Serialisierung läse jeder den
    // (noch leeren) Stand und der letzte Write wirfe die Änderung des
    // ersten ersatzlos weg.
    await Promise.all([
      setReviewSpot({ direction: 'th_to_de', mode: 'cards' }, store),
      setConversationDirection('de_to_th', store),
    ]);

    const profile = await loadProfile(store);
    expect(profile.review).toEqual({ direction: 'th_to_de', mode: 'cards' });
    expect(profile.conversation).toBe('de_to_th');
  });

  it('nimmt auch drei Schreibzugriffe verschiedener Felder vollständig mit', async () => {
    const store = await freshStore();
    await setLanguage('en', store);

    await Promise.all([
      setReviewSpot({ direction: 'de_to_en', mode: 'tone' }, store),
      setReviewSpot({ direction: 'en_to_de', mode: 'cards' }, store),
      setConversationDirection('en_to_de', store),
    ]);

    const profile = await loadProfile(store);
    // Beim gemerkten Stand gewinnt der letzte Schreibzugriff — aber die
    // Richtung des Gespräch-Reiters überlebt ihn.
    expect(profile.review).toEqual({ direction: 'en_to_de', mode: 'cards' });
    expect(profile.conversation).toBe('en_to_de');
  });
});
