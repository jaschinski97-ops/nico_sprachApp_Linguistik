import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

import catalog from '../../content/catalog.json';
import { CONTENT_ASSETS } from '../../content/assets';
import type { ContentCatalog, ContentDocuments, ContentKind } from './types';
import { isDeliverableEntry } from './audio-policy';

const entries = (catalog as unknown as ContentCatalog).entries.filter(isDeliverableEntry);

export function bundledEntry(kind: ContentKind, id: string) {
  return entries.find(entry => entry.kind === kind && entry.id === id);
}

export function bundledDocuments<K extends ContentKind>(kind: K): ContentDocuments[K][] {
  return entries.filter((entry) => entry.kind === kind).map((entry) => entry.document as ContentDocuments[K]);
}

export async function bundledAssetUri(kind: 'audio' | 'images', id: string): Promise<string | null> {
  const entry = entries.find((item) => item.kind === kind && item.id === id);
  if (!entry?.asset) return null;
  // WEB: URL statt require. Der Web-Bundle enthält die Binärdateien nicht
  // (assets.web.ts gegen den EMFILE-Kaltstart) — seitdem blieb jede
  // thailändische Aussprache stumm, weil Desktops keine th-Stimme mitbringen
  // (Nutzermeldung 2026-09-10). `public/content/` spiegelt die Dateien
  // (`npm run web:content`); Expo-web serviert den Ordner statisch, und die
  // Datei wird erst beim ersten Tipp auf „Anhören" geladen — der Kaltstart
  // bleibt vom Katalog unabhängig. Der Ton-Status im Katalog und damit das
  // Auslieferungs-Gate in `resolveClipUri` sind von diesem Weg nicht
  // berührt.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/content/${entry.asset}`;
  }
  const moduleId = CONTENT_ASSETS[entry.asset];
  if (moduleId === undefined) return null;
  // Metro collects the static requires into the native application resources.
  // downloadAsync resolves/copies that embedded resource on native, also after
  // an OS cache purge. No remote content URL is stored in the catalog.
  const asset = await Asset.fromModule(moduleId).downloadAsync();
  return asset.localUri ?? asset.uri;
}

/** Shipped content wins over old local drafts, without touching learner state. */
export function preferBundled<K extends ContentKind>(kind: K, local: ContentDocuments[K][]): ContentDocuments[K][] {
  const combined = new Map(local.map((doc) => [doc.id, doc]));
  for (const doc of bundledDocuments(kind)) combined.set(doc.id, doc);
  return [...combined.values()].sort((a, b) => a.id.localeCompare(b.id));
}
