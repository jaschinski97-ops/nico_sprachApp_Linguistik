import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ProgressScreen from '../app/progress';
import { loadLearningStats } from '@/lib/stats';

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => (() => void) | void) => jest.requireActual('react').useEffect(callback, [callback]),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/lib/i18n', () => {
  const actual = jest.requireActual('@/lib/i18n') as typeof import('@/lib/i18n');
  return { ...actual, useLocale: () => ({
    ...actual.useLocale(), uiLanguage: 'en',
    t: (key: import('@/lib/i18n').TranslationKey, params?: import('@/lib/i18n').TParams) => actual.translate('en', key, params),
    languageName: (code: import('@/lib/i18n').UiLanguage) => actual.languageDisplayName(code, 'en'),
  }) };
});
jest.mock('@/lib/profile', () => ({
  loadProfile: async () => ({ language: 'th', review: { direction: 'th_to_de', mode: 'cards' } }),
}));
jest.mock('@/lib/stats', () => ({
  ...jest.requireActual('@/lib/stats'),
  loadLearningStats: jest.fn(async (_store, _now, _days, direction) => ({
    perDirection: [], cardStates: { new: 9, learning: 0, review: 1, mastered: 0 },
    totalCards: direction === 'en_to_de' ? 10 : 20, totalDue: 0, days: [],
    totalReviews: 2, reviewsToday: 2, loggedSince: null, streak: 1,
    drillsToday: 3, totalDrills: 3, totalDrillsCorrect: 2,
    accuracyToday: { total: 3, correct: 2 }, accuracyWindow: { total: 3, correct: 2 },
    directionWindow: { total: 0, correct: 0 }, weakAreas: [],
    forecast: [{ date: '2026-09-23', due: 0 }], milestones: [],
  })),
}));

test('Fortschritt übernimmt das Deutsch-Ziel und lädt beim Zielwechsel neue Kartenzahlen', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<ProgressScreen />); });
  expect(loadLearningStats).toHaveBeenLastCalledWith(undefined, expect.any(Number), 14, 'en_to_de');
  expect(JSON.stringify(tree.toJSON())).toContain('German');
  const spanish = tree.root.findAll(node => node.props.accessibilityLabel === 'Learn Spanish' && typeof node.props.onPress === 'function')[0];
  await act(async () => { spanish.props.onPress(); });
  expect(loadLearningStats).toHaveBeenLastCalledWith(undefined, expect.any(Number), 14, 'en_to_es');
  expect(JSON.stringify(tree.toJSON())).toContain('Spanish');
  await act(async () => { tree.unmount(); });
});
