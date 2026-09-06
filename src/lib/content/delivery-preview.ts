import { VOCABULARY } from '@/data/vocabulary';
import type { AudioClipSpec } from '../clips/types';

export type DeliveryPreview = {
  total: number;
  toneCheckable: number;
  technicalOnly: number;
  uncheckedDelivered: number;
  excluded: number;
  reasons: Record<string, number>;
};

/** Eligibility from text/metadata, never a prediction that unheard audio is correct. */
export function previewAudioDelivery(specs: readonly AudioClipSpec[]): DeliveryPreview {
  const result: DeliveryPreview = { total: 0, toneCheckable: 0, technicalOnly: 0,
    uncheckedDelivered: 0, excluded: 0, reasons: {} };
  for (const clip of new Map(specs.map(spec => [spec.id, spec])).values()) {
    result.total++;
    if (clip.language !== 'th') { result.technicalOnly++; continue; }
    const word = VOCABULARY.find(word => word.language === 'th' && word.id === clip.sourceId && word.term === clip.text);
    let reason: string;
    if (clip.kind !== 'vocab') reason = 'Satz-/Dialogclip: keine verifizierte Silbenprüfung';
    else if (!word?.sourceVerified) reason = 'Kein exakt passender quellengeprüfter Wortbezug';
    else if (word.syllables?.length !== 1) reason = 'Mehrsilbig: keine verifizierte zeitliche Segmentierung';
    else if (word.syllables[0].tone !== 'falling' && word.syllables[0].tone !== 'rising') reason = 'Mittel/tief/hoch: keine belastbare Sprecherreferenz';
    else { result.toneCheckable++; continue; }
    result.excluded++;
    result.reasons[reason] = (result.reasons[reason] ?? 0) + 1;
  }
  return result;
}
