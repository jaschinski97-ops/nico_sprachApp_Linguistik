import { registerPronunciationClipLookup, SpeechLanguage } from '../audio';
import { DataStore, getStore } from '../storage';
import { bundledAssetUri } from '../content/bundled';
import { isContentDeveloper } from '../content/developer';

import { getAudioBlobStore } from './blob-store';
import { AudioBlobStore, AudioClip, clipIdFor, isValidAudioClip } from './types';

/**
 * Findet zu (Sprache, Text) den abgelegten Clip — der Auflöser, den Phase 3
 * vorgesehen hat.
 *
 * WARUM EIN INDEX IM ARBEITSSPEICHER: Jeder Tipp auf „Anhören" fragt hier
 * nach. Das Web-Backend des Dokumentspeichers liest eine Sammlung als ganzen
 * JSON-Blob (AE-14); bei tausend Clips wäre das je Tipp ein Parsen von einigen
 * hundert Kilobyte. Der Index hält nur `id → blobKey`, wird beim ersten Tipp
 * gefüllt und nach jedem Lauf und Löschen verworfen (`invalidateClipIndex`).
 *
 * NACHSICHTIG (AE-25): Ein unbrauchbares Dokument wird ausgelassen, nicht
 * gelöscht — der Text fällt dann auf TTS zurück, wie vor Phase 11.
 */

let index: Map<string, string> | null = null;
let pending: Promise<Map<string, string>> | null = null;

async function buildIndex(db: DataStore): Promise<Map<string, string>> {
  const docs = await db.getAll<unknown>('audio');
  const map = new Map<string, string>();
  for (const doc of docs) {
    if (isValidAudioClip(doc)) map.set(doc.id, doc.blobKey);
  }
  return map;
}

export function invalidateClipIndex(): void {
  index = null;
  pending = null;
}

export async function clipIndex(store?: DataStore): Promise<Map<string, string>> {
  if (index) return index;
  if (!pending) {
    pending = (async () => {
      const db = store ?? (await getStore());
      const built = await buildIndex(db);
      index = built;
      return built;
    })();
  }
  return pending;
}

export async function resolveClipUri(
  request: { text: string; language: SpeechLanguage },
  store?: DataStore,
  blobStore?: AudioBlobStore
): Promise<string | null> {
  const id = clipIdFor(request.language, request.text);
  const bundled = await bundledAssetUri('audio', id);
  if (bundled) return bundled;
  // Learning screens must not bypass the delivery gate through old drafts.
  // Explicit stores are retained only as the dependency seam for isolated tests.
  if (request.language === 'th' && !store) return null;
  if (!__DEV__ || (!store && !isContentDeveloper())) return null;
  const blobKey = (await clipIndex(store)).get(id);
  if (!blobKey) return null;
  const blobs = blobStore ?? (await getAudioBlobStore());
  return blobs.uri(blobKey);
}

/**
 * Hängt den Auflöser in die Aussprache-Wiedergabe ein. Einmal beim Start
 * aufrufen — die Screens bleiben unverändert, genau wie in Phase 3 vorgesehen.
 * Fehler beim Nachschlagen werden geschluckt: dann läuft TTS, wie bisher.
 */
export function installClipLookup(): void {
  registerPronunciationClipLookup(async (request) => {
    try {
      return await resolveClipUri(request);
    } catch (error) {
      console.warn('[clips] Clip-Suche fehlgeschlagen, weiter mit Sprachausgabe.', error);
      return null;
    }
  });
}

export type { AudioClip };
