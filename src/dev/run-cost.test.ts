import { estimateRunCost } from './run-cost';

test('known Gemini models estimate the exact missing set; unknown tariffs are explicit', () => {
  expect(estimateRunCost('audio', 'gemini', 'gemini-3.1-flash-tts-preview', [{ text: 'ค่ะ' }])).toMatchObject({ count: 1, usd: expect.any(Number) });
  expect(estimateRunCost('images', 'gemini', 'gemini-3.1-flash-image', [{}, {}]).usd).toBeCloseTo(0.1474);
  expect(estimateRunCost('images', 'gemini', 'custom-model', [{}]).usd).toBeNull();
  expect(estimateRunCost('audio', 'gemini', 'custom-model', []).usd).toBe(0);
});
