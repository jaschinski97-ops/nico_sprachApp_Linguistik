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

### AE-16 — Übungen laufen **nicht** durch FSRS, wählen ihre Aufgaben aber daraus

**Entscheidung:** Die Übungstypen aus Phase 6 legen **keine** eigenen
FSRS-Karten an und schreiben **keine** Bewertung zurück. Sie sind ein
Übungsmodus ohne Wiederholungsplanung. Aber sie sind auch nicht blind: welche
Vokabeln drankommen, entscheidet der **vorhandene** FSRS-Zustand derselben
Richtung — am schwächsten Sitzendes zuerst, dieselbe Sortierung, die auch
`buildReviewQueue` benutzt. Beantwortete Aufgaben werden im Tagesprotokoll
**getrennt** mitgezählt (`drills`, `drillsCorrect`).

**Begründung — drei Gründe, der zweite ist der wichtigste:**

1. **FSRS modelliert eine Erinnerungsspur je Item.** Der Artikel von „das
   Haus" ist keine eigene Erinnerung neben der Vokabel — er steht schon auf
   der `th_to_de`-Karte im deutschen Stichwort. Zwei getrennte Zeitpläne für
   dieselbe Tatsache anzulegen, hieße dieselbe Sache zweimal mit
   auseinanderlaufenden Intervallen abzufragen. Genau das will Spaced
   Repetition vermeiden.
2. **Die Bewertungsskala passt nicht zum Aufgabentyp.** „Nochmal / Schwer /
   Gut / Leicht" ist eine **Selbsteinschätzung des Abrufs**. Eine
   Auswahlübung liefert nur richtig/falsch — und dazu eine Ratequote von 33 %
   (drei Artikel) bzw. 20 % (fünf Töne). Ein geratenes Richtig als „Gut" in die
   Stabilitätsformel zu geben, verlängert das Intervall für etwas, das gar
   nicht abgerufen wurde. Der Schaden wäre unsichtbar und würde sich über
   Monate aufbauen — dieselbe Überlegung, aus der in Phase 2 ein falscher Ton
   als „teuer" eingestuft wurde.
3. **Der Kartenschlüssel ist `vocabId:direction`.** Ein dritter Schlüsselteil
   für den Übungstyp würde `cardKey`, `loadCardStatesForDirection`, das
   Dashboard und die Statistik anfassen. Im Dashboard stünde dann „252 Karten
   fällig", ohne dass erkennbar wäre, was davon Vokabeln sind.

**Was die Übungen dafür sehr wohl tun:** Sie ziehen aus einem **Fenster** der
schwächsten Kandidaten (dreimal so groß wie die Runde) zufällig. Stur die
schwächsten zu nehmen ginge nicht, denn eine Übungsantwort ändert den
Kartenzustand ja bewusst nicht — bei jedem Start käme dieselbe Liste heraus.
So bleibt der Schwerpunkt auf dem Wackligen, ohne dass sich die Sitzung
wörtlich wiederholt.

**Folge für die Statistik:** Übungen zählen **nicht** in `total` — das Feld
heißt im UI „Wiederholungen", und eine Auswahlübung ist keine. Das Diagramm
stapelt beide Reihen in zwei Farben mit Legende. Für die **Lernserie** zählen
Übungen dagegen mit: Wer einen Abend lang Töne gehört hat, hat gelernt; die
Serie über eine Rechenentscheidung zur Wiederholungsplanung zerbrechen zu
lassen, wäre nicht nachvollziehbar.

**Wenn sich das ändern soll:** Der saubere Weg wäre nicht ein zweiter
Kartensatz, sondern ein Aufgabentyp mit **freier Eingabe** statt Auswahl (Wort
tippen, Artikel schreiben). Dann gäbe es kein Rateproblem, und die Antwort
wäre ein echter Abruf. Das ist eine eigene Entscheidung für später, keine
Nachlässigkeit hier.

### AE-17 — Standard-Lernrichtung im Profil, ausdrücklich gesetzt und jederzeit änderbar

**Entscheidung:** Es gibt eine Standard-Lernrichtung im Lernprofil (Sammlung
`meta`, Dokument `profile`). Sie wird **nur auf ausdrückliche Anweisung**
gesetzt („☆ Als Standard merken" im Lernen-Reiter, oder in den Einstellungen),
ist überall sichtbar, wo sie wirkt, und lässt sich an derselben Stelle wieder
aufheben. Ohne Standard fragt die App wie bisher bei jeder Sitzung.

**Begründung:** Die App bedient zwei getrennte Zielgruppen. Für die meisten
Menschen ist die Lernrichtung eine Eigenschaft der Person und keine
Entscheidung je Sitzung — wer Thai lernt, lernt beim nächsten Mal wieder Thai.
Jedes Mal neu zu wählen ist Reibung mit vorhersehbarer Antwort.

**Warum nicht automatisch aus der letzten Wahl:** Bidirektionalität ist ein
Kernversprechen (AE-11) — dieselbe Person kann beide Richtungen lernen, und
ein Gerät kann von zwei Menschen geteilt werden. Die zuletzt gewählte Richtung
still festzuschreiben, würde die App nach einem einzigen Tippen festlegen,
ohne dass jemand das gewollt hätte, und wäre für den Betroffenen kaum als
Ursache erkennbar. Die Auswahl bleibt deshalb auch mit gesetztem Standard über
„Richtung wechseln" erreichbar — sonst wäre der Standard eine Einbahnstraße;
dafür sorgt ein eigener Parameter, nicht das bloße Fehlen der Richtung.

Die Sammlung `meta` ist seit Phase 1 genau dafür vorgesehen („Einstellungen,
Lernprofil, Zähler") und war bis jetzt ungenutzt. Ein Profil aus einer älteren
Version wird nachsichtig gelesen: ein unbekannter Wert ergibt „immer fragen"
statt eines Absturzes oder einer Sperre.

### AE-18 — Die Prüfungsstruktur ist erhoben, nicht erinnert

**Entscheidung:** Das `ExamModule`-Schema bildet ab, was auf den Seiten des
Goethe-Instituts steht — Fertigkeiten, Textsorten, Dauern, Alters- und
Stundenempfehlungen — und trägt an jedem Zertifikat **Quelle und Abrufdatum**,
sichtbar auch im UI.

**Begründung:** Prüfungsformate ändern sich, und aus dem Gedächtnis
aufgeschriebene Formate klingen plausibel, auch wenn sie falsch sind. Zwei
Punkte, die die Recherche gegen die naheliegende Vermutung entschieden hat:

1. **A1 und A2 haben „Prüfungsteile", B1 hat „Module".** Und der Unterschied
   ist keine Wortklauberei: bei B1 „können die vier Module einzeln oder in
   Kombination abgelegt werden", und „die Einzelzeugnisse über vier Module
   entsprechen einem Gesamtzeugnis". Die Seiten benennen das selbst
   unterschiedlich — Überschrift bei A1/A2: „Gar nicht so schwer: die
   Prüfungsteile", bei B1: „Ihr Auftritt, bitte! Die Module". Ein Schema, das
   überall „Module" schreibt, hätte für A1 etwas versprochen, das es dort nicht
   gibt.
2. **Die Dauern folgen keiner Regel.** Lesen dauert bei A1 25 Minuten, bei A2
   „etwa 30", bei B1 65. Schreiben: 20 / „etwa 30" / 60. Das „etwa" steht bei
   A2 an drei von vier Teilen und bei A1 an keinem — deshalb hat `ExamPart` ein
   eigenes Feld `approximate`, statt eine Zahl zu behaupten, wo die Quelle
   ungefähr sagt.

Auch die **Aufgabenformate** sind nicht ausgedacht, sondern im Einstufungstest
(`goethe.de/lrn/pro/30-item/`) Aufgabe für Aufgabe durchgeklickt: Auswahl mit
drei Möglichkeiten, Richtig/Falsch, Zuordnung, Lückentext. Die vollständige
Beobachtung steht im Protokolleintrag zu Phase 7.

### AE-19 — Das Prüfungsmodul ist einseitig, und das steht in der App

**Entscheidung:** Das Modul richtet sich ausschließlich an `th_to_de` —
Thai-Muttersprachler, die Deutsch lernen. Für `de_to_th` ist **nichts**
hinterlegt. Das Feld `direction` steht trotzdem im Schema.

**Begründung:** Das Goethe-Institut zertifiziert Deutsch. Ein Thai-Gegenstück
gibt es durchaus — die Suche führte auf den **CU-TFL** des Sirindhorn Thai
Language Institute der Chulalongkorn-Universität, der ebenfalls Hören,
Sprechen, Lesen und Schreiben prüft. Gebaut wurde er hier trotzdem nicht, und
zwar aus genau dem Grund, aus dem diese Phase überhaupt mit Recherche beginnt:

- Die **Primärquelle war aus dieser Sitzung nicht erreichbar** (die Navigation
  zu `sti.chula.ac.th` wurde abgelehnt).
- Die Sekundärquellen widersprechen sich in einem Kernpunkt, der ins Schema
  gehört: die eine nennt die fünf Stufen *Basic, Intermediate, Good,
  Excellent, Superior*, die andere *Novice, Intermediate, Advanced, Superior,
  Distinguished*.

Eine Stufenskala aus zwei einander widersprechenden Sekundärquellen
zusammenzusetzen, wäre dasselbe Raten, das die Phasenvorgabe ausdrücklich
verbietet — nur diesmal auf der anderen Seite der App. Also: nichts bauen, den
Grund benennen, und das Schema so lassen, dass ein **recherchierter** CU-TFL
später danebenpasst, ohne dass etwas umgebaut werden muss. Die Einseitigkeit
steht auch im UI, damit niemand sie für ein Versehen hält.

### AE-20 — Lesen und Hören werden bewertet, Schreiben und Sprechen nicht

**Entscheidung:** Aufgaben zu Lesen und Hören werden automatisch ausgewertet.
Schreiben und Sprechen sind Aufgaben mit **Musterlösung und Selbstkontrolle**
(Typ `production`) — sie bekommen keine Punktzahl. Es gibt außerdem
**nirgends eine Bestehensgrenze**.

**Begründung:** Ein freier Text oder eine gesprochene Antwort ließe sich nur
von einem Sprachmodell beurteilen. Dessen Urteil wäre eine ungeprüfte Aussage
über die eigene Prüfungsreife — und die Prüfung kostet Geld, Zeit und hängt in
manchen Fällen an einem Visum. „Deine Antwort reicht für A1" ist eine Auskunft,
für die dieses Projekt keine Grundlage hat. Musterlösung plus Prüfliste sagt
dagegen genau so viel, wie belegbar ist.

Dieselbe Überlegung führt zur fehlenden Bestehensgrenze: wie viele Punkte zum
Bestehen nötig sind, steht in den Durchführungsbestimmungen des
Goethe-Instituts, die hier **nicht** erhoben wurden. Eine ausgedachte Grenze
(„60 % — bestanden!") wäre die plausibel klingende Erfindung, gegen die diese
ganze Phase gerichtet ist. Angezeigt wird deshalb nur, wie viel richtig war,
mit dem Hinweis, dass es eine Übung ist und keine Prüfung.

Aus derselben Entscheidung folgt, was der Generator **nicht** erzeugt: Lese-
und Hörtexte ja, Schreib- und Sprechaufgaben nein — dort wäre die Musterlösung
selbst ungeprüfter Text, an dem sich jemand ausrichtet.

### AE-21 — APK für Testbuilds, AAB nur für den Play Store

**Entscheidung:** Die Profile `development` und `preview` bauen ein **APK**
(`android.buildType: "apk"`), `production` ein **AAB** (`app-bundle`).

**Begründung — in der EAS-Dokumentation nachgesehen:** „AABs can't be installed
directly on your device." Ein AAB ist ein Bündel, aus dem der Play Store erst
gerätespezifische APKs schneidet; auf ein Handy laden lässt es sich nicht. Da
das erklärte Ziel dieser Phase ein **installierbarer** Testbuild ist — und
zwar einer, der den Umweg über Expo Go und damit den Blocker B-2 umgeht —,
wäre ein AAB hier genau das Falsche. Umgekehrt verlangt Google Play für neue
Apps ein AAB, deshalb bleibt `production` dabei.

Beide Testprofile tragen zusätzlich `distribution: "internal"`. Das erzeugt
laut Dokumentation eine teilbare Installationsadresse — der Nutzer bekommt
einen Link aufs Handy statt einer Datei, die er erst irgendwie übertragen muss.

### AE-22 — iOS zuerst als Simulator-Build, weil das ohne Apple-Konto geht

**Entscheidung:** Die Profile `development` und `preview` setzen für iOS
`simulator: true`.

**Begründung:** Der Apple-Signierweg war dem Nutzer schon in Phase 3 zu
aufwendig (B-2), und die Mitgliedschaft im Apple Developer Program kostet
laufend Geld. Die EAS-Dokumentation zu Simulator-Builds sagt dazu wörtlich, ein
solcher Build laufe „without needing to deploy to TestFlight or even having an
**Apple Developer account**". Damit ist genau ein iOS-Weg offen, der ohne
Apple-Konto durch die Mac-Cloud läuft — und das ist der, der in dieser Phase
verlangt war („mindestens ein Durchlauf über EAS").

Was das **nicht** ist: ein Build fürs echte Gerät oder für TestFlight. Dafür
braucht es das Apple Developer Program (99 USD/Jahr laut EAS-Setup-Seite) und
Signierschlüssel, die EAS zwar selbst erzeugen kann, aber erst nach Anmeldung
mit einer Apple-ID. Das bleibt offen und ist als solches benannt.

### AE-23 — Der Web-Export bleibt an der Wurzel; die WordPress-Einbettung ist bewusst nicht gebaut

**Entscheidung:** `npx expo export --platform web` erzeugt einen statischen
Export, der an der **Wurzel** einer Domain oder Subdomain liegt. Eine
WordPress-Einbettung ist **nicht** gebaut — aber der Hebel dafür ist benannt
und der Export so gelassen, dass er ihn nicht verstellt.

**Begründung — im Export nachgemessen, nicht vermutet:** Die erzeugte
`dist/index.html` verweist auf ihre Bündel **absolut**:

```
src="/_expo/static/js/web/entry-367a768a954092aad27cf9af094d407c.js"
href="/favicon.ico"
```

Unter `example.com/lernbegleiter/` abgelegt, würde der Browser diese Dateien
also unter `example.com/_expo/…` suchen und nicht finden. Wer den Export später
in ein Unterverzeichnis legen will, braucht deshalb `experiments.baseUrl` in
`app.json` (z. B. `"baseUrl": "/lernbegleiter"`) und einen **neuen Export** —
die Angabe wirkt zur Exportzeit, nicht zur Laufzeit. Die Dokumentation nennt
dazu einen Haken, der später zählt: `Link` und die `router`-API setzen den
Basispfad selbst davor, ein rohes `<a>` oder die `Linking`-API dagegen nicht.

Warum jetzt trotzdem nichts davon gesetzt wird: Ein `baseUrl` festzulegen,
ohne den Zielpfad zu kennen, macht den Export an jeder anderen Stelle kaputt —
inklusive dem lokalen Ausprobieren. Die Entscheidung „eigene Subdomain oder
Unterverzeichnis" gehört zum Hosting und liegt beim Nutzer. Der Export
funktioniert heute ohne jede Sonderbehandlung; die Umstellung ist später eine
Zeile plus ein erneuter Export.

**Geprüft, nicht angenommen:** Der Export wurde aus einem gewöhnlichen
statischen Server ausgeliefert (kein Dev-Server, kein Metro) und die App lief
vollständig — inklusive Prüfungsmodul und Artikel-Übung, ohne einen einzigen
Konsolenfehler.

### AE-24 — Tonfarben je Anzeigemodus statt einer Farbe je Ton

**Entscheidung:** Jeder Ton hat zwei Farben — eine für den hellen, eine für
den dunklen Modus. Das Feld heißt `colors: { light, dark }` statt `color`, und
die Farbe kommt über `useToneColor()` aus dem aktiven Modus.

**Begründung — gerechnet, nicht geschätzt:** Die einzelne Farbe je Ton stammte
aus dem Referenzprototyp. Nach WCAG 2.1 nachgerechnet verfehlt sie die Stufe AA
**in beiden Modi**:

| Ton | hell: bg / element / selected | dunkel: bg / element / selected |
| --- | --- | --- |
| mittel | 3,80 / 3,35 / 2,91 ✗ | 5,52 / 4,18 / 3,43 ✗ |
| tief | 6,43 / 5,65 / 4,92 ✓ | 3,27 / 2,47 / 2,03 ✗ |
| fallend | 5,67 / 4,98 / 4,34 ✗ | 3,71 / 2,81 / 2,31 ✗ |
| hoch | 3,20 / 2,81 / 2,45 ✗ | 6,56 / 4,97 / 4,09 ✗ |
| steigend | 4,49 / 3,95 / 3,44 ✗ | 4,67 / 3,54 / 2,91 ✗ |

Von 30 Kombinationen bestanden 6. Das ist kein Randfall: Die Umschrift ist
**normaler Text** (also 4,5:1, nicht 3:1), sie ist der Kern der Tonanzeige aus
Phase 3, und sie steht auf drei verschiedenen Untergründen, weil Karten in
Karten liegen. „steigend" im hellen Modus lag mit 4,49 knapp darunter — genau
der Fall, den Schätzen nicht findet.

**Was geändert wurde und was nicht:** Farbton und Sättigung bleiben, nur die
Helligkeit ist je Modus gelöst — sonst wäre „tief" im Dunkelmodus plötzlich
grün und die Tonlegende, die sich jemand eingeprägt hat, hinfällig. Ein Test
prüft das ausdrücklich mit.

Die Umbenennung von `color` zu `colors` war Absicht: So gibt es **keine Stelle
mehr**, an der sich „die" Tonfarbe abgreifen lässt, ohne den Modus zu nennen.
Der Übersetzer hat daraufhin alle 24 Fundstellen gemeldet — genau der Fehler,
der vorher unbemerkt durch die ganze App ging.

Und die Werte stehen als **Test**, nicht als Tabelle im Protokoll: Farben
ändert man im Vorbeigehen, eine Tabelle altert dann still, und niemand merkt
es, bis sich jemand beschwert, dass er die Umschrift nicht lesen kann.

### AE-25 — Dokumente werden auch beim Lesen geprüft, nicht nur beim Schreiben

**Entscheidung:** `loadSituations` und `loadExamModules` prüfen jedes Dokument
(`isValidSituation`, `isValidExamModule`) und lassen aus, was nicht passt.
Ausgelassenes wird **nicht gelöscht**.

**Begründung:** Die Batch-Läufe prüfen die Antwort des Modells streng, bevor
sie speichern — das ist seit Phase 4 getestet. Beim **Lesen** wurde dagegen
blind vertraut, und das ist eine Annahme, die nur bis zur zweiten Version der
App hält. Nachgestellt, bevor etwas geändert wurde:

```
ABSTURZ im Pruefungs-Runner: Cannot read properties of undefined (reading 'map')
ABSTURZ im Gespraechs-Screen: Cannot read properties of undefined (reading 'map')
```

Ein Dokument aus einem älteren Schema, ein von Hand eingespielter Testdatensatz
(in diesem Projekt zweimal vorgekommen) oder ein halb geschriebener Eintrag
hätte also nicht eine Aufgabe fehlen lassen, sondern den ganzen Reiter mit einer
**weißen Seite** beendet.

**Warum nur auslassen, nicht löschen:** Vielleicht kann eine spätere Version
mehr mit dem Dokument anfangen. Stilles Löschen von Nutzerdaten ist die
schlechtere Voreinstellung — eine Meldung in der Konsole nennt die Zahl, damit
ein Schema-Bruch nicht völlig unbemerkt bleibt.

Bewusst **nicht** angefasst wurde, was schon robust ist: der beschädigte
JSON-Blob im Speicher-Backend (Phase 1), die Teilausfälle der Batch-Läufe
(Phase 4/5/7), die stumme Sprachausgabe (Phase 3/6) und das fehlende Bild
(Phase 5) sind seit ihren Phasen getestet.

### AE-26 — Gemini kommt durch CORS, verrät ohne Schlüssel aber nichts

**Entscheidung:** Gemini wird als Textanbieter **und** als Bildanbieter
angeboten, angesprochen mit einem selbst geschriebenen `fetch` gegen
`generativelanguage.googleapis.com/v1beta/models/{modell}:generateContent`, den
Schlüssel im **Header** `x-goog-api-key`.

**Begründung — am 2026-09-03 aus dem laufenden Web-Build gemessen, nach dem
Muster von AE-3/AE-10/AE-12/AE-13:**

| Anfrage | Ergebnis |
| --- | --- |
| `POST …/gemini-2.5-flash:generateContent`, Schlüssel im Header | HTTP 400, lesbar |
| dieselbe Anfrage, Schlüssel als `?key=` | HTTP 400, lesbar |
| `POST …/gemini-2.5-flash-image:generateContent` | HTTP 400, lesbar |
| `POST …/imagen-4.0-generate-001:predict` | HTTP 400, lesbar |
| `GET …/v1beta/models` | HTTP 400, lesbar |
| `POST` ohne das Pflichtfeld `contents` | HTTP 400, lesbar |

Der Netzweg ist also offen — für Text **und** für Bilder, ohne jeden
Sonderheader. Kontrollen in derselben Sitzung: `api.anthropic.com` antwortete
**mit** dem Header aus AE-12 mit 401 und **ohne** ihn mit „Failed to fetch";
zwei Gegenstellen ohne CORS-Header (`example.com`, `goethe.de`) scheiterten
beide. Die CORS-Prüfung des Browsers war also scharf und die Messung
aussagekräftig.

**Schlüssel im Header statt in der URL.** Beide Wege kommen durch — der Header
löst eine Vorabfrage aus, die Google beantwortet. Genommen wird trotzdem der
Header: eine URL landet in Verlaufslisten, Server-Protokollen und
Fehlermeldungen, ein Header nicht. Für einen Schlüssel, der Geld ausgibt, ist
das kein Detail.

**Der Haken, den AE-13 schon benannt hat, ist bestätigt und größer als
gedacht:** Google antwortet mit ungültigem Schlüssel auf **alles** dasselbe —
`API key not valid. Please pass a valid API key.` Auf ein erfundenes Modell, auf
eine Anfrage ohne Pflichtfeld, sogar auf ein `GET` der Modellliste. Damit lässt
sich vor dem ersten bezahlten Aufruf **nichts** belegen: weder die Anfrageform
noch die Antwortform noch die Frage, ob der eingetippte Modellname existiert.
Bei Stability ging genau das, weil dort Pflichtfelder und Aufzählungswerte vor
der Authentifizierung geprüft werden (AE-13). Folgen im Code:

- Die Parser (`parseGeminiText`, `parseGeminiImage`) nennen im Fehlerfall die
  **tatsächlich gelieferten Feldnamen** — dieselbe Vorsichtsmaßnahme wie beim
  Bild-Parser aus AE-13.
- Am Modellfeld steht im UI, dass ein Tippfehler im Modellnamen bei Gemini
  **nicht** vom falschen Schlüssel zu unterscheiden ist.

### AE-27 — Der OpenAI-Blocker aus AE-13 ist echt, aber die Ursache war eine andere

**Entscheidung:** ChatGPT bleibt wählbar, ist im **Web-Build** aber sichtbar als
eingeschränkt gekennzeichnet; nativ gilt die Kennzeichnung nicht.

**Begründung — nachgemessen statt übernommen.** Pflicht 1 dieser Phase lautete,
den bekannten Blocker nicht noch einmal zu „entdecken". Eine Kontrollmessung lief
trotzdem mit, so wie AE-13 seinerzeit Anthropic gegengeprüft hat. Sie widersprach
dem Protokoll:

| Anfrage | Ergebnis |
| --- | --- |
| `POST api.openai.com/v1/chat/completions`, `Authorization: Bearer ungueltig` | HTTP 401, lesbar |
| `POST api.openai.com/v1/images/generations`, derselbe Schlüssel | HTTP 401, lesbar |

Damit sah es zunächst so aus, als hätte OpenAI seine CORS-Haltung geändert —
und genau das stand hier eine Zeit lang. Der erste Lauf des Bildgenerators über
ChatGPT schlug dann aber fünfmal mit `Failed to fetch` fehl, obwohl derselbe
Aufruf aus der Konsole durchkam. Die Ursache wurde eingekreist, nicht geraten:

1. **Verdacht Anmeldedaten.** `credentials: 'include'` erzeugt genau diesen
   Fehler, weil OpenAI `Access-Control-Allow-Origin: *` schickt und ein
   Wildcard für eine Anfrage mit Anmeldedaten nicht gilt. Auf `'omit'` gestellt
   — **änderte nichts**. Der Verdacht war falsch.
2. **Verdacht Anfragekörper.** Den echten, langen Bild-Prompt gegen einen
   kurzen getauscht — **änderte nichts**.
3. **Der Schlüssel war es.** Derselbe Aufruf, nur der Testschlüssel getauscht:

| `Authorization: Bearer …` | Ergebnis |
| --- | --- |
| `ungueltig` | HTTP 401, lesbar |
| `sk-ungueltig` | `Failed to fetch` |
| `sk-UNGUELTIG` | `Failed to fetch` |
| `sk-abcdefghijklmnopqrstuvwxyz012345` | `Failed to fetch` |
| `SK-UNGUELTIG-nur-zum-Testen-0000000000` (groß geschrieben) | HTTP 401, lesbar |
| `xk-UNGUELTIG-nur-zum-Testen-0000000000` | HTTP 401, lesbar |

**Ein POST an OpenAI mit einem Schlüssel, der mit `sk-` beginnt, bekommt eine
Antwort ohne `Access-Control-Allow-Origin`.** Es hängt buchstäblich an diesen
drei Zeichen. Beim **GET** greift die Regel nicht: `GET /v1/models` mit
demselben `sk-`-Schlüssel lieferte ein lesbares 401.

**Damit stimmt die Tabelle aus AE-13 genau — nur die Deutung war zu grob.**
„OpenAI lässt GET durch, POST nicht" war die richtige Beobachtung mit der
falschen Begründung: es ist keine Methodensperre, sondern eine Schlüsselregel,
die GET und POST verschieden trifft. **An der Konsequenz für die App ändert das
nichts**, denn jeder echte OpenAI-Schlüssel beginnt mit `sk-`. Die Entscheidung
von Phase 5 für Stability war also richtig, auch wenn die Begründung zu
korrigieren war.

**Was offen bleibt und als offen benannt ist:** ob ein **gültiger** `sk-`-
Schlüssel die Ausnahme ist. Das ließe sich nur mit einem solchen prüfen, und
fremde Schlüssel gebe ich nicht ein — dieselbe Linie wie bei B-4. Dazu kommt ein
Risiko, das in der Warnung im UI steht: die Vorabfrage trägt den Schlüssel gar
nicht, die eigentliche Anfrage geht also hinaus. Es ist nicht auszuschließen,
dass ein Bild erzeugt und **berechnet** wird, dessen Antwort der Browser danach
verwirft.

**Warum ChatGPT trotzdem wählbar bleibt:** Nativ gibt es kein CORS. Dieselbe
Codebasis läuft auf Android und iOS, und dort ist der Weg offen — belegen lässt
sich das erst am Gerät (B-2). Den Anbieter im Web-Build zu **sperren** hieße,
eine Web-Eigenheit in die nativen Builds zu tragen. Die Warnung steht deshalb
genau dort, wo sie gemessen ist: hinter `Platform.OS === 'web'`.

### AE-28 — Eine Naht für alle Anbieter, an der Stelle, wo sie anbieterfrei ist

**Entscheidung:** Zwei schmale Verträge in `src/lib/providers/`:
`TextClient` („System- und Nutzertext rein, Text raus") und `ImageClient`
(„Prompt rein, Bilddaten raus"). Die bestehenden Umsetzungen für Anthropic und
Stability hängen **dahinter**, nicht daneben. Die Anbieterwahl liegt **je
Generator-Gruppe** getrennt im Dokument `meta/generators`.

**Begründung:** Vor dieser Phase stand der Netzaufruf in jedem Generator neben
Prompt und Parser — dreimal fast dasselbe. Ein dritter Anbieter hätte entweder
eine dritte Kopie bekommen oder jede Prompt-Datei mit einer Anbieterweiche
durchzogen. Die Naht liegt jetzt dort, wo alle drei Textanbieter gleich
aussehen; Prompts, Parser und der Batch-Läufer aus Phase 5 blieben unangetastet.
Ein vierter Anbieter kostet eine Datei und keine Zeile in den Generatoren.

**Was bewusst nicht in den Vertrag wandert:** Temperatur, Werkzeuge, Streaming,
Bildgrößen jenseits des Seitenverhältnisses. Nichts davon wird hier gebraucht,
und ein Vertrag, der jede Fähigkeit jedes Anbieters abbildet, ist keine
Abstraktion mehr, sondern eine Vereinigungsmenge.

**Drei Einstellungen statt einer**, weil es anders gar nicht ginge: Claude
erzeugt keine Bilder, Stability keinen Text. Eine app-weite Anbieterwahl hätte
die einzige sinnvolle Kombination unmöglich gemacht.

**Stability bleibt für Bilder wählbar**, obwohl die Vorgabe „Gemini/ChatGPT/
Claude, kein Provider darüber hinaus" lautet. Der Grund: Claude fällt für Bilder
ganz aus, ChatGPT ist im Web nachweislich unbrauchbar (AE-27), und von Gemini
ließ sich ohne bezahlten Schlüssel **nichts** belegen (AE-26). Die Bild-Gruppe
hätte dann keinen einzigen Anbieter mehr gehabt, dessen Weg tatsächlich gemessen
ist — ein Rückschritt hinter Phase 5. Stability ist kein vierter *neuer*
Anbieter, sondern der Bestand, und das Abnahmekriterium „bestehende
Stability-Generatoren laufen unverändert weiter" wäre ohne ihn sinnlos.
**Das ist eine bewusste Auslegung der Vorgabe und keine Nachlässigkeit — wer es
strikt will, streicht einen Eintrag in `PROVIDER_INFO`.**

**Modellname als Freitext, ohne jede Prüfung** (Pflicht 5). Kein Katalog im
Code: der wäre beim nächsten Modellwechsel falsch, und zwar auf die schlimmste
Art — indem er ein gültiges Modell ablehnt. Ein leeres Feld nimmt den Vorschlag
des Anbieters. Bei Stability füllt der Name den **Pfad** (`…/generate/core`),
bei Gemini ebenfalls (`…/models/{name}:generateContent`) — dort wird er kodiert,
damit ein Tippfehler mit Schrägstrich keine fremde Adresse baut. Ein
Anbieterwechsel zieht den Modellnamen mit: `claude-opus-5` an Gemini zu
schicken ergäbe nur einen Fehlschlag, den niemand mit dem Wechsel in Verbindung
brächte.

**Die Voreinstellungen bleiben, was bisher lief** — Claude für Text, Stability
für Bilder. Ein Umbau, der die Anbieterwahl bringt und dabei still den Standard
verschiebt, wäre eine Falle für alle, die nichts umstellen. Ein Test prüft das
mit, samt der Endpunktadresse aus AE-13.

**Statt eines Aufklappfeldes eine Knopfreihe.** Die Vorgabe sagt „Dropdown".
React Native hat kein plattformweites Aufklappfeld; ein echtes bräuchte eine
neue Abhängigkeit oder eine eigene Umsetzung je Plattform, und `@expo/ui` ist
nativ-only, also im Web-Build — der einzigen bisher prüfbaren Umgebung (B-2) —
nicht zu gebrauchen. Bei drei bis vier Möglichkeiten ist eine Reihe ohnehin die
bessere Bedienung: alles gleichzeitig sichtbar, ein Tipp statt zwei, und es ist
dasselbe Muster wie bei Umfang und Lernrichtung, das Phase 9 bereits auf
Tippziele und Fokus geprüft hat.

**Schlüsselablage** folgt unverändert AE-10 und gilt jetzt für vier Anbieter
statt für zwei. Der Ablagename für Claude bleibt `anthropic-api-key`: er heißt
seit Phase 4 so und liegt auf den Geräten der Nutzer im Keychain. Ihn zur
Sauberkeit umzubenennen, würde einen dort gespeicherten Schlüssel unauffindbar
machen — die App fragte kommentarlos erneut danach, und der alte Eintrag bliebe
für immer liegen. Ein Test hält den Namen fest.

### AE-29 — `aria-checked` wird direkt gesetzt, weil React Native Web es nicht übersetzt

**Entscheidung:** Auswahlknöpfe tragen `accessibilityRole="radio"` **und**
`aria-checked` als eigenes Attribut; sie stehen in einer `ChoiceRow` mit
`radiogroup`. Ein Knopf ohne `selected` bleibt eine gewöhnliche Aktion mit
`role="button"`.

**Begründung — im Web-Build im DOM nachgemessen:** Der bestehende `Button` gab
seinen Zustand über `accessibilityState={{ selected }}` an. Im gerenderten DOM
stand davon **nichts** — weder `aria-selected` noch sonst ein Attribut. Die
gewählte Möglichkeit war nur an ihrer Umrandung zu erkennen: für Sehende
sichtbar, für einen Screenreader unsichtbar. Der zweite Versuch über
`accessibilityRole="radio"` plus `accessibilityState={{ checked }}` erzeugte zwar
`role="radio"`, aber weiterhin kein `aria-checked` — und ein `radio` ohne
`aria-checked` ist schlechter als gar keins, weil die Rolle einen Zustand
verspricht, den niemand abfragen kann. Erst das direkt gesetzte Attribut kam an:
nachgemessen **18 von 18** Auswahlknöpfen mit `aria-checked`, davon genau sieben
auf `true` — einer je Gruppe. Kein Aktionsknopf hat dabei fälschlich eine
Radio-Rolle bekommen.

**Betroffen war nicht nur das Neue.** Umfang (Phase 4) und Standard-Lernrichtung
(Phase 6) hatten dasselbe Problem, seit es sie gibt. Die Prüfung in Phase 9 hat
Beschriftung, Tippziel und Fokus gemessen — den **Zustand** hat sie nicht
gemessen, und deshalb ist er durchgerutscht. Das ist die Lehre daraus: „Label
vorhanden" ist nicht dasselbe wie „Zustand ablesbar".

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
zum dünnen Adapter geschrumpft; **alle 23 Tests aus Phase 4 laufen unverändert
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

### 2026-08-31 — Phase 6: Bidirektionalität & Curriculum-Differenzierung

**Ausgangslage, ehrlich benannt**

Ein großer Teil dieser Phase war schon da, ohne dass sie je so hieß: getrennte
Situationssätze je Richtung mit richtungsspezifischen Korrektur-Hinweisen
(AE-11), deutsche Grammatikdaten an jeder Vokabel (Phase 2), richtungsabhängige
Bildanzeige (Phase 5). Die tatsächliche Lücke war eine andere: es gab **nur
Karteikarten**. Die beiden Zielgruppen scheitern an ganz verschiedenen Stellen,
aber geübt wurde für beide dasselbe.

**Gemacht**

- `src/lib/drills/` — `types.ts` (Übungstypen, Zuordnung zur Richtung),
  `questions.ts` (die drei Aufgabenbauer), `session.ts` (Runde
  zusammenstellen, auswerten), `random.ts` (aussaatbarer Zufall).
- `src/lib/profile.ts` — Lernprofil nach AE-17.
- `components/drill-runner.tsx` — die Übungsrunde.
- Lernen-Reiter umgebaut: Umschalter zwischen Karteikarten und den Übungen der
  jeweiligen Richtung, Standard-Richtung setzen und aufheben an Ort und Stelle.
- Einstellungen: Karte „Standard-Lernrichtung".
- Fortschritt: eigene Kachel „Heute geübt", gestapeltes Diagramm mit Legende,
  Übungen in der Gesamtbilanz.
- `review-log.ts` um `drills`/`drillsCorrect` und `dayIsActive` erweitert;
  `audio.ts` um `isLanguageAvailable`.

**Die drei Übungen — je Richtung eine andere Schwachstelle**

| Richtung | Übung | Woher die Daten | Warum gerade das |
| --- | --- | --- | --- |
| `de_to_th` | **Töne hören** | `syllables[0].tone` | Der Ton trägt Bedeutung und ist im Deutschen kein Merkmal. Wer ihn nicht hört, kann ihn nicht sprechen. |
| `th_to_de` | **Artikel** | `germanNoun.article` | Thai hat keine Artikel. Das Genus ist im Deutschen nicht ableitbar, sondern gehört zum Wort. |
| `th_to_de` | **Stammformen** | `germanVerb` | Thai konjugiert nicht. „haben" gegen „sein" im Perfekt ist eine eigene Fehlerquelle. |

Nichts davon braucht neue Inhalte: 69 der 84 Einträge sind einsilbig (alle fünf
Töne kommen vor), 29 sind Substantive, 20 sind Verben.

**Drei Entscheidungen im Detail, die leicht anders hätten ausfallen können**

1. **Die Ton-Übung nimmt nur einsilbige Wörter.** Bei สวัสดี hätte die Frage
   „welchen Ton?" gar keine richtige Antwort — das Wort ist tief-tief-mittel.
   Und nach einer *einzelnen* Silbe zu fragen geht auch nicht, weil sich die
   Silbengrenze in der Thai-Schrift nicht verlässlich bestimmen lässt (AE-8).
   Ein Test hält fest, dass mehrsilbige Wörter gar nicht erst angeboten werden.
2. **Vor der Antwort ist bei der Ton-Übung nichts zu sehen** — weder die
   Thai-Schrift (sie trägt das Tonzeichen) noch die Bedeutung (dann ließe sich
   die Antwort aus dem Gedächtnis holen, statt sie zu hören). Nur Ton, und
   beliebig oft wiederholbar.
3. **Kein Ablenker ist erfunden.** Jede falsche Antwort ist eine echte Form aus
   derselben geprüften Datei oder eine mechanische Ableitung, die garantiert
   falsch ist (vertauschtes Hilfsverb). Ein ausgedachtes Partizip wäre dasselbe
   Problem wie ein ausgedachter Ton: Lernende sehen es, und Falsches prägt sich
   mit ein. Ein Test prüft das für **jedes** Verb im Bestand.
   Das vertauschte Hilfsverb ist dabei immer dabei, weil man die Aufgabe sonst
   lösen könnte, ohne je über „hat" gegen „ist" nachzudenken.

**Fehlende Thai-Stimme: benannt statt stumm**

Die Ton-Übung hängt an der Sprachausgabe des Geräts. `isLanguageAvailable`
liefert deshalb **drei** Antworten, nicht zwei: ja, nein und **„weiß ich
nicht"**. Manche Plattformen geben eine leere Stimmenliste zurück, obwohl TTS
läuft; daraus „keine Thai-Stimme" zu schließen, würde die Übung auf Geräten
sperren, auf denen sie funktioniert. Gewarnt wird nur bei einem eindeutigen
Nein. Im Testbrowser war genau das der Fall — drei Stimmen, alle `de-DE` —, und
der Hinweis erschien korrekt. Sobald der Content-Schritt echte Clips liefert,
verbessert sich die Übung von selbst: `playPronunciation` bevorzugt Clips vor
TTS, ohne dass an der Übung etwas geändert werden muss.

**Die beiden offenen Fragen, entschieden**

- **FSRS?** Nein, bewusst nicht — Begründung in **AE-16**. Die Übungen wählen
  ihre Aufgaben aber über den vorhandenen FSRS-Zustand aus und werden im
  Tagesprotokoll getrennt gezählt.
- **Standard-Richtung im Profil?** Ja, aber nur ausdrücklich gesetzt und
  jederzeit widerrufbar — Begründung in **AE-17**.

**Verifiziert**

- `npm test` → **322 Tests grün** in 11 Suites (vorher 275). `npx tsc --noEmit`
  fehlerfrei.
- **Im Browser durchgespielt:** Ton-Übung (Antwort „Tief" auf สี่ → „✓ Richtig",
  Auflösung `สี่ · sìi — vier`, „Tiefer Ton."), Artikel-Übung mit falscher
  Antwort (`___ Kaffee`, „die" gewählt → „✗ Nicht ganz", richtige Antwort grün
  umrandet, „der Kaffee · Plural: die Kaffees"), Stammformen (`machen` mit den
  Antworten „ist gemacht", „ist gekommen", „hat gemacht", „hat zugehört").
- **Standard-Richtung:** gesetzt, danach vollständig neu geladen → `/review`
  startet direkt in der gemerkten Richtung; „Richtung wechseln" führt trotzdem
  zur Auswahl, die den Standard als solchen markiert; in den Einstellungen
  steht dieselbe Wahl.
- **Fortschritt nach zwei Übungsaufgaben:** „Heute wiederholt 0 · Heute geübt 2
  · Tage in Folge 1", Diagramm mit getrennter Übungsfarbe, Bilanz „0
  Wiederholungen und 2 Übungsaufgaben, davon 1 richtig". Der Tag zählt als
  Lerntag, obwohl keine einzige Karte bewertet wurde — genau die Folge aus
  AE-16.
- Layout bei 375 px geprüft (die fünf Tonknöpfe brechen auf 2+2+1 um).
- Die Abnahmedaten wurden danach wieder entfernt.

**Offen**

- **B-2** (Gerätecheck in Expo Go) und **B-4** (Bilder-Probelauf mit gültigem
  Stability-Schlüssel) sind beide weiterhin offen — vom Nutzer bestätigt.
  Für Phase 6 kommt hinzu: Die Ton-Übung ist **im Browser** nur insoweit
  geprüft, wie es dort geht — dieser Browser hat keine Thai-Stimme, es war also
  der Warnpfad, der lief, nicht der Hörpfad. Ob eine Thai-TTS-Stimme die Töne
  brauchbar wiedergibt, lässt sich erst am Gerät beurteilen und gehört zu B-2.

### 2026-08-31 — Phase 7: Prüfungsmodul

**Zuerst die Recherche — sie hat das Schema bestimmt, nicht umgekehrt**

Beide vorgegebenen Seiten liefern über `WebFetch` **HTTP 403**. Abgerufen wurden
sie deshalb über den echten Browser, am **2026-08-31**:

| Seite | Was sie hergab |
| --- | --- |
| `goethe.de/ins/th/de/spr/prf.html` | Prüfungsangebot A1–C2, dazu TestDaF und Goethe-Test PRO; je Stufe getrennt für Jugendliche und Erwachsene |
| `…/prf/gzsd1/inf.html` | Struktur **A1: Start Deutsch 1** |
| `…/prf/gzsd2/inf.html` | Struktur **A2** |
| `…/prf/gzb1/inf.html` | Struktur **B1** |
| `goethe.de/ins/th/de/spr/tsd.html` | Einstufungstest — der Inhalt steckt in einem `iframe` auf `goethe.de/lrn/pro/30-item/m/de/index.html` |

Die erhobene Struktur (wörtlich übernommen, Belege stehen im Code an jedem
Zertifikat):

| | A1: Start Deutsch 1 | A2 | B1 |
| --- | --- | --- | --- |
| Teile heißen | Prüfungsteile | Prüfungsteile | **Module**, einzeln ablegbar |
| Lesen | 25 Min | etwa 30 Min | 65 Min |
| Hören | 20 Min | etwa 30 Min | 40 Min |
| Schreiben | 20 Min | etwa 30 Min | 60 Min |
| Sprechen | 15 Min, **Gruppenprüfung** | 15 Min | etwa 15 Min, **Paarprüfung** |
| Alter empfohlen | ab 16 | ab 16 | Jugendliche ab 12, Erwachsene ab 16 |
| Unterrichtseinheiten | 80–200 | 200–350 | 350–650 |

**Der Einstufungstest, Aufgabe für Aufgabe durchgeklickt.** Die URL sagt
`30-item`; die Einleitung nennt als Gegenstand „wie gut Sie schriftliche und
mündliche deutsche Texte verstehen und wie gut Ihre Grammatik- und
Wortschatzkenntnisse schon sind". Beobachtet wurden diese Formate, in dieser
Reihenfolge: Zeitungsanzeige mit drei A/B/C-Fragen → Hörgespräch (echte
mp3-Datei) mit Richtig/Falsch → Kaufhaus-Wegweiser als Zuordnung → Radio-Ansage
mit A/B/C → „Welche Anzeige passt zu der Situation?" → Kommentare mit
Zuordnung → Pressetext mit A/B/C → Hörtext mit Richtig/Falsch → **Lückentext**
(„Rekonstruieren Sie den Text, indem Sie die fehlenden Wörter ergänzen"). Die
Schwierigkeit steigt sichtbar von einer Bahn-Anzeige bis zu „Erkenntnisse aus
der Stressforschung". Daraus stammen die vier Aufgabenformate im Schema —
`multipleChoice`, `trueFalse`, `matching`, `gapFill`.

**Gemacht**

- `src/lib/exam/types.ts` — die drei Zertifikate als Daten samt Quelle und
  Abrufdatum, dazu das `ExamModule`-Schema als **unterscheidende Union**:
  bewertbare Aufgaben tragen `items`, freie Aufgaben `production`. Der Typ
  zwingt die Oberfläche, beide Fälle zu behandeln, statt eine Punktzahl für
  einen freien Text zu erfinden.
- `src/data/exam-modules.ts` — **acht mitgelieferte Aufgaben**, alle vier
  Fertigkeiten und alle fünf Formate abgedeckt, auf A1 und A2.
- `src/lib/exam/session.ts` — Übersicht je Stufe und Fertigkeit, Auswertung.
- `src/lib/exam/{plan,generator,batch}.ts` — zusätzliche Lese- und Höraufgaben
  über die **schon vorhandene** Batch-Infrastruktur.
- `src/app/exam.tsx` + `components/exam-runner.tsx`, neuer Reiter **Prüfung**
  in beiden Navigationen.
- Einstellungen: dritte Generator-Karte.

**Inhalt aus Vorhandenem, und wo das aufhört**

Die Texte sind aus dem deutschen Teil des geprüften Vokabel-Grundstocks
zusammengesetzt — Markt, Obst, Gemüse, Fisch, Laden, Schule, Arzt, Auto,
Kaffee, Tee —, ergänzt um elementare Funktionswörter, Uhrzeiten und
Eigennamen, ohne die eine Anzeige keine Anzeige wäre. Dieselbe Ehrlichkeit wie
bei den Beispielsätzen aus Phase 2: die einzelnen Wörter sind gedeckt, die
Sätze als Ganzes sind nicht einzeln gegen eine Quelle geprüft. Und ausdrücklich
im UI: **es sind keine Originalaufgaben und keine Modellsätze** des
Goethe-Instituts.

Für den Hörteil war kein neues Material nötig — die Skripte werden über die
Aussprache-Abstraktion aus Phase 3 vorgelesen (`de-DE`). Das Skript ist vor dem
Auswerten **nicht** zu lesen, danach schon, weil man es zum Nachvollziehen der
eigenen Fehler braucht.

**Batch-Infrastruktur zum dritten Mal benutzt, nicht neu gebaut**

`runExamBatch` ist ein Adapter über demselben Läufer wie Sprachsituationen und
Bilder. Die vier Robustheitsregeln stehen weiterhin an genau einer Stelle. Neu
ist nur die Sammlung `exam` — und die Regel, dass **Löschen die mitgelieferten
Aufgaben nicht anfasst**: sie sind Teil der App und müssen ohne Schlüssel und
ohne Netz da sein.

**Ein echter Fehler, den erst ein Test gefunden hat**

Die mitgelieferten Aufgaben wurden anfangs nur eingespielt, wenn die Sammlung
`exam` **komplett leer** war. Wer auf einem frischen Gerät zuerst Aufgaben
erzeugt und erst danach den Prüfungs-Reiter öffnet, hätte deshalb nie die
mitgelieferten bekommen — dauerhaft. Geprüft wird jetzt, ob die
**mitgelieferten IDs** vorhanden sind, nicht ob die Sammlung leer ist.

**Verifiziert**

- `npm test` → **365 Tests grün** in 12 Suites (vorher 322). `npx tsc --noEmit`
  fehlerfrei. Die Tests prüfen unter anderem, dass jedes Zertifikat eine
  `https`-Quelle und ein Abrufdatum trägt, dass die erhobenen Dauern
  unverändert im Code stehen, dass in **jeder** bewertbaren Aufgabe der
  `correctIndex` auf eine tatsächlich vorhandene Option zeigt (der
  gefährlichste denkbare Fehler: die Aufgabe wäre nie lösbar), und dass der
  Generator eine Antwort mit `correctIndex` außerhalb der Optionen ablehnt.
- **Im Browser durchgespielt:** Hörverstehen A1 (3/3 richtig, Skript erst nach
  dem Auswerten sichtbar, Begründung je Aufgabe), Leseverstehen A1 mit Anzeige,
  Sprechen A1 (Aufgabe, Leitpunkte, Musterlösung mit Vorlesetaste,
  Selbstkontrolle). B1 zeigt korrekt die Modul-Formulierung und für alle vier
  Fertigkeiten „noch keine Aufgabe".
- **Echter Lauf durch den Netzwerkpfad**, aus der Oberfläche heraus mit
  absichtlich ungültigem Schlüssel: 8 von 8 verarbeitet, 0 erzeugt, 8
  fehlgeschlagen, jeder Fehlschlag mit ID und
  `401 … authentication_error … API key is invalid`, **0 Aufgaben gespeichert**
  — der Bestand blieb bei den acht mitgelieferten.
- Layout bei 375 px geprüft.

**Offen**

- **B-2** (Gerätecheck in Expo Go) und **B-4** (Bilder-Probelauf mit gültigem
  Stability-Schlüssel) sind beide weiterhin offen — am selben Tag vom Nutzer
  bestätigt.
- Für **B1** gibt es keine Aufgaben. Das ist kein Versehen: B1-Material
  bräuchte B1-Wortschatz, und der Grundstock trägt A1/A2. Der Reiter sagt das.
- Die **Durchführungsbestimmungen** (Punkteverteilung, Bestehensgrenzen) sind
  nicht erhoben. Solange das so ist, gibt es hier bewusst keine Bewertung
  „bestanden/nicht bestanden" — siehe AE-20.

### 2026-09-01 — Phase 8: Build & Distribution

**Was ich selbst machen konnte — und wo die Wand steht**

Der Web-Export ist fertig und geprüft. Alles, was EAS betrifft, ist vorbereitet,
aber **nicht ausgeführt**: EAS verlangt ein Expo-Konto, und der Nutzer hat
keines. Das ist nicht vermutet, sondern gemessen:

```
$ npx eas-cli@latest whoami
Not logged in

$ npx eas-cli@latest config --platform android --profile preview
An Expo user account is required to proceed.
Either log in with eas login or set the EXPO_TOKEN environment variable
```

Bemerkenswert daran: Selbst das bloße **Anzeigen** der Konfiguration verlangt
ein Konto. Es gibt also keinen Teil von EAS, den ich stellvertretend prüfen
könnte. Fremde Konten lege ich nicht an — dieselbe Linie wie bei den
API-Schlüsseln in Phase 4, 5 und 7.

**EAS-Kosten, am 2026-09-01 nachgesehen** (nicht aus altem Wissen), von
`expo.dev/pricing` und der maschinenlesbaren Fassung `expo.dev/pricing.md`:

| Tarif | Preis | Build-Guthaben | Warteschlange |
| --- | --- | --- | --- |
| **Free** | 0 $/Monat | **15 Android- und 15 iOS-Builds** | niedrige Priorität |
| Starter | 19 $/Monat + Nutzung | 45 $ Guthaben | hohe Priorität |
| Production | 199 $/Monat + Nutzung | 225 $ Guthaben | hohe Priorität, 2 Nebenläufigkeiten |
| Enterprise | individuell | 1 000 $ Guthaben | 5 Nebenläufigkeiten |

Der freie Tarif enthält außerdem 60 Minuten CI/CD-Workflows, Einreichung in die
App-Stores und Updates an 1 000 aktive Nutzer im Monat. **Für dieses Projekt
reicht der freie Tarif**: 15 Android- und 15 iOS-Builds sind für ein paar
Testdurchläufe reichlich. Eine Einschränkung, die die Seite nicht ausspricht:
ob die 15 Builds monatlich zurückgesetzt werden oder einmalig sind, steht dort
nicht — sie stehen in der Vergleichstabelle in derselben Zeile wie das
monatliche Guthaben der Bezahltarife („Build credit"). Wer viel bauen will,
sollte das im Konto selbst nachsehen.

**Gemacht**

- `eas.json` mit drei Profilen — `development` (Dev-Client, APK, iOS-Simulator),
  `preview` (APK, iOS-Simulator, interne Verteilung), `production` (AAB,
  `autoIncrement`). `cli.appVersionSource: "remote"`, weil EAS damit
  `versionCode` und `buildNumber` selbst hochzählt und doppelte Uploads
  verhindert. Begründung zu APK/AAB in **AE-21**, zu iOS in **AE-22**.
- `app.json` um die beiden Angaben ergänzt, **ohne die EAS gar nicht baut**:
  `android.package` und `ios.bundleIdentifier`, beide
  `com.thailernbegleiter.app`.
- `expo-dev-client` installiert — ohne das Paket kann das `development`-Profil
  nicht bauen.
- Web-Export erzeugt und aus einem gewöhnlichen statischen Server geprüft.

**Der Web-Export, geprüft**

`npx expo export --platform web` erzeugte **8 statische Routen** (`/`, `/review`,
`/conversation`, `/exam`, `/progress`, `/settings`, `/_sitemap`, `/+not-found`)
und 3,1 MB in `dist/`. Der Haupt-Bundle wiegt 2,5 MB; die Bildablage liegt
erwartungsgemäß als **eigene Datei** daneben
(`blob-backend-….js`, 1,4 KB) — das verzögerte Laden aus Phase 5 funktioniert
also auch im Export und nicht nur im Dev-Server.

Danach aus einem schlichten statischen Server ausgeliefert (kein Metro, kein
Dev-Server): Prüfungsmodul und Artikel-Übung liefen vollständig, **keine
Konsolenfehler**. Zur Wurzel-/Unterverzeichnis-Frage siehe **AE-23**.

**Icons und Splash: noch die Platzhalter aus dem Template**

Nachgesehen statt vermutet. `assets/images/` enthält unverändert den
Bildersatz des Expo-Templates — `icon.png`, `splash-icon.png`,
`android-icon-foreground/background/monochrome.png`, dazu `expo-logo.png`,
`react-logo.png`, `expo-badge.png`. Auch `assets/expo.icon/` (Apples neues
`.icon`-Bündelformat, auf das `ios.icon` zeigt) ist das Expo-Symbol. Der
Splash-Screen läuft über `expo-splash-screen` mit `#208AEF` und demselben
Platzhalterbild.

Das ist **kein Fehler und kein Auftrag dieser Phase**, aber es gehört benannt:
Ein Build mit diesen Dateien trägt das Expo-Logo als App-Symbol. Für einen
Testbuild ist das gleichgültig, für eine Store-Einreichung nicht.

**Bundle-Identifier: einmal gewählt, dann festgenagelt**

`com.thailernbegleiter.app` ist gesetzt, weil ohne ihn gar nichts baut. Er ist
aber eine Entscheidung, die der Nutzer vor dem **ersten Store-Upload**
bestätigen sollte: Nach der Veröffentlichung lässt sich weder der
Android-`package` noch der iOS-`bundleIdentifier` ändern, ohne dass daraus eine
neue App wird. Üblich ist eine Umkehrung einer Domain, die einem selbst gehört.

**Der Weg zum Android-Testbuild — für den Nutzer**

```bash
npm install --global eas-cli
```

```bash
eas login
```

```bash
eas build --platform android --profile preview
```

Der erste Build fragt nach einem Android-Keystore; „Generate new keystore"
bestätigen, EAS verwahrt ihn. Danach liefert EAS eine Adresse mit QR-Code — auf
dem Handy öffnen, APK laden, installieren (Android fragt einmal nach
„Installation aus unbekannten Quellen"). Das ist eine **installierte App**,
kein Expo Go: die SDK-Versionsfrage, an der B-2 hing, stellt sich damit nicht
mehr.

Für iOS im Simulator:

```bash
eas build --platform ios --profile preview
```

Das braucht **kein** Apple-Konto (AE-22), liefert aber ein Simulator-Abbild,
das nur auf einem Mac mit Xcode läuft. Ein Build fürs echte iPhone braucht das
Apple Developer Program.

**Vorab-Prüfung statt Warten — und sie hat zwei echte Fehler gefunden**

Ein Build ließ sich nicht anstoßen, aber die Konfiguration **prüfen** ging sehr
wohl, und zwar ohne jedes Konto. Zuerst wurde erwogen, lokal zu bauen
(`expo prebuild` + Gradle braucht kein EAS): auf diesem Rechner ist aber weder
ein JDK noch das Android-SDK installiert (`java: command not found`,
`ANDROID_HOME` nicht gesetzt), und mehrere Gigabyte Werkzeugkette ungefragt
nachzuinstallieren ist keine Nebensache dieser Phase. Stattdessen zwei
Prüfungen, die beide ohne Konto und ohne SDK laufen:

**1. `npx expo-doctor` — 20 von 21 Prüfungen bestanden.** Die eine, die fiel:

```
✖ Check that required peer dependencies are installed
Missing peer dependency: expo-asset — Required by: expo-audio
Your app may crash outside of Expo Go without this dependency.
```

Das ist genau der Fehler, den ein erster Build gekostet hätte: „outside of Expo
Go" ist die native App, also alles, was diese Phase baut. `expo-asset` ist jetzt
installiert, `expo-doctor` meldet **21 von 21**.

**2. `npx expo prebuild --platform android` — das native Projekt erzeugt sich
sauber.** Damit ließ sich nachsehen, was ein Build tatsächlich enthalten würde:
`applicationId 'com.thailernbegleiter.app'` sitzt richtig, und die
Schlüsselablage aus AE-10 ist nativ verdrahtet
(`android:fullBackupContent="@xml/secure_store_backup_rules"`).

Dabei fiel das Zweite auf: **die App hätte die Mikrofon-Berechtigung verlangt.**
Im Manifest standen `RECORD_AUDIO`, `FOREGROUND_SERVICE` und
`FOREGROUND_SERVICE_MEDIA_PLAYBACK` — alle drei von `expo-audio`, das sie
standardmäßig setzt. Diese App **nimmt nie etwas auf**; sie spricht nur Wörter
vor. Eine Vokabel-App, die beim Start nach dem Mikrofon fragt, ist für Nutzer
ein Warnsignal und für eine Store-Prüfung eine Rückfrage. Im Plugin
nachgesehen (`node_modules/expo-audio/plugin/build/withAudio.js`) gibt es genau
die passenden Schalter; in `app.json` gesetzt:

```json
["expo-audio", {
  "recordAudioAndroid": false,
  "microphonePermission": false,
  "enableBackgroundPlayback": false
}]
```

Danach sind alle drei aus dem Manifest verschwunden. `enableBackgroundPlayback`
ist mit abgeschaltet, weil die App ein Wort vorspricht, während man die Karte
ansieht — sie ist kein Musikspieler, der im Hintergrund weiterlaufen muss. Ein
Schalter, falls sich das je ändert.

**Was übrig bleibt, und woher es kommt** (nachverfolgt, nicht geraten):

| Berechtigung | Herkunft | Bewertung |
| --- | --- | --- |
| `INTERNET` | expo-file-system | nötig — Generatorläufe |
| `MODIFY_AUDIO_SETTINGS` | expo-audio | nötig fürs Vorlesen |
| `READ/WRITE_EXTERNAL_STORAGE` | expo-file-system (Bildablage, AE-14) | trägt `android:maxSdkVersion="32"`, wird ab Android 13 gar nicht mehr angefragt |
| `VIBRATE` | Expo-Vorlage | harmlos |
| `SYSTEM_ALERT_WINDOW` | Expo-Vorlage (`main`-Manifest) | vor einer Store-Einreichung anzusehen |

Das erzeugte `android/`-Verzeichnis wurde danach wieder **entfernt**: EAS
erzeugt es im Build selbst, und der Managed-Workflow soll die Wahrheit bleiben
statt eines eingecheckten Zwischenstands. `/android` und `/ios` standen dafür
schon seit Phase 0 in `.gitignore` (Block „generated native folders" aus der
Expo-Vorlage) — es war also nichts zu ergänzen. Die zwei Skripte, die
`prebuild` in `package.json` auf `expo run:*` umgestellt hatte, sind
zurückgesetzt.

**Verifiziert**

- `npx expo-doctor` → **21 von 21** Prüfungen bestanden.
- `npm test` → **365 Tests grün** in 12 Suites, `npx tsc --noEmit` fehlerfrei
  (Phase 8 hat keine Geschäftslogik angefasst).
- `eas.json` ist gültiges JSON; gegen die EAS-CLI prüfen ließ es sich nicht,
  weil dafür ein Konto nötig ist (siehe oben).
- Web-Export nach allen Konfigurationsänderungen erneut erzeugt, aus statischem
  Server ausgeliefert, App lief fehlerfrei.

**Für iOS gibt es auf diesem Rechner überhaupt keinen Weg — auch keinen lokalen**

Zur Vollständigkeit geprüft, damit die Frage nicht offenbleibt: Der
Android-Prebuild lief unter Windows durch und ließ sich auswerten (siehe oben).
Der iOS-Prebuild lehnt schon die Erzeugung ab:

```
$ npx expo prebuild --platform ios --no-install
⚠️  Skipping generating the iOS native project files.
   Run npx expo prebuild again from macOS or Linux to generate the iOS project.
CommandError: At least one platform must be enabled when syncing
```

Damit ist belegt, was vorher nur plausibel war: Für iOS gibt es keinen lokalen
Ersatzweg, mit dem sich irgendetwas ohne EAS prüfen ließe. Der Mac-Cloud-Weg
über EAS ist die einzige Möglichkeit, und die hängt am Konto.

**Entscheidung des Nutzers: die Phase wird so abgeschlossen**

Zwei der sechs Abnahmekriterien — der installierbare Android-Build und ein
iOS-Durchlauf über EAS — sind **nicht erfüllt**. Das ist kein Versehen und
keine Nachlässigkeit, sondern eine ausdrückliche Entscheidung.

Dem Nutzer wurden am 2026-09-01 drei Wege vorgelegt:

1. Kostenlosen Expo-Account anlegen und `eas login` ausführen (zwei Minuten);
   die Builds hätte ich danach selbst gestartet und verfolgt.
2. JDK und Android-SDK lokal installieren (~4 GB, 30–60 Minuten, mit
   Fehlerrisiko) und das APK ohne EAS mit Gradle bauen — iOS bliebe auch dann
   unmöglich, weil das macOS braucht.
3. Die Phase mit den zwei offenen Kriterien abschließen.

**Gewählt wurde Weg 3.** Damit gilt für die Übergabe: alles Vorbereitende ist
fertig und geprüft, aber **es ist nachweislich kein Build gelaufen**. Wer
später liest „Phase 8 abgeschlossen", muss das mitlesen — deshalb steht es hier
und nicht nur in der Blockerliste.

**Offen**

- **B-5 (neu): EAS-Konto anlegen und die Builds anstoßen.** Der einzige
  verbleibende Schritt dieser Phase; vom Nutzer bewusst zurückgestellt (siehe
  oben). Erst danach lässt sich sagen, dass ein Build tatsächlich durchgelaufen
  ist — ich habe die Konfiguration vorbereitet und vorab validiert, nicht den
  Build bewiesen.
- **B-2** bleibt formal offen, ist aber jetzt anders gelagert: Der
  Android-Weg über ein `preview`-APK umgeht Expo Go vollständig. Sobald B-5
  erledigt ist, schließt derselbe Schritt B-2 für Android mit. Für iOS bleibt
  B-2 offen, solange kein Apple-Konto da ist.
- **B-4** (Bilder mit gültigem Stability-Schlüssel) unverändert offen — am
  selben Tag vom Nutzer bestätigt.
- **App-Symbol und Splash** sind Template-Platzhalter. Vor einer
  Store-Einreichung zu ersetzen; ausdrücklich kein Auftrag dieser Phase.

### 2026-09-01 — Phase 9: QA & Abschluss

**Kein neues Feature. Drei Dinge — und alle drei haben etwas gefunden.**

**1. Barrierefreiheit**

*Kontrast, gerechnet:* Die WCAG-2.1-Formel steht ausgeschrieben in
`src/constants/tones.test.ts` und ist gegen die Normbeispiele geprüft
(Schwarz auf Weiß = 21:1, `#767676` auf Weiß gerade über 4,5). Ergebnis der
Erstmessung: **von 30 Kombinationen aus Tonfarbe und Untergrund bestanden 6.**
Die Tonfarben sind deshalb jetzt modusabhängig — Zahlen und Begründung in
**AE-24**.

*Icon-only-Knöpfe:* Ein Audit über alle 30 `Pressable` ergab genau **einen**
echten Fall — die kompakte Vorlesetaste am Beispielsatz. Ihr Label lautete
`"▶: สวัสดี ครับ"`, begann also mit dem Zeichen selbst; ein Screenreader hätte
„schwarzes rechtsweisendes Dreieck" angesagt. Jetzt
`"Beispielsatz anhören: สวัสดี ครับ"`, im Browser nachgemessen. Alle übrigen
Knöpfe tragen sichtbaren Text, den Screenreader ohnehin vorlesen — ein
zusätzliches Label wäre dort Doppelung, keine Verbesserung.

*Tippziele:* Im Web-Build gemessen. Drei reine Textknöpfe waren **20 Pixel
hoch** und damit unter der Grenze von WCAG 2.2 (2.5.8, 24×24): „Richtung
wechseln", „Als Standard merken", „Übung verlassen". Auf 44 gesetzt; die
Nachmessung findet kein Element mehr unter 24, und die Vorlesetaste misst
jetzt 44×44.

*Tastatur — und eine Fehlmessung, die beinahe zu einer Falschmeldung geführt
hätte:* 15 von 15 Bedienelementen sind fokussierbar, Tab wandert der Reihe nach
durch, der Fokusring ist sichtbar (im Bildschirmfoto belegt), und sie rendern
als native `<button>` mit funktionierendem Klickpfad. Ein echter Enter-Druck
löste jedoch **nicht** aus — was wie ein Verstoß gegen WCAG 2.1.1 (Stufe A)
aussah, also schwerer als alles andere hier. Bevor ich das gemeldet habe, ein
Kontrollversuch: einen **ganz gewöhnlichen HTML-Knopf** ins Dokument gehängt,
fokussiert, denselben Tastendruck geschickt — er reagierte genauso wenig. Die
Grenze liegt also im Automatisierungswerkzeug, nicht in der App. Die
Auslösbarkeit per Tastatur bleibt damit **ungeprüft**, wird aber ausdrücklich
**nicht** als Fehler geführt.

**2. Fehlerbehandlung außerhalb der Batch-Pfade → AE-25**

Die Lücke war die Leserichtung: Beim Schreiben wird streng geprüft, beim Lesen
wurde blind vertraut. Ein leeres Dokument in `exam` oder `situations` beendete
den jeweiligen Reiter mit einer weißen Seite. Vorher nachgestellt, dann
geschlossen; 18 neue Tests decken die Fälle ab. Was schon robust war, wurde
nicht angefasst.

**3. Konsolidierte Abnahme gegen den jetzigen Stand**

Die Tabelle unten ist aus `.agent/state.json` **erzeugt**, nicht abgetippt.
Eigens nachgemessen wurde der Quergriff, den Phase 9 selbst gefährdet hat: Das
Phase-3-Kriterium zu den Silbenfarben war mit den **alten** Farben verifiziert.
Neu gemessen zeigt สวัสดี jetzt `rgb(138,155,177)` · `rgb(138,155,177)` ·
`rgb(136,160,131)` — tief-tief-mittel gilt weiterhin, mit den
Dunkelmodus-Fassungen. Genau dafür war die Anweisung da, gegen den *jetzigen*
Zustand zu prüfen.

**Nebenbei aufgeräumt**

`Collapsible` aus dem Expo-Template war nirgends eingebunden und zugleich das
einzige Bedienelement ganz ohne `accessibilityRole` — entfernt. Damit wurde
`expo-symbols` unbenutzt und ist ebenfalls raus. `expo-doctor` weiterhin 21/21.
Für die Jest-Konfiguration kam ein CSS-Platzhalter dazu, weil `theme.ts` die
`global.css` importiert und Jest sie nicht lesen kann.

**Verifiziert**

- `npm test` → **392 Tests grün** in 14 Suites (vorher 365). `npx tsc --noEmit`
  fehlerfrei. `npx expo-doctor` 21/21.
- Kontraste: als Test hinterlegt, nicht als Momentaufnahme.
- Im Browser nachgemessen: Bedienelemente, Fokus, Tippziele, Silbenfarben.

---

### 2026-09-03 — Phase 10: KI-Anbieter-Auswahl in den Einstellungen

**Vorbedingung: die offenen Blocker**

`PROGRESS.md` und `.agent/state.json` gelesen, Repo-Zustand geprüft (sauberer
Arbeitsbaum auf `main`, 392 Tests grün, `tsc` fehlerfrei — deckungsgleich mit
dem protokollierten Stand). Nach **B-2** (Gerätecheck), **B-4** (Bilder-Probelauf
mit gültigem Stability-Schlüssel) und **B-5** (EAS-Konto und Builds) wurde beim
Nutzer nachgefragt; bis zum Ende dieser Sitzung kam keine Antwort. **Alle drei
gelten deshalb weiterhin als offen**, und diese Phase ist unter dieser Annahme
gearbeitet worden. Das ist an einer Stelle spürbar: der Web-Build bleibt die
einzige Umgebung, in der sich überhaupt etwas messen lässt — die nativen Aussagen
unten sind entsprechend als ungeprüft gekennzeichnet.

**Gemacht**

- `src/lib/providers/` — die gemeinsame Naht (AE-28): `types.ts` (Anbieter,
  Fähigkeiten, Verträge `TextClient`/`ImageClient`), `text.ts` (Claude, ChatGPT,
  Gemini), `image.ts` (Stability, Gemini, ChatGPT), `http.ts` (ein POST mit
  JSON, ein gemeinsamer Fehlerleser für vier Fehlerformen), `settings.ts`
  (Anbieter und Modell je Generator-Gruppe in `meta/generators`).
- Die drei Generatoren rufen jetzt einen Vertrag statt einen Anbieter. Prompts,
  Parser, Bauplan und Batch-Läufer wurden **nicht angefasst**;
  `createAnthropicClient` und `createStabilityImageClient` bleiben als Aufruf
  erhalten, damit der Bestandsweg am Code ablesbar bleibt und nicht nur im
  Protokoll behauptet wird.
- `api-key.ts` von zwei auf vier Anbieter erweitert, Muster aus AE-10
  unverändert. Der Ablagename für Claude bleibt `anthropic-api-key`.
- `GeneratorCard`: Anbieterwahl, Modell-Freitextfeld, anbieterabhängiges
  Schlüsselfeld, Warnung im Web-Build. `ChoiceRow` als `radiogroup`.
- Einstellungs-Screen: drei Karten, drei getrennte Einstellungen, erklärender
  Fußtext mit dem Datum der Messung.

**Pflicht 2 — Gemini gemessen (AE-26)**

Text und **beide** Bildwege (`gemini-2.5-flash-image:generateContent` und
`imagen-4.0-generate-001:predict`) kommen aus dem Browser durch, mit dem
Schlüssel im Header wie als Query-Parameter. Genommen wurde der Header, weil
eine URL in Verlaufslisten und Protokollen landet. Der Preis: mit ungültigem
Schlüssel antwortet Google auf **alles** mit „API key not valid" — erfundenes
Modell, fehlendes Pflichtfeld, sogar ein GET auf die Modellliste. Vor dem ersten
bezahlten Aufruf ist damit weder Anfrage- noch Antwortform belegbar. Das steht
im Code, in den Fehlermeldungen und am Modellfeld im UI.

**Pflicht 1 — der bekannte Blocker, und was die Kontrollmessung ergab (AE-27)**

Nicht neu entdeckt, aber wie in AE-13 gegengeprüft — und die Gegenprobe
widersprach dem Protokoll: `POST` an OpenAI kam mit lesbarem 401 zurück. Der
erste echte Lauf über ChatGPT scheiterte trotzdem fünfmal. Zwei Verdächtige
wurden geprüft und **verworfen** (Anmeldedaten, Anfragekörper), der dritte war
es: Ein POST mit einem Schlüssel, der mit `sk-` beginnt, bekommt eine Antwort
ohne CORS-Header; mit `SK-` oder `xk-` kommt dieselbe Anfrage durch, und beim
GET greift die Regel gar nicht. Damit stimmt die Tabelle aus AE-13 genau, nur
die Deutung war zu grob — und die Konsequenz bleibt dieselbe, weil jeder echte
OpenAI-Schlüssel mit `sk-` beginnt. ChatGPT ist im Web-Build entsprechend
gekennzeichnet, nativ nicht.

**Pflicht 3 bis 5**

Abstraktion statt dritter Kopie (AE-28), Schlüsselablage je Anbieter nach dem
AE-10-Muster, Modellname als Freitext ohne Katalog. Ein leeres Modellfeld nimmt
den Vorschlag des Anbieters; ein Anbieterwechsel zieht den Modellnamen mit.

**Nebenbefund, der nicht Auftrag war (AE-29)**

Beim Nachmessen der neuen Auswahlreihe im DOM stellte sich heraus, dass
`accessibilityState={{ selected }}` in dieser React-Native-Web-Fassung **gar
kein** ARIA-Attribut erzeugt. Die gewählte Möglichkeit war für einen
Screenreader unsichtbar — und zwar nicht nur die neue Anbieterwahl, sondern auch
Umfang (Phase 4) und Standard-Lernrichtung (Phase 6). Behoben durch ein direkt
gesetztes `aria-checked` plus `radiogroup`; nachgemessen 18 von 18
Auswahlknöpfen mit Zustand, davon sieben auf `true`.

**Verifiziert**

- `npm test` → **437 Tests grün** in 15 Suites (vorher 392 in 14). Die 392 alten
  laufen unverändert — das ist der Regressionsnachweis auf Testebene.
- `npx tsc --noEmit` fehlerfrei.
- **Im Web-Build durchgespielt:** Alle drei Karten zeigen Anbieterwahl und
  Modellfeld. Umstellen wirkt sofort auf Modellvorschlag, Schlüsselplatzhalter
  und Beschriftung des Schlüsselfeldes („API-Schlüssel für Google"), und **nur**
  auf die eigene Gruppe. Ein eigener Modellname (`gemini-99-voellig-ausgedacht`)
  wird angenommen, in `meta/generators` abgelegt und übersteht ein vollständiges
  Neuladen. Die ChatGPT-Warnung erscheint genau dann, wenn ChatGPT gewählt ist.
- **Läufe durch den echten Netzwerkpfad, alle mit ungültigem Schlüssel:**

| Gruppe | Anbieter | Ergebnis |
| --- | --- | --- |
| Sprachsituationen | Gemini | 16/16 verarbeitet, 0 erzeugt, 16 × „HTTP 400: API key not valid. — INVALID_ARGUMENT" |
| Prüfungsaufgaben | Gemini | 8/8 verarbeitet, 0 erzeugt, Bestand bleibt bei 8 mitgelieferten |
| Bilder | ChatGPT | 5/5 verarbeitet, 0 erzeugt, 5 × „Keine Antwort von api.openai.com" mit CORS-Erklärung |
| Sprachsituationen | **Claude** (Bestand) | 16/16, 16 × „401 authentication_error — API key is invalid" — **wortgleich Phase 4/7** |
| Bilder | **Stability** (Bestand) | 5/5, 5 × „HTTP 401: authorization: invalid or missing header value" — **wortgleich Phase 5** |

  Nach jedem Lauf war der Bestand unverändert: 0 Situationen, 0 Bilder, 8
  Prüfungsaufgaben (die mitgelieferten), 0 davon erzeugt.
- Alle sechs Reiter nach dem Umbau aufgerufen, alle rendern; keine
  App-Konsolenfehler (die 400/401 in der Konsole stammen aus den Messungen).

**Offen / bewusst nicht gemacht**

- **Ob ein gültiger ChatGPT-Schlüssel im Browser durchkommt** (AE-27). Braucht
  einen echten Schlüssel; fremde gebe ich nicht ein. Ein Versuch könnte zudem
  berechnet werden, ohne dass die Antwort ankommt — das steht in der Warnung.
- **Anfrage- und Antwortform von ChatGPT und Gemini.** Beide prüfen den
  Schlüssel vor dem Rest, deshalb ließ sich nichts festklopfen — anders als bei
  Stability (AE-13). Die Parser nennen im Fehlerfall die gelieferten Feldnamen,
  damit ein Formwechsel sofort in der Fehlerliste steht.
- **Der native Weg** für alle vier Anbieter. Ohne CORS sollte dort mehr
  funktionieren als im Web, insbesondere ChatGPT — geprüft ist das nicht
  (**B-2**).
- **`max_completion_tokens` bei OpenAI.** Nicht messbar ohne gültigen Schlüssel;
  wenn die API sich beschwert, ist es genau diese eine Zeile in
  `providers/text.ts`, und das steht dort auch.

---

## Konsolidierte Abnahme (Stand 2026-09-03)

Jedes „Fertig, wenn" aus Phase 0–10 gegen den **jetzigen** Repo-Zustand.
**83 von 88 erfüllt; 5 offen, und alle 5 hängen an einer Handlung des
Nutzers** — an einem gültigen API-Schlüssel (B-4, B-6), einem Expo-Konto (B-5)
oder einem Gerät (B-2). Diese Tabelle ist **aus `.agent/state.json` erzeugt**,
nicht abgetippt; sie kann deshalb nicht still von der maschinenlesbaren
Fassung abweichen.

| Phase | Kriterium | Stand | Wie geprüft |
| --- | --- | --- | --- |
| 0 | npx expo start liefert klickbare Navigation zwischen Platzhalter-Screens im Browser | **erfüllt** | Alle fuenf Routen im Browser angeklickt und gerendert; zusaetzlich bei 375px Breite geprueft. |
| 0 | Gleiche Navigation in Expo Go auf dem Handy sichtbar | **erfüllt** | Vom Nutzer am Geraet bestaetigt (2026-08-30). |
| 0 | Git-Repo und PROGRESS.md angelegt | **erfüllt** | PROGRESS.md und .agent/state.json im Projekt-Root, Commits auf Branch main. |
| 1 | Unit-Tests fuer Retrievability und Review-Update gruen | **erfüllt** | npm test gruen; fsrs.test.ts prueft Formel, Monotonie, Grenzen, Lapses, Abstandseffekt. |
| 1 | Persistenz-Abstraktion fuer alle Datentypen | **erfüllt** | DataStore ueber vocab, cards, situations, exam, meta; Backends SQLite / AsyncStorage / Memory; gemeinsame Vertragspruefung. |
| 1 | Kartenzustand uebersteht App-Neustart auf Web | **erfüllt** | Im Browser bewertet, Seite neu geladen, Werte unveraendert. Backend: async-storage. |
| 1 | Kartenzustand uebersteht App-Neustart in Expo Go (SQLite-Pfad) | **erfüllt** | Vom Nutzer am Geraet bestaetigt (2026-08-30); Anzeige 'Speicher: expo-sqlite'. |
| 2 | 50-100 Eintraege, bidirektional vollstaendig, schema-konform | **erfüllt** | 84 Eintraege; vocabulary.test.ts prueft Anzahl, eindeutige IDs, Schema je Eintrag, Silbenzerlegung, deutsche Pflichtangaben je Wortart und Bidirektionalitaet. |
| 2 | Jeder Eintrag hat einen nachvollziehbaren sourceVerified-Stand, nicht pauschal true | **erfüllt** | 82 von 84 geprueft; die zwei Ausnahmen tragen den Grund in verificationNote. Ein Test erzwingt eine Quote >= 0.9 UND < 1, damit pauschales Abhaken auffliegt. |
| 2 | Skalierungsplan auf 1000 ausformuliert in PROGRESS.md | **erfüllt** | Abschnitt 'Skalierungsplan auf ~1000 Eintraege': Frequenzliste als Wortquelle, siebenstufiger Pruefschritt, bewusste Trennung vom Content-Generator aus Phase 4/5. |
| 2 | Tests und tsc weiterhin gruen | **erfüllt** | 154 Tests in 3 Suites gruen; npx tsc --noEmit fehlerfrei. |
| 3 | Vollstaendige Review-Session in beide Richtungen durchspielbar (Browser) | **erfüllt** | Im Browser beide Richtungen durchgespielt: aufdecken, bewerten, Karte wechselt weiter, Sitzungsabschluss. |
| 3 | Vollstaendige Review-Session am Geraet in Expo Go | **offen** | Blocker: B-2 - braucht das Geraet des Nutzers; betrifft jetzt auch Phase 5 (nativer Bildpfad). |
| 3 | Mehrsilbige Woerter zeigen unterschiedliche Tonfarben je Silbe | **erfüllt** | สวัสดี im DOM nachgemessen: sa=rgb(79,96,118) tief, wat=rgb(79,96,118) tief, dii=rgb(111,138,106) mittel. ThaiWord wertet syllables[] aus, tone nur als Fallback (per Test abgesichert). |
| 3 | Unverifizierte Eintraege sind erkennbar gekennzeichnet | **erfüllt** | VerificationBadge nur bei sourceVerified:false; im Browser mit นอน geprueft, Antippen klappt die verificationNote auf. |
| 3 | Dashboard zeigt beide Richtungen getrennt | **erfüllt** | Zwei Karten mit eigener Faelligkeitszahl; Test belegt, dass Bewertungen einer Richtung die andere nicht beeinflussen. |
| 3 | Layout auf Handy UND breitem Browser geprueft | **erfüllt** | 1280px: zwei gleich breite Spalten. 375px: untereinander, Bewertungsknoepfe brechen auf 2x2 um. Ungleiche Kartenbreiten (306/290 statt 343) gefunden und behoben. |
| 3 | Tests und tsc gruen | **erfüllt** | 187 Tests in 6 Suites gruen; npx tsc --noEmit fehlerfrei. |
| 4 | Lernstatistik-Screen zeigt echte Daten statt Platzhalter | **erfüllt** | Wiederholungen heute, Tagesserie, faellige Karten, Kartenzustaende und 14-Tage-Diagramm aus der Persistenzschicht; im Browser mit echten Bewertungen geprueft. |
| 4 | Einschraenkung der Statistik-Methode dokumentiert | **erfüllt** | AE-9; Hinweis steht im UI selbst ('Protokolliert seit ... Fruehere Sitzungen sind nicht enthalten'). |
| 4 | Teilausfall-Verhalten nachweislich getestet | **erfüllt** | Tests: Fehler mitten im Lauf (14 ok / 2 fehlgeschlagen, alle 16 angefasst), drei Fehler zu Beginn (13 bleiben gespeichert), Fortsetzen (12 uebersprungen), Abbruch (5 bleiben). Zusaetzlich echter Lauf mit ungueltigem Dummy-Schluessel: 16 Fehlschlaege, Batch lief durch, 0 gespeichert. |
| 4 | CORS-Header im Web-Build | **erfüllt** | Direkt gemessen: ohne Header 'TypeError: Failed to fetch', mit Header HTTP 401 mit JSON-Fehlerobjekt. dangerouslyAllowBrowser setzt genau diesen Header (im SDK-Quelltext nachgesehen). |
| 4 | Key-Speicherung plattformgerecht geloest und begruendet | **erfüllt** | AE-10: expo-secure-store hat auf Web die Implementierung 'export default {}'. Nativ Keychain, Web nur Arbeitsspeicher fuer die Sitzung; Weiche ueber isAvailableAsync() zur Laufzeit. |
| 4 | Situationen offline abspielbar (Neustart-Test) | **erfüllt** | Zwei Situationen im Schema eingespielt, Gespraech-Screen zeigt sie vollstaendig; nach komplettem Neuladen unveraendert vorhanden, ohne Schluessel und ohne Netzanfrage. |
| 4 | Testlauf mit echtem Schluessel (10-20 Situationen) | **erfüllt** | Vom Nutzer mit gueltigem Anthropic-Schluessel durchgefuehrt und bestaetigt (2026-08-31); die Zahlen des Laufs liegen nicht vor. |
| 4 | Tests und tsc gruen | **erfüllt** | 237 Tests in 9 Suites gruen; npx tsc --noEmit fehlerfrei. |
| 4 | Prompt-Vertrag geprueft (Antwortform passt zum Parser) | **erfüllt** | prompt-contract.test.ts: zwei ausformulierte Musterantworten je Richtung; prueft Zuglaenge, Sprecherwechsel, alle drei Sprachfassungen und richtungsspezifische Korrektur-Hinweise. Schliesst die einzige Luecke, die der Lauf mit ungueltigem Schluessel offenliess. |
| 5 | Bild-Pipeline nutzt die Batch-Infrastruktur aus Phase 4 statt einer Kopie | **erfüllt** | Der Laeufer steht jetzt einmalig in lib/generation/batch.ts (runBatch + BatchTask); conversation/batch.ts und images/batch.ts sind duenne Adapter. Alle 23 Tests aus Phase 4 laufen unveraendert weiter. Anmerkung: das Protokoll fuehrte plan.ts/batch.ts frueher als generisch - sie waren es nicht, sie sind es jetzt. |
| 5 | Anbieter gewaehlt und Browser-/CORS-Verhalten empirisch belegt | **erfüllt** | AE-13. Gemessen: POST an api.openai.com wird von CORS geblockt (GET nicht), POST an api.stability.ai kommt durch (401). Kontrollmessung an api.anthropic.com mit/ohne Header wie in Phase 4. dangerouslyAllowBrowser des openai-SDK setzt keinen Header - im Paket nachgesehen. |
| 5 | Anfrageform gegen die laufende API belegt, nicht geraten | **erfüllt** | Stability prueft Pflichtfelder und Enums vor der Authentifizierung; die API nannte die erlaubten Werte fuer output_format, aspect_ratio, seed und prompt selbst. Die vollstaendige gueltige Anfrage lief bis 401 durch, ein falscher Pfad gibt 404. |
| 5 | Speicherformat fuer Bilder begruendet geloest | **erfüllt** | AE-14: Metadaten in der Sammlung images, Bytes in eigener Ablage (nativ expo-file-system, Web IndexedDB). Grund nachgesehen: AsyncStorage-Web ist window.localStorage (~5 MB fuer alle Sammlungen zusammen); expo-file-system hat auf Web keine Umsetzung. |
| 5 | isConcrete-Gate testgesichert - Pipeline laeuft fuer abstrakte Eintraege gar nicht erst an | **erfüllt** | AE-15: drei Sperren plus Literaltyp isConcrete: true. Ein Test faehrt einen gefaelschten Auftrag durch den echten Batch: 0 Client-Aufrufe, 0 gespeichert, 1 Fehlschlag mit Begruendung. Ein zweiter mischt ihn unter vier echte - die vier laufen durch. |
| 5 | Kleiner Testlauf erfolgreich, danach offline abrufbar ohne Schluessel | **erfüllt** | 5 Bilder durch dieselbe Pipeline mit einem Ersatz-Client (echte WebP-Bytes): 5 erzeugt, 0 fehlgeschlagen; die IndexedDB enthielt die fuenf .webp-Eintraege, localStorage blieb bei 78 KB. Danach Dev-Server neu gestartet und Seite neu geladen: '5 von 25 Bildern', Schluesselfelder leer, Bilder auf den Karteikarten sichtbar. |
| 5 | Lauf durch den echten Netzwerkpfad (ungueltiger Schluessel) | **erfüllt** | Aus dem Web-Build: 5/5 verarbeitet, 0 erzeugt, 5 fehlgeschlagen mit 'HTTP 401: authorization: invalid or missing header value', 0 gespeichert. |
| 5 | Bild auf der Karteikarte, richtungsabhaengig | **erfüllt** | de_to_th: Bild schon auf der Vorderseite (verraet die thailaendische Form nicht). th_to_de: erst nach dem Aufdecken (waere sonst die Antwort). Eine abstrakte Karte zeigt kein Bild und keinen Platzhalter. Bei 375 px und im breiten Fenster geprueft. |
| 5 | Testlauf mit gueltigem Stability-Schluessel | **offen** | Blocker: B-4 - erfordert einen gueltigen API-Schluessel des Nutzers; fremde Schluessel gebe ich nicht ein. |
| 5 | Tests und tsc gruen | **erfüllt** | 275 Tests in 10 Suites gruen; npx tsc --noEmit fehlerfrei. |
| 6 | Je Richtung mindestens ein eigener Uebungstyp aus vorhandenen Daten | **erfüllt** | de_to_th: Ton-Erkennung aus syllables[0].tone (69 einsilbige Eintraege, alle fuenf Toene vertreten). th_to_de: Artikel aus germanNoun.article (29 Substantive) und Stammformen aus germanVerb (20 Verben). Keine neue Content-Generierung noetig. |
| 6 | Uebungen im Browser spielbar | **erfüllt** | Alle drei durchgespielt: Ton (Antwort 'Tief' auf สี่ -> richtig, Aufloesung 'sìi - vier'), Artikel (falsche Antwort -> richtige Option gruen umrandet, Plural in der Erklaerung), Stammformen ('machen' mit vertauschtem Hilfsverb und zwei echten Fremdformen als Ablenker). |
| 6 | Kein erfundener Ablenker | **erfüllt** | Test prueft fuer JEDES Verb im Bestand, dass jede falsche Antwort entweder eine echte Perfektform aus der Vokabeldatei oder die Form mit vertauschtem Hilfsverb ist. |
| 6 | Ton-Uebung nur fuer einsilbige Woerter | **erfüllt** | Bei mehrsilbigen Woertern hat jede Silbe ihren eigenen Ton (AE-7), und die Silbengrenze in der Thai-Schrift ist nicht bestimmbar (AE-8). buildToneQuestion wirft; Test deckt alle mehrsilbigen Eintraege ab. |
| 6 | FSRS-Integrationsfrage entschieden und begruendet | **erfüllt** | AE-16: Uebungen laufen NICHT durch FSRS (eine Erinnerungsspur je Item; Ratequote 20-33 % passt nicht zur Selbsteinschaetzungs-Skala; Kartenschluessel ist vocabId:direction). Sie waehlen ihre Aufgaben aber ueber den vorhandenen FSRS-Zustand und werden im Tagesprotokoll getrennt gezaehlt. Tests belegen, dass keine Karte angelegt oder veraendert wird. |
| 6 | Nutzerprofil-Frage entschieden und begruendet | **erfüllt** | AE-17: Standard-Lernrichtung im meta-Dokument 'profile', nur ausdruecklich gesetzt, jederzeit aufhebbar, Auswahl bleibt ueber 'Richtung wechseln' erreichbar. Im Browser geprueft: gesetzt, neu geladen, startet direkt in der Richtung; Auswahl weiterhin erreichbar und markiert den Standard. |
| 6 | Fehlende Thai-Stimme wird benannt statt stumm zu bleiben | **erfüllt** | isLanguageAvailable liefert ja/nein/weiss-nicht; gewarnt wird nur bei eindeutigem Nein, weil manche Plattformen eine leere Stimmenliste liefern. Im Testbrowser: drei Stimmen, alle de-DE, kein Thai - der Hinweis erschien korrekt. |
| 6 | Uebungen in der Statistik sichtbar, ohne die Wiederholungszahl zu verfaelschen | **erfüllt** | Eigene Zaehler drills/drillsCorrect, eigene Kachel, gestapeltes Diagramm mit Legende. Im Browser nach zwei Aufgaben: 'Heute wiederholt 0 - Heute geuebt 2 - Tage in Folge 1'. Ein Tag mit nur Uebungen zaehlt fuer die Serie mit. |
| 6 | Tests und tsc gruen | **erfüllt** | 322 Tests in 11 Suites gruen; npx tsc --noEmit fehlerfrei. |
| 7 | Reale Modulstruktur mit Quellenangabe erhoben und dokumentiert | **erfüllt** | Beide vorgegebenen Seiten liefern WebFetch HTTP 403; abgerufen ueber den echten Browser am 2026-08-31, dazu die drei Zertifikatsseiten gzsd1/gzsd2/gzb1 unter .../inf.html. Struktur woertlich im Code (lib/exam/types.ts) mit source und retrieved, sichtbar auch im UI. |
| 7 | Aufgabenformate beobachtet statt geraten | **erfüllt** | Einstufungstest (goethe.de/lrn/pro/30-item/, im iframe der tsd.html) Aufgabe fuer Aufgabe durchgeklickt: A/B/C-Auswahl, Richtig/Falsch mit echten mp3-Dateien, Zuordnung (Kaufhaus-Wegweiser, 'Welche Anzeige passt'), Lueckentext. Daraus die vier Formate im Schema. |
| 7 | ExamModule-Schema festgelegt und umgesetzt | **erfüllt** | Unterscheidende Union: bewertbare Aufgaben tragen items, freie tragen production. Der Typ zwingt die Oberflaeche, beide Faelle zu behandeln, statt fuer einen freien Text eine Punktzahl zu erfinden. ExamPart hat ein eigenes Feld approximate, weil A2 'etwa 30 Minuten' sagt und A1 '25 Minuten'. |
| 7 | Mindestens ein spielbares Beispiel je Fertigkeit und Aufgabentyp | **erfüllt** | Acht mitgelieferte Aufgaben decken Lesen, Hoeren, Schreiben und Sprechen sowie alle fuenf Formate auf A1 und A2 ab; Tests erzwingen beide Abdeckungen. Im Browser durchgespielt: Hoeren A1 (3/3, Skript erst nach dem Auswerten), Lesen A1, Sprechen A1 mit Musterloesung und Vorlesetaste. |
| 7 | Geltungsbereich begruendet entschieden | **erfüllt** | AE-19: Modul ist th_to_de. Ein Thai-Gegenstueck existiert (CU-TFL, Chulalongkorn), wurde aber nicht gebaut - die Primaerquelle war aus der Sitzung nicht erreichbar und die Sekundaerquellen widersprechen sich in der Stufenskala. Das Feld direction steht trotzdem im Schema. |
| 7 | Inhalt aus Vorhandenem, Batch-Infrastruktur wiederverwendet | **erfüllt** | Texte aus dem deutschen Teil des geprueften Grundstocks plus elementare Funktionswoerter; Hoerskripte ueber die Aussprache-Abstraktion aus Phase 3 (de-DE), also ohne neue Audio-Erzeugung. runExamBatch ist ein Adapter ueber demselben Laeufer wie Situationen und Bilder - dritter Nutzer, keine Kopie. |
| 7 | Lauf durch den echten Netzwerkpfad (ungueltiger Schluessel) | **erfüllt** | Aus der Oberflaeche heraus: 8/8 verarbeitet, 0 erzeugt, 8 fehlgeschlagen mit '401 authentication_error - API key is invalid', 0 gespeichert; der Bestand blieb bei den acht mitgelieferten Aufgaben. |
| 7 | Keine erfundene Bewertung | **erfüllt** | AE-20: Lesen und Hoeren werden ausgewertet, Schreiben und Sprechen bekommen Musterloesung und Selbstkontrolle statt einer Punktzahl. Nirgends eine Bestehensgrenze, weil die Durchfuehrungsbestimmungen nicht erhoben wurden - der Hinweis steht im UI. |
| 7 | Tests und tsc gruen | **erfüllt** | 365 Tests in 12 Suites gruen; npx tsc --noEmit fehlerfrei. |
| 8 | eas.json mit development/preview/production-Profilen | **erfüllt** | development (Dev-Client, APK, iOS-Simulator), preview (APK, iOS-Simulator, interne Verteilung), production (AAB, autoIncrement); cli.appVersionSource remote. Gueltiges JSON; gegen die EAS-CLI pruefbar erst nach Anmeldung. |
| 8 | app.json fuer EAS vollstaendig | **erfüllt** | android.package und ios.bundleIdentifier ergaenzt (com.thailernbegleiter.app) - ohne sie baut EAS gar nicht. expo-dev-client installiert, sonst kann das development-Profil nicht bauen. |
| 8 | APK/AAB-Wahl begruendet | **erfüllt** | AE-21: Testprofile bauen APK, weil ein AAB sich laut EAS-Dokumentation nicht direkt aufs Geraet installieren laesst; production bleibt beim AAB, weil Google Play das verlangt. |
| 8 | iOS-Weg ohne Apple-Konto gefunden und begruendet | **erfüllt** | AE-22: Simulator-Build (ios.simulator true). Die EAS-Dokumentation sagt woertlich, das gehe 'without needing to deploy to TestFlight or even having an Apple Developer account'. Ein Geraete-Build braucht weiterhin das Apple Developer Program. |
| 8 | EAS-Kontingente und Kosten aktuell nachgesehen | **erfüllt** | Am 2026-09-01 von expo.dev/pricing und expo.dev/pricing.md: Free 0 $/Monat mit 15 Android- und 15 iOS-Builds, niedrige Prioritaet, 60 min CI/CD, Updates an 1K MAUs; Starter 19 $, Production 199 $, Enterprise individuell. Fuer dieses Projekt reicht der freie Tarif. |
| 8 | Web-Export lauffaehig | **erfüllt** | npx expo export --platform web: 8 statische Routen, 3,1 MB in dist/, die Bildablage als eigene Datei (verzoegertes Laden aus Phase 5 funktioniert auch im Export). Aus einem schlichten statischen Server ausgeliefert - Pruefungsmodul und Artikel-Uebung liefen vollstaendig, keine Konsolenfehler. |
| 8 | WordPress-Anschluss bewusst offen gelassen und begruendet | **erfüllt** | AE-23: Im Export nachgemessen, dass die Buendel absolut referenziert werden (/_expo/static/...). Fuer ein Unterverzeichnis braucht es experiments.baseUrl in app.json plus einen neuen Export; ohne bekannten Zielpfad gesetzt, macht das den Export ueberall sonst kaputt. Haken laut Doku: Link und router setzen den Basispfad selbst davor, ein rohes <a> und die Linking-API nicht. |
| 8 | Icons/Splash geprueft | **erfüllt** | Nachgesehen: assets/images/ enthaelt unveraendert den Bildersatz des Expo-Templates, auch assets/expo.icon/ ist das Expo-Symbol. Als offener Punkt vor einer Store-Einreichung benannt, nicht selbst gestaltet - kein Auftrag dieser Phase. |
| 8 | Android-Testbuild tatsaechlich gebaut und installiert | **offen** | Blocker: B-5 - EAS verlangt ein Expo-Konto; fremde Konten lege ich nicht an. Vom Nutzer am 2026-09-01 bewusst zurueckgestellt, nachdem drei Wege vorgelegt wurden. |
| 8 | iOS-Build mindestens einmal ueber EAS durchgelaufen | **offen** | Blocker: B-5 - EAS verlangt ein Expo-Konto; fremde Konten lege ich nicht an. Vom Nutzer am 2026-09-01 bewusst zurueckgestellt, nachdem drei Wege vorgelegt wurden. |
| 8 | Tests und tsc gruen | **erfüllt** | 365 Tests in 12 Suites gruen; npx tsc --noEmit fehlerfrei. Phase 8 hat keine Geschaeftslogik angefasst. |
| 8 | Build-Konfiguration vorab validiert, ohne Konto | **erfüllt** | expo-doctor fand eine fehlende Peer-Abhaengigkeit (expo-asset, gebraucht von expo-audio, 'Your app may crash outside of Expo Go without this dependency') - nachinstalliert, jetzt 21/21 Pruefungen. expo prebuild erzeugte das native Projekt sauber; applicationId und die Keychain-Backup-Regeln aus AE-10 sitzen richtig. Ein lokaler Gradle-Build schied aus: kein JDK und kein Android-SDK auf dem Rechner. |
| 8 | Keine ueberfluessigen Android-Berechtigungen | **erfüllt** | Der Prebuild zeigte RECORD_AUDIO, FOREGROUND_SERVICE und FOREGROUND_SERVICE_MEDIA_PLAYBACK aus expo-audio - die App nimmt aber nie auf. Im Plugin nachgesehen und in app.json abgeschaltet (recordAudioAndroid false, microphonePermission false, enableBackgroundPlayback false); danach aus dem Manifest verschwunden. Rest nachverfolgt: READ/WRITE_EXTERNAL_STORAGE kommen von expo-file-system und tragen maxSdkVersion 32; SYSTEM_ALERT_WINDOW stammt aus der Expo-Vorlage und ist vor einer Store-Einreichung anzusehen. |
| 9 | Kontrastwerte tatsaechlich berechnet, nicht geschaetzt | **erfüllt** | WCAG-2.1-Formel (relative Leuchtdichte, (L1+0,05)/(L2+0,05)) in tones.test.ts ausgeschrieben und gegen die Norm-Beispiele geprueft (Schwarz/Weiss = 21:1, #767676 auf Weiss >= 4,5). Ergebnis der Erstmessung: die einzelne Farbe je Ton aus dem Referenzprototyp verfehlte AA in BEIDEN Modi - hell fielen mid (3,35), high (2,81) und rising (3,95) durch, dunkel low (2,47), falling (2,81) und rising (3,54). |
| 9 | Tonfarben erreichen WCAG AA auf jedem Untergrund | **erfüllt** | AE-24: je Ton eine helle und eine dunkle Fassung, Farbton erhalten, Helligkeit geloest. Alle fuenf Toene erreichen in beiden Modi >= 4,5:1 gegen background, backgroundElement und backgroundSelected. tones.test.ts rechnet das bei jedem Testlauf nach und prueft zusaetzlich, dass der Farbton zwischen den Modi gleich bleibt. |
| 9 | Screenreader-Labels fuer alle Icon-only-Interaktionen | **erfüllt** | Audit ueber alle 30 Pressables. Einziger echter Icon-only-Knopf war die kompakte Vorlesetaste des Beispielsatzes; ihr Label lautete '▶: <Text>' und begann also mit dem Zeichen selbst. Jetzt 'Beispielsatz anhoeren: ...' - im Browser nachgemessen. Auf den geprueften Screens hat kein Bedienelement mehr weder Label noch Text. |
| 9 | Tippziele mindestens 24x24 (WCAG 2.2 AA 2.5.8) | **erfüllt** | Im Web-Build gemessen: drei reine Textknoepfe waren nur 20 Pixel hoch ('Richtung wechseln', 'Als Standard merken', 'Uebung verlassen'). Auf 44 gesetzt; Nachmessung ergibt kein Element mehr unter 24. Die kompakte Vorlesetaste misst jetzt 44x44. |
| 9 | Tastaturbedienbarkeit im Web-Build geprueft | **erfüllt** | 15 von 15 Bedienelementen sind fokussierbar (tabIndex >= 0), Tab wandert der Reihe nach durch, der Fokusring ist sichtbar (im Screenshot belegt), und sie rendern als native <button> mit funktionierendem Klickpfad. Die AUSLOESUNG per Enter liess sich mit dem Automatisierungswerkzeug nicht nachweisen - ein Kontrollversuch mit einem selbst eingefuegten, ganz gewoehnlichen HTML-Knopf schlug genauso fehl. Die Grenze liegt also im Werkzeug, nicht in der App; als Fehler gemeldet wird das ausdruecklich NICHT. |
| 9 | Fehlerbehandlung ausserhalb der Batch-Pfade geschlossen | **erfüllt** | AE-25: Beim Schreiben wurde streng geprueft, beim LESEN blind vertraut. Ein leeres oder veraltetes Dokument liess Pruefungs- und Gespraech-Screen mit 'Cannot read properties of undefined (reading map)' abstuerzen - vorher im Kleinen nachgestellt. Jetzt filtern isValidExamModule und isValidSituation an der Lesegrenze; 18 neue Tests decken die Faelle ab, inklusive: Beschaedigtes wird ausgelassen, aber NICHT geloescht. |
| 9 | Konsolidierte Abnahme gegen den JETZIGEN Repo-Zustand | **erfüllt** | Tabelle in PROGRESS.md, aus .agent/state.json erzeugt statt abgetippt. Der Quergriff, den Phase 9 selbst gefaehrdet hat, wurde eigens nachgemessen: das Phase-3-Kriterium zu den Silbenfarben war mit den ALTEN Farben geprueft. Neu gemessen zeigt สวัสดี jetzt rgb(138,155,177) / rgb(138,155,177) / rgb(136,160,131) - tief-tief-mittel gilt weiterhin, mit den Dunkelmodus-Fassungen. |
| 9 | Toter Code aus der Vorlage entfernt | **erfüllt** | Collapsible aus dem Expo-Template war nirgends eingebunden und das einzige Bedienelement ganz ohne accessibilityRole. Entfernt; damit wurde expo-symbols unbenutzt und ist ebenfalls raus. expo-doctor weiterhin 21/21. |
| 9 | Tests und tsc gruen | **erfüllt** | 392 Tests in 14 Suites gruen; npx tsc --noEmit fehlerfrei. |
| 10 | Alle drei Generator-Gruppen zeigen Anbieter-Auswahl und Modell-Textfeld | **erfüllt** | Im Web-Build geprueft: Sprachsituationen, Bilder und Pruefungsaufgaben haben je eine Anbieterreihe und ein Modell-Freitextfeld. Umstellen wirkt sofort auf Modellvorschlag, Schluesselplatzhalter und die Beschriftung des Schluesselfeldes ('API-Schluessel fuer Google') und NUR auf die eigene Gruppe. Statt eines Aufklappfeldes eine Knopfreihe - Begruendung in AE-28 (React Native hat kein plattformweites Dropdown; @expo/ui ist nativ-only). |
| 10 | Gemini-CORS-Befund gemessen und dokumentiert | **erfüllt** | AE-26. Aus dem laufenden Web-Build am 2026-09-03: generateContent (Text), gemini-2.5-flash-image, imagen-4.0:predict und GET /v1beta/models kommen alle durch (HTTP 400, lesbar), mit Schluessel im Header wie als Query-Parameter. Kontrollen: Anthropic mit/ohne Header wie in AE-12; example.com und goethe.de scheitern - die CORS-Pruefung war also scharf. Genommen wurde der Header, weil eine URL in Verlaufslisten landet. Haken: mit ungueltigem Schluessel antwortet Google auf ALLES 'API key not valid', auch auf ein erfundenes Modell - Anfrage- und Antwortform sind damit vor dem ersten bezahlten Aufruf nicht belegbar. |
| 10 | ChatGPT im Web-Build klar als eingeschraenkt gekennzeichnet | **erfüllt** | AE-27. Die Messung bestaetigt eine Einschraenkung, aber mit anderer Ursache als in AE-13 vermutet: Ein POST an api.openai.com mit einem Schluessel, der mit 'sk-' beginnt, bekommt eine Antwort ohne Access-Control-Allow-Origin; mit 'SK-' oder 'xk-' kommt dieselbe Anfrage durch, beim GET greift die Regel nicht. Da jeder echte OpenAI-Schluessel mit 'sk-' beginnt, bleibt die Konsequenz aus Phase 5 dieselbe. Warnung steht in der Oberflaeche, aber nur hinter Platform.OS === 'web' - nativ gibt es kein CORS. Zwei andere Verdaechtige (Anmeldedaten, Anfragekoerper) wurden geprueft und verworfen. |
| 10 | Provider-Abstraktion statt dritter Kopie | **erfüllt** | AE-28: TextClient und ImageClient in src/lib/providers/. Die bestehenden Anthropic- und Stability-Umsetzungen haengen dahinter, nicht daneben; Prompts, Parser, Bauplan und der Batch-Laeufer aus Phase 5 wurden nicht angefasst. createAnthropicClient und createStabilityImageClient bleiben als Aufruf erhalten. Ein Test belegt, dass beide Textgeneratoren denselben anbieterfreien Prompt schicken. |
| 10 | Key-Speicherung je Anbieter nach dem AE-10-Muster | **erfüllt** | api-key.ts von zwei auf vier Anbieter erweitert, Muster unveraendert (nativ Keychain, Web nur Sitzung, Weiche ueber isAvailableAsync). Tests mit einer nachgebildeten sicheren Ablage: vier Schluessel getrennt, Loeschen eines Anbieters laesst die anderen stehen, und der Claude-Schluessel liegt weiterhin unter dem alten Namen 'anthropic-api-key' - ihn umzubenennen haette gespeicherte Schluessel unauffindbar gemacht. |
| 10 | Modellname nicht validiert (Freitext, kein Katalog) | **erfüllt** | Pflicht 5. Ein Test faehrt vier beliebige Namen durch, darunter '../etwas', und erwartet sie unveraendert zurueck. Leeres Feld nimmt den Vorschlag des Anbieters; ein Anbieterwechsel zieht den Modellnamen mit. Bei Gemini und Stability fuellt der Name den Pfad und wird kodiert, damit ein Tippfehler mit Schraegstrich keine fremde Adresse baut. Im Browser mit 'gemini-99-voellig-ausgedacht' geprueft, inklusive Neuladen. |
| 10 | Bestehende Anthropic-/Stability-Generatoren laufen unveraendert weiter (Regressionstest) | **erfüllt** | Zweifach belegt. Testebene: alle 392 Tests aus Phase 0-9 laufen unveraendert gruen; zusaetzlich prueft ein Test, dass die Voreinstellungen (Claude/claude-opus-5, Stability/stable-image-core) und die in AE-13 gemessene Endpunktadresse sich nicht verschoben haben. Netzebene, aus der Oberflaeche mit ungueltigem Schluessel: Sprachsituationen ueber Claude 16/16 mit '401 authentication_error - API key is invalid' (wortgleich Phase 4/7), Bilder ueber Stability 5/5 mit 'HTTP 401: authorization: invalid or missing header value' (wortgleich Phase 5). Bestand danach unveraendert. |
| 10 | Lauf durch den echten Netzwerkpfad je neuem Anbieter (ungueltiger Schluessel) | **erfüllt** | Sprachsituationen ueber Gemini: 16/16 verarbeitet, 0 erzeugt, 16 x 'HTTP 400: API key not valid. - INVALID_ARGUMENT'. Pruefungsaufgaben ueber Gemini: 8/8, Bestand bleibt bei den 8 mitgelieferten. Bilder ueber ChatGPT: 5/5, 5 x 'Keine Antwort von api.openai.com' mit CORS-Erklaerung. Nach jedem Lauf 0 gespeichert. |
| 10 | Auswahlzustand ist fuer Screenreader ablesbar (Nebenbefund) | **erfüllt** | AE-29, nicht Auftrag dieser Phase, beim Nachmessen gefunden: accessibilityState={{selected}} erzeugt in dieser React-Native-Web-Fassung GAR KEIN ARIA-Attribut, und accessibilityRole 'radio' + accessibilityState {{checked}} liefert zwar role=radio, aber kein aria-checked. Betraf auch Umfang (Phase 4) und Standard-Lernrichtung (Phase 6). Behoben durch direkt gesetztes aria-checked plus radiogroup; nachgemessen 18 von 18 Auswahlknoepfen mit Zustand, davon 7 auf true, und kein Aktionsknopf mit falscher Rolle. |
| 10 | Tests und tsc gruen | **erfüllt** | 437 Tests in 15 Suites gruen (vorher 392 in 14); npx tsc --noEmit fehlerfrei. |
| 10 | Antwortform von ChatGPT und Gemini gegen die laufende API belegt | **offen** | Blocker: B-6 - beide Anbieter pruefen den Schluessel VOR der Anfrageform und antworten auf jede Anfrage mit demselben Auth-Fehler. Anders als bei Stability (AE-13) liess sich deshalb nichts ohne bezahlten Schluessel festklopfen. Die Parser nennen im Fehlerfall die gelieferten Feldnamen, damit ein Formwechsel sofort in der Fehlerliste steht. |

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

> **Neu aus Phase 10 (2026-09-03):** Die Anbieterwahl steht. Was hier oben
> liegt, ist unverändert das, was einen Schlüssel oder ein Gerät des Nutzers
> braucht — nur dass die Probeläufe seit Phase 10 auch mit **Gemini** gefahren
> werden können und nicht mehr nur mit Anthropic und Stability.

0. **Anbieter mit einem gültigen Schlüssel gegenprüfen (neu, Phase 10):**
   Reiter **Einstellungen**, bei einer Gruppe den gewünschten Anbieter wählen,
   Modell stehen lassen, Schlüssel eintragen, **Probelauf**, **Start**. Was
   dabei erstmals belegbar wäre und heute offen ist:
   - **Gemini:** die Anfrage- **und** die Antwortform. Google antwortet mit
     ungültigem Schlüssel auf alles „API key not valid", deshalb ließ sich
     nichts festklopfen (AE-26). Schlägt der Lauf mit „Antwort enthielt keine
     candidates (gelieferte Felder: …)" fehl, nennt die Meldung selbst, was
     stattdessen kam — anzupassen sind dann `parseGeminiText` bzw.
     `parseGeminiImage` in `src/lib/providers/`.
   - **ChatGPT im Browser:** ob ein **gültiger** `sk-`-Schlüssel die Ausnahme
     von der in AE-27 gemessenen Regel ist. **Achtung:** die Anfrage geht
     hinaus, auch wenn der Browser die Antwort verwirft — ein Bildlauf könnte
     also berechnet werden, ohne dass ein Bild ankommt. Wenn, dann mit dem
     kleinsten Umfang.
   - **ChatGPT nativ:** ohne CORS sollte der Weg offen sein. Prüfbar erst mit
     B-2 bzw. B-5.
   - Bei OpenAI zusätzlich: ob `max_completion_tokens` das richtige Feld ist.
     Beschwert sich die API, ist es genau diese eine Zeile in
     `src/lib/providers/text.ts`.

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
> **Der ursprüngliche Plan (Phase 0–9) ist abgearbeitet.** Was hier noch steht,
> braucht eine Handlung des Nutzers oder war nie Teil von v1 — die vollständige
> Bewertung steht im Abschnitt „Konsolidierte Abnahme".

4. **EAS-Konto anlegen und bauen (Blocker B-5, schließt Phase 8 ab und
   B-2 für Android gleich mit):** `npm install --global eas-cli`, dann
   `eas login`, dann `eas build --platform android --profile preview`. Beim
   ersten Lauf „Generate new keystore" bestätigen. Der freie Tarif reicht
   (15 Android- und 15 iOS-Builds). Danach `--platform ios --profile preview`
   für den Simulator-Build, der **kein** Apple-Konto braucht.
   *Warum ich das nicht selbst gemacht habe:* EAS verlangt schon zum Lesen der
   Konfiguration ein Konto (`Not logged in`), und fremde Konten lege ich nicht
   an. Alles davor ist vorbereitet und geprüft.
5. **Phase 9 — QA & Abschluss.**

**Vor einer Store-Einreichung, nicht vorher nötig:**

- **App-Symbol und Splash-Screen** ersetzen — stehen noch auf den
  Template-Platzhaltern von Expo (kein Auftrag von Phase 8, siehe dort).
- **Bundle-Identifier bestätigen** (`com.thailernbegleiter.app`). Nach der
  Veröffentlichung nicht mehr änderbar.
- **Google Play (25 $ einmalig) bzw. Apple Developer Program (99 $/Jahr)** —
  Zahlen von der EAS-Setup-Seite, abgerufen am 2026-09-01.

**Offene Fäden aus Phase 7, bewusst nicht mitgemacht:**

- **Durchführungsbestimmungen erheben** (die PDFs sind auf den
  Zertifikatsseiten verlinkt): Punkteverteilung und Bestehensgrenzen. Erst
  damit dürfte die App „bestanden" sagen — siehe AE-20.
- **B1-Aufgaben** brauchen erst B1-Wortschatz; das hängt am Skalierungsplan.
- **CU-TFL recherchieren**, falls das Prüfungsmodul auch die Gegenrichtung
  bedienen soll — Primärquelle `sti.chula.ac.th`, die aus dieser Sitzung nicht
  erreichbar war. Das Schema trägt `direction` bereits (AE-19).

**Naheliegende Fortsetzungen aus Phase 6, bewusst nicht mitgemacht:**

- Ein Übungstyp mit **freier Eingabe** statt Auswahl. Damit fiele das
  Rateproblem weg, das in AE-16 gegen eine FSRS-Anbindung spricht — und erst
  dann wäre die Frage „Übungen durch FSRS?" überhaupt neu zu stellen.
- Weitere Übungen aus schon vorhandenen Daten: Pluralformen und Steigerung von
  Adjektiven (`germanAdjective`, 12 Einträge) für `th_to_de`, Tonzeichen-Lesen
  für `de_to_th`.

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
