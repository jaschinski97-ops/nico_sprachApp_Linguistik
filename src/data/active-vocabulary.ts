import type { VocabEntry } from './vocab-types';
import type { Lang } from '@/lib/languages/types';
import { currentCatalog } from '@/lib/content/catalog-state';
import { isDeliverableEntry } from '@/lib/content/audio-policy';

/**
 * DER Wortschatz der App: die auslieferbaren Vokabel-Einträge des Katalogs
 * (`src/content/catalog.json`), erzeugt und geprüft im Entwicklerstudio.
 *
 * SPRACH-UMBAU 23.09.2026: Der alte, fest eingebaute Grundstock
 * (`data/vocabulary*.ts`, Brücken-Pools, abgeleiteter Deutsch-Pool) ist aus
 * der App entfernt — es gibt nur noch diesen einen Datenweg. Lernen,
 * Studio-Zähler und Erzeugungspläne lesen alle hier.
 */
export function activeVocabulary(): VocabEntry[] {
  const generated = currentCatalog().entries
    .filter(entry => entry.kind === 'vocabulary' && isDeliverableEntry(entry))
    .map(entry => entry.document as VocabEntry);
  return [...new Map(generated.map(word => [word.id, word])).values()];
}

export function activeVocabularyFor(language: Lang): VocabEntry[] {
  return activeVocabulary().filter(word => String(word.language) === language);
}

/** Die IDs des aktiven Bestands — alles andere im lokalen Speicher ist Altlast. */
export function activeVocabularyIds(): Set<string> {
  return new Set(activeVocabulary().map(word => word.id));
}
