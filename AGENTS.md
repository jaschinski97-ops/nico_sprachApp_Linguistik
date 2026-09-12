# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Arbeitsstand — für die nächste KI (Stand 11.09.2026, nach Commits 0610a53 + 005d3ff)

Alles committet, Working Tree clean, `npx tsc --noEmit` clean, **1026/1026 Tests grün**. Kurz:

- **0610a53 — Optimierungslauf nach Runde 8:** SDK-Erbe entfernt (`@anthropic-ai/sdk` deinstalliert, Stub + Metro-Redirect raus). ⚠️ `config.resolver.unstable_conditionNames` in `metro.config.js` bewusst stehen lassen — Metro-Default ist eine LEERE Liste. Modell-Konstanten aus `PROVIDER_INFO.gemini.modelPlaceholder` abgeleitet; `planClips` nur noch über `vocabulary:`; ar↔de-Kopplung über exportiertes `DE_CONCEPTS` (Invariant `id === concept` gepinnt); Zähler-Typen `Record<Lang, number>`; Details in der Commit-Message. **Offen:** Metro-Config danach noch nicht live verifiziert — beim nächsten `npm start` Bundle-Lauf beobachten.
- **005d3ff — Aufgeräumt (~5,7 GB):** 6 veraltete content/-Berichte (188-MB-Blob automatic-checks.json bleibt trotzdem in der Git-Historie), 8 Metro-Konsolenlogs + `.gitignore /pipeline/logs/*.log`, docs/screenshots, design-review-shots, CLAUDE.md, .vscode. BEHALTEN: `content/phase21-research.md` (AE-61), `content/structure-audit.json` (aktives Ausgabeziel von `npm run audit:structure`), 5 kleine historische content/-JSONs, `pipeline/reports/tone-calibration.json` (182 MB, regenerierbar per `measure-tones.cjs`), komplette Doku. `CLAUDE.md` (@AGENTS.md-Verweis) ist gelöscht — CLAUDE-Tools laden AGENTS.md dann nicht automatisch.
- **Nicht geändert (bekannt veraltet):** `content/README.md` + `docs/PIPELINE.md` + `src/dev/content-report.tsx` nennen teils noch alte Berichtspfade in `content/`.

Verlauf/Details älterer Runden: persistent Memory (`thaispeaker-ui-review-2026-09-09`), Git-Log. Nächste KI: Ergebnisse und offene Punkte ebenfalls hier in AGENTS.md eintragen (dieser Abschnitt wird bei jedem Chat geladen).
