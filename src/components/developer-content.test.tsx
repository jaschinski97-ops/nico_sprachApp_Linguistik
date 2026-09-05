import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import SettingsScreen from '../app/settings';
import { DeveloperContent } from './developer-content';
import { isContentDeveloper } from '../lib/content/developer';

jest.mock('../lib/content/developer', () => ({ isContentDeveloper: jest.fn(() => true) }));
// Throwing when loaded proves the release path never even imports the studio.
jest.mock('../dev/content-studio', () => { throw new Error('Developer module reached production!'); });
jest.mock('./screen-scaffold', () => ({ ScreenScaffold: ({ children }: React.PropsWithChildren) => <>{children}</> }));

test('production settings render no input, key field, provider choice, start button or progress', async () => {
  const previous = __DEV__;
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
  let screen: TestRenderer.ReactTestRenderer | undefined;
  try {
    await act(async () => { screen = TestRenderer.create(<SettingsScreen />); });
    expect(screen!.root.findAllByType(TextInput)).toHaveLength(0);
    expect(JSON.stringify(screen!.toJSON())).not.toMatch(/Schlüssel|API|Generator|Fortschrittsbalken|Starten|Claude|Gemini|Stability/i);
    expect(screen!.root.findAll((node) => node.props.accessibilityRole === 'progressbar')).toHaveLength(0);
    expect(JSON.stringify(screen!.toJSON())).toContain('App-Updates');
    expect(isContentDeveloper).not.toHaveBeenCalled();
  } finally {
    await act(async () => screen?.unmount());
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = previous;
  }
});

test('development build on any other origin still cannot reach the studio', async () => {
  (isContentDeveloper as jest.Mock).mockReturnValue(false);
  let screen: TestRenderer.ReactTestRenderer | undefined;
  await act(async () => { screen = TestRenderer.create(<DeveloperContent />); });
  expect(screen!.toJSON()).toBeNull();
  await act(async () => screen?.unmount());
});
