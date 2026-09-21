import { activeVocabulary, activeVocabularyFor } from './active-vocabulary';
import { VOCABULARY } from './vocabulary';
import type { VocabEntry } from './vocab-types';
import { currentCatalog, setCurrentCatalog } from '@/lib/content/catalog-state';
import type { ContentCatalog, ContentEntry } from '@/lib/content/types';
import { MemoryDataStore } from '@/lib/storage';
import { loadVocabulary, seedVocabulary } from '@/lib/repository';
import { buildReviewQueue, ensureCardStates } from '@/lib/review-session';
import { planClips } from '@/lib/clips/plan';
import { planImages } from '@/lib/images/plan';
import { LANGUAGES } from '@/lib/languages/registry';

const initial = currentCatalog();
afterEach(() => setCurrentCatalog(initial));
const generated = (language: string): ContentEntry<'vocabulary'> => ({
  kind: 'vocabulary', id: `ki-${language}-hello`, digest: 'test',
  check: { status: 'unchecked', label: 'ungeprüft', checkedAt: 'test', scope: 'schema-language' },
  document: { ...VOCABULARY[0], id: `ki-${language}-hello`, language: language as VocabEntry['language'],
    term: language === 'de' ? 'Hallo' : language === 'th' ? 'สวัสดี' : 'hello', german: 'Gruß',
    translations: { th: 'สวัสดี', en: 'hello', es: 'hola', de: 'Hallo' }, generatedAt: 100 },
});

test('empty generated foundation never reseeds legacy words; old learner progress remains', async () => {
  setCurrentCatalog({ version: 2, vocabularySource: 'generated', entries: [] });
  const store = new MemoryDataStore();
  await store.put('vocab', VOCABULARY[0].id, VOCABULARY[0]);
  await store.put('cards', 'old-progress', { reviews: 7 });
  expect(await seedVocabulary(store)).toBe(0);
  expect(await loadVocabulary(store)).toEqual([]);
  expect(await store.getAll('vocab')).toEqual([]);
  expect(await store.get('cards', 'old-progress')).toEqual({ reviews: 7 });
  expect(activeVocabulary()).toEqual([]);
  expect(LANGUAGES.th.entryCount).toBe(0);
  expect(planClips()).toEqual([]);
  expect(planImages()).toEqual([]);
  expect((await ensureCardStates('th_to_de', store)).entries).toEqual([]);
});

test('published words populate each language immediately, including the independent German target', async () => {
  const catalog: ContentCatalog = { version: 2, vocabularySource: 'generated', entries: ['th', 'en', 'es', 'de'].map(generated) };
  setCurrentCatalog(catalog);
  const store = new MemoryDataStore();
  expect((await loadVocabulary(store)).map(word => word.id).sort()).toEqual(catalog.entries.map(entry => entry.id).sort());
  expect(activeVocabularyFor('de')).toHaveLength(1);
  expect(LANGUAGES.en.entryCount).toBe(1);
  const queue = await buildReviewQueue('th_to_de', store);
  expect(queue).toHaveLength(1);
  expect(queue[0].entry).toMatchObject({ id: 'ki-de-hello', language: 'de', term: 'Hallo', german: 'Hallo' });
  expect(queue[0].bridgeEntry?.term).toBe('สวัสดี');
  setCurrentCatalog({ ...catalog, entries: [] });
  expect(activeVocabularyFor('de')).toEqual([]);
  expect(LANGUAGES.en.entryCount).toBe(0);
});
