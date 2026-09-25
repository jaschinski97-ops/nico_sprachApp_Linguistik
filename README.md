# ThaiLernbegleiter

Eine Offline-Lern-App für Thai, Englisch, Spanisch und Deutsch: Vokabeln mit
Bild und Hörclip, Sätze, Übungsgespräche, Prüfungssimulation — alles wird mit
der App **komplett offline** ausgeliefert. KI-Anbieter (Text, Sprachausgabe,
Bilder) braucht nur, wer als Admin neuen Inhalt **erzeugen** will; die Nutzer
bekommen den fertigen Inhalt mit dem App-Build.

Gebaut mit Expo SDK 57 / React Native. Expo Go funktioniert nicht (native
Audio- und SQLite-Module) — siehe „Entwicklung" unten.

## Ordnerstruktur

```
ThaiSpeaker/
├── src/                  App-Code
│   ├── app/              Bildschirme (Expo Router): Übersicht, Lernen,
│   │                     Gespräch, Prüfung, Fortschritt, Einstellungen
│   ├── content/          Generierter Katalog (catalog.json) + Asset-Bindings
│   ├── data/             Verifizierter Wortschatz mit Thai-Tönen
│   ├── lib/              Fachlogik: Tonhöhenmessung, Ton-Gate, Speicher,
│   │                     Anbieter-Clients, Übungsläufe
│   └── components/       UI-Bausteine
├── assets/
│   ├── content/          Ausgelieferte Medien (Bilder + Hörclips,
│   │                     sha256-Dateinamen) — gehört zum Offline-Bundle
│   └── images/           App-Icon, Splash
├── content/              Mess- und Prüfberichte (generierte Qualitätshistorie)
├── scripts/              Werkzeuge: Inhalts-Pipeline, Tonmessung,
│                         Freigabe-Gate, Release-Pipeline
├── docs/                 Projektgeschichte (PROGRESS.md), Audits,
│                         PIPELINE.md (Ablauf für Admins)
├── android/              Natives Projekt — lokal generiert, nicht im Repo
└── _Local/, .agent/, …   Nur lokal, nie auf GitHub (siehe unten)
```

## Auf GitHub vs. nur lokal

**Auf GitHub landet:** `src/`, `assets/`, `scripts/`, `content/`, `docs/`
und die Konfigurationsdateien — also alles, was die App braucht.

**Nie auf GitHub (ignoriert):** Alles, was auf `*_Local` endet bzw. im Ordner
`_Local/` liegt, dazu die werkseigenen Ordner `.content-studio/` (Inhalt-Entwürfe),
`.expo/`, `.agent/`, `.claude/`, `build-verification/`, `dist/`, `android/`
(per `expo prebuild` neu erzeugbar) und `node_modules/`.

## Entwicklung

```bash
npm install
npm run android     # nativer Debug-Build (erstes Bauen dauert länger)
npm run web         # Web-Build — Grundlage des lokalen Debug-Studios
npm test            # Testreihe
```

## Inhalt erzeugen (nur Admin, Debug-Modus)

Der Ablauf — zentrale Schlüsselverwaltung unter Einstellungen → Entwicklerstudio, Generierung im
Studio mit automatischer Tonhöhenprüfung je Clip, Publish, Gegenmessung,
Release — steht in [docs/PIPELINE.md](docs/PIPELINE.md). Kurzform:

```bash
npm run pipeline:release   # Messkern-Check, Inhaltsprüfung, Gegenmessung, Tests
```

## Qualität der Sprachausgabe

Thai-Töne werden automatisch gegen den verifizierten Sollton gemessen
(`src/lib/speaking/analysis.ts`, F0-Kontur via normierter Autokorrelation —
dieselbe Messung wie im Werkzeug `scripts/tone-contour.html`). Das ist ein
Filter gegen grobe Fehler, kein Hörtest; Grenzen stehen in
`src/lib/content/tone-gate.ts` und in den Berichten unter `content/`.
