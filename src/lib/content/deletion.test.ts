import { isDeletedDraft } from './bundled';
import type { ContentCatalog } from './types';

const catalog: ContentCatalog = {
  version: 2, entries: [],
  deleted: { 'images:old-image': 100 },
  clearedBefore: { 'situations:th': 100, audio: 100, 'vocabulary:th': 100 },
};

test('a reset also suppresses old browser-only drafts, limited to the selected kind and language', () => {
  expect(isDeletedDraft('situations', { id: 'never-published', direction: 'de_to_th', generatedAt: 50 }, catalog)).toBe(true);
  expect(isDeletedDraft('situations', { id: 'german', direction: 'th_to_de', generatedAt: 50 }, catalog)).toBe(false);
  expect(isDeletedDraft('audio', { id: 'spanish', language: 'es', generatedAt: 50 }, catalog)).toBe(true);
  expect(isDeletedDraft('images', { id: 'old-image', generatedAt: 50 }, catalog)).toBe(true);
});

test('new generations with the same ID are allowed and original vocabulary is retained', () => {
  expect(isDeletedDraft('situations', { id: 'never-published', direction: 'de_to_th', generatedAt: 101 }, catalog)).toBe(false);
  expect(isDeletedDraft('images', { id: 'old-image', generatedAt: 101 }, catalog)).toBe(false);
  expect(isDeletedDraft('vocabulary', { id: 'ki-th-test', language: 'th' }, catalog)).toBe(true);
  expect(isDeletedDraft('vocabulary', { id: 'ki-th-test', language: 'th', generatedAt: 101 }, catalog)).toBe(false);
  expect(isDeletedDraft('vocabulary', { id: 'base-th', language: 'th' }, catalog)).toBe(false);
});
