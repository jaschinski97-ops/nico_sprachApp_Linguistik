# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Arbeitsstand — für die nächste KI (Stand 13.09.2026)

**Grundstock-Ära (12.–13.09.): Katalog 840 Einträge — Vokabel-Clips th 79 / en 85 / es 109 (+30 es-Beispiele), 78 Thai-Vokabelbilder, 489 Situationen de↔th (ohne Turn-Audio → TTS-Fallback), 32 mitgelieferte Prüfungsmodule. Plan: Nutzer stockt je Sprache selbst per KI-Generierung auf (kleine Läufe, kein Massen-Export).**

- **d1a54ac — 3.023 Thai-Massenclips gelöscht** (Nutzerfreigabe): aus catalog.json UND `.content-studio/stage.json` (⚠️ `publish()` merged Stage nur HINZU — Staging immer mitbeschniden, sonst kommt alles zurück), `assets.ts` regeneriert, 7.255 Dateien (283,7 MiB) aus assets/content + .content-studio gelöscht, Web-Mirror gesynct.
- **13.09. — 64 erzeugte Prüfungsmodule aus Katalog + Staging entfernt** (Nutzerrückmeldung: Studio-Löschen griff nicht — `loadExamModules` legt den gebündelten Bestand IMMER über den Store, das Studio-Löschen erreicht nur den Store). Studio zeigt jetzt „32 gesamt, davon 0 erzeugt".
- **13.09. — Navigation (Nutzerwunsch):** Übersicht: jede Ziel-Zeile im LanguagePicker hat einen „Lernen"-Knopf → wählt Ziel + `router.push('/review?direction=…')` (Adressparameter schlägt das Profil — kein Race mit dem Profil-Schreiben). Lern-Reiter: „← Zur Übersicht" über dem Titel (neues ScreenScaffold-Prop `headerAction`). Neu: `'review.backToOverview'` in allen 5 Wörterbüchern. Zeile/Knopf sind geschwisterliche Pressables (a11y: radio + button).
- **Verifiziert:** content:integrity errors:0 · tsc clean · 1026/1026 Tests · Browser: Studio-Zähler 32/0, Round-trip Übersicht → Lernen (Thai) → Übersicht.
- ⚠️ **Altes Studio-Fenster** (Nutzer-Browser/Emulator-Speicher) kann noch den alten Bestand halten → ein Export dort schreibt die Massen zurück; vorher „Alle Clips löschen" etc. drücken (gebündelter Grundstock bleibt als preferBundled-Fallback).
- **Uncommitted geblieben (bewusst):** `src/dev/content-studio.tsx` (onDelete-Refresh + POOL_ZAEHLER „Deutsch 84 (abgeleitet)", Nutzerwunsch 12.09.) und `pipeline/logs/`.
- **Nicht geändert (bekannt veraltet):** `content/README.md` + `docs/PIPELINE.md` + `src/dev/content-report.tsx` nennen teils noch alte Berichtspfade in `content/`.

Verlauf/Details älterer Runden: persistent Memory (`thaispeaker-ui-review-2026-09-09`), Git-Log. Nächste KI: Ergebnisse und offene Punkte ebenfalls hier in AGENTS.md eintragen (dieser Abschnitt wird bei jedem Chat geladen).
