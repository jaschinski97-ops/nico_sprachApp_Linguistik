# Thai ↔ Deutsch Lernbegleiter — Fortschrittsprotokoll

> **Dieses Dokument ist die Übergabe zwischen Sessions.**
> Zu Beginn JEDER Session zuerst vollständig lesen, dann den tatsächlichen
> Repo-Zustand gegen den hier protokollierten Stand prüfen (siehe
> „Verifikationsbefehle"), Abweichungen dokumentieren — erst danach
> weiterarbeiten. Einträge werden **angehängt**, nie überschrieben.
> Maschinenlesbarer Kurzstand: `.agent/state.json`.

---

## Schnellstart — aktuellen Stand ansehen

```bash
npx expo start
```

Danach im Terminal:

| Taste / Aktion | Ergebnis |
| --- | --- |
| `w` | Öffnet die App im Browser (http://localhost:8081) |
| QR-Code scannen | Öffnet die App in **Expo Go** auf dem Handy (PC und Handy müssen im selben WLAN sein) |
| `a` | Startet den Android-Emulator (falls installiert) |
| `r` | Neu laden |

Nur Web, ohne Menü:

```bash
npx expo start --web
```

## Verifikationsbefehle (Ist-Zustand prüfen)

```bash
npx tsc --noEmit
```

```bash
npm test
```

> **Hinweis:** `expo-env.d.ts` steht (wie im Expo-Template vorgesehen) in
> `.gitignore` und wird von Expo generiert. In einem frisch geklonten
> Arbeitsverzeichnis meldet `npx tsc --noEmit` deshalb zwei Fehler zu
> `*.module.css` und `@/global.css`, bis der Dev-Server einmal gelaufen ist.
> Erst `npx expo start` ausführen, dann typprüfen.

---

## Architekturentscheidungen

### AE-1 — Expo (React Native) + TypeScript

**Entscheidung:** Expo SDK 57, TypeScript, `expo-router` (dateibasiertes Routing).

**Begründung:** Eine Codebasis für Web, iOS und Android; Entwicklung und Test
vollständig unter Windows möglich (Browser + Expo Go); iOS-Builds später über
EAS Build auf Expos Mac-Cloud, kein eigener Mac nötig. Die bereits geprüfte
FSRS-Logik aus dem Referenzprototyp lässt sich unverändert in TypeScript
weiterverwenden.

### AE-2 — Vorhandenes Git-Repo weiterverwendet statt neu angelegt

**Entscheidung:** Das Verzeichnis `my-app/` enthielt einen abgebrochenen
`create-expo-app`-Lauf: ein Git-Repo **ohne einen einzigen Commit**, dessen
Template-Dateien alle im Index als gelöscht markiert waren, und keine einzige
Datei auf der Platte. Das `.git`-Verzeichnis wurde in den Projekt-Root
verschoben, der Index mit `git reset` geleert, das leere `my-app/` entfernt.

**Begründung:** Es ging keine Arbeit verloren (keine Commits, keine Dateien);
gleichzeitig wurde ein verschachteltes zweites Repo im Projekt vermieden.
Das Scaffold liegt jetzt direkt im Projekt-Root, `PROGRESS.md` also ebenfalls.

### AE-3 — `expo-sqlite` ist auf Web **nicht** verlässlich → Persistenz-Abstraktion

**Entscheidung:** Persistenz wird hinter eine eigene Abstraktionsschicht
gekapselt. Nativ (iOS/Android) → `expo-sqlite`. Web → JSON-Blobs über
`@react-native-async-storage/async-storage`. Die Geschäftslogik kennt nur die
Abstraktion und erfährt vom Unterschied nichts.

**Begründung — selbst geprüft, nicht aus Trainingswissen übernommen:** Der
Web-Pfad von `expo-sqlite@57.0.2` läuft über wa-sqlite in einem Web Worker.
`node_modules/expo-sqlite/web/WorkerChannel.ts` legt dafür `new SharedArrayBuffer(4)`
und `new SharedArrayBuffer(1024 * 1024)` an und synchronisiert über
`Atomics.wait` / `Atomics.load`. `SharedArrayBuffer` ist im Browser nur bei
**Cross-Origin-Isolation** verfügbar, also nur mit den Response-Headern
`Cross-Origin-Opener-Policy: same-origin` und
`Cross-Origin-Embedder-Policy: require-corp`. Der Dev-Server von
`expo start --web` setzt diese Header nicht, und ein statischer Web-Export
(Phase 8) hätte sie auf fremdem Hosting erst recht nicht — in einem
WordPress-`iframe` schon gar nicht. Damit ist der SQLite-Web-Pfad für dieses
Projekt untauglich.

### AE-4 — Navigation als Plattform-Split statt eines gemeinsamen Layouts

**Entscheidung:** `src/components/app-tabs.tsx` (nativ) rendert eine
Bottom-Tab-Leiste, `src/components/app-tabs.web.tsx` eine Top-Navigationsleiste.
Metro wählt die Datei automatisch nach Plattform.

**Begründung:** Phase 3 verlangt ausdrücklich ein Layout, das auch im breiten
Browser-Fenster gut aussieht und kein reines Phone-Layout ist. Eine
Bottom-Tab-Leiste am unteren Rand eines 1920px-Desktops wirkt fehl am Platz.
Das Muster stammt aus dem Expo-Default-Template und wurde auf fünf Bereiche
erweitert. Nativ wurde dabei vom `NativeTabs` des Templates (in `expo-router`
als *unstable* markiert) auf das stabile `Tabs` gewechselt.

### AE-5 — `expo-audio` statt `expo-av`

**Entscheidung:** Für vorproduzierte Audioclips wird `expo-audio` verwendet.

**Begründung:** `expo-av` ist in aktuellen SDKs zugunsten von `expo-audio` und
`expo-video` abgelöst; `npx expo install expo-audio` liefert unter SDK 57 die
passende Version (57.0.4). `expo-speech` bleibt der plattformübergreifende
TTS-Fallback.

### AE-6 — Dokumentspeicher statt relationalem Schema

**Entscheidung:** Die Persistenz-Abstraktion arbeitet mit `Sammlung + ID +
JSON-Wert` statt mit Tabellen je Datentyp.

**Begründung:** Dieselbe schmale Schnittstelle lässt sich verlustfrei auf eine
SQLite-Tabelle **und** auf JSON-Blobs in AsyncStorage abbilden. Eine gemeinsame
Vertragsprüfung läuft gegen beide Backends, damit sie sich nicht
auseinanderentwickeln.

### AE-7 — `syllables` ergänzt, weil ein einzelnes `tone`-Feld mehrsilbige Wörter nicht abbildet

**Entscheidung:** `VocabEntry` bekommt zusätzlich
`syllables: { roman: string; tone: Tone }[]`. Das Feld `tone` aus der
Datenmodell-Skizze bleibt erhalten und trägt den Ton der **ersten** Silbe — bei
einsilbigen Wörtern also den Ton des Wortes.

**Begründung:** Thai vergibt den Ton **je Silbe**, nicht je Wort. Ein einzelnes
`tone`-Feld zwingt bei mehrsilbigen Wörtern zu einer Angabe, die schlicht falsch
ist. สวัสดี ist der Beleg: der Referenzprototyp führte es pauschal als „mid",
tatsächlich ist es `sà-wàt-dii` — **tief-tief-mittel**. Ohne `syllables` könnte
die Tonfarbcodierung in Phase 3 mehrsilbige Wörter nur falsch einfärben, und
genau die Farbcodierung ist ein Kernversprechen der App. Die Struktur der
Skizze bleibt gewahrt, sie wird nur dort präzisiert, wo sie die Sprache nicht
abbildet.

### AE-8 — Silbenfarben stehen an der Umschrift, die Thai-Schrift wird nur einfarbig gefärbt

**Entscheidung:** Jede Silbe der **Umschrift** bekommt die Farbe ihres eigenen
Tons plus die passende Konturglyphe. Die **Thai-Schrift** wird nur dann
eingefärbt, wenn alle Silben denselben Ton haben; sonst bleibt sie in der
normalen Textfarbe.

**Begründung:** Die Daten kennen den Ton je Silbe, aber keine verlässliche
**Silbengrenze in der Thai-Schrift** — Thai setzt zwischen Silben keine
Trennzeichen. Ein naives Aufteilen wäre geraten, und ผลไม้ (`pǒn-lá-máai`)
zeigt, warum das schiefgeht: das Wort hat drei Silben, aber die mittlere
entsteht aus einem Bindekonsonanten, den beide Nachbarn teilen — eine
Zeichenkette lässt sich hier gar nicht in drei saubere Stücke schneiden. Eine
Einfärbung der Thai-Schrift nach dem Ton der ersten Silbe würde bei สวัสดี über
zwei Drittel des Wortes die Unwahrheit sagen. Lieber neutral als falsch.

Wer die Thai-Schrift später doch silbenweise färben will, braucht ein
zusätzliches, **geprüftes** Feld mit den Schriftsilben — nicht eine Heuristik
zur Laufzeit.

---

## Protokoll

### 2026-08-30 — Phase 0: Setup

**Gemacht**

- Abgebrochenes Scaffold in `my-app/` bereinigt, Git-Repo in den Projekt-Root
  gehoben (siehe AE-2).
- `npx create-expo-app@latest --template default` → Expo SDK 57, React 19.2,
  React Native 0.86, `expo-router` 57, TypeScript 6. Scaffold in den
  Projekt-Root verschoben.
- App-Identität gesetzt: Name „Thai Lernbegleiter", Slug `thai-lernbegleiter`,
  Scheme `thailernbegleiter`.
- Laufzeit-Abhängigkeiten über `npx expo install` (SDK-passende Versionen):
  `expo-sqlite`, `expo-speech`, `expo-secure-store`, `expo-audio`,
  `@react-native-async-storage/async-storage`, `@expo/vector-icons`.
- Test-Werkzeuge: `jest`, `jest-expo`, `@types/jest`.
- Web-Support von `expo-sqlite` im installierten Paket selbst nachgeprüft →
  AE-3.
- Fünf Platzhalter-Screens unter `src/app/`: `index` (Übersicht), `review`
  (Lernen), `conversation` (Gespräch), `progress` (Fortschritt), `settings`
  (Einstellungen). Template-Screen `explore.tsx` entfernt.
- Navigation auf fünf Bereiche erweitert, Plattform-Split → AE-4.
- Gemeinsame Bausteine: `ScreenScaffold` (zentriert, `maxWidth` 800 → gute
  Figur auf Handy **und** im breiten Browser) und `PlaceholderCard` (zeigt in
  der laufenden App an, welche Phase den jeweiligen Bereich füllen wird).
- Tondaten aus dem Referenzprototyp nach `src/constants/tones.ts` übernommen
  (Labels, Farben, Konturpfade, Tonzeichen). Der Kommentar dort hält fest, dass
  das Tonzeichen allein den Ton nicht bestimmt (Konsonantenklasse und
  Silbentyp zählen mit) — die Angabe ist Lernhilfe für die Legende, keine
  Rechtschreibregel.
- `.claude/launch.json` für den Web-Dev-Server ergänzt.

**Verifiziert**

- `npx tsc --noEmit` läuft fehlerfrei durch.

**Offen / als Nächstes**

- Siehe TODO-Liste am Ende.

### 2026-08-30 — Phase 1: FSRS-Engine & Persistenzschicht

**Gemacht**

- `src/lib/fsrs/` — Typen (`Direction`, `Rating`, `CardState`, `FSRSCardState`)
  und Engine als reine Funktionen: `createCardState`, `retrievability`,
  `nextIntervalDays`, `reviewCard`, `isDue`, `dueCards`. Formeln unverändert
  aus dem Referenzprototyp; der Modulkommentar hält ausdrücklich fest, dass
  `DEFAULT_WEIGHTS` eine **Näherung** an veröffentlichte FSRS-Gewichte ist und
  keine zertifizierte Kopie.
- `src/lib/storage/` — Persistenz-Abstraktion nach AE-3, umgesetzt als
  Dokumentspeicher (`Sammlung` + `ID` + JSON-Wert) über fünf Sammlungen:
  `vocab`, `cards`, `situations`, `exam`, `meta`. Damit sind alle Datentypen
  des Projekts abgedeckt, auch die aus Phase 4, 5 und 7.
  - `backend.ts` (nativ) → eine SQLite-Tabelle, `putMany` in einer Transaktion.
  - `backend.web.ts` (Web) → ein JSON-Blob je Sammlung in AsyncStorage.
  - `memory-store.ts` → für Tests und als Notnagel.
  - `index.ts` → `getStore()` als Singleton. Schlägt die Initialisierung des
    Plattform-Backends fehl, fällt die App auf den Memory-Store zurück und
    startet trotzdem; `getActiveBackend()` sagt, was wirklich läuft.
- `src/lib/repository.ts` — typisierte Zugriffe (`loadOrCreateCardState`,
  `saveCardState`, `loadCardStatesForDirection`, `readMeta`/`writeMeta`), damit
  die Screens weder Sammlungsnamen noch Schlüsselformate kennen müssen.
- Jest eingerichtet (`jest-expo`), `@types/jest` über `types` in der
  `tsconfig.json` aktiviert.
- Auf dem Screen „Lernen" eine Persistenz-Prüfung ergänzt: eine echte
  FSRS-Karte (ไก่ *gài*), Bewertungsknöpfe, alle Kennzahlen und die Anzeige des
  aktiven Speicher-Backends. Phase 3 ersetzt das durch den richtigen
  Karteikarten-Flow.

**Verifiziert**

- `npm test` → **49 Tests grün** in 2 Suites.
  - `fsrs.test.ts` prüft die Retrievability-Kurve gegen die Formel selbst,
    Monotonie über die Zeit, das Verhalten bei `t < 0`, die Zielretention am
    Fälligkeitszeitpunkt, `S = W[rating-1]` bei Erstbewertung, die Ordnung
    Leicht > Gut > Schwer, Lapse-Zählung, die Grenzen 1..10 für Difficulty auch
    nach 50 Lapses, Unveränderlichkeit der Eingabekarte und den Abstandseffekt
    (späte Wiederholung bringt mehr Stabilität als sofortige).
  - `storage.test.ts` fährt **dieselbe Vertragsprüfung gegen beide
    Backends** (Memory und AsyncStorage-Web), damit sich die Plattformen nicht
    auseinanderentwickeln — inklusive Trennung der Sammlungen, `putMany`,
    Kopiersemantik beim Lesen und Neustart-Persistenz. Ein beschädigter
    JSON-Blob führt zu einer leeren Sammlung statt zu einem Absturz.
- `npx tsc --noEmit` fehlerfrei.
- **Web-Persistenz am laufenden Gerät geprüft:** Karte im Browser zweimal
  bewertet (Gut, Leicht) → `reps 2`, `Stabilität 2.40`, `Difficulty 4.07`;
  danach die Seite vollständig neu geladen → identische Werte. Anzeige des
  Backends: `async-storage`, wie nach AE-3 erwartet. Keine Konsolenfehler.

**Beobachtung, die keine Fehlfunktion ist**

Zweimal direkt hintereinander bewerten lässt die Stabilität *nicht* steigen
(hier: 2.40 nach „Gut", danach unverändert 2.40 nach „Leicht"). Das ist so
gewollt: bei Retrievability 1 ist der Wachstumsterm
`exp(W[10] * (1 - R)) - 1` gleich null. Massiertes Wiederholen ohne zeitlichen
Abstand bringt keinen Lernzuwachs — genau der Abstandseffekt, den FSRS abbildet.

**Offen**

- Persistenz **in Expo Go auf dem Handy** (SQLite-Pfad) ist noch nicht
  bestätigt — das kann nur der Nutzer auf seinem Gerät prüfen. Der
  SQLite-Pfad ist deshalb bislang nur typgeprüft, nicht am Gerät verifiziert.

### 2026-08-30 — Blocker B-1 erledigt

Der Nutzer hat den Gerätecheck in Expo Go durchgeführt und bestätigt: alle
fünf Tabs sichtbar, Kartenwerte bleiben nach vollständigem Schließen und
Neuöffnen der App stehen, unter „Speicher:" steht `expo-sqlite`. Damit sind
die beiden offenen Abnahmekriterien aus Phase 0 (Navigation in Expo Go) und
Phase 1 (Kartenzustand übersteht Neustart nativ) erfüllt; **B-1 ist
geschlossen**. Der SQLite-Pfad ist damit nicht mehr nur typgeprüft, sondern am
Gerät verifiziert.

### 2026-08-30 — Phase 2: Vokabular-Grundstock

**Gemacht**

- `src/data/vocabulary.ts` — **84 Einträge**, bidirektional vollständig, nach
  dem `VocabEntry`-Schema.
- `src/lib/repository.ts` um `seedVocabulary`, `loadVocabulary` und
  `loadVocabEntry` erweitert. Das Einspielen ist idempotent und fasst die
  Sammlung `cards` (Nutzerfortschritt) nicht an.
- Auf der Übersicht eine Zusammenfassung ergänzt, die den Grundstock **über
  die Persistenzschicht** lädt — die angezeigten Zahlen kommen also aus dem
  Speicher, nicht direkt aus dem Modul.

**Quelle und Prüfverfahren (Thai-Seite)**

- Geplant war thai-language.com. Die Seite ist über HTTPS **nicht abrufbar**
  (selbstsigniertes Zertifikat), also wurde auf das **englische Wiktionary**
  ausgewichen — pro Eintrag als `source` verlinkt.
- Abgefragt wurde nicht die ganze Seite, sondern über die Sections-API gezielt
  der **Abschnitt „Thai"**. Das war nötig: ein erster Durchlauf, der nur am
  Stichwort „Paiboon" verankert war, hatte bei ดี die IPA eines
  fremdsprachigen Eintrags (`/di/`, „crossbow") gegriffen und bei ไป
  Nordthai-Inhalt eingeblendet. Nach der Umstellung stimmten alle Töne des
  ersten Laufs bis auf น้ำ (`náam` statt `nám`).
- **Töne wurden nicht aus Tonbezeichnungen im Fließtext übernommen**, sondern
  aus der IPA-Tonkontur abgeleitet:
  `˧` mid · `˨˩` low · `˥˩` falling · `˦˥` high · `˩˩˦` rising.
  Das war keine Förmlichkeit: eine Fließtext-Zusammenfassung bezeichnete
  `/kaj˨˩/` (ไก่) fälschlich als „falling" — richtig ist **tief**. Die
  abgeleiteten Töne decken sich mit den Tonregeln, etwa ร้อน (tiefe
  Konsonantenklasse + mai tho → **hoch**, nicht fallend).
- Für alle 84 Einträge stimmt die Silbenzahl der Paiboon-Umschrift mit der der
  IPA überein; daraus entstand das Feld `syllables` (Umschrift + Ton je Silbe).

**Abweichung vom Datenmodell, bewusst — siehe AE-7**

Das skizzierte `tone`-Feld ist nur für einsilbige Wörter eindeutig. Ergänzt
wurde deshalb `syllables: { roman, tone }[]`; `tone` bleibt als Ton der ersten
Silbe erhalten. สวัสดี ist dafür das Musterbeispiel: der Referenzprototyp führte
es pauschal als „mid", tatsächlich ist es **tief-tief-mittel**.

**Zwei Einträge bewusst NICHT als geprüft markiert**

| Eintrag | Warum `sourceVerified: false` |
| --- | --- |
| ร้าน `ráan` | Der Thai-Abschnitt belegt nur „Stand, Bude, Plattform". Die Alltagsbedeutung „Laden, Geschäft" steht dort ausschließlich im Khmer/Lao-Vergleich der Etymologie. |
| นอน `nɔɔn` | Die Thai-Definition lautet nur „to lie or lay down". „schlafen" erscheint bloß in der Proto-Tai-Etymologie; eindeutig „schlafen" ist นอนหลับ. |

Beide tragen den Grund in `verificationNote` und sind damit im Lernbetrieb
erkennbar. Der Rest (82 von 84) ist in Ton, Umschrift **und** Bedeutung
gedeckt.

**Deutsche Seite**

Weil die App auch Thailändern Deutsch beibringt, trägt jeder Eintrag die
Angaben, an denen Thai-Muttersprachler scheitern:

- **Substantive:** Genus und Plural (`germanNoun`), das Genus zusätzlich im
  Stichwort („das Haus"). Hinweise dort, wo es weh tut — n-Deklination bei
  „der Mensch" (den/dem/des Menschen), Umlautplurale, fehlender Plural bei
  „das Obst".
- **Verben:** 3. Person Singular, Präteritum und Perfekt **mit Hilfsverb**
  (`hat`/`ist`) — ein Test erzwingt das, weil „haben" gegen „sein" eine eigene
  Fehlerquelle ist. Vokalwechsel und untrennbare Präfixe stehen als Hinweis
  (z. B. „verstehen" hat kein `ge-` im Partizip).
- **Adjektive:** Steigerung, unregelmäßige ausdrücklich begründet
  (gut/besser, viel/mehr, groß/größer, teuer → teurer).

**Beispielsätze**

Zusammengesetzt ausschließlich aus Wörtern, die in derselben Datei verifiziert
sind — jede Silbe der Beispiel-Umschrift stammt also aus einem geprüften
Eintrag. Die Sätze folgen einfachen Mustern (Subjekt-Verb-Objekt, Substantiv
mit nachgestelltem Adjektiv), sind als **ganze Sätze aber nicht einzeln
gegen eine Quelle geprüft**. Das steht auch im Kopfkommentar der Datendatei.

**`isConcrete`**

25 Einträge sind konkret, ausnahmslos Substantive. Tests stellen sicher, dass
Partikel, Pronomen, Zahlwörter, Adverbien, Interjektionen, Adjektive und
Verben **nie** als konkret markiert werden — die Bild-Pipeline in Phase 5 soll
für „nicht" oder „ครับ" gar nicht erst anlaufen.

**Verifiziert**

- `npm test` → **154 Tests grün** in 3 Suites (vorher 49).
  `vocabulary.test.ts` prüft Anzahl (50–100), eindeutige IDs und Thai-Formen,
  Schema-Konformität jedes Eintrags einzeln, Übereinstimmung von `tone` mit
  `syllables[0]`, verlustfreie Silbenzerlegung, die deutschen Pflichtangaben je
  Wortart, Bidirektionalität, dass jedes Beispiel sein Stichwort enthält, die
  `isConcrete`-Regeln, sowie Round-Trip und Idempotenz über die
  Persistenzschicht.
- Eine Prüfung schlägt bewusst Alarm, wenn **alles** als `sourceVerified: true`
  markiert wäre (Quote muss `>= 0.9` und `< 1` sein) — pauschales Abhaken wäre
  ein Zeichen dafür, dass gar nicht geprüft wurde.
- `npx tsc --noEmit` fehlerfrei.
- Im Browser gegengeprüft: Übersicht zeigt „84 Einträge · 82 von 84
  quellengeprüft · 25 bildfähig", geladen über die Persistenzschicht.

### 2026-08-30 — Phase 3: Lern-UI

**Gemacht**

- `src/lib/audio.ts` — Aussprache-Abstraktion. Aufrufer sagen nur *was* und *in
  welcher Sprache*; das Modul entscheidet: vorproduzierter Clip, falls sich
  `audioAssetId` auflösen lässt, sonst `expo-speech` (`th-TH` bzw. `de-DE`,
  Thai langsamer). Der Content-Schritt hängt später nur einen Auflöser über
  `registerAudioAssetResolver` ein — **kein Umbau an den Screens**. Genau das
  ist als Test abgesichert.
- `src/lib/review-session.ts` — Sitzungslogik: `ensureCardStates` (legt fehlende
  Karten in **einem** `putMany` an), `buildReviewQueue` (fällige Karten über
  `dueCards`, aufsteigend nach Retrievability), `summarizeDirection`.
- `rateCard` in der Repository-Schicht ergänzt: verbindet das bestehende
  `reviewCard` mit der Persistenz. Die Screens fassen weder Formeln noch
  Speicher direkt an.
- Komponenten: `ToneContour` (SVG-Konturglyphen aus dem Referenzprototyp),
  `ToneLegend`, `ThaiWord` (silbenweise Tonfarben), `VerificationBadge`,
  `Flashcard`, `DirectionDashboard`.
- `src/data/vocab-helpers.ts` — `syllablesOf`, `uniformTone`, `isMultiSyllable`.
- `react-native-svg` ergänzt (SDK-passend über `npx expo install`).

**Pflicht 1 — silbenweise Tonfarben**

`ThaiWord` wertet `syllables[]` aus. Das Feld `tone` wird **nur** benutzt, wenn
`syllables` fehlt oder leer ist (Altdatensätze vor AE-7); ein Test hält
ausdrücklich fest, dass der Normalfall nicht über `tone` läuft.
Im Browser gegengeprüft und im DOM nachgemessen: bei สวัสดี hat `sà` die Farbe
`rgb(79,96,118)` (tief), `wàt` dieselbe, `dii` dagegen `rgb(111,138,106)`
(mittel) — tief-tief-mittel, wie gefordert. Alle fünf Konturpfade rendern mit
ihren eigenen Farben.
Zur Grenze bei der Thai-Schrift siehe **AE-8**.

**Pflicht 2 — Bidirektionalität**

Das Dashboard zeigt zwei getrennte Karten mit eigener Fälligkeitszahl,
Gesamtzahl, „neu" und „gemeistert" — keine gemeinsame Summe. Ohne gewählte
Richtung startet keine Sitzung (`/review` zeigt sonst die Richtungsauswahl).
Vorder- und Rückseite tauschen: bei `th_to_de` vorne die Thai-Schrift, bei
`de_to_th` vorne das deutsche Wort samt Grammatik. Ein Test belegt, dass
Bewertungen in einer Richtung die andere unberührt lassen.

Die Tonfarben erscheinen bewusst erst beim Aufdecken — vorher wären sie bei
`th_to_de` die halbe Antwort.

**Pflicht 3 — unverifizierte Einträge**

`VerificationBadge` erscheint ausschließlich bei `sourceVerified: false` und
zeigt „⚠ Bedeutung nicht quellengeprüft"; Antippen klappt die
`verificationNote` auf. Geprüfte Karten bekommen **kein** Abzeichen — sonst
wäre es überall und würde nichts mehr unterscheiden. Im Browser mit นอน
durchgespielt.

**Nebenbei aufgeräumt**

In Phase 2 trug `verificationNote` zweierlei: Grammatikhinweise **und**
benannte Unsicherheiten. Das ist jetzt getrennt — `note` für Lernhinweise,
`verificationNote` nur noch für ungeprüfte Einträge. Ein Test stellt sicher,
dass geprüfte Einträge gar kein `verificationNote` haben.

**Zwei echte Fehler beim Testen gefunden und behoben**

1. *Layout:* Die beiden Richtungskarten waren unterschiedlich breit (im DOM
   gemessen: Container 343 px, Karten 306 px und 290 px). Ursache: `Link asChild`
   macht aus dem `Pressable` ein `<a>`, und das wuchs im Web-Build nicht auf die
   Spaltenbreite, sondern blieb bei seiner Inhaltsbreite. Die Flex-Größe hängt
   jetzt an einem neutralen `View` als Flex-Kind.
2. *Test-Umgebung:* `expo-audio` ließ sich im Jest-Prozess gar nicht
   importieren (natives Modul). Es wird jetzt erst **im** `playAsset`-Zweig
   dynamisch geladen — der bis zum Content-Schritt ohnehin nie betreten wird.

**Verifiziert**

- `npm test` → **187 Tests grün** in 6 Suites (vorher 155). Neu:
  `vocab-helpers.test.ts` (Silbenauswertung inkl. Fallback-Verhalten),
  `review-session.test.ts` (Kartenanlage, Richtungstrennung,
  Retrievability-Sortierung, Fälligkeit), `audio.test.ts` (Locale je Sprache,
  Abbruch vor neuer Ausgabe, Umschalten auf Clips ohne Screen-Änderung).
- `npx tsc --noEmit` fehlerfrei.
- **Im Browser durchgespielt:** vollständige Sitzung in **beiden** Richtungen —
  aufdecken, bewerten, Karte wechselt weiter (Karte 1 → 2), Sitzungsabschluss.
  Bei **1280 px** stehen die Richtungskarten in zwei gleich breiten Spalten,
  bei **375 px** untereinander und die Bewertungsknöpfe brechen auf 2×2 um.

**Offen**

- Der Durchlauf **in Expo Go am Gerät** ist noch nicht bestätigt — das kann nur
  der Nutzer prüfen (Blocker **B-2**). Besonders zu beachten: ob auf dem Gerät
  eine **Thai-Stimme** installiert ist; ohne sie bleibt „Thai anhören" stumm,
  was kein Fehler der App ist, sondern eine Systemeinstellung.

---

## Skalierungsplan auf ~1000 Einträge

Die Erstellung der restlichen ~900 ist **nicht** Teil von Phase 2. Hier steht,
wie sie ablaufen soll.

### Quelle für die Wortauswahl

Basis ist eine **Frequenzliste**, nicht freies Erfinden. In dieser Reihenfolge:

1. **Thai National Corpus** (Chulalongkorn-Universität) bzw. offene
   Frequenzlisten auf Basis von OpenSubtitles/Wikipedia für Thai. Liefert
   Rangfolge nach Häufigkeit — genau die Reihenfolge, in der Vokabeln für
   Lernende wertvoll sind.
2. Abgleich mit dem **CEFR-Wortschatz A1–B1**, damit Prüfungsrelevanz (Phase 7)
   und Alltagstauglichkeit zusammenpassen.
3. Für die Gegenrichtung „Deutsch für Thailänder": **Goethe-Zertifikat-Wortlisten
   A1/A2/B1**, die das Goethe-Institut selbst veröffentlicht.

Die Frequenzliste liefert **nur die Wortauswahl** — nie Ton, Umschrift oder
Bedeutung. Die kommen ausschließlich aus dem Prüfschritt unten.

### Prüfschritt vor Übernahme (unverändert für jeden Eintrag)

Das in Phase 2 gebaute Skript ist der Weg dorthin und bleibt bestehen:

1. Thai-Abschnitt des Wiktionary-Eintrags über die Sections-API laden.
2. Paiboon-Umschrift, Royal-Institute-Umschrift und IPA extrahieren.
3. Ton **aus der IPA-Tonkontur** ableiten, nie aus Prosa.
4. Silbenzahl von Umschrift und IPA gegeneinander prüfen — stimmt sie nicht,
   geht der Eintrag in die manuelle Sichtung.
5. Bedeutung gegen die Definition des Thai-Abschnitts abgleichen. Deckt sie den
   gewünschten Sinn nicht (wie bei ร้าน und นอน), dann `sourceVerified: false`
   **mit benanntem Grund** — nicht raten, nicht stillschweigend übernehmen.
6. Deutsche Seite von Hand ergänzen: Genus, Plural, Stammformen mit Hilfsverb,
   Steigerung, Kasus bei Präpositionen.
7. Die bestehenden Tests laufen über den gesamten Bestand und blockieren
   Einträge, die das Schema verletzen.

**Durchsatz und Portionierung:** in Blöcken von 50–100 Wörtern arbeiten, je
Block ein eigener Commit mit Nennung der Quelle und der Zahl der
unverifizierten Einträge. Ein Block, dessen Verifikationsquote unter 90 %
liegt, wird nicht übernommen, sondern zurück in die Sichtung gegeben.

### Verhältnis zum Content-Generator aus Phase 4/5 — bewusst getrennt

Der Vokabel-Grundstock läuft **nicht** über das API-Key-plus-Start-Prinzip der
Phasen 4 und 5. Begründung:

- Die Vokabeln sind das **Fundament**. Ein falscher Ton pflanzt sich über die
  FSRS-Wiederholungen monatelang fort und wird eingeschliffen — genau das, was
  Spaced Repetition so wirksam macht, macht einen Fehler hier so teuer. Ein
  Sprachmodell, das Töne aus dem Gedächtnis erzeugt, ist dafür die falsche
  Quelle; ein Wörterbuch-Abgleich ist die richtige.
- Der Grundstock wird **mit der App ausgeliefert** und muss ohne Schlüssel und
  ohne Internet vollständig da sein (Gesamt-Abschlusskriterium). Generierte
  Inhalte sind dagegen ausdrücklich optional.
- Sprachsituationen (Phase 4) und Bilder (Phase 5) sind **Ausschmückung um
  geprüfte Vokabeln herum**: Ein misslungener Dialog ist ärgerlich, ein
  falscher Ton ist schädlich. Deshalb dürfen die Generatoren auf dem
  Grundstock aufsetzen, ihn aber nie erweitern oder verändern.

Ein Sprachmodell darf im Skalierungsprozess an genau einer Stelle helfen:
beim **Vorschlagen von Kandidatenwörtern und deutschen Übersetzungen**. Ton und
Umschrift kommen nie von dort, und jeder Vorschlag durchläuft die Schritte 1–7.

---

## TODO — priorisiert

1. **Gerätecheck durch den Nutzer (Blocker B-2, blockiert den Abschluss von Phase 3):**
   `npx expo start`, QR-Code mit **Expo Go** scannen und prüfen:
   (a) Übersicht zeigt beide Richtungen mit eigener Fälligkeitszahl,
   (b) eine Sitzung in **beiden** Richtungen durchspielen — aufdecken,
   bewerten, nächste Karte,
   (c) bei สวัสดี sind die drei Silben in zwei verschiedenen Farben,
   (d) „Thai anhören" antippen. Bleibt es stumm, fehlt dem Gerät eine
   **Thai-Stimme** — das ist eine Systemeinstellung, kein Fehler der App.
   Ergebnis hier eintragen.
2. **Phase 4 — Generator Sprachsituationen** (API-Key-Feld, Batch, Offline-Persistenz).
3. **Phase 5 — Generator Bilder** (nur `isConcrete`).
4. **Phase 6 — Bidirektionalität & Curriculum-Differenzierung.**
5. **Phase 7 — Prüfungsmodul** (Goethe-Seiten erst fetchen, dann bauen).
6. **Phase 8 — Build & Distribution** (EAS Android/iOS, Web-Export).
7. **Phase 9 — QA & Abschluss.**

---

## Referenz: FSRS-Kernformeln

Aus dem geprüften Referenzprototyp übernommen, nicht neu erfunden:

```
retrievability = (1 + (19/81) * t / S) ^ -0.5
nextInterval   = max(1, round(S * (0.9^-2 - 1) / (19/81)))
```

Erstbewertung: `S = W[rating-1]`, `D = clamp(W[4] - (rating-3) * W[5], 1, 10)`.
Folgebewertungen: Difficulty-Update mit Mean-Reversion gegen `d0Easy`,
Stability-Wachstum bzw. -Einbruch je nach Bewertung.

Die Default-Gewichte sind eine **Näherung** an veröffentlichte FSRS-Werte,
keine zertifizierte Kopie — dieser Hinweis gehört auch als Kommentar in den
Code.
