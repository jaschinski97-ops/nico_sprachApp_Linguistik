import { base64ToBytes, wavToMonoFloat32 } from './bytes';

/**
 * Dekodierung frisch generierter Clips fuer die Tonpruefung.
 *
 * WAV tragt rohes PCM und geht ueberall ohne Bibliothek — auch nativ. mp3
 * braucht einen Decoder: Im Web (das Studio laeuft als Browser-Seite) nimmt
 * `AudioContext.decodeAudioData` ihn ohne Zutun; nativ gibt es keinen, dort
 * bleibt die verbindliche Pruefung dem Studio-Node vorbehalten (ffmpeg beim
 * Stage/Publish). Ein Dekodierfehler bedeutet "ungeprueft", nie "bestanden".
 */

export type DecodedClip = { pcm: Float32Array; sampleRate: number };

/** WAV direkt (synchron, plattformunabhaengig). */
export function decodeWavClip(base64: string): DecodedClip | null {
  const decoded = wavToMonoFloat32(base64ToBytes(base64));
  return decoded ? { pcm: decoded.pcm, sampleRate: decoded.sampleRate } : null;
}

/** Nur die Ecken von WebAudio, die wir brauchen — ohne DOM-Lib-Annahme. */
type AudioBufferLike = {
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  getChannelData(channel: number): Float32Array;
};
type MinimalAudioContext = {
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike>;
  close?(): Promise<void> | void;
};
type AudioContextCtor = new () => MinimalAudioContext;

function audioContextCtor(): AudioContextCtor | null {
  const scope = globalThis as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

/** WAV oder mp3 — mp3 nur, wo ein AudioContext existiert (Web-Studio). */
export async function decodeClipAsync(base64: string, format: string): Promise<DecodedClip | null> {
  if (format === 'wav') return decodeWavClip(base64);
  const Ctx = audioContextCtor();
  if (!Ctx) return null;
  try {
    const context = new Ctx();
    try {
      // decodeAudioData darf den Puffer konsumieren (detach) — deshalb Kopie.
      const bytes = base64ToBytes(base64);
      const copy = new Uint8Array(bytes.length);
      copy.set(bytes);
      const buffer = await context.decodeAudioData(copy.buffer);
      const pcm = new Float32Array(buffer.length);
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < buffer.length; i++) pcm[i] += data[i];
      }
      if (buffer.numberOfChannels > 1) {
        for (let i = 0; i < pcm.length; i++) pcm[i] /= buffer.numberOfChannels;
      }
      return { pcm, sampleRate: buffer.sampleRate };
    } finally {
      await context.close?.();
    }
  } catch {
    return null;
  }
}
