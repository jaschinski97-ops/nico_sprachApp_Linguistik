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

### AE-9 — Tagesprotokoll statt Näherung aus `lastReview`

**Entscheidung:** Neue Sammlung `reviewLog` mit **einem Dokument je
Kalendertag** (nicht je Ereignis), fortgeschrieben von `rateCard`.

**Begründung:** `FSRSCardState` hält nur `lastReview` — den *letzten*
Zeitpunkt je Karte. Wer eine Karte heute zum zehnten Mal wiederholt,
überschreibt jede Spur der neun vorherigen Male. Eine „Wiederholungen pro
Tag"-Statistik aus `lastReview` wäre deshalb keine Historie, sondern nur eine
Momentaufnahme — und würde als Historie gelesen. Ein Dokument je Tag hält den
Speicher beschränkt (365 im Jahr statt beliebig vieler Ereignisse) und reicht
für die Auswertung nach Tagen genau aus. Einzelereignisse mit Zeitstempel
gehen verloren; für eine Tagesauswertung ist das kein Verlust.

**Einschränkung, die im UI steht und nicht nur hier:** Die Historie beginnt
mit der Einführung des Protokolls. Frühere Wiederholungen fehlen, weil sie nie
festgehalten wurden. Beim Testen war das direkt zu sehen — 8 bewertete Karten,
aber nur 5 protokolliert; die drei anderen stammten aus Phase-3-Tests.

Tagesschlüssel bewusst in **lokaler** Zeit: mit `toISOString()` läge der
Tageswechsel in Thailand (UTC+7) mitten am Abend.

### AE-10 — API-Schlüssel: Keychain nativ, nur Arbeitsspeicher im Browser

**Entscheidung:** Nativ über `expo-secure-store`; im Web wird der Schlüssel
**nur für die laufende Sitzung im Arbeitsspeicher** gehalten und nach dem
Neuladen erneut abgefragt. Die Weiche stellt `isAvailableAsync()` zur
Laufzeit, nicht `Platform.OS`.

**Begründung — im Paket nachgesehen, nicht angenommen:** Die Web-Variante von
`expo-secure-store@57.0.2` ist `src/ExpoSecureStore.web.ts` mit dem
vollständigen Inhalt `export default {}`. Es gibt dort also **keinerlei**
Implementierung; `isAvailableAsync()` prüft `!!ExpoSecureStore.getValueWithKeyAsync`
und liefert im Browser `false`, ein `setItemAsync` liefe in „is not a
function". Die naheliegende Notlösung `localStorage` wurde verworfen: sie wäre
für jedes Skript derselben Herkunft lesbar und bliebe dauerhaft liegen — für
einen Schlüssel, der echtes Geld ausgibt, ein schlechter Tausch gegen etwas
Bequemlichkeit, und beim späteren WordPress-Einbau (Phase 8) noch schlechter.
Erneutes Eintippen bei Bedarf ist zumutbar: der Schlüssel wird nur für
Generierungsläufe gebraucht, nicht zum Lernen.

### AE-11 — `direction` benennt die Sprache, die aktiv produziert wird

**Entscheidung:** `direction` einer `ConversationSituation` sagt, welche
Sprache die lernende Person **hervorbringt** — deckungsgleich mit der schon
etablierten `Direction` aus dem FSRS-Modul (`de_to_th` = Deutsch verstehen,
Thai produzieren). Es gibt daher **zwei getrennte Sätze** von Situationen, je
Richtung eigene. Innerhalb eines Dialogs markiert `speaker: 'learner'` die zu
übenden Zeilen, `partner` die vorgegebene Gegenseite.

**Begründung:** Die Alternative — ein Satz Dialoge, bei dem je nach Richtung
die andere Seite verdeckt wird — spart Generierungskosten und macht das
Material für eine der beiden Zielgruppen unbrauchbar. Ein Deutscher, der Thai
lernt, übt auf einem Markt in Bangkok; ein Thailänder, der Deutsch lernt, übt
beim Bäcker oder auf dem Amt. Vor allem aber sind die **Korrektur-Hinweise**
richtungsspezifisch: Töne, Vokallänge und Klassifikatoren auf der einen Seite,
Artikel, Kasus und Verbstellung auf der anderen. Ein gespiegelter Dialog
könnte höchstens einen der beiden Sätze Hinweise tragen — der andere fiele weg
oder wäre falsch. Das ist dieselbe Überlegung wie in Phase 6 des Plans:
Bidirektionalität ist kein Karten-Flip.

### AE-12 — Offizieller Anthropic-SDK statt eigenem `fetch`, mit angepasster Metro-Auflösung

**Entscheidung:** `@anthropic-ai/sdk` mit `dangerouslyAllowBrowser: true`,
dazu eine `metro.config.js`, die `unstable_enablePackageExports` und die
Bedingungsnamen `require`/`import`/`default`/`browser` setzt.

**Begründung:** Ohne diese Konfiguration bricht der Web-Build mit
`Unable to resolve module ./lib/credentials/types.js` ab — die `exports`-Map
des SDK führt für `./lib/*` nur die Bedingungen `import` und `require`, kein
`default`, und Metros Standardauflösung greift daneben. Die Datei existiert
sehr wohl; es war reines Auflösungsverhalten. Mit der Anpassung bündelt der
SDK sauber, was einen handgeschriebenen HTTP-Client überflüssig macht.
`dangerouslyAllowBrowser: true` setzt dabei **genau** den Header
`anthropic-dangerous-direct-browser-access: true` — im SDK-Quelltext
nachgesehen (`client.js`), nicht angenommen.

### AE-13 — Bildanbieter: Stability AI, weil OpenAI im Browser gar nicht erst antwortet

**Entscheidung:** Bilder kommen von **Stability AI**
(`POST https://api.stability.ai/v2beta/stable-image/generate/core`), angesprochen
mit einem selbst geschriebenen `fetch` statt mit einem SDK.

**Begründung — im Browser gemessen, nicht angenommen:** Die Anthropic-API aus
Phase 4 erzeugt keine Bilder, es musste also ein zweiter Anbieter her. Gesetzt
war zuerst OpenAI Images, dem Muster von AE-12 folgend: offizieller SDK,
`dangerouslyAllowBrowser: true`. Im installierten Paket `openai@7.8.0` zeigte
sich der entscheidende Unterschied — dieser Schalter setzt **keinen Header**.
In `client.js` steht nur

```js
if (!options.dangerouslyAllowBrowser && isRunningInBrowserOrBrowserWorker())
    throw new Errors.OpenAIError("It looks like you're running in a browser…")
```

Es ist also eine reine Selbstsperre des SDK, keine Gegenstelle wie
`anthropic-dangerous-direct-browser-access`. Ob der Browser durchkommt,
entscheidet damit allein CORS auf Anbieterseite. Aus dem laufenden Web-Build
gemessen:

| Anfrage | Ergebnis |
| --- | --- |
| `GET api.openai.com/v1/models` | HTTP 401, lesbar |
| `POST api.openai.com/v1/images/generations` | `TypeError: Failed to fetch` |
| `POST api.openai.com/v1/chat/completions` | `TypeError: Failed to fetch` |
| `POST api.stability.ai/v2beta/stable-image/generate/core` | HTTP 401, lesbar |
| `POST generativelanguage.googleapis.com/…:generateContent` | HTTP 400, lesbar |

Die Konsole nennt den Grund beim Namen: *„blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource."*
Zur Kontrolle lief in derselben Sitzung die Messung aus Phase 4 noch einmal:
`api.anthropic.com` antwortete **mit** dem Header aus AE-12 mit 401 und **ohne**
ihn mit „Failed to fetch". Das Netz war also offen und die Messung
aussagekräftig; OpenAI lässt Browsern **GET** durch, **POST** nicht. Damit ist
OpenAI Images für den Web-Build unbrauchbar — und der Web-Build ist derzeit die
einzige Umgebung, in der überhaupt geprüft werden kann, weil der Gerätecheck
(B-2) aussteht.

**Warum Stability und nicht Google:** Beide kommen durch CORS. Der Unterschied
liegt darin, was sich **ohne gültigen Schlüssel** noch belegen lässt. Google
antwortet auf ein erfundenes Modell mit derselben Meldung wie auf einen
falschen Schlüssel (`API key not valid`) — ob der Modellname stimmt, bliebe
also bis zum ersten bezahlten Aufruf offen. Genau dieses Risiko hat Phase 4
beim Antwortformat bewusst vermieden. Stability prüft dagegen Pflichtfelder und
Aufzählungswerte **vor** der Authentifizierung und verrät die erlaubten Werte
selbst:

| Gesendet | Antwort der API |
| --- | --- |
| `output_format: "tiff"` | 400 — „Expected 'png' \| 'jpeg' \| 'webp'" |
| `aspect_ratio: "3:7"` | 400 — „Expected '21:9' \| '16:9' \| '3:2' \| '5:4' \| '1:1' \| …" |
| ohne `prompt` | 400 — „prompt: required" |
| `seed: "abc"` | 400 — „expected number, received string" |
| vollständige, gültige Anfrage | 401 — „authorization: invalid or missing header value" |
| falscher Pfad | 404 |

Die Anfrageform steht damit vollständig fest, und das 401 belegt zugleich, dass
es den Endpunkt gibt. Offen bleibt allein der Schlüssel — dieselbe Lage wie am
Ende von Phase 4.

**Warum kein SDK, anders als in AE-12:** Für Stability gibt es **keinen**
offiziellen JavaScript-SDK — nachgesehen: `stability-sdk` ist Python, auf npm
findet sich nur ein Paket eines Einzelentwicklers von 2024. Eine
multipart-Anfrage von zwanzig Zeilen selbst zu schreiben ist die kleinere
Abhängigkeit als ein fremdgepflegter Node-SDK im Browser-Bundle. Der zunächst
installierte `openai`-SDK wurde wieder entfernt.

**Was sich nicht ohne Schlüssel belegen ließ:** die **Antwort**form. Der Parser
verlangt deshalb streng ein Feld `image` und nennt im Fehlerfall die
tatsächlich gelieferten Feldnamen — heißt das Feld eines Tages anders, steht
das sofort in der Fehlerliste des Laufs, statt als Rätsel zu enden.

**Schlüsselablage** folgt unverändert AE-10: nativ Keychain, im Web nur
Arbeitsspeicher für die Sitzung. Neu ist lediglich, dass `api-key.ts` jetzt
**zwei** Schlüssel getrennt hält (`anthropic`, `stability`) — die beiden Läufe
sind unabhängig, und niemand soll einen Schlüssel eintippen, den er nicht
braucht.

### AE-14 — Bilder: Metadaten in den Dokumentspeicher, Bytes in eine eigene Ablage

**Entscheidung:** Der Dokumentspeicher aus AE-6 bekommt eine neue Sammlung
`images`, die aber **nur Metadaten** trägt (Format, Größe, Modell, Prompt,
Zeitpunkt, `blobKey`). Die Bilddaten liegen in einer eigenen, ebenfalls
plattformgeteilten Ablage: nativ eine Datei je Bild über `expo-file-system`,
im Web ein Eintrag je Bild in **IndexedDB**.

**Begründung — in den installierten Paketen nachgesehen:**

Base64 im JSON-Wert wäre der einfachere Weg gewesen und scheitert an einer
harten Grenze. Das Web-Backend des Dokumentspeichers schreibt über
`@react-native-async-storage/async-storage`, und dessen Web-Umsetzung ist
`window.localStorage` — in `lib/module/AsyncStorage.js` steht wörtlich
`window.localStorage.setItem(key, value)`. localStorage hat je Herkunft rund
**5 MB, und zwar für alle Sammlungen zusammen**: Vokabeln, Kartenzustände,
Sprachsituationen, Tagesprotokoll. Ein einziges Bild wiegt selbst als
komprimiertes WebP oft über 50 KB, als Base64 ein Drittel mehr. 25 Bilder
sprengen das Budget, die später geplanten ~1000 Vokabeln erst recht. Dazu
kommt: eine Sammlung wird bei jedem Schreibvorgang **komplett** neu
serialisiert, und `getAll('images')` würde jedes Bild in den Speicher holen,
nur um sie zu zählen.

Auf der nativen Seite war die Wahl ähnlich klar: eine SQLite-Zeile je Bild
ginge, aber eine Datei ist das natürliche Format für Bilddaten, und `file.uri`
lässt sich direkt an `<Image>` reichen, ohne dass Base64 durch den
JavaScript-Thread muss. `File.write(inhalt, { encoding: 'base64' })` nimmt die
Antwort der API unverändert entgegen und dekodiert nativ — ein eigener
Base64-Dekodierer in JavaScript ist damit überflüssig. Abgelegt wird unter
`Paths.document`, nicht `Paths.cache`: erzeugte Bilder kosten Geld und gehören
nicht in ein Verzeichnis, das das System bei Speichermangel leeren darf.

**Warum trotzdem eine eigene Abstraktion und nicht einfach `expo-file-system`
überall:** `expo-file-system@57.0.6` hat auf Web **keine** Umsetzung. Die Datei
`src/ExpoFileSystem.web.ts` besteht aus Klassen, deren Konstruktor
`console.warn('expo-file-system is not supported on web')` ruft und die
ansonsten leere Werte liefern; die Expo-Dokumentation zu SDK 57 nennt als
Plattformen nur „Android, iOS, tvOS". Also dasselbe Muster wie bei AE-3: eine
schmale Schnittstelle (`ImageBlobStore`), je Plattform eine Umsetzung, dazu
eine im Arbeitsspeicher für Tests und als Notnagel. Im Web gemessen: die
Anzeige nennt `Ablage indexeddb`, die fünf Testbilder lagen als `nam.webp`,
`khaao.webp`, … in der IndexedDB, und `localStorage` blieb dabei bei 78 KB —
die Bilder landen also nachweislich nicht dort.

Im Web wird der **Base64-String** abgelegt, nicht ein `Blob`: `<Image>` nimmt
eine `data:`-URL direkt entgegen, während ein Objekt-URL wieder freigegeben
werden müsste und ein vergessenes `revokeObjectURL` die Daten für die ganze
Sitzung im Speicher hielte.

**Reihenfolge beim Schreiben, mit Absicht:** erst die Bilddatei, dann das
Metadaten-Dokument. Bricht es dazwischen ab, fehlt das Dokument, der Eintrag
gilt als „nicht vorhanden" und wird sauber neu erzeugt. Andersherum entstünde
eine Karteileiche: ein Dokument ohne Datei, das jeder weitere Lauf überspringen
würde, während die Karte für immer leer bliebe. Deshalb prüft `exists` auch
**beides** — Dokument *und* Datei. Beim Löschen gilt die umgekehrte
Reihenfolge, aus demselben Grund.

### AE-15 — Das isConcrete-Tor ist dreifach, nicht einfach

**Entscheidung:** Ob eine Vokabel ein Bild bekommt, wird an drei Stellen
geprüft: beim Bauen des Auftrags (`imageSpecFor`), im Batch-Lauf vor dem
Netzaufruf (`imageTask.produce`) und im API-Client selbst
(`createStabilityImageClient`). Dazu ist `isConcrete` im Auftragstyp ein
**Literaltyp** (`isConcrete: true`), sodass schon der Übersetzer keinen Auftrag
aus einem abstrakten Eintrag bauen lässt.

**Begründung:** Der Nutzen von Bildern beim Vokabellernen (Dual-Coding,
Picture-Superiority) hängt daran, dass das Bild den Begriff **trifft**. Für
„nicht", „ครับ" oder „vielleicht" gibt es kein solches Bild; was ein Modell
dazu malt, ist bestenfalls Dekoration und schlimmstenfalls eine falsche
Merkhilfe neben sorgfältig geprüften Vokabeln. Eine einzelne Sperre wird
irgendwann durch einen neuen Aufrufer umgangen — deshalb liegt sie auch
unmittelbar vor dem Aufruf, der Geld kostet. Der Laufzeitcheck holt sich den
Eintrag dabei **neu aus dem Grundstock**, weil ein Auftrag aus dem Speicher
oder aus altem Code seinen Literaltyp längst verloren hat.

**Dazu gehört die Motivliste:** `src/lib/images/motifs.ts` hält je konkreter
Vokabel eine **englische** Motivbeschreibung. Zwei Gründe. Erstens die Sprache:
Bildmodelle sind auf englischen Bildunterschriften trainiert, „das Huhn" als
Prompt wäre ein Glücksspiel. Zweitens — und wichtiger — die Eindeutigkeit: ไก่
ist das *Tier* Huhn, ein Teller Brathähnchen würde als „Hühnerfleisch"
gemerkt; ปลา ist der Fisch im Wasser, nicht das Filet; ร้าน ist laut Quelle
„Stand, Bude" (der Eintrag trägt deshalb `sourceVerified: false`), also ein
Straßenstand und kein Ladengeschäft. Solche Festlegungen gehören ausformuliert
und nachlesbar, nicht in einen Prompt hineingeraten. Die Liste liegt beim
Generator und **nicht** im Vokabel-Grundstock — der bleibt unangetastet, wie im
Skalierungsplan festgehalten. Ein Test hält beide Seiten zusammen: jede
konkrete Vokabel braucht ein Motiv, und ein Motiv ohne passende Vokabel fliegt
auf.

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

### 2026-08-30 — Zusatz: Lernstatistik (Nachtrag aus Phase 3)

Der Fortschritt-Tab war noch Platzhalter. Er zeigt jetzt echte Daten:
Wiederholungen heute, Tage in Folge, fällige Karten, Kartenzustände als
gestapelter Balken und ein Diagramm der letzten 14 Tage. Datenmodell-Frage
geklärt → **AE-9** (Tagesprotokoll statt Näherung), Einschränkung im UI
benannt. Lücken im Diagramm werden mit Nullen aufgefüllt statt
zusammengeschoben; die Tagesserie bricht nicht ab, nur weil heute noch nichts
gelernt wurde. 19 neue Tests für Tagesschlüssel, Protokollierung, Lücken,
Serienberechnung und Aggregation.

### 2026-08-30 — Phase 4: Content-Generator für Sprachsituationen

**Gemacht**

- `src/lib/conversation/` — `types.ts` (Schema, Themen, Niveaus), `plan.ts`
  (deterministischer Bauplan), `generator.ts` (Prompt, API-Aufruf, strenge
  Prüfung der Antwort), `batch.ts` (robuster Lauf).
- `src/lib/api-key.ts` — Ablage nach AE-10.
- Einstellungs-Screen: Schlüsselfeld, Umfangwahl (Probelauf 16 /
  vollständiger Lauf 512), Start und Anhalten, Fortschrittsbalken mit
  **getrennten** Zählern, aufklappbare Fehlerliste, Löschen des Bestands.
- Gespräch-Screen: Filter nach Richtung, aufklappbare Situationen mit
  Szenenbeschreibung, Zügen (Thai / Umschrift / Deutsch), Sprechtaste je Zug
  und Korrektur-Hinweisen. Eigene Zeilen sind farbig markiert.
- `metro.config.js` ergänzt → AE-12.

**Kein Live-Chat** — bewusst. Die Dialoge entstehen einmalig als
`scriptTurns`, danach braucht das Üben weder Netz noch Schlüssel.

**Robustheit (Pflicht 2), nachweislich geprüft**

Sofort speichern statt am Ende sammeln; Fehler zählen und weitermachen statt
abbrechen; Vorhandenes überspringen; abbrechbar. Belegt durch Tests *und*
einen echten Lauf gegen die API:

- Fehler mitten im Lauf → 14 erzeugt, 2 fehlgeschlagen, alle 16 angefasst.
- Drei Fehler gleich zu Beginn → die übrigen 13 sind trotzdem gespeichert.
- Zweiter Lauf → 12 übersprungen, nur die 4 fehlenden angefragt.
- Dritter Lauf → gar kein API-Aufruf mehr.
- Abbruch nach 5 → die 5 bleiben erhalten.
- Unbrauchbare Antwort → gilt als Fehlschlag, nichts Halbes wird gespeichert.

**CORS (Pflicht 4) — empirisch belegt, nicht angenommen**

Aus dem laufenden Web-Build heraus gegen `api.anthropic.com` geprüft:

| Anfrage | Ergebnis |
| --- | --- |
| **ohne** `anthropic-dangerous-direct-browser-access` | `TypeError: Failed to fetch` — CORS blockt |
| **mit** dem Header | HTTP 401 mit sauberem JSON `authentication_error` |

Der Header ist also tatsächlich nötig, und mit ihm ist der Netzwerkweg frei.

**Durchlauf durch den echten SDK**

Mit einem absichtlich ungültigen Dummy-Schlüssel im Web-Build gestartet:
16/16 verarbeitet, 0 erzeugt, 16 fehlgeschlagen, jeder Fehlschlag mit ID und
Grund (`401 authentication_error`), **0 Einträge gespeichert**. Damit sind
Bündelung, Header, Anfrageform, Fehlerbehandlung und Batch-Verhalten unter
echten Netzwerkbedingungen belegt — nur die Gültigkeit des Schlüssels fehlte.

**Offline-Wiedergabe geprüft**

Zwei Situationen im Schema eingespielt, Gespräch-Screen zeigt sie mit allen
Zügen und Hinweisen; nach vollständigem Neuladen unverändert vorhanden
(„2 Situationen — offline nutzbar"), ohne Schlüssel und ohne Netzanfrage. Die
Testdaten wurden danach wieder entfernt.

**Antwortformat**

JSON im Prompt verlangt und streng geprüft, statt `output_config.format` zu
verwenden. Grund: ohne echten Schlüssel ließ sich das hier nicht gegen die API
testen. Ein Fehler im Schema-Parameter hätte **jeden** Aufruf zum Scheitern
gebracht; eine unerwartete Antwortform zeigt sich dagegen als *ein*
fehlgeschlagener Eintrag, den der Batch übersteht. Strukturierte Ausgaben sind
die natürliche Verbesserung, sobald ein echter Lauf die Basis bestätigt.

**Verifiziert**

- `npm test` → **237 Tests grün** in 9 Suites (vorher 187).
- `npx tsc --noEmit` fehlerfrei.
- Layout bei 375 px und im breiten Fenster geprüft.

**Nachtrag: die letzte Lücke so weit wie möglich geschlossen**

Auf dem Rechner sind keine Zugangsdaten hinterlegt (weder
`ANTHROPIC_API_KEY` noch `ANTHROPIC_AUTH_TOKEN`, kein `ant`-CLI, kein
Profilverzeichnis) — nachgesehen, nicht vermutet. B-3 lässt sich hier also
nicht schließen. Zwei Dinge, die stattdessen gemacht wurden:

1. **Prompt-Vertrag getestet** (`prompt-contract.test.ts`). Der Lauf mit
   ungültigem Schlüssel konnte alles prüfen außer einem: ob eine Antwort, die
   genau der im Prompt verlangten Form folgt, auch durch die Prüfung kommt.
   Zwei ausformulierte Musterantworten — eine je Richtung — decken das jetzt
   ab, inklusive Zuglänge, Sprecherwechsel, Vollständigkeit der drei
   Sprachfassungen und **richtungsspezifischer** Korrektur-Hinweise (Töne und
   Klassifikatoren gegen Artikel, Kasus, Verbstellung — der Kern von AE-11).
   Das ersetzt keinen echten Lauf, fängt aber genau den Fehler ab, der sonst
   erst beim ersten bezahlten Aufruf aufgefallen wäre: dass Prompt und Parser
   auseinandergelaufen sind.
2. **`output_config: { effort: 'low' }`** ergänzt. Ein kurzer A1/A2-Dialog in
   vorgegebenem JSON ist eine einfache Aufgabe; bei 512 Aufrufen im vollen
   Lauf schlägt der Unterschied im Aufwand spürbar auf Kosten und Dauer durch.

**Offen**

- Ein Lauf mit **gültigem** Schlüssel steht aus. Das ist Blocker **B-3** und
  bleibt beim Nutzer: fremde API-Schlüssel gebe ich nicht ein, und auf diesem
  Rechner sind keine hinterlegt. Alles davor ist geprüft — CORS empirisch,
  SDK-Bündelung, Anfrageform, Fehlerverhalten, Batch-Robustheit,
  Offline-Wiedergabe und jetzt auch der Prompt-Vertrag.
- Gerätecheck in Expo Go (**B-2**) bleibt offen, weil der Apple-Signierweg dem
  Nutzer zu aufwendig ist. Damit sind Phase 3 und 4 auf dem Gerät unbestätigt;
  im Web-Build ist beides geprüft.

### 2026-08-31 — Blocker B-3 erledigt

Der Nutzer hat den Probelauf des Sprachsituationen-Generators mit einem
gültigen Anthropic-Schlüssel durchgeführt und bestätigt. Damit ist das letzte
offene Abnahmekriterium aus Phase 4 erfüllt; **B-3 ist geschlossen**. Die
genauen Zahlen des Laufs liegen mir nicht vor — falls sie hier stehen sollen,
bitte nachtragen.

### 2026-08-31 — Phase 5: Content-Generator für Bilder

**Gemacht**

- `src/lib/generation/` — der Batch-Läufer, jetzt tatsächlich anbieter- und
  inhaltsunabhängig: `batch.ts` (`runBatch`, `missingFrom`, `BatchProgress`),
  `types.ts` (`GenerationSpec`, `BatchTask`), `plan.ts` (`limitPlan`,
  `assertUniqueIds`).
- `src/lib/images/` — `types.ts` (Schema, Blob-Schnittstelle), `motifs.ts`
  (25 Motive), `plan.ts` (Bauplan + isConcrete-Tor), `generator.ts` (Prompt,
  API-Aufruf, strenge Antwortprüfung), `batch.ts` (Ablage), `blob-backend.ts`
  / `blob-backend.web.ts` / `blob-memory.ts` / `blob-store.ts`.
- `api-key.ts` hält zwei Schlüssel getrennt (AE-13).
- Sammlung `images` im Dokumentspeicher (AE-14); Repository-Zugriffe
  `loadVocabImage`, `loadVocabImageUri`, `countVocabImages`,
  `clearVocabImages`.
- `components/generator-card.tsx` — die Generator-Karte (Schlüsselfeld,
  Umfang, Start/Anhalten, Fortschritt, Fehlerliste, Löschen) einmal gebaut,
  zweimal benutzt. Der Einstellungs-Screen ist dadurch kürzer als vorher, statt
  eine zweite Kopie derselben Bedienung zu tragen.
- `components/vocab-image.tsx` — das Bild auf der Karteikarte.

**Pflicht 1 — Bestehende Infrastruktur wiederverwendet, und dabei eine
Selbstkorrektur**

Das Protokoll führte `plan.ts` / `batch.ts` aus Phase 4 als „bewusst generisch,
nicht an Sprachsituationen gebunden". Beim Nachsehen stimmte das nicht:
`runGenerationBatch` war fest mit der Sammlung `situations`, dem Typ
`ConversationSituation` und dem Dialog-Client verdrahtet. Der Läufer ist jetzt
wirklich generisch — die vier Robustheitsregeln stehen einmalig in
`lib/generation/batch.ts`, und was ein Eintrag ist, wann er als vorhanden gilt
und wie er abgelegt wird, steckt im `BatchTask`. `conversation/batch.ts` ist
zum dünnen Adapter geschrumpft; **alle 24 Tests aus Phase 4 laufen unverändert
weiter**, was zugleich belegt, dass sich das Verhalten nicht verschoben hat.
`plan.ts` blieb getrennt: Situationen sind ein Kreuzprodukt, Bilder eine
Auswahl aus dem Grundstock — das ist zweierlei Inhalt, keine Doppelung.
Gemeinsam sind nur `limitPlan` und `assertUniqueIds`.

**Pflicht 2 — Anbieter: gemessen statt angenommen → AE-13**

Kurzfassung: OpenAI Images fiel durch, weil `api.openai.com` Browsern zwar GET,
aber **kein POST** erlaubt (`Failed to fetch`, in der Konsole als CORS-Blockade
benannt) und der `dangerouslyAllowBrowser`-Schalter des OpenAI-SDK — anders als
bei Anthropic — gar keinen Header setzt, sondern nur eine Selbstsperre aufhebt.
Stability AI kommt durch und lässt sich zudem ohne Schlüssel vollständig
festklopfen, weil die API Pflichtfelder und Aufzählungswerte vor der
Authentifizierung prüft. Der zunächst installierte `openai`-SDK wurde wieder
entfernt. Volle Messtabellen in AE-13.

**Pflicht 3 — Speicherformat → AE-14**

Metadaten in den Dokumentspeicher, Bilddaten in eine eigene Ablage. Der Grund
ist nachgesehen und nicht geschätzt: das Web-Backend des Dokumentspeichers
landet in `window.localStorage` mit rund 5 MB für **alle** Sammlungen
zusammen. Nativ eine Datei je Bild, im Web IndexedDB — `expo-file-system` hat
auf Web keine Umsetzung.

**Pflicht 4 — isConcrete-Tor, testgesichert → AE-15**

Drei Sperren plus ein Literaltyp. Die Tests decken jede Ebene ab, und der
entscheidende Test fährt einen **gefälschten** Auftrag für einen abstrakten
Eintrag durch den echten Batch-Lauf: der Client wird **kein einziges Mal**
aufgerufen, es wird nichts gespeichert, und der Lauf zählt einen Fehlschlag mit
Begründung. Ein zweiter Test mischt einen gefälschten Auftrag unter vier echte:
die vier laufen durch, der fünfte wird nicht angefragt.

**Verifiziert**

- `npm test` → **275 Tests grün** in 10 Suites (vorher 237). `npx tsc --noEmit`
  fehlerfrei.
- **Echter Lauf durch den echten Netzwerkpfad**, aus dem Web-Build heraus, mit
  absichtlich ungültigem Schlüssel: 5 von 5 verarbeitet, 0 erzeugt, 5
  fehlgeschlagen, jeder Fehlschlag mit ID und Grund
  (`HTTP 401: authorization: invalid or missing header value`), **0 Einträge
  gespeichert**. Damit sind Anfrageform, Header, Fehlerbehandlung und
  Batch-Verhalten unter echten Netzwerkbedingungen belegt — nur die Gültigkeit
  des Schlüssels fehlte. Dieselbe Lage wie am Ende von Phase 4.
- **Kleiner Testlauf über die Ablage:** 5 Bilder durch dieselbe Pipeline, mit
  einem Ersatz-Client, der echte WebP-Bytes liefert. Ergebnis: 5 erzeugt, 0
  fehlgeschlagen; in der IndexedDB lagen `aahaan.webp`, `baan.webp`,
  `khaao.webp`, `nam.webp`, `rot.webp`, im Dokumentspeicher fünf Metadaten;
  `localStorage` blieb bei 78 KB.
- **Offline abrufbar ohne Schlüssel:** danach den Dev-Server neu gestartet und
  die Seite vollständig neu geladen. Anzeige: „Im Speicher: 5 von 25 Bildern ·
  Modell stable-image-core · Ablage indexeddb", beide Schlüsselfelder leer (wie
  nach AE-10 erwartet). Die Bilder erschienen auf den Karteikarten ohne
  Schlüssel und ohne Netzanfrage.
- **Anzeige in beiden Richtungen geprüft:** bei `de_to_th` steht das Bild schon
  auf der Vorderseite (es verrät die gesuchte thailändische Form nicht),
  bei `th_to_de` erst nach dem Aufdecken (vorher wäre es die Antwort). Bei
  einer abstrakten Karte („hallo, guten Tag") erscheint kein Bild und auch kein
  Platzhalter.
- Layout bei 375 px und im breiten Fenster geprüft.
- Die Abnahmedaten (fünf Ersatzbilder, verschobene Kartenzustände) wurden
  danach wieder entfernt.

**Offen**

- Ein Lauf mit **gültigem Stability-Schlüssel** steht aus — Blocker **B-4**.
  Fremde API-Schlüssel gebe ich nicht ein, und auf diesem Rechner sind keine
  hinterlegt. Alles davor ist geprüft: CORS empirisch, Anfrageform gegen die
  laufende API, Fehlerverhalten, Batch-Robustheit, Ablage, Offline-Abruf und
  Anzeige.
- Was sich ohne Schlüssel nicht prüfen ließ, ist die **Antwortform** (heißt das
  Feld wirklich `image`?). Der Parser nennt deshalb im Fehlerfall die
  gelieferten Feldnamen, damit ein Namenswechsel sofort sichtbar wird statt zu
  rätseln.
- Gerätecheck in Expo Go (**B-2**) bleibt offen; damit ist auch der native
  Bildpfad (`expo-file-system`) bislang nur typgeprüft, nicht am Gerät gelaufen.

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

1. **Bilder-Probelauf mit gültigem Schlüssel (Blocker B-4, schließt Phase 5 ab):**
   `npx expo start` → `w`, Reiter **Einstellungen**, Karte **Generator:
   Bilder**, einen Stability-AI-Schlüssel eintragen, **Probelauf** wählen (5
   Bilder), **Start**. Erwartung: 5 von 5 erzeugt, 0 fehlgeschlagen; danach
   zeigt die Statuszeile „5 von 25 Bildern", und die Bilder erscheinen im
   Reiter **Lernen** auf den Karten zu Wasser, Reis, Essen, Haus und Auto.
   Seite neu laden und noch einmal schauen — sie müssen ohne Schlüssel
   dableiben. Ein Bild kostet bei Stable Image Core wenige Cent, fünf also
   Kleingeld, aber es ist echtes Geld.
   *Falls Fehlschläge kommen:* die Fehlerliste unter dem Fortschrittsbalken
   aufklappen. Steht dort „Antwort enthielt kein Feld ,image'", hat der
   Anbieter die Antwortform geändert — die gelieferten Feldnamen stehen in
   derselben Meldung, `parseImageResponse` in
   `src/lib/images/generator.ts` ist dann die einzige anzupassende Stelle.
   *Warum ich das nicht selbst gemacht habe:* Ich gebe keine fremden
   API-Schlüssel ein. Alles davor ist geprüft — CORS empirisch, Anfrageform
   gegen die laufende API, Fehlerverhalten, Batch, Ablage, Offline-Abruf und
   Anzeige.
2. **Gerätecheck in Expo Go (Blocker B-2, offen, vom Nutzer zurückgestellt):**
   Betrifft Phase 3, 4 und 5 auf iOS/Android; der Apple-Signierweg ist dem
   Nutzer derzeit zu aufwendig. Im Web-Build ist alles geprüft. Auf **Android**
   wäre der Weg über Expo Go deutlich einfacher, falls das später relevant
   wird. Für Phase 5 kommt dazu: der native Bildpfad (`expo-file-system`,
   Datei je Bild unter `Paths.document`) ist bisher nur typgeprüft.
3. **Restliche 20 Bilder**, sobald der Probelauf sitzt: „Alle konkreten
   Vokabeln" statt „Probelauf". Der Lauf überspringt, was schon da ist.
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
