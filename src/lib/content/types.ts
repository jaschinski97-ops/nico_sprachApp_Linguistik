import type { AudioClip } from '../clips/types';
import type { ConversationSituation } from '../conversation/types';
import type { ExamModule } from '../exam/types';
import type { VocabImage } from '../images/types';

export type ContentKind = 'situations' | 'images' | 'audio' | 'exam';
export type ContentDocuments = {
  situations: ConversationSituation;
  images: VocabImage;
  audio: AudioClip;
  exam: ExamModule;
};
export type ContentCheck = {
  status: 'passed' | 'failed' | 'unchecked';
  label: 'automatisch geprüft' | 'ungeprüft' | 'aussortiert';
  checkedAt: string;
  scope: 'schema-integrity-decode';
  tone?: import('./tone-gate').ToneCheck;
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
