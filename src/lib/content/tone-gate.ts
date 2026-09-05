import { VOCABULARY } from '@/data/vocabulary';
import type { AudioClip } from '../clips/types';
import { analyzeToneContour, matchesToneShape, type ToneContourSummary } from '../speaking/analysis';
import type { Tone } from '@/constants/tones';

export const TONE_GATE_VERSION = 'f0-hysteresis-1';
export const TONE_GATE_LIMITS = 'Filter gegen grobe Tonhöhenfehler, kein Qualitätsnachweis. Konsonanten, Vokallänge und Aspiration werden nicht geprüft. Mehrsilbige Wörter und Sätze sind ohne verifizierte zeitliche Silbengrenzen ungeprüft (AE-7/AE-8). Ohne Sprecherreferenz bleibt die Registerlage von mittel, tief und hoch ungeprüft. System-TTS wird durch diesen Filter nicht geprüft.';
export type ToneCheck = {
  status: 'passed' | 'failed' | 'unchecked' | 'not-applicable';
  reason: string;
  version: string;
  targetTone?: Tone;
  sourceId?: string;
  source?: string;
  voicedMs?: number;
  summary?: ToneContourSummary;
  track?: { seconds: number; hz: number; correlation: number }[];
};

export function checkThaiTone(clip: AudioClip, pcm: Float32Array, sampleRate: number): ToneCheck {
  const base = { version: TONE_GATE_VERSION };
  if (clip.language !== 'th') return { ...base, status: 'not-applicable', reason: 'Kein Thai-Ton; nur technische Integritätsprüfung.' };
  const measurement = analyzeToneContour(pcm, sampleRate);
  const metrics = {
    voicedMs: measurement.voicedMs,
    ...(measurement.status === 'measured' ? { summary: measurement.summary } : {}),
    track: measurement.frames.map((frame) => ({ seconds: frame.t, hz: frame.f0, correlation: frame.correlation ?? 0 })),
  };
  const word = VOCABULARY.find((entry) => entry.language === 'th' && entry.id === clip.sourceId && entry.term === clip.text);
  if (clip.kind !== 'vocab' || !word?.sourceVerified || word.syllables?.length !== 1 || !word.syllables[0].tone) {
    return { ...base, ...metrics, status: 'unchecked', reason: 'Kein verifizierter einsilbiger Wortbezug; keine automatische Silbensegmentierung.' };
  }
  const targetTone = word.syllables[0].tone;
  const target = { targetTone, sourceId: word.id, source: word.source ?? undefined };
  if (measurement.status !== 'measured') return { ...base, ...metrics, ...target, status: 'unchecked', reason: 'Keine ausreichend zusammenhängende stimmhafte Strecke.' };
  const compatible = matchesToneShape(targetTone, measurement.summary);
  if (compatible === null) {
    // An obvious downward movement contradicts high/rising production even
    // without a calibrated register. Otherwise do not invent a positive test.
    if (targetTone === 'high' && measurement.summary.slope < -3) {
      return { ...base, ...metrics, ...target, status: 'failed', reason: 'Deutlicher Fall widerspricht dem hohen Ton.' };
    }
    return { ...base, ...metrics, ...target, status: 'unchecked', reason: 'Registerlage mittel/tief/hoch ohne Sprecherreferenz nicht prüfbar.' };
  }
  return { ...base, ...metrics, ...target, status: compatible ? 'passed' : 'failed',
    reason: compatible ? 'Relative Konturform mit verifiziertem Sollton vereinbar; nur Tonhöhe geprüft.' : 'Relative Konturform widerspricht dem verifizierten Sollton.' };
}
