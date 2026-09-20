import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import SettingsScreen from '../app/settings/index';
import AboutScreen from '../app/settings/about';
import StudioScreen from '../app/settings/studio';
import { DeveloperContent } from './developer-content';
import { isContentDeveloper } from '../lib/content/developer';
// Der Test wählt Deutsch ausdrücklich.
// Die Assertion liest den erwarteten Satz aus dem de-Wörterbuch, damit sie an
// der Semantik hängt statt an einer in den Test kopierten Zeichenkette.
import { dictionaries } from '../lib/i18n';
// Diese UI-Tests wählen Deutsch ausdrücklich; der Produkt-Default bleibt Englisch.
jest.mock('@/lib/i18n', () => {
  const actual = jest.requireActual('@/lib/i18n') as typeof import('@/lib/i18n');
  return { ...actual, useLocale: () => ({
    ...actual.useLocale(), uiLanguage: 'de',
    t: (key: import('@/lib/i18n').TranslationKey, params?: import('@/lib/i18n/types').TParams) => actual.translate('de', key, params),
    languageName: (code: import('@/lib/i18n').UiLanguage) => actual.languageDisplayName(code, 'de'),
  }) };
});



/** Der Material-Hinweis, den die Produktions-Einstellungen zeigen müssen. */
const MATERIAL_BODY = dictionaries.de['settings.materialBody']!;

jest.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Redirect: () => null, router: { dismissTo: jest.fn() },
}));

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
    expect(JSON.stringify(screen!.toJSON())).toContain('Über die App');
    await act(async () => { screen!.update(<AboutScreen />); });
    expect(JSON.stringify(screen!.toJSON())).toContain(MATERIAL_BODY);
    await act(async () => { screen!.update(<StudioScreen />); });
    expect(JSON.stringify(screen!.toJSON())).not.toMatch(/Generator|API-Schlüssel/);
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
