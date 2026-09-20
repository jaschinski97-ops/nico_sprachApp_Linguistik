import shipped from '../../content/catalog.json';
import type { ContentCatalog } from './types';

let current = shipped as unknown as ContentCatalog;
export function currentCatalog(): ContentCatalog { return current; }
export function setCurrentCatalog(catalog: ContentCatalog): void {
  if (!catalog || !Array.isArray(catalog.entries)) throw new Error('Der Inhaltskatalog ist unvollständig. Bitte Studio aktualisieren.');
  current = catalog;
}
