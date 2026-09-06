import { planDeliveryAudio } from './audio-plan';
import { previewAudioDelivery } from './delivery-preview';
import { checkThaiTone } from './tone-gate';
import type { AudioClip } from '../clips/types';

test('full plan is partitioned before payment without treating eligibility as success', () => {
  const plan = planDeliveryAudio();
  const preview = previewAudioDelivery(plan);
  expect(preview.total).toBe(plan.length);
  expect(preview.toneCheckable + preview.technicalOnly + preview.uncheckedDelivered + preview.excluded).toBe(plan.length);
  expect(preview.uncheckedDelivered).toBeGreaterThan(0);
  expect(previewAudioDelivery([...plan, ...plan])).toEqual(preview);
  const silence = new Float32Array(800);
  // No statically excluded Thai clip may obtain a positive gate result, even
  // if the runtime signal changes; static source eligibility must agree.
  for (const spec of plan.filter(spec => spec.language === 'th')) {
    const one = previewAudioDelivery([spec]);
    const tone = checkThaiTone(spec as AudioClip, silence, 8000);
    expect(tone.status).not.toBe('passed');
    if (one.toneCheckable) expect(['falling', 'rising']).toContain(tone.targetTone);
  }
  expect(preview.excluded).toBe(0);
  expect(preview.toneCheckable).toBeGreaterThan(0);
});
