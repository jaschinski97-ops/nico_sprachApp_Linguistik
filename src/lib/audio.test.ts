import {
  playPronunciation,
  PronunciationBackend,
  registerAudioAssetResolver,
  setPronunciationBackend,
  stopPronunciation,
} from './audio';

type Call = { kind: string; args: unknown[] };

function recordingBackend(): { backend: PronunciationBackend; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    backend: {
      async playAsset(uri) {
        calls.push({ kind: 'playAsset', args: [uri] });
      },
      async speak(text, locale, rate) {
        calls.push({ kind: 'speak', args: [text, locale, rate] });
      },
      async stop() {
        calls.push({ kind: 'stop', args: [] });
      },
    },
  };
}

describe('playPronunciation', () => {
  let calls: Call[];

  beforeEach(() => {
    const recorder = recordingBackend();
    calls = recorder.calls;
    setPronunciationBackend(recorder.backend);
    registerAudioAssetResolver(() => null);
  });

  afterEach(() => {
    setPronunciationBackend(null);
    registerAudioAssetResolver(() => null);
  });

  it('spricht Thai mit th-TH', async () => {
    expect(await playPronunciation({ text: 'ไก่', language: 'th' })).toBe('tts');
    expect(calls.find((c) => c.kind === 'speak')?.args[1]).toBe('th-TH');
  });

  it('spricht Deutsch mit de-DE', async () => {
    expect(await playPronunciation({ text: 'das Huhn', language: 'de' })).toBe('tts');
    expect(calls.find((c) => c.kind === 'speak')?.args[1]).toBe('de-DE');
  });

  it('spricht Thai langsamer als Deutsch, damit die Toene hoerbar bleiben', async () => {
    await playPronunciation({ text: 'ไก่', language: 'th' });
    await playPronunciation({ text: 'das Huhn', language: 'de' });
    const rates = calls.filter((c) => c.kind === 'speak').map((c) => c.args[2] as number);
    expect(rates[0]).toBeLessThan(rates[1]);
  });

  it('bricht laufende Ausgabe ab, bevor neu gesprochen wird', async () => {
    await playPronunciation({ text: 'ไก่', language: 'th' });
    expect(calls.map((c) => c.kind)).toEqual(['stop', 'speak']);
  });

  it('nutzt TTS, solange kein Clip aufgeloest werden kann', async () => {
    registerAudioAssetResolver(() => null);
    expect(
      await playPronunciation({ text: 'ไก่', language: 'th', audioAssetId: 'gai-01' })
    ).toBe('tts');
    expect(calls.some((c) => c.kind === 'playAsset')).toBe(false);
  });

  it('nutzt den vorproduzierten Clip, sobald ein Aufloeser ihn liefert', async () => {
    // Das ist der spaetere Content-Schritt: nur der Aufloeser wird eingehaengt,
    // die aufrufenden Screens bleiben unveraendert.
    registerAudioAssetResolver((id) => `https://example.invalid/${id}.m4a`);

    expect(
      await playPronunciation({ text: 'ไก่', language: 'th', audioAssetId: 'gai-01' })
    ).toBe('asset');
    expect(calls.find((c) => c.kind === 'playAsset')?.args[0]).toBe(
      'https://example.invalid/gai-01.m4a'
    );
    expect(calls.some((c) => c.kind === 'speak')).toBe(false);
  });

  it('faellt auf TTS zurueck, wenn der Aufloeser die ID nicht kennt', async () => {
    registerAudioAssetResolver((id) => (id === 'bekannt' ? 'file:///clip.m4a' : null));
    expect(
      await playPronunciation({ text: 'ไก่', language: 'th', audioAssetId: 'unbekannt' })
    ).toBe('tts');
  });

  it('macht bei leerem Text gar nichts', async () => {
    expect(await playPronunciation({ text: '   ', language: 'th' })).toBe('unavailable');
    expect(calls).toHaveLength(0);
  });

  it('laesst einen Fehler beim Stoppen den Sprechvorgang nicht verhindern', async () => {
    setPronunciationBackend({
      async playAsset() {},
      async speak(text, locale) {
        calls.push({ kind: 'speak', args: [text, locale] });
      },
      async stop() {
        throw new Error('nichts lief');
      },
    });

    await expect(playPronunciation({ text: 'ไก่', language: 'th' })).resolves.toBe('tts');
    expect(calls.some((c) => c.kind === 'speak')).toBe(true);
  });
});

describe('stopPronunciation', () => {
  it('schluckt Fehler, damit die Oberflaeche nicht abstuerzt', async () => {
    setPronunciationBackend({
      async playAsset() {},
      async speak() {},
      async stop() {
        throw new Error('kaputt');
      },
    });
    await expect(stopPronunciation()).resolves.toBeUndefined();
    setPronunciationBackend(null);
  });
});
