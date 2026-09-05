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
export type ContentReview = {
  status: 'approved' | 'rejected';
  reviewer: string;
  reviewedAt: string;
  reason: string;
  /** Binds the human decision to metadata AND the final compressed bytes. */
  digest: string;
};
export type ContentEntry<K extends ContentKind = ContentKind> = {
  kind: K;
  id: string;
  document: ContentDocuments[K];
  digest: string;
  asset?: string;
  sourceBytes?: number;
  byteSize?: number;
  review?: ContentReview;
};
export type ContentCatalog = { version: 1; entries: ContentEntry[] };
