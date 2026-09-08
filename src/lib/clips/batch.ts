import { BatchProgress, missingFrom, runBatch } from '../generation/batch';
import { BatchTask } from '../generation/types';
import { base64ByteLength } from '../images/types';
import { checkThaiTone } from '../content/tone-gate';
import { DataStore, getStore } from '../storage';

import { getAudioBlobStore } from './blob-store';
import { decodeClipAsync } from './decode-clip';
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
      const doc = await db.get<AudioClip>('audio', spec.id);
      if (!doc) return false;
      return blobs.has(doc.blobKey);
    },
  };
}

/**
 * Tonprüfung des frisch generierten Clips, noch vor dem Ablegen. WAV-Klipse
 * (Gemini) tragen rohes PCM; mp3 (ChatGPT) wird im Web-Studio über
 * `decodeAudioData` dekodiert — nativ gibt es keinen Decoder, dort bleibt
 * die Prüfung beim Stage/Publish im Studio-Node (ffmpeg). Derselbe Messkern
 * wie im Messwerkzeug. Ein Clip, der klar widerspricht, wird nicht
 * abgelegt — der Lauf zählt ihn als fehlgeschlagen mit Grund, und der
 * nächste Lauf erzeugt ihn neu. Ein interner Messfehler darf die Erzeugung
 * nie blockieren — dann eben ungeprüft statt gar nicht.
 */
async function measureFreshClip(spec: AudioClipSpec, clip: { format: string; base64: string }) {
  try {
    const decoded = await decodeClipAsync(clip.base64, clip.format);
    if (!decoded) return null;
    return checkThaiTone(spec, decoded.pcm, decoded.sampleRate);
  } catch {
    return null;
  }
}

function clipTask(
  client: ClipGenerationClient,
  db: DataStore,
  blobs: AudioBlobStore,
  tone: { passed: number; failed: number; other: number },
  now: () => number
): BatchTask<AudioClipSpec> {
  return {
    ...clipExists(db, blobs),
    async produce(spec) {
      const clip = await client.generate(spec);

      // Automatische Tonprüfung (Debug-Ablauf): Ein Clip, dessen Kontur dem
      // verifizierten Sollton klar widerspricht, wird gar nicht erst
      // abgelegt — der Lauf zählt ihn als fehlgeschlagen mit Grund, und der
      // nächste Lauf erzeugt ihn neu. Speichern wir ihn trotzdem, bliebe er
      // lokal abspielbar und würde nur beim Publish aussortiert.
      const toneCheck = await measureFreshClip(spec, clip);
      if (toneCheck) {
        if (toneCheck.status === 'passed') tone.passed += 1;
        else if (toneCheck.status === 'failed') tone.failed += 1;
        else tone.other += 1;
      }
      if (toneCheck?.status === 'failed') {
        throw new Error(`Ton-Check fehlgeschlagen (${spec.text}): ${toneCheck.reason}`);
      }

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
  const tone = { passed: 0, failed: 0, other: 0 };
  const onProgress = options.onProgress
    ? (progress: BatchProgress) => options.onProgress?.({ ...progress, tone: { ...tone } })
    : undefined;
  const result = await runBatch({
    specs: options.specs,
    task: clipTask(options.client, db, blobs, tone, options.now ?? Date.now),
    onProgress,
    shouldCancel: options.shouldCancel,
    delayMs: options.delayMs,
  });
  return { ...result, tone: { ...tone } };
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
