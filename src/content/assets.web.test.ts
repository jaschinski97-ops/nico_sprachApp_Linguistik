/**
 * Web-Simulation des Asset-Stubs (2026-09-09): Jest loest wie Metro-Native
 * `./assets` auf assets.ts auf (Plattform-Erweiterungen `.web.*` greifen im
 * Testlauf nicht). Der Test praesentiert `lib/content/bundled` daher per
 * jest.mock exakt die leere Map, die auf Web durch assets.web.ts ersetzt
 * wird, und prueft Stub-API und Aufoesungskette: null statt Asset — die
 * Kette (Paket -> eingebettet -> Entwurf -> TTS) faellt ehrlich durch.
 */
import { Asset } from 'expo-asset';

import { CONTENT_ASSETS } from './assets.web';
import { bundledAssetUri, bundledEntry } from '../lib/content/bundled';
import { clipIdFor } from '../lib/clips/types';

jest.mock('./assets', () => ({ CONTENT_ASSETS: {} }));
jest.mock('./catalog.json', () => {
  const { clipIdFor } = require('../lib/clips/types');
  return { version: 2, entries: [
    {
      kind: 'audio',
      id: clipIdFor('en', 'stubkette'),
      digest: 'stub',
      document: { id: clipIdFor('en', 'stubkette') },
      asset: 'embedded.mp3',
      check: { status: 'passed' },
    },
  ] };
});
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({ downloadAsync: async () => ({ localUri: 'file:///darf-nicht-erreicht-werden' }) })),
  },
}));

test('der Stub bietet dieselbe API wie assets.ts, aber mit leerer Map (keine require()-Assets)', () => {
  const stub = require('./assets.web') as Record<string, unknown>;
  expect(Object.keys(stub)).toEqual(['CONTENT_ASSETS']);
  expect(CONTENT_ASSETS).toEqual({});
  expect(CONTENT_ASSETS['embedded.mp3']).toBeUndefined();
});

test('mit der Stub-Map liefert die Kette null (TTS-Fallback) und beruehrt kein eingebettetes Asset', async () => {
  const id = clipIdFor('en', 'stubkette');
  // Der Katalog bleibt eingebettet — nur die Binärdatei fehlt auf Web.
  expect(bundledEntry('audio', id)?.asset).toBe('embedded.mp3');
  expect(await bundledAssetUri('audio', id)).toBeNull();
  expect(Asset.fromModule).not.toHaveBeenCalled();
});
