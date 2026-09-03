import { MemoryBlobStore } from '../blobs/memory';

import { IMAGE_BLOB_CONFIG } from './types';

/** Bildablage im Arbeitsspeicher — für Tests und als Notnagel (siehe `lib/blobs`). */
export class MemoryImageBlobStore extends MemoryBlobStore {
  constructor() {
    super(IMAGE_BLOB_CONFIG);
  }
}

export { MEMORY_BLOB_BACKEND_NAME } from '../blobs/memory';
