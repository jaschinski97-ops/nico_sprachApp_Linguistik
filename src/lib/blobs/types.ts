/**
 * Ablage für Binärdaten — Bilder (Phase 5) und Hörclips (Phase 11).
 *
 * WARUM AUS `lib/images` HERAUSGEZOGEN: Die Bildablage aus AE-14 war von
 * Anfang an eine allgemeine Datei-je-Eintrag-Ablage, nur mit Bild-MIME-Typen
 * und dem Ordnernamen `images` fest verdrahtet. Hörclips brauchen exakt
 * dieselben fünf Operationen mit einem anderen Ordner und anderen MIME-Typen.
 * Sie ein zweites Mal zu schreiben hieße, die IndexedDB-Umsetzung, die
 * Dateisystem-Umsetzung und den Notnagel im Arbeitsspeicher dreimal zu
 * pflegen — dieselbe Überlegung, aus der in Phase 5 der Batch-Läufer und in
 * Phase 10 die Anbieter-Naht entstanden sind.
 *
 * Die Bildablage bleibt nach außen unverändert (`getImageBlobStore`,
 * `MemoryImageBlobStore`, `ImageBlobStore`) und liegt weiter unter dem Namen
 * `images` — die IndexedDB `thai-lernbegleiter-images` und der Ordner
 * `<Dokumente>/images/` sind dieselben wie vor dieser Phase, gespeicherte
 * Bilder bleiben also auffindbar.
 */

export interface BlobStore {
  init(): Promise<void>;
  has(key: string): Promise<boolean>;
  /** Legt die Daten ab. `base64` ohne `data:`-Präfix. */
  put(key: string, base64: string): Promise<void>;
  /**
   * Abspielbare bzw. anzeigbare Quelle — nativ ein `file://`-Pfad, im Web
   * eine `data:`-URL. `null`, wenn nichts abgelegt ist.
   */
  uri(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export type BlobStoreConfig = {
  /**
   * Kurzname der Ablage. Wird zum Ordnernamen (nativ) und zum Suffix der
   * IndexedDB (`thai-lernbegleiter-<name>`). Muss stabil bleiben, sonst
   * finden bestehende Installationen ihre Dateien nicht mehr.
   */
  name: string;
  /** MIME-Typ für die `data:`-URL, abgeleitet aus dem Schlüssel (Endung). */
  mimeOf(key: string): string;
};

/** Endung eines Schlüssels wie `nam.webp` → `webp`. */
export function extensionOf(key: string): string {
  return key.slice(key.lastIndexOf('.') + 1).toLowerCase();
}
