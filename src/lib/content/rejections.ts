import ledger from '../../../content/rejections.json';
import type { DataStore } from '../storage';
import type { ContentKind } from './types';

export async function isContentRejected(kind: ContentKind, id: string, db: DataStore): Promise<boolean> {
  const shipped = ledger.entries as { kind: ContentKind; id: string }[];
  if (shipped.some((entry) => entry.kind === kind && entry.id === id)) return true;
  return (await db.get('meta', `content-rejected:${kind}:${id}`)) !== null;
}
