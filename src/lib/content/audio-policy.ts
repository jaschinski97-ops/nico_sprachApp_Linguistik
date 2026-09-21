import type { ContentEntry } from './types';
import type { ToneCheck } from './tone-gate';
import type { TranslationKey } from '../i18n/keys';

export type AudioPurpose = 'general' | 'tone' | 'vocabulary' | 'sentence';
export type ToneStatus = ToneCheck['status'];

/** Product decision B-21. A delivery permission never changes a measurement. */
export function isDeliverableEntry(entry: ContentEntry): boolean {
  // Phase 2, Schritt 4: KI-Wortschatz ist auch im 'unchecked'-Zustand
  // auslieferbar — die App kennzeichnet ihn über `verificationNote` (dieselbe
  // Ehrlichkeit wie bei ungeprüften Thai-Clips). 'failed' (Schrift-/Regel-
  // fehler) bleibt draußen.
  if (entry.kind === 'vocabulary') {
    return entry.check?.status === 'passed' || entry.check?.status === 'unchecked';
  }
  if (entry.kind !== 'audio' || !('language' in entry.document) || entry.document.language !== 'th') {
    return entry.check?.status === 'passed';
  }
  const tone = entry.check?.tone?.status;
  return (tone === 'passed' || tone === 'unchecked') && entry.check?.status === tone;
}

export function allowsThaiPlayback(status: ToneStatus | undefined, purpose: AudioPurpose = 'general'): boolean {
  return status === 'passed' || (status === 'unchecked' && (purpose === 'vocabulary' || purpose === 'sentence'));
}

/**
 * Die ehrliche Quellen-Zeile je Tonprüfstand — ALS WÖRTERBUCHSCHLÜSSEL
 * (21.09.2026, Nutzerbefund en-UI): Bisher standen hier deutsche Sätze, die
 * auf jeder Oberfläche erschienen; die Runner übersetzen jetzt über `t()`.
 */
export function clipToneLabel(status: ToneStatus | undefined): TranslationKey {
  if (status === 'passed') return 'audio.tonePassed';
  if (status === 'failed') return 'audio.toneFailed';
  if (status === 'not-applicable') return 'audio.toneNotApplicable';
  return 'audio.toneUnchecked';
}
