import { getStore } from '@/lib/storage';
import { getAudioBlobStore } from '@/lib/clips/blob-store';
import { getImageBlobStore } from '@/lib/images/blob-store';
import { isContentDeveloper } from '@/lib/content/developer';
import type { ContentCatalog, ContentEntry } from '@/lib/content/types';

export const STUDIO_URL = 'http://127.0.0.1:8082';
export type StudioState = {
  stage: ContentCatalog;
  shipped: ContentCatalog;
  report: { limitations?: string; entries: (ContentEntry['check'] & { kind: string; id: string; text?: string })[] };
};
export async function studioRequest<T>(path: string, data?: unknown): Promise<T> {
  if (!isContentDeveloper()) throw new Error('Inhaltsstudio nur lokal im Entwicklerbetrieb.');
  let response: Response;
  try {
    response = await fetch(STUDIO_URL + path, data === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
  } catch { throw new Error('Lokales Inhaltsstudio nicht erreichbar. Im Repo „npm run content:studio“ starten.'); }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Inhaltsexport fehlgeschlagen.');
  return result as T;
}
/** One item at a time; never collect the complete PCM corpus in memory/JSON. */
export async function exportDrafts(onProgress: (message: string) => void): Promise<void> {
  await studioRequest<StudioState>('/state');
  const db = await getStore();
  let exported = 0;

  const failures: string[] = [];
  for (const kind of ['situations', 'exam', 'images', 'audio'] as const) {
    const docs = await db.getAll<unknown>(kind);
    for (const document of docs) {
      let id = '(ungültiger Eintrag)';
      try {
        if (!document || typeof document !== 'object' || Array.isArray(document) ||
            !('id' in document) || typeof document.id !== 'string' || !document.id) {
          throw new Error('Inhaltsmetadaten oder ID fehlen.');
        }
        id = document.id;
        if (kind === 'exam' && 'source' in document && document.source === 'builtin') continue;
        onProgress(`${exported} exportiert · Prüfung läuft · ${kind}: ${id}`);
        let base64: string | undefined;
        if (kind === 'audio' || kind === 'images') {
          const blobs = kind === 'audio' ? await getAudioBlobStore() : await getImageBlobStore();
          if (!('blobKey' in document) || typeof document.blobKey !== 'string') throw new Error('Blob-Schlüssel fehlt.');
          const uri = await blobs.uri(document.blobKey);
          if (!uri?.startsWith('data:') || !uri.includes(';base64,')) throw new Error('Lokale Mediendatei fehlt.');
          base64 = uri.split(';base64,')[1];
        }
        await studioRequest('/stage', { kind, document, base64 });
        exported++;
      } catch (error) { failures.push(`${kind}:${id}: ${error instanceof Error ? error.message : String(error)}`); }
    }
  }
  await studioRequest('/publish', {});
  onProgress(`${exported} exportiert · Prüfbericht aktualisiert · ${failures.length} Exportfehler` + (failures.length ? `\n${failures.join('\n')}` : ''));
  if (failures.length) throw new Error(failures.join('\n'));
}
