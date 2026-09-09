/**
 * WEB-STUB (2026-09-09): Metro loest `content/assets` auf der Plattform 'web'
 * bevorzugt auf DIESE Datei auf — Plattform-Erweiterung `.web.ts` gewinnt vor
 * `.ts` (metro-resolver probiert `<name>.web.<ext>` zuerst; gleiche Mechanik
 * wie beim bestehenden `lib/storage/backend.web.ts`). Auf Native bleibt
 * `assets.ts` mit allen eingebetteten Assets aktiv, unveraendert.
 *
 * WARUM: Die 3.374 require()-Assets in assets.ts reissen das Web-Dev-Bundle
 * von Metro auf Windows mit offenen Datei-Handles ab (EMFILE, Gegenmassnahme
 * in metro.config.js). Der Stub bietet dieselbe API wie assets.ts (einziger
 * Export: `CONTENT_ASSETS`), aber mit LEERER Map: `bundledAssetUri` liefert
 * auf Web ehrlich `null`, und die Auflösungskette (installiertes Paket ->
 * eingebettetes Asset -> Entwurf -> TTS) faellt komplett in den TTS-Fallback
 * durch. Der Katalog (catalog.json) und alle Dokumente bleiben eingebettet —
 * nur die Audio-/Bild-Binärdateien sind auf Web nicht mehr mitgebündelt.
 */
export const CONTENT_ASSETS: Record<string, number> = {};
