import { VOCABULARY } from '@/data/vocabulary';
import type { AudioClipSpec } from '../clips/types';

import { sollToneFuerClip, type ToneWort } from './tone-gate';

export type DeliveryPreview = {
  total: number;
  toneCheckable: number;
  technicalOnly: number;
  uncheckedDelivered: number;
  excluded: number;
  reasons: Record<string, number>;
};

/**
 * Eligibility from text/metadata, never a prediction that unheard audio is
 * correct. Seit 18.09. mit derselben Soll-Ermittlung wie das Tor selbst:
 * Wörter über `syllables[].tone`, Beispielsätze über die Tonfolge ihrer
 * Roman-Umschrift. Formprüfbar ohne Sprecherreferenz bleiben nur Silben mit
 * Sollton fallend oder steigend — sonst weiß die Vorschau ehrlich, dass der
 * Clip höchstens ungeprüft durchgeht.
 */
export function previewAudioDelivery(
  specs: readonly AudioClipSpec[],
  woerter: readonly ToneWort[] = VOCABULARY
): DeliveryPreview {
  const result: DeliveryPreview = { total: 0, toneCheckable: 0, technicalOnly: 0,
    uncheckedDelivered: 0, excluded: 0, reasons: {} };
  for (const clip of new Map(specs.map(spec => [spec.id, spec])).values()) {
    result.total++;
    if (clip.language !== 'th') { result.technicalOnly++; continue; }
    const soll = sollToneFuerClip(clip, woerter);
    let reason: string;
    if (!soll) {
      reason = clip.kind === 'vocab'
        ? 'Wort ohne Silbentöne im Bestand'
        : clip.kind === 'example'
          ? 'Beispielsatz ohne auswertbare Ton-Umschrift'
          : 'Dialogzug ohne hinterlegte Silbentöne';
    } else if (!soll.toene.some(tone => tone === 'falling' || tone === 'rising')) {
      reason = 'Nur mittel/tief/hoch: keine belastbare Sprecherreferenz';
    } else { result.toneCheckable++; continue; }
    result.uncheckedDelivered++;
    result.reasons[reason] = (result.reasons[reason] ?? 0) + 1;
  }
  return result;
}
