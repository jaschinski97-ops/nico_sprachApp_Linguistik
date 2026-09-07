import { VOCABULARY_TH } from '@/data/vocabulary';

import { MemoryBlobStore } from '../blobs/memory';
import { DataStore, MemoryDataStore } from '../storage';

import { runClipBatch } from './batch';
import { bytesToBase64, pcmToWav } from './bytes';
import { AUDIO_BLOB_CONFIG, AudioBlobStore, AudioClipSpec, GeneratedClip } from './types';
import { ClipGenerationClient } from './generator';

/**
 * Automatische Tonprüfung im Clip-Lauf: WAV-Klipse werden direkt nach der
 * Erzeugung gemessen, und ein Clip, dessen Kontur dem verifizierten Sollton
 * klar widerspricht, wird gar nicht erst abgelegt. Hier steht der Gegenbeweis
 * in beide Richtungen — mit künstlichen Tönen, deren Verlauf wir kennen.
 */

const T0 = Date.UTC(2026, 8, 7);

function sineWavBase64(fromHz: number, toHz: number, ms = 400, sampleRate = 24000): string {
  const samples = Math.round((sampleRate * ms) / 1000);
  const pcm = new Uint8Array(samples * 2);
  const view = new DataView(pcm.buffer);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const frequency = fromHz + (toHz - fromHz) * (i / samples);
    const value = Math.round(0.5 * 32767 * Math.sin(2 * Math.PI * frequency * t));
    view.setInt16(i * 2, value, true);
  }
  return bytesToBase64(pcmToWav(pcm, { sampleRate, channels: 1, bitsPerSample: 16 }));
}

async function freshStore(): Promise<DataStore> {
  const store = new MemoryDataStore();
  await store.init();
  return store;
}

function freshBlobs(): AudioBlobStore {
  return new MemoryBlobStore(AUDIO_BLOB_CONFIG);
}

function staticClient(base64: string): ClipGenerationClient {
  return {
    async generate(): Promise<GeneratedClip> {
      return {
        base64,
        format: 'wav',
        model: 'test-tts',
        voice: 'Testa',
        provider: 'gemini',
        durationMs: 400,
      };
    },
  };
}

function specOf(term: string, id: string): AudioClipSpec {
  const word = VOCABULARY_TH.find((entry) => entry.term === term);
  if (!word?.sourceVerified) throw new Error('Testwort nicht verifiziert: ' + term);
  return { id, language: 'th', text: word.term, kind: 'vocab', sourceId: word.id };
}

describe('Automatische Tonprüfung im Clip-Lauf', () => {
  it('legt einen Clip, der dem Sollton klar widerspricht, nicht ab', async () => {
    const store = await freshStore();
    const blobs = freshBlobs();
    // ไม่ ist verifiziert fallend; ein ebener Ton widerspricht dem klar.
    const spec = specOf('ไม่', 'test-flat-falling');

    const result = await runClipBatch({
      specs: [spec],
      client: staticClient(sineWavBase64(200, 200)),
      store,
      blobStore: blobs,
      now: () => T0,
    });

    expect(result.failed).toBe(1);
    expect(result.tone?.failed).toBe(1);
    expect(result.errors[0]?.message).toContain('Ton-Check fehlgeschlagen');
    expect(await store.get('audio', spec.id)).toBeNull();
    expect(await blobs.has(`${spec.id}.wav`)).toBe(false);
  });

  it('nimmt einen Clip mit passender Kontur an und zählt ihn', async () => {
    const store = await freshStore();
    const blobs = freshBlobs();
    // หมา ist verifiziert steigend; eine klare Aufwärtsbewegung passt.
    const spec = specOf('หมา', 'test-rising');

    const result = await runClipBatch({
      specs: [spec],
      client: staticClient(sineWavBase64(150, 270)),
      store,
      blobStore: blobs,
      now: () => T0,
    });

    expect(result.ok).toBe(1);
    expect(result.tone?.passed).toBe(1);
    expect(await store.get('audio', spec.id)).not.toBeNull();
  });

  it('lässt nicht-prüfbare Clips ungeprüft zu — Fremdsprache bleibt speicherbar', async () => {
    const store = await freshStore();
    const blobs = freshBlobs();
    const spec: AudioClipSpec = {
      id: 'test-en-water',
      language: 'en',
      text: 'water',
      kind: 'vocab',
      sourceId: 'en-water',
    };

    const result = await runClipBatch({
      specs: [spec],
      client: staticClient(sineWavBase64(200, 200)),
      store,
      blobStore: blobs,
      now: () => T0,
    });

    expect(result.ok).toBe(1);
    expect(result.tone?.other).toBe(1);
    expect(await store.get('audio', spec.id)).not.toBeNull();
  });
});
