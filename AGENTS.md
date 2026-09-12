# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Arbeitsstand — für die nächste KI (Stand 12.09.2026, nachmittags)

**Thai-Massenclips gelöscht (Nutzerfreigabe „lösche die ca. 3000 thai clips raus") — gleicher Grundstock für alle Sprachen, Aufstocken je Sprache per KI-Generierung ist der Plan.** Kurz:

- **Gelöscht: 3.023 Thai-Clips** (2.943 Situations-Turns + 80 Vokabel-Beispiele) — aus `src/content/catalog.json` UND `.content-studio/stage.json` (wichtig: `publish()` in pipeline.cjs merged Stage nur HINZU, ohne Staging-Beschnitt käme die Masse beim nächsten Export zurück). `src/content/assets.ts` regeneriert; 7.255 Dateien (283,7 MiB) aus `assets/content/` + `.content-studio/` entfernt; Web-Mirror per `npm run web:content` gesynct (3.023 entfernt).
- **Verbleibender Grundstock (Katalog 904 Einträge):** Vokabel-Clips th 79 / en 85 / es 109 (79 Vokabel + 30 Beispiele), 78 Thai-Vokabelbilder, 489 Situationen de↔th (Text komplett, Turn-Audio fehlt jetzt → TTS-Fallback bzw. Regenerierung), 64 erzeugte Prüfungsmodule. Studio-Anzeige live verifiziert: „Hörclips: Thai 79 · Englisch 85 · Spanisch 109 · Deutsch 0".
- **Verifiziert:** `content:integrity` errors:0 · `npx tsc --noEmit` clean · **1026/1026 Tests grün** · Web-Bundle (Metro 8081) baut ohne Resolve-Fehler.
- ⚠️ **Wenn im ALTEN Studio-Fenster** (Browser-Profil des Nutzers bzw. App-Emulator-Speicher) noch der alte Bestand liegt, schreibt ein Export dort die 3.023 Clips ZURÜCK. Dann erst im Studio „Alle Clips löschen"/„Alle Bilder löschen" drücken — der gebündelte Grundstock bleibt als `preferBundled`-Fallback erhalten, der Store muss ihn nicht halten. (Der Publish-Speicher des Morgen-Laufs war beim Löschlauf nicht erreichbar: kein Emulator an, Playwright-Profil frisch/leer.)
- **Uncommitted geblieben (bewusst):** `src/dev/content-studio.tsx` (onDelete-Refresh + POOL_ZAEHLER „Deutsch 84 (abgeleitet)", Nutzerwunsch 12.09.) und `pipeline/logs/` der Morgen-Läufe.
- **Nicht geändert (bekannt veraltet):** `content/README.md` + `docs/PIPELINE.md` + `src/dev/content-report.tsx` nennen teils noch alte Berichtspfade in `content/`.

Verlauf/Details älterer Runden: persistent Memory (`thaispeaker-ui-review-2026-09-09`), Git-Log. Nächste KI: Ergebnisse und offene Punkte ebenfalls hier in AGENTS.md eintragen (dieser Abschnitt wird bei jedem Chat geladen).
