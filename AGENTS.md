# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Arbeitsstand — für die nächste KI (Stand 13.09.2026, abends)

**⚠️ PARALLEL-SITZUNG (wichtig):** Ein zweiter KI-Chat baut GERADE den „20-Sprachen-Ausbau“ (20 meistgesprochene Sprachen, 380 Paare, KI-generierte Pools via `scripts/content/generate-target-vocab.cjs`, +15 neue `vocabulary-*.ts`, types/registry/goals/review-session/i18n-index u. a. — 28+ Dateien). Dieser Stand ist WIP: **tsc ~92 Fehler, 20 Test-Suiten rot, Web-Dev-Server 500** (registry.ts liest Pool-Exporte, die `@/data/vocabulary` noch nicht hergibt). NICHT als Defekt „reparieren“ — dort weiterarbeiten oder den Chat fertig machen lassen. Der Commit unten enthält bewusst NUR die eigenen Dateien (Pfad-Commit), damit die Slices nicht verwurschteln.

**Übersicht-Politur (dieser Commit, NUtilzerwünsche 13.09.):**
- **Hero folgt der Sprache:** `tone-hero.tsx` → `language-hero.tsx` (`LanguageHero`): zeigt den Gruß der GELEHRTEN Sprache des aktiven Lernziels (`goalLanguage(aktivesZiel)`) — Thai-Marke unverändert (handverifizierte Segmente), Spanisch betonte Silbe + Regeltext, Englisch Lautschrift, Deutsch „hallo / guten Tag“ (aus dem `german`-Feld des Ankers `sawatdii`). Grußwörter aus den Pools über `concept: 'sawatdii'`, Fallback Thai-Marke. Merkhilfe je SPRACHE (Lautschrift ≠ Betonungsregel — Vertauscher-Bug von `language-hero.test.tsx` gepinnt, 4 Fälle).
- **Deutsch-Zeile:** „84 Wörter von Thai auf Deutsch“ → Standard „84 Wörter“ wie alle Zeilen; `picker.goalDeutschDetail` aus allen 5 Wörterbüchern entfernt; `goal.deutschDescription` ohne Thai-Bezug umformuliert.

**Grundstock-Ära (12.–13.09., d1a54ac + 677cd7b):** Katalog 840 Einträge — Vokabel-Clips th 79 / en 85 / es 109 (+30 es-Beispiele), 78 Thai-Bilder, 489 Situationen (ohne Turn-Audio → TTS-Fallback), 32 mitgelieferte Prüfungsmodule. Nutzer stockt je Sprache selbst auf. ⚠️ `publish()` merged Stage nur HINZU — Löschen immer in catalog.json UND `.content-studio/stage.json`. ⚠️ Studio-Löschen erreicht nur den Dev-Speicher, nie den gebündelten Bestand (`loadExamModules`/`loadAudioClips` legen Bundled über den Store). Navigation: „Lernen“-Knopf je Ziel-Zeile (`/review?direction=…`), Rückweg „← Zur Übersicht“ im Lern-Reiter (`ScreenScaffold.headerAction`, `'review.backToOverview'`).

- **Verifiziert (vor dem Parallel-WIP):** Navigation-Round-trip live, Studio-Zähler 32/0, integrity errors:0. **Der neue Hero-Test läuft grün** (`npx jest src/components/language-hero.test.tsx`) — der Rest der Suite ist vom Parallel-WIP rot.
- **Uncommitted (bewusst):** der komplette Parallel-WIP (siehe oben), `src/dev/content-studio.tsx` (onDelete-Refresh + POOL_ZAEHLER), `pipeline/logs/`.
- **Nicht geändert (bekannt veraltet):** `content/README.md` + `docs/PIPELINE.md` + `src/dev/content-report.tsx` nennen teils noch alte Berichtspfade in `content/`.

Verlauf/Details älterer Runden: persistent Memory (`thaispeaker-ui-review-2026-09-09`), Git-Log. Nächste KI: Ergebnisse und offene Punkte ebenfalls hier in AGENTS.md eintragen (dieser Abschnitt wird bei jedem Chat geladen).
