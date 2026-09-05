import { VOCABULARY } from '@/data/vocabulary';
import { checkThaiTone } from './tone-gate';
import type { AudioClip } from '../clips/types';
import { analyzeToneContour } from '../speaking/analysis';

function sweep(from: number, to: number) {
  let phase = 0;
  return Float32Array.from({ length: 8000 }, (_, i) => {
    phase += 2 * Math.PI * (from + (to - from) * i / 8000) / 8000;
    return Math.sin(phase);
  });
}
const clip = (id: string, extra: Partial<AudioClip> = {}) => ({
  language: 'th', kind: 'vocab', sourceId: id, text: VOCABULARY.find(word => word.id === id)?.term, ...extra,
}) as AudioClip;

test('only verified exact single-syllable text can pass; metadata cannot invent a target', () => {
  const falling = sweep(240, 120);
  expect(checkThaiTone(clip('kha'), falling, 8000)).toMatchObject({ status: 'passed', targetTone: 'falling', sourceId: 'kha' });
  expect(checkThaiTone(clip('kha'), sweep(120, 240), 8000).status).toBe('failed');
  for (const candidate of [clip('sawatdii'), clip('raan'), clip('kha', { text: 'ม้า' }), clip('kha', { kind: 'example' })]) {
    expect(checkThaiTone(candidate, falling, 8000).status).toBe('unchecked');
  }
  expect(checkThaiTone(clip('khrap'), sweep(200, 200), 8000).status).toBe('unchecked');
  expect(checkThaiTone(clip('khrap'), falling, 8000).status).toBe('failed');
});

test('silence and seeded random noise cannot turn weak correlations into a passing tone', () => {
  let state = 91321;
  const noise = Float32Array.from({ length: 32000 }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x80000000 - 1;
  });
  expect(analyzeToneContour(noise, 8000).status).toBe('unmeasurable');
  expect(checkThaiTone(clip('kha'), new Float32Array(8000), 8000).status).toBe('unchecked');
});
