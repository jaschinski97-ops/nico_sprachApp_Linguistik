/**
 * Web-Simulation des Asset-Stubs (2026-09-09, geändert 2026-09-10): Jest loest
 * wie Metro-Native `./assets` auf assets.ts auf (Plattform-Erweiterungen
 * `.web.*` greifen im Testlauf nicht). Der Test praesentiert
 * `lib/content/bundled` daher per jest.mock exakt die leere Map, die auf Web
 * durch assets.web.ts ersetzt wird.
 *
 * SEIT 2026-09-10 LIEFERT DIE KETTE AUF WEB EINE URL statt null
 * (public/content-Spiegel, siehe bundled.ts): Der Test deckt beide Fälle —
 * Web (`Platform.OS === 'web'` + window) baut die statische URL, Native
 * bleibt bei der leeren Map hängen und fällt ehrlich auf null durch.
 */
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

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

/** Stellt die Laufzeit auf eine Plattform ein und gibt den vorigen Zustand zurück. */
function plattformEinstellen(os: string, mitWindow: boolean): () => void {
  const originalOs = Object.getOwnPropertyDescriptor(Platform, 'OS');
  const originalWindow = (globalThis as { window?: unknown }).window;
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  if (mitWindow) {
    (globalThis as { window?: unknown }).window = { location: { origin: 'http://localhost:8095' } };
  } else {
    delete (globalThis as { window?: unknown }).window;
  }
  return () => {
    if (originalOs) Object.defineProperty(Platform, 'OS', originalOs);
    if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = originalWindow;
  };
}

test('der Stub bietet dieselbe API wie assets.ts, aber mit leerer Map (keine require()-Assets)', () => {
  const stub = require('./assets.web') as Record<string, unknown>;
  expect(Object.keys(stub)).toEqual(['CONTENT_ASSETS']);
  expect(CONTENT_ASSETS).toEqual({});
  expect(CONTENT_ASSETS['embedded.mp3']).toBeUndefined();
});

test('auf Web baut die Kette die URL aus dem public/content-Spiegel (Laden erst beim Anhören)', async () => {
  const aufräumen = plattformEinstellen('web', true);
  try {
    const id = clipIdFor('en', 'stubkette');
    expect(bundledEntry('audio', id)?.asset).toBe('embedded.mp3');
    expect(await bundledAssetUri('audio', id)).toBe('http://localhost:8095/content/embedded.mp3');
    expect(Asset.fromModule).not.toHaveBeenCalled();
  } finally {
    aufräumen();
  }
});

test('ohne Web-Laufzeit (Native) bleibt die leere Stub-Map wirksam — null statt Asset', async () => {
  const aufräumen = plattformEinstellen('android', false);
  try {
    const id = clipIdFor('en', 'stubkette');
    expect(await bundledAssetUri('audio', id)).toBeNull();
    expect(Asset.fromModule).not.toHaveBeenCalled();
  } finally {
    aufräumen();
  }
});
