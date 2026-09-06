import type { ContentEntry } from './types';
import type { ToneCheck } from './tone-gate';

export type AudioPurpose = 'general' | 'tone' | 'vocabulary' | 'sentence';
export type ToneStatus = ToneCheck['status'];

/** Product decision B-21. A delivery permission never changes a measurement. */
export function isDeliverableEntry(entry: ContentEntry): boolean {
  if (entry.kind !== 'audio' || !('language' in entry.document) || entry.document.language !== 'th') {
    return entry.check?.status === 'passed';
  }
  const tone = entry.check?.tone?.status;
  return (tone === 'passed' || tone === 'unchecked') && entry.check?.status === tone;
}

export function allowsThaiPlayback(status: ToneStatus | undefined, purpose: AudioPurpose = 'general'): boolean {
  return status === 'passed' || (status === 'unchecked' && (purpose === 'vocabulary' || purpose === 'sentence'));
}

export function clipToneLabel(status: ToneStatus | undefined): string {
  if (status === 'passed') return 'KI-Stimme, Ton automatisch geprüft';
  if (status === 'failed') return 'KI-Stimme, Tonprüfung nicht bestanden';
  if (status === 'not-applicable') return 'KI-Stimme, keine Muttersprachler-Aufnahme';
  return 'KI-Stimme, Ton nicht geprüft';
}
