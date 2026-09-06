/**
 * Gemeinsamer Vertrag der plattformspezifischen Mikrofonaufnahme.
 *
 * Eine Aufnahme lebt nur im Arbeitsspeicher. Sie wird weder in der bestehenden
 * Clip-Ablage gespeichert noch an einen Anbieter geschickt. Damit kann die
 * Tonkontur lokal ausgewertet werden, ohne aus der Sprechuebung versehentlich
 * eine Sprach- oder TTS-Anfrage zu machen.
 */

export const DEFAULT_CAPTURE_DURATION_MS = 8_000;
export const MIN_CAPTURE_DURATION_MS = 1_000;
export const MAX_CAPTURE_DURATION_MS = 15_000;

export type CapturedPcm = {
  /** Mono, auf -1 bis +1 normiert. */
  samples: Float32Array;
  /** Tatsaechliche Abtastrate der gelieferten Daten, nicht nur der Wunschwert. */
  sampleRate: number;
  durationMs: number;
  /** `true`, wenn die feste Speicher-/Zeitgrenze den Stopp ausgeloest hat. */
  reachedLimit: boolean;
};

export type MicrophoneCaptureStatus =
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'stopping';

export type MicrophoneCaptureErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'start-failed'
  | 'capture-failed'
  | 'empty';

export type MicrophoneCaptureError = {
  code: MicrophoneCaptureErrorCode;
  message: string;
};

export type MicrophoneCaptureOptions = {
  /**
   * Automatischer Stopp. Werte werden auf 1--15 Sekunden begrenzt, damit eine
   * vergessene Aufnahme den JavaScript-Speicher nicht unbegrenzt wachsen laesst.
   */
  maxDurationMs?: number;
  /** Shadowing: native Audiositzung fuer gleichzeitige Wiedergabe offen halten. */
  allowPlayback?: boolean;
};

export type MicrophoneCaptureController = {
  status: MicrophoneCaptureStatus;
  isRecording: boolean;
  elapsedMs: number;
  /** Ergebnis des letzten manuellen oder automatischen Stopps. */
  lastCapture: CapturedPcm | null;
  error: MicrophoneCaptureError | null;
  /** Fragt die Berechtigung erst bei diesem ausdruecklichen Nutzer-Schritt an. */
  start(): Promise<boolean>;
  /** Stoppt und liefert dieselbe fluechtige Aufnahme wie `lastCapture`. */
  stop(): Promise<CapturedPcm | null>;
  /** Stoppt, gibt Ressourcen frei und verwirft die laufenden Samples. */
  cancel(): void;
  /** Entfernt Ergebnis und Fehler der letzten Aufnahme. */
  clear(): void;
};

export function captureDurationMs(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_CAPTURE_DURATION_MS;
  }
  return Math.min(MAX_CAPTURE_DURATION_MS, Math.max(MIN_CAPTURE_DURATION_MS, value));
}

export function joinPcmChunks(chunks: readonly Float32Array[], length: number): Float32Array {
  const joined = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    const remaining = joined.length - offset;
    if (remaining <= 0) break;
    const part = chunk.length <= remaining ? chunk : chunk.subarray(0, remaining);
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

/**
 * Wandelt little-endian Int16-PCM in Mono-Float um.
 *
 * `expo-audio` 57 dokumentiert bei mehreren Kanaelen verschachtelte Samples
 * (`L, R, L, R, ...`). Die App fordert Mono an, mittelt hier aber trotzdem
 * alle tatsaechlich gelieferten Kanaele, statt das angeforderte Format blind
 * vorauszusetzen.
 */
export function int16PcmToMono(data: ArrayBuffer, channelCount: number): Float32Array {
  const channels = Math.max(1, Math.floor(channelCount));
  const sampleCount = Math.floor(data.byteLength / 2);
  const frameCount = Math.floor(sampleCount / channels);
  const view = new DataView(data);
  const mono = new Float32Array(frameCount);

  for (let frame = 0; frame < frameCount; frame++) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel++) {
      const offset = (frame * channels + channel) * 2;
      sum += view.getInt16(offset, true) / 32_768;
    }
    mono[frame] = sum / channels;
  }
  return mono;
}
