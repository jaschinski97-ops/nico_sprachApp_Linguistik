#!/usr/bin/env node
/**
 * Spiegelt die Content-Binärdateien (Clips, Bilder) nach `public/content/`.
 *
 * WARUM: Der Web-Bundle enthält die Binärdateien nicht (assets.web.ts, der
 * Kaltstart-Fix gegen EMFILE) — auf Web lief `bundledAssetUri` deshalb leer
 * und jede thailändische Aussprache fiel auf die System-Sprachausgabe zurück.
 * Auf typischen Desktops gibt es keine Thai-Stimme, es blieb stumm
 * (Nutzermeldung 2026-09-10). Expo-web serviert `public/` statisch aus; der
 * Web-Zweig in `lib/content/bundled.ts` baut daraus eine URL und LÄDT die
 * Datei erst beim ersten Tipp auf „Anhören" — kein JS-Bundle-Impact, der
 * Kaltstart bleibt schnell.
 *
 * `public/` ist gitignored (204 MB gehört nicht ins Repo); das Skript läuft
 * nach Bedarf lokal und vor jedem `expo export --platform web`.
 *
 * Aufruf: `npm run web:content` (idempotent, spiegelt 1:1 inkl. Löschen
 * von Dateien, die in der Quelle nicht mehr existieren).
 */

const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'assets', 'content');
const target = path.join(__dirname, '..', 'public', 'content');

if (!fs.existsSync(source)) {
  console.error(`Quelle fehlt: ${source}`);
  process.exit(1);
}

fs.mkdirSync(target, { recursive: true });

const files = fs.readdirSync(source).filter((file) => fs.statSync(path.join(source, file)).isFile());
let copied = 0;
let skipped = 0;

for (const file of files) {
  const from = path.join(source, file);
  const to = path.join(target, file);
  if (fs.existsSync(to)) {
    skipped += 1;
    continue;
  }
  fs.copyFileSync(from, to);
  copied += 1;
}

// Gespiegelt heißt 1:1: Dateien, die in der Quelle verschwunden sind, fliegen
// auch aus dem Ziel — sonst täuscht ein alter Hash eine Abdeckung vor.
const targetFiles = new Set(fs.readdirSync(target));
let removed = 0;
for (const file of targetFiles) {
  if (!fs.existsSync(path.join(source, file))) {
    fs.unlinkSync(path.join(target, file));
    removed += 1;
  }
}

console.log(`web:content — ${copied} kopiert, ${skipped} bereits aktuell, ${removed} entfernt (Quelle: ${files.length} Dateien).`);
