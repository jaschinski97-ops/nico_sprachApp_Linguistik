/**
 * Base64 und WAV ohne Abhängigkeiten.
 *
 * WARUM SELBST GESCHRIEBEN: `Buffer` gibt es in React Native nicht, und ob
 * `atob`/`btoa` auf jeder Zielplattform vorhanden und für große Eingaben
 * brauchbar sind, ließ sich nur im Web-Build prüfen (B-2). Zwei Tabellen und
 * eine Schleife sind billiger als eine Annahme, die erst am Gerät auffällt.
 *
 * WARUM WAV: Gemini liefert Sprachausgabe als **rohes PCM** (24 kHz, 16 Bit,
 * mono — laut Doku), also ohne Kopf. Kein Player spielt das ab, ohne dass man
 * ihm Abtastrate und Bittiefe sagt. Ein WAV-Kopf ist 44 Byte und genau diese
 * Auskunft; `expo-audio` und `<audio>` spielen WAV ohne Weiteres. Eine
 * Verdichtung (mp3, opus) bräuchte dagegen einen Encoder im JavaScript-Bündel
 * oder ein natives Modul — der Speicherpreis dafür steht in AE-30.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET.charCodeAt(i)] = i;

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += ALPHABET[(triple >> 18) & 63];
    out += ALPHABET[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(triple >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? ALPHABET[triple & 63] : '=';
  }
  return out;
}

export function base64ToBytes(base64: string): Uint8Array {
  // Fuellzeichen sind nach dem Filtern schon weg - jedes verbleibende Zeichen
  // traegt 6 Bit, also ergeben n Zeichen floor(n * 6 / 8) Byte. Ein zweiter
  // Abzug fuer '=' waere doppelt: bei einem einzelnen Byte ('TQ==') kaeme 0
  // heraus.
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const length = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(length);
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const s0 = LOOKUP[clean.charCodeAt(i)];
    const s1 = LOOKUP[clean.charCodeAt(i + 1)] ?? 0;
    const s2 = LOOKUP[clean.charCodeAt(i + 2)] ?? 0;
    const s3 = LOOKUP[clean.charCodeAt(i + 3)] ?? 0;
    const triple = (s0 << 18) | (s1 << 12) | (s2 << 6) | s3;
    if (o < length) out[o++] = (triple >> 16) & 255;
    if (o < length) out[o++] = (triple >> 8) & 255;
    if (o < length) out[o++] = triple & 255;
  }
  return out;
}

export type PcmDescription = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
};

/** Liest `audio/L16;codec=pcm;rate=24000` (so nennt Gemini sein PCM) aus. */
export function parsePcmMimeType(mimeType: unknown): PcmDescription | null {
  if (typeof mimeType !== 'string') return null;
  const lower = mimeType.toLowerCase();
  if (!/^audio\/l16\b/.test(lower) && !/codec=pcm/.test(lower)) return null;
  const rate = lower.match(/rate=(\d+)/);
  const bits = lower.match(/audio\/l(\d+)/);
  const channels = lower.match(/channels=(\d+)/);
  return {
    sampleRate: rate ? Number(rate[1]) : 24000,
    channels: channels ? Number(channels[1]) : 1,
    bitsPerSample: bits ? Number(bits[1]) : 16,
  };
}

/** Verpackt rohes PCM in einen WAV-Container (RIFF, 44-Byte-Kopf). */
export function pcmToWav(pcm: Uint8Array, pcmInfo: PcmDescription): Uint8Array {
  const { sampleRate, channels, bitsPerSample } = pcmInfo;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const wav = new Uint8Array(44 + pcm.length);
  const view = new DataView(wav.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) wav[offset + i] = text.charCodeAt(i);
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // Laenge des fmt-Blocks
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  ascii(36, 'data');
  view.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);
  return wav;
}

/** Dauer eines WAV aus dem Kopf, ohne die Daten anzufassen. */
export function wavDurationMs(wav: Uint8Array): number | null {
  if (wav.length < 44) return null;
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const byteRate = view.getUint32(28, true);
  const dataLength = view.getUint32(40, true);
  if (!byteRate) return null;
  return Math.round((dataLength / byteRate) * 1000);
}
