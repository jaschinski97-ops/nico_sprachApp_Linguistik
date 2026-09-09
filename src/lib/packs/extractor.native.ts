/**
 * Nativer Entpacker auf Basis von `react-native-zip-archive`.
 *
 * Stand 2026-09-09: Die Abhaengigkeit ist installiert (react-native-zip-
 * archive 9.5.1 in package.json). `createPackExtractor()` kehrt auf dem
 * Geraet mit dem naechsten NATIVEN Build etwas anderes als `null` zurueck —
 * bis dahin bleibt der require-Aufruf in extractor.ts im try/catch-Weg und
 * die App laeuft mit den eingebetteten Assets weiter (Fallback-Regel).
 * Zip-Slip ist durch die Bibliothek abgedeckt (kanonische Pfadvalidierung,
 * Symlinks deaktiviert — ZipSecurity.java, Review 2026-09-09 geprueft).
 *
 * Bewusst hier und nicht inline in extractor.ts: Diese Datei importiert das
 * native Modul nur ueber den injizierten Parameter — die Typpruefung laeuft
 * auch ohne installierte Dependency, und Tests koennen ein Fake-Modul
 * uebergeben.
 */

import type { PackExtractor, NativeZipModule } from './extractor';

export function createNativeExtractor(zip: NativeZipModule): PackExtractor {
  return {
    async extract(zipUri: string, destDirUri: string) {
      // react-native-zip-archive entpackt nach dem Zielordner (legt ihn auf
      // Android selbst an) und liefert den Pfad zurueck. Fehler werden
      // durchgereicht — der Downloader raeumt das halbe Ziel weg.
      await zip.unzip(zipUri, destDirUri);
    },
  };
}
