import { BatchProgress, missingFrom, runBatch } from '../generation/batch';
import { BatchTask } from '../generation/types';
import { base64ByteLength } from '../images/types';
import { DataStore, getStore } from '../storage';
import { isContentRejected } from '../content/rejections';

import { getAudioBlobStore } from './blob-store';
import { ClipGenerationClient } from './generator';
import { invalidateClipIndex } from './lookup';
import { AudioBlobStore, AudioClip, AudioClipSpec, clipBlobKey } from './types';

/**
 * Der Lauf für Hörclips — vierter Nutzer desselben Läufers
 * (`lib/generation/batch.ts`): sofort speichern, Fehler überleben,
 * fortsetzbar, abbrechbar. Hier steht nur, was Clips ausmacht: die
 * zweiteilige Ablage nach dem Muster der Bilder (AE-14, AE-30).
 */

export type ClipRunOptions = {
  specs: AudioClipSpec[];
  client: ClipGenerationClient;
  store?: DataStore;
  blobStore?: AudioBlobStore;
  onProgress?: (progress: BatchProgress) => void;
  shouldCancel?: () => boolean;
  delayMs?: number;
  now?: () => number;
};

/** Vorhanden heißt: Dokument **und** Datei — sonst Karteileiche (AE-14). */
function clipExists(db: DataStore, blobs: AudioBlobStore) {
  return {
    async exists(spec: AudioClipSpec) {
      if (await isContentRejected('audio', spec.id, db)) return true;
      const doc = await db.get<AudioClip>('audio', spec.id);
      if (!doc) return false;
      return blobs.has(doc.blobKey);
    },
  };
}

function clipTask(
  client: ClipGenerationClient,
  db: DataStore,
  blobs: AudioBlobStore,
  now: () => number
): BatchTask<AudioClipSpec> {
  return {
    ...clipExists(db, blobs),
    async produce(spec) {
      const clip = await client.generate(spec);
      const blobKey = clipBlobKey(spec.id, clip.format);

      // Erst die Datei, dann das Dokument - bricht es dazwischen ab, gilt der
      // Clip als fehlend und wird beim naechsten Lauf sauber neu erzeugt.
      await blobs.put(blobKey, clip.base64);

      const doc: AudioClip = {
        id: spec.id,
        language: spec.language,
        text: spec.text,
        kind: spec.kind,
        sourceId: spec.sourceId,
        format: clip.format,
        byteSize: base64ByteLength(clip.base64),
        durationMs: clip.durationMs,
        blobKey,
        provider: clip.provider,
        model: clip.model,
        voice: clip.voice,
        generatedAt: now(),
        synthetic: true,
      };
      await db.put('audio', spec.id, doc);
      invalidateClipIndex();
    },
  };
}

export async function runClipBatch(options: ClipRunOptions): Promise<BatchProgress> {
  const db = options.store ?? (await getStore());
  const blobs = options.blobStore ?? (await getAudioBlobStore());
  return runBatch({
    specs: options.specs,
    task: clipTask(options.client, db, blobs, options.now ?? Date.now),
    onProgress: options.onProgress,
    shouldCancel: options.shouldCancel,
    delayMs: options.delayMs,
  });
}

/** Welche Clips aus dem Plan noch fehlen. */
export async function missingClipSpecs(
  specs: AudioClipSpec[],
  store?: DataStore,
  blobStore?: AudioBlobStore
): Promise<AudioClipSpec[]> {
  const db = store ?? (await getStore());
  const blobs = blobStore ?? (await getAudioBlobStore());
  return missingFrom(specs, clipExists(db, blobs));
}
