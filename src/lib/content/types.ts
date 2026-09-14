import type { AudioClip } from '../clips/types';
import type { ConversationSituation } from '../conversation/types';
import type { ExamModule } from '../exam/types';
import type { VocabImage } from '../images/types';
import type { VocabEntry } from '@/data/vocab-types';

// Phase 2, Schritt 4: 'vocabulary' ist die vierte + fünfte … Inhaltsart —
// KI-erzeugter Wortschatz läuft über Stage UND catalog.json wie alles andere.
export type ContentKind = 'situations' | 'images' | 'audio' | 'exam' | 'vocabulary';
export type ContentDocuments = {
  situations: ConversationSituation;
  images: VocabImage;
  audio: AudioClip;
  exam: ExamModule;
  vocabulary: VocabEntry;
};
export type ContentCheck = {
  status: 'passed' | 'failed' | 'unchecked';
  label: 'automatisch geprüft' | 'ungeprüft' | 'aussortiert';
  checkedAt: string;
  scope: 'schema-integrity-decode' | 'schema-language';
  tone?: import('./tone-gate').ToneCheck;
  /** Grund bei 'aussortiert' oder 'ungeprüft' (Phase 2, Schritt 1). */
  reason?: string;
};
export type ContentEntry<K extends ContentKind = ContentKind> = {
  kind: K;
  id: string;
  document: ContentDocuments[K];
  digest: string;
  asset?: string;
  sourceBytes?: number;
  byteSize?: number;
  check?: ContentCheck;
};
export type ContentCatalog = { version: 2; entries: ContentEntry[] };
