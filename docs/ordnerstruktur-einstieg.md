# Die Ordnerstruktur für den Einstieg

ThaiSpeaker ist eine React-Native-App mit Expo. TypeScript übernimmt dabei die
Rolle deiner Python- oder C++-Quelldateien. React beschreibt die Oberfläche aus
kleinen wiederverwendbaren Bausteinen. Expo liefert Werkzeuge zum Starten und
Bauen für iPhone, Android und Browser.

```text
ThaiSpeaker/
├─ src/                 Der eigentliche Programmcode
│  ├─ app/              Die Seiten und ihre Navigation
│  ├─ components/       Wiederverwendbare Oberflächenbausteine
│  ├─ lib/              Regeln, Berechnungen und Datenspeicherung
│  ├─ hooks/            Gemeinsam verwendete Anbindung an React
│  ├─ constants/        Gemeinsame Werte, etwa Farben und Abstände
│  ├─ content/          Katalog und Einbindung erzeugter Lerninhalte
│  ├─ data/             Weitere Lern- und Referenzdaten
│  └─ dev/              Entwicklerstudio
├─ assets/              Bilder, Symbole und Audiodateien
├─ scripts/             Hilfsprogramme zum Prüfen und Bauen
├─ docs/                Erklärungen, Planung und Prüfberichte
├─ pipeline/            Arbeitsdaten und Protokolle der Inhaltserstellung
├─ public/              Dateien für den Browser, z. B. der Medien-Spiegel
├─ node_modules/        Installierte fremde Bibliotheken
└─ build-verification/  Lokal erzeugte Builds und Prüfergebnisse
```

## Wo starte ich beim Lesen?

`src/app/index.tsx` ist die Übersichtsseite. `src/app/progress.tsx` beschreibt
die Fortschrittsseite. `_layout.tsx` legt die gemeinsame Navigation fest.
Expo Router findet Seiten anhand ihrer Dateien: `progress.tsx` wird zur Route
`/progress`. Du brauchst dafür keine selbst geschriebene zentrale `main()`.
Der technische Einstieg ist in `package.json` als `expo-router/entry` angegeben.

Eine Seite benutzt Komponenten aus `src/components/`, beispielsweise
`language-switch.tsx`. Das ist ungefähr wie eine selbst geschriebene Klasse
oder Funktion für ein Bedienelement, die mehrere Seiten benutzen können.

Die fachliche Arbeit liegt überwiegend unter `src/lib/`. Für den Fortschritt
liest `stats.ts` die gespeicherten Werte und berechnet Kennzahlen. Der Ablauf
ist also: **Seite → Berechnungsfunktion → gespeicherte Daten → Anzeige**.
Das entspricht einer Python-Oberfläche, die Funktionen aus eigenen Modulen
aufruft. Unter `lib/i18n/` liegen Übersetzungen; `lib/languages/` beschreibt
Sprachen und Lernziele; `lib/fsrs/` behandelt die Planung von Wiederholungen.

## Was bedeuten die Dateiendungen?

| Endung | Bedeutung | Vergleich |
| --- | --- | --- |
| `.ts` | TypeScript-Code mit Typangaben | Funktionen und Klassen in `.py`/`.cpp` |
| `.tsx` | TypeScript mit Beschreibung von Oberflächen | Code plus Anordnung von Bedienelementen |
| `.test.ts`, `.test.tsx` | Automatische Tests | `unittest` oder ein C++-Testprogramm |
| `.js`, `.cjs` | JavaScript, hier oft Werkzeuge/Konfiguration | Kleine Hilfsskripte |
| `.json` | Strukturierte Daten ohne ausführbaren Code | Python-Dictionaries und Listen als Datei |
| `.md` | Lesbarer Text mit einfacher Formatierung | Dokumentation |

Tests liegen meistens neben dem getesteten Modul. Beispielsweise gehören
`src/lib/stats.ts` und `src/lib/stats.test.ts` zusammen. Eine Importzeile mit
`@/lib/stats` meint in diesem Projekt `src/lib/stats`; das `@` ist eine
Abkürzung für den Quellordner.

## Die wichtigsten Dateien im Hauptordner

| Datei | Aufgabe |
| --- | --- |
| `package.json` | Bibliotheken und Befehle wie Starten, Testen und Bauen |
| `package-lock.json` | Hält die tatsächlich aufzulösenden Bibliotheksversionen fest |
| `app.json` | Expo-App-Konfiguration, Namen, Plattformangaben und Plugins |
| `tsconfig.json` | Einstellungen für TypeScript und Importabkürzungen |
| `metro.config.js` | Einstellungen für das Zusammenstellen der App-Dateien |
| `eslint.config.js` | Regeln für die automatische Codeprüfung |
| `eas.json` | Profile für Builds mit EAS; veröffentlicht alleine nichts |

`node_modules/`, `.expo/` und `build-verification/` werden erzeugt. Für eine
gewöhnliche Änderung arbeitest du zuerst in `src/`, nicht in diesen Ordnern.
Audiodateien unter `assets/content/` haben lange Hash-Namen: Der Name gehört
zum Dateiinhalt. Nicht von Hand umbenennen, weil der Katalog darauf verweist.

Ein guter erster Rundgang ist: `src/app/progress.tsx` lesen, danach
`src/components/language-switch.tsx`, dann `src/lib/stats.ts` und dessen Test.
Damit siehst du eine vollständige Funktion von der Oberfläche bis zur Logik.
