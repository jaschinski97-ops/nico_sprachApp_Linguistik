const mockPlayer = { play: jest.fn(), pause: jest.fn(), remove: jest.fn(), addListener: jest.fn() };
const mockCreatePlayer = jest.fn(() => mockPlayer);
const mockSpeak = jest.fn();
jest.mock('expo-audio', () => ({ createAudioPlayer: (...args: unknown[]) => mockCreatePlayer(...args as []) }));
jest.mock('expo-speech', () => ({ speak: (...args: unknown[]) => mockSpeak(...args), stop: jest.fn(async () => {}), getAvailableVoicesAsync: jest.fn(async () => []) }));

import { playPronunciation, registerAudioAssetResolver, registerPronunciationClipLookup, setPronunciationBackend, stopPronunciation } from './audio';

afterEach(async () => { await stopPronunciation(); registerAudioAssetResolver(() => null); registerPronunciationClipLookup(null); });

test('shadowing keeps the native session active at clip end while still releasing its player', async () => {
  jest.clearAllMocks(); setPronunciationBackend(null);
  const removeListener = jest.fn();
  mockPlayer.addListener.mockReturnValue({ remove: removeListener });
  registerAudioAssetResolver(() => 'file:///sentence.mp3');
  registerPronunciationClipLookup(() => ({ uri: 'file:///sentence.mp3', id: 'sentence', toneStatus: 'unchecked' }));
  await playPronunciation({ text: 'ผม มา', language: 'th', purpose: 'sentence', audioAssetId: 'sentence', concurrentRecording: true });
  expect(mockCreatePlayer).toHaveBeenCalledWith({ uri: 'file:///sentence.mp3' }, { keepAudioSessionActive: true });
  mockPlayer.addListener.mock.calls[0][1]({ didJustFinish: true });
  expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
  expect(mockPlayer.remove).toHaveBeenCalledTimes(1);
  expect(removeListener).toHaveBeenCalledTimes(1);
  await playPronunciation({ text: 'ผม มา', language: 'th', purpose: 'sentence', audioAssetId: 'sentence' });
  expect(mockCreatePlayer).toHaveBeenLastCalledWith({ uri: 'file:///sentence.mp3' }, { keepAudioSessionActive: false });
});

test('shadowing system speech shares the recording session', async () => {
  jest.clearAllMocks(); setPronunciationBackend(null);
  await playPronunciation({ text: 'ผม มา', language: 'th', concurrentRecording: true });
  expect(mockSpeak).toHaveBeenCalledWith('ผม มา', { language: 'th-TH', rate: .8, useApplicationAudioSession: true });
});
