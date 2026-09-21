import { allowsThaiPlayback, clipToneLabel, isDeliverableEntry } from './audio-policy';
import type { ContentEntry } from './types';
import { hasPronunciationClip, playPronunciationWithStatus, registerAudioAssetResolver, setPronunciationBackend } from '../audio';
import { installClipLookup } from '../clips/lookup';

jest.mock('../../content/catalog.json', () => {
  const { clipIdFor } = require('../clips/types');
  return { version: 2, entries: ['passed', 'unchecked', 'failed'].map(status => ({
    kind: 'audio', id: clipIdFor('th', status), document: { language: 'th', text: status },
    asset: status + '.mp3', check: { status, tone: { status } },
  })) };
});
jest.mock('../../content/assets', () => ({ CONTENT_ASSETS: { 'passed.mp3': 1, 'unchecked.mp3': 2, 'failed.mp3': 3 } }));
jest.mock('expo-asset', () => ({ Asset: { fromModule: (id: number) => ({ downloadAsync: async () => ({ localUri: `file:///clip-${id}` }) }) } }));

test.each(['tone', 'general', 'vocabulary', 'sentence'] as const)('mode %s respects passed/unchecked/failed independently of delivery', purpose => {
  expect(allowsThaiPlayback('passed', purpose)).toBe(true);
  expect(allowsThaiPlayback('unchecked', purpose)).toBe(purpose === 'vocabulary' || purpose === 'sentence');
  expect(allowsThaiPlayback('failed', purpose)).toBe(false);
  expect(allowsThaiPlayback(undefined, purpose)).toBe(false);
});

test('catalog status must agree with the measurement; delivery never relabels unchecked as passed', () => {
  const entry = { kind: 'audio', document: { language: 'th' }, check: { status: 'unchecked', tone: { status: 'unchecked' } } } as ContentEntry;
  expect(isDeliverableEntry(entry)).toBe(true);
  expect(isDeliverableEntry({ ...entry, check: { ...entry.check!, status: 'passed' } })).toBe(false);
  expect(clipToneLabel('unchecked')).toBe('audio.toneUnchecked');
  expect(clipToneLabel('passed')).not.toBe(clipToneLabel('unchecked'));
});

test('real catalog resolver blocks unchecked and raw asset bypass for tone recognition, reports the actual clip elsewhere', async () => {
  const playAsset = jest.fn(async () => {});
  const speak = jest.fn(async () => {});
  setPronunciationBackend({ playAsset, speak, stop: async () => {}, availableLocales: async () => ['th-TH'] });
  registerAudioAssetResolver(() => 'file:///unchecked-bypass');
  installClipLookup();
  try {
    for (const text of ['unchecked', 'failed', 'missing']) {
      expect(await hasPronunciationClip({ text, language: 'th', purpose: 'tone' })).toBe(false);
      expect((await playPronunciationWithStatus({ text, language: 'th', purpose: 'tone', audioAssetId: 'bypass' })).kind).toBe('unavailable');
    }
    expect(speak).not.toHaveBeenCalled(); expect(playAsset).not.toHaveBeenCalled();
    const checked = await playPronunciationWithStatus({ text: 'passed', language: 'th', purpose: 'tone' });
    expect(checked.toneStatus).toBe('passed'); expect(checked.label).toBe('audio.tonePassed');
    for (const purpose of ['vocabulary', 'sentence'] as const) {
      const unchecked = await playPronunciationWithStatus({ text: 'unchecked', language: 'th', purpose });
      expect(unchecked.kind).toBe('asset'); expect(unchecked.toneStatus).toBe('unchecked');
      expect(unchecked.label).toBe('audio.toneUnchecked');
      expect(unchecked.clipId).toBeDefined(); expect(playAsset).toHaveBeenLastCalledWith('file:///clip-2');
    }
    expect(speak).not.toHaveBeenCalled();
  } finally { setPronunciationBackend(null); registerAudioAssetResolver(() => null); }
});
