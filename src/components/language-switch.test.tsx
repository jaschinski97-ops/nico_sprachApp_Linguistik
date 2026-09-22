import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { LanguageSwitch } from './language-switch';

jest.mock('@/lib/i18n', () => {
  const actual = jest.requireActual('@/lib/i18n') as typeof import('@/lib/i18n');
  return { ...actual, useLocale: () => ({
    ...actual.useLocale(), uiLanguage: 'en',
    t: (key: import('@/lib/i18n').TranslationKey, params?: import('@/lib/i18n').TParams) => actual.translate('en', key, params),
    languageName: (code: import('@/lib/i18n').UiLanguage) => actual.languageDisplayName(code, 'en'),
  }) };
});

test('Fortschrittsauswahl zeigt Deutsch und liefert dessen Lernrichtung', async () => {
  const onSelect = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<LanguageSwitch selected="en_to_de" onSelect={onSelect} />); });
  const buttons = tree.root.findAll(node => node.props.accessibilityRole === 'radio' && typeof node.props.onPress === 'function');
  const german = buttons.find(button => button.props.accessibilityLabel === 'Learn German');
  expect(german).toBeDefined();
  expect(german!.props.accessibilityState).toEqual({ checked: true });
  expect(buttons.every(button => button.props['aria-checked'] === (button.props.accessibilityLabel === 'Learn German'))).toBe(true);
  await act(async () => { german!.props.onPress(); });
  expect(onSelect).toHaveBeenCalledWith('en_to_de');
  expect(JSON.stringify(tree.toJSON())).not.toContain('Learn English');
  await act(async () => { tree.unmount(); });
});
