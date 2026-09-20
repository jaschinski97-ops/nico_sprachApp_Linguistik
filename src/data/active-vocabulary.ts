import { VOCABULARY } from './vocabulary';
import type { VocabEntry } from './vocab-types';
import type { Lang } from '@/lib/languages/types';
import { currentCatalog } from '@/lib/content/catalog-state';
import { isDeliverableEntry } from '@/lib/content/audio-policy';

const legacyIds = new Set(VOCABULARY.map(word => word.id));

/** Older catalogs retain their data contract; the new foundation uses generated words only. */
export function usesGeneratedVocabulary(): boolean {
  return currentCatalog().vocabularySource === 'generated';
}

export function isRetiredVocabulary(word: VocabEntry): boolean {
  return usesGeneratedVocabulary() && legacyIds.has(word.id);
}

/** Shared source for learning, studio counts and generation plans. No implicit reseeding. */
export function activeVocabulary(): VocabEntry[] {
  const generated = currentCatalog().entries
    .filter(entry => entry.kind === 'vocabulary' && isDeliverableEntry(entry))
    .map(entry => entry.document as VocabEntry);
  return [...new Map([...(usesGeneratedVocabulary() ? [] : VOCABULARY), ...generated].map(word => [word.id, word])).values()];
}

export function activeVocabularyFor(language: Lang): VocabEntry[] {
  return activeVocabulary().filter(word => String(word.language) === language);
}
