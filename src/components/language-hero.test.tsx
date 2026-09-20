import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { LanguageHero } from './language-hero';
// Diese UI-Tests wählen Deutsch ausdrücklich; der Produkt-Default bleibt Englisch.
jest.mock('@/lib/i18n', () => {
  const actual = jest.requireActual('@/lib/i18n') as typeof import('@/lib/i18n');
  return { ...actual, useLocale: () => ({
    ...actual.useLocale(), uiLanguage: 'de',
    t: (key: import('@/lib/i18n').TranslationKey, params?: import('@/lib/i18n/types').TParams) => actual.translate('de', key, params),
    languageName: (code: import('@/lib/i18n').UiLanguage) => actual.languageDisplayName(code, 'de'),
  }) };
});



/**
 * Der Hero der Übersicht folgt der GELEHRTEN Sprache (Nutzerwunsch 13.09.):
 * Thai zeigt die Marken-Marke mit Tönen, die lateinischen Grußwörter kommen
 * aus den geprüften Pools — und die Merkhilfe gehört zur JEWEILIGEN Sprache
 * (Lautschrift bei Englisch, Betonungsregel bei Spanisch), nicht zu einer
 * festen. Genau dieser Vertauscher war der Fehler, den der Test pinnt.
 */
async function renderHero(language: 'th' | 'en' | 'es' | 'de'): Promise<string> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<LanguageHero language={language} />);
  });
  const json = JSON.stringify(tree.toJSON());
  await act(async () => {
    tree.unmount();
  });
  return json;
}

test('Thai zeigt das Markenwort mit Ton-Umschrift', async () => {
  const json = await renderHero('th');
  expect(json).toContain('สวัส');
  expect(json).toContain('sà');
  expect(json).toContain('wàt');
});

test('Englisch zeigt die Lautschrift als Merkhilfe — nicht die Betonungsregel', async () => {
  const json = await renderHero('en');
  expect(json).toContain('hello');
  expect(json).toContain('/həˈləʊ/');
  expect(json).not.toContain('Endet auf Vokal');
});

test('Spanisch nennt die Betonungsregel als Merkhilfe', async () => {
  const json = await renderHero('es');
  expect(json).toContain('hola');
  expect(json).toContain('Endet auf Vokal');
});

test('Deutsch zeigt den deutschen Gruß des Thai-Ankers', async () => {
  const json = await renderHero('de');
  expect(json).toContain('hallo');
  expect(json).toContain('guten Tag');
});
