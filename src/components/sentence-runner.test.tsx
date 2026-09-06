import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SentenceAction, SentenceRunner } from './sentence-runner';
import type { MicrophoneCaptureController } from '@/lib/speaking/microphone-capture';
import { sentenceSession } from '@/lib/speaking/sentence-session';

const mockPlay = jest.fn(async () => 'tts');
const mockStopAudio = jest.fn(async () => {});
const mockAvailable = jest.fn(async () => true);
const mockClip = jest.fn(async () => false);
const mockStart = jest.fn(async () => true);
const mockCancel = jest.fn();
const mockClear = jest.fn();
const mockRecording = { samples: new Float32Array(8000), sampleRate: 8000, durationMs: 1000, reachedLimit: false };
const mockStop = jest.fn(async () => mockRecording);
let mockOptions: { maxDurationMs?: number; allowPlayback?: boolean };
jest.mock('@/lib/audio', () => ({ playPronunciation: (...args: unknown[]) => mockPlay(...args as []),
  stopPronunciation: () => mockStopAudio(), isLanguageAvailable: () => mockAvailable(), hasPronunciationClip: () => mockClip() }));
jest.mock('@/hooks/use-microphone-capture', () => ({ useMicrophoneCapture: (options: typeof mockOptions): MicrophoneCaptureController => {
  mockOptions = options;
  return { status: 'idle', isRecording: false, elapsedMs: 0, lastCapture: null, error: null,
    start: mockStart, stop: mockStop, cancel: mockCancel, clear: mockClear };
} }));
jest.mock('./measured-tone-contour', () => ({ MeasuredToneContour: () => null }));

let tree: ReactTestRenderer;
function button(label: string) {
  const node = tree.root.findAllByType(SentenceAction).find(node => node.props.label === label);
  if (!node) throw Error('Missing ' + label);
  return node;
}
async function press(label: string) { await act(async () => { button(label).props.onPress(); }); }
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(100000); jest.clearAllMocks(); mockAvailable.mockResolvedValue(true); mockStart.mockResolvedValue(true); mockStop.mockImplementation(async () => ({ ...mockRecording })); });
afterEach(async () => { await act(async () => tree?.unmount()); jest.useRealTimers(); });

test('shadowing enforces preparation, hearing and headphones before mic; plays only after mic succeeds', async () => {
  await act(async () => { tree = create(<SentenceRunner mode="shadowing" onExit={() => {}} />); });
  expect(mockStart).not.toHaveBeenCalled();
  await press('Aufnahme starten'); expect(mockStart).not.toHaveBeenCalled();
  await press('Satz hören'); await press('Ich verwende Kopfhörer');
  await press('Aufnahme starten'); expect(mockStart).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(15000));
  mockPlay.mockClear();
  await press('Aufnahme starten');
  expect(mockStart).toHaveBeenCalledTimes(1); expect(mockPlay).toHaveBeenCalledTimes(1);
  expect(mockOptions.allowPlayback).toBe(true);
  expect(mockPlay).toHaveBeenCalledWith(expect.objectContaining({ concurrentRecording: true }));
  expect(mockStart.mock.invocationCallOrder[0]).toBeLessThan(mockPlay.mock.invocationCallOrder[0]);
  await press('Aufnahme beenden'); await act(async () => jest.advanceTimersByTime(1));
  expect(mockClear).toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('Keine ausreichende stimmhafte Strecke');
  await press('Nächster Satz');
  expect(button('Aufnahme starten').props.disabled).toBe(true);
});
test('sentence repetition runs 12/9/6 seconds with new mandatory preparation between rounds', async () => {
  await act(async () => { tree = create(<SentenceRunner mode="sentenceRepeat" onExit={() => {}} />); });
  for (const [index, duration] of [12000, 9000, 6000].entries()) {
    expect(mockOptions.maxDurationMs).toBe(duration);
    expect(mockOptions.allowPlayback).toBe(false);
    await press('Satz hören'); await act(async () => jest.advanceTimersByTime(15000));
    await press('Aufnahme starten');
    await press('Aufnahme beenden'); await act(async () => jest.advanceTimersByTime(1));
    if (index < 2) { await press('Nächstes Zeitfenster vorbereiten'); expect(button('Aufnahme starten').props.disabled).toBe(true); }
  }
  expect(button('Nächster Satz')).toBeDefined();
});
test('hearing presents no transcript before answer, handles missing voice and evaluates sentence meaning once', async () => {
  await act(async () => { tree = create(<SentenceRunner mode="sentenceListening" onExit={() => {}} />); });
  const task = sentenceSession(100000)[0];
  expect(JSON.stringify(tree.toJSON())).not.toContain(task.text);
  expect(button(task.german).props.disabled).toBe(true);
  mockAvailable.mockResolvedValue(false); await press('Satz hören');
  expect(mockPlay).not.toHaveBeenCalled(); expect(button(task.german).props.disabled).toBe(true);
  mockAvailable.mockResolvedValue(true); await press('Satz hören');
  await press(task.german);
  expect(JSON.stringify(tree.toJSON())).toContain('Richtig.');
  expect(JSON.stringify(tree.toJSON())).toContain(task.text);
  expect(button(task.german).props.disabled).toBe(true);
  expect(mockStart).not.toHaveBeenCalled();
});
test('permission failure never plays the shadowing model into a nonexistent recording', async () => {
  await act(async () => { tree = create(<SentenceRunner mode="shadowing" onExit={() => {}} />); });
  await press('Satz hören'); await press('Ich verwende Kopfhörer');
  await act(async () => jest.advanceTimersByTime(15000));
  mockStart.mockResolvedValue(false); mockPlay.mockClear(); await press('Aufnahme starten');
  expect(mockPlay).not.toHaveBeenCalled(); expect(button('Aufnahme starten')).toBeDefined();
});

test('leaving during permission request cancels capture and prevents late model playback', async () => {
  let release!: (value: boolean) => void;
  await act(async () => { tree = create(<SentenceRunner mode="shadowing" onExit={() => {}} />); });
  await press('Satz hören'); await press('Ich verwende Kopfhörer');
  await act(async () => jest.advanceTimersByTime(15000));
  mockStart.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  mockPlay.mockClear(); await press('Aufnahme starten');
  await act(async () => tree.unmount());
  await act(async () => release(true));
  expect(mockPlay).not.toHaveBeenCalled(); expect(mockCancel).toHaveBeenCalled();
});
