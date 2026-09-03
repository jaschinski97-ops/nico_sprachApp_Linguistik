import { activeBlobBackend, getBlobStore } from '../blobs/store';

import { AUDIO_BLOB_CONFIG, AudioBlobStore } from './types';

/** Die Clip-Ablage der Plattform — ein Name in der allgemeinen Blob-Ablage. */
export function getAudioBlobStore(): Promise<AudioBlobStore> {
  return getBlobStore(AUDIO_BLOB_CONFIG);
}

export function getActiveAudioBlobBackend(): string {
  return activeBlobBackend(AUDIO_BLOB_CONFIG.name);
}
