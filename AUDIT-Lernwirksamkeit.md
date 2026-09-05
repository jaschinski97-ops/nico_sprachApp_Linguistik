# Audit: Lernwirksamkeit

**Erstellt:** 2026-09-05
**Geprüfter Stand:** Branch `main`, Commit `e2a82fd` (Phase 18 abgeschlossen)
**Testlage bei Auditbeginn:** `npm test` → 712 Tests in 31 Suiten grün, Exit 0
**Auftrag:** bewerten, nicht ändern. **Am Anwendungscode wurde nichts geändert**, keine
Datei unter `src/` angefasst, kein Test angepasst. Was beim Prüfen auffiel, steht in
Abschnitt 10 — aufgeschrieben, nicht behoben.

---

## 0. Das Urteil vorweg

**Die Mechanismen sind da, der Inhalt trägt sie nicht.**

Die App implementiert eine bemerkenswert saubere Auswahl dessen, was die Forschung als
wirksam ausweist: verteiltes Üben mit einem modernen Wiederholungsplaner, Abrufübung,
sofortige Rückmeldung mit Begründung, freie Produktion statt bloßer Auswahl, explizite
Regelherleitung, Wahrnehmungstraining für das schwierigste Merkmal jeder Sprache. Jeder
dieser Mechanismen ist einzeln nachprüfbar gebaut und getestet.

Gefüllt sind sie mit **248 Vokabeln, 84 Beispielsätzen, 20 automatisch bewerteten
Prüfungsaufgaben, null Sprachsituationen, null Bildern und null Hörclips.**

Ein Lernender, der die App ernsthaft benutzt, hat den gesamten Inhalt in wenigen Tagen
gesehen. Danach wiederholt die App etwas, das für keinen realen Zweck ausreicht: 100
verschiedene deutsche Wörter stehen gegen die ~650 Einträge der Goethe-A1-Wortliste
[S-14] und gegen die 6.000–9.000 Wortfamilien, die Nation für selbstständiges Lesen und
Hören veranschlagt [S-11].

**Wer heute Thai lernen will, ist mit Anki plus einem wöchentlichen Tandempartner besser
dran als mit dieser App.** Die ausführliche Begründung steht in Abschnitt 6. Sie ist kein
Urteil über die Bauqualität — sie folgt allein aus der Inhaltsmenge.

---

## 1. Wie dieses Audit gearbeitet hat, und was es nicht kann

### Belege

Alle Aussagen über „die Forschung" stammen aus extern recherchierten Quellen mit
Abrufdatum (Abschnitt 11), nicht aus Trainingswissen. Wo die Forschungslage umstritten
ist — namentlich bei Krashens Input-Hypothese —, steht das ausdrücklich da, statt eine
Seite als Konsens auszugeben (Prinzip P5).

**Zugriffstiefe wird je Quelle gekennzeichnet**, weil sie ungleich ist:

- **[V]** — Abstract oder Volltext im Wortlaut gelesen.
- **[Z]** — nur über die Zusammenfassung eines Suchindex erreicht (Bezahlschranke, oder
  das PDF ließ sich in dieser Umgebung nicht in Text wandeln; `pdftoppm`, `pypdf` und
  `pymupdf` fehlen, und die eigene zlib-Extraktion scheiterte an Subset-Fonts). Zahlen
  aus solchen Quellen sind im Text als „laut Abstract-Zusammenfassung" markiert.

Das ist dieselbe Disziplin wie bei `sourceVerified` im Vokabel-Grundstock: kennzeichnen,
was nicht mit eigenen Augen belegt ist.

### Zahlen

Die Zahlen in Abschnitt 2 sind am Repo **selbst gemessen**, nicht aus `PROGRESS.md` oder
`.agent/state.json` abgeschrieben. Der jeweilige Befehl steht daneben. Wo die Messung von
`.agent/state.json` abweicht oder der Auftragstext eine andere Zahl nennt, steht das in
Abschnitt 5 und 10.

### Was dieses Audit ausdrücklich nicht ist

Es ist **kein Wirksamkeitsnachweis**. Es wurde kein Lernender getestet, keine Retention
gemessen, kein Vorher-Nachher erhoben. Was hier steht, ist ein Abgleich der **Bauweise**
mit der Forschungslage — mehr kann man von außen nicht sagen. Abschnitt 9 zählt auf, was
aus dieser Position grundsätzlich nicht beurteilbar ist.

---

## 2. Der Ist-Stand in Zahlen (selbst gemessen)

| Gegenstand | Ist | Wie gemessen |
| --- | --- | --- |
| Vokabeln gesamt | **248** | `grep -c "^    id: '"` über die drei Grundstöcke |
| — Thai / Englisch / Spanisch | 84 / 85 / 79 | dito, je Datei |
| Verschiedene **deutsche** Stichwörter | **100** | `grep -h "^    german: " … \| sort -u \| wc -l` |
| Gemeinsame Begriffe (`concept`) | 76 in EN+ES | `grep -h "^    concept: " … \| sort -u` |
| Thai-Einträge mit `sourceVerified: false` | 3 | `grep -c "sourceVerified: false"` |
| Einsilbige Thai-Wörter | **69** von 84 | Silbenzahl aus `syllables: [...]` gezählt |
| Beispielsätze Thai | 84 | `grep -c "exampleTerm:"` in `vocabulary.ts` |
| Beispiel-**Wortgruppen** Spanisch (`el libro`) | 30 | dito in `vocabulary-es.ts` |
| Beispiele Englisch | **0** | dito in `vocabulary-en.ts` |
| Konkrete Vokabeln (bildfähig) | 25 / 28 / 25 | `grep -c "isConcrete: true"` |
| Prüfungsmodule mitgeliefert | 8 | `grep -c "taskType: '"` |
| — davon automatisch bewertete Aufgaben | **20** in 6 Modulen | `grep -c "correctIndex"`; 2 Module sind `production` und werden nicht bewertet (AE-20) |
| Sprachsituationen ausgeliefert | **0** | keine Datei mit Situationen unter `src/data`; kein Seed-Pfad in `repository.ts`; `.agent/state.json → situations.generated: 0` |
| Bilder ausgeliefert | **0** | `.agent/state.json → images.generated: 0`; Testbilder wurden nach der Ablageprüfung entfernt |
| Hörclips ausgeliefert | **0** | `.agent/state.json → audioClips.generated: 0`; dito |
| Übungstypen | 8 | `DRILLS` in `src/lib/drills/types.ts` |
| — davon mit **freier Eingabe** | 1 (Schreiben) | `src/lib/writing/` |
| — davon FSRS-wirksam | 1 (Schreiben, AE-40) | `ratingForVerdict` → `rateCard` |
| Sprachpaar-Richtungen | 6 | `de↔th`, `de↔en`, `de↔es` |
| Sprechübung | nur Thai, nur einsilbig | 69 Kandidaten (`sourceVerified` + 1 Silbe) |

### Wie schnell der Inhalt aufgebraucht ist

Eine Übungsrunde umfasst 10 Aufgaben (`DRILL_SESSION_SIZE`). Daraus folgt, wie oft
jemand eine Übung starten kann, bevor er alles einmal gesehen hat:

| Übung | Kandidaten | Runden bis zur Vollabdeckung |
| --- | --- | --- |
| `tone` / `toneRule` (Thai) | 69 | ~7 |
| `stressHear` / `stressRule` (Spanisch) | 65 | ~7 |
| `spelling` / `soundSpelling` (Englisch) | **23** | **~2** |
| `article` | 29 / 30 / 33 | ~3 |
| `verbForms` | 20 / 18 / 19 | **~2** |
| Sprechen (Thai) | 69 | ~7 |
| Karteikarten Thai, beide Richtungen | 168 Karten | — |

Die englische Aussprache-Übung und die Verbformen-Übungen sind nach **zwei Runden**
durch. Das ist der Kern des ganzen Audits: Der Generator ist tadellos, die Menge nicht.

---

## 3. Prinzip für Prinzip

Je Prinzip zwei getrennte Urteile, wie in Pflicht 2 verlangt:

- **(a) Mechanismus** — ist er gebaut? → `vorhanden` / `teilweise` / `fehlt`
- **(b) Inhalt** — reicht die Füllung, damit ein realer Lernender davon profitiert? →
  `trägt` / `trägt knapp` / `trägt nicht`

Nur (b) entscheidet über Lernerfolg.

---

### P1 — Verteiltes Üben (Spacing)

**(a) Mechanismus: vorhanden.** `src/lib/fsrs/fsrs.ts` implementiert die
Retrievability-Kurve `R = (1 + 19/81 · t/S)^-0.5`, das Intervall zum Zielwert 90 %
Abrufwahrscheinlichkeit, Difficulty mit Mean-Reversion, Stabilitätswachstum und
Lapse-Einbruch. Karten sind je `vocabId:direction` getrennt. Ein Tagesprotokoll
(`review-log.ts`) hält Wiederholungen und Übungen auseinander.

**(b) Inhalt: trägt knapp.** Der Mechanismus wirkt auf 168 Thai-Karten (84 × 2
Richtungen). Spacing wirkt auf das, was da ist — es macht aber aus 84 Wörtern keine
Sprachkompetenz.

**Beleg.** Cepeda et al. (2006) werteten 839 Vergleiche aus 317 Experimenten in 184
Artikeln aus; verteiltes Üben schlägt massiertes, und das optimale Zwischenintervall
wächst mit dem Behaltensintervall [S-1, Z]. Genau diese Kopplung modelliert FSRS.

**Zur Güte der Umsetzung — ein präziser Befund.** `DEFAULT_WEIGHTS` in `fsrs.ts:29-31`
enthält 17 Werte:
`0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61`
Das sind **exakt die veröffentlichten Vorgabewerte von FSRS v4** [S-2, V]. Der
Modulkommentar nennt sie eine „Näherung an veröffentlichte FSRS-Gewichte" — das ist
ungenauer als nötig: es ist ein publizierter Satz, nur ein alter. Die Kurve dagegen
(`19/81`, Exponent `-0.5`) ist die von **FSRS-4.5** [S-2, V]. Die Kombination ist damit
keine einzelne veröffentlichte Fassung.

Praktisch relevant ist der Unterschied bei den ersten vier Werten, die die
Anfangsstabilität nach der ersten Bewertung setzen:

| | Nochmal | Schwer | Gut | Leicht |
| --- | --- | --- | --- | --- |
| App (= FSRS v4) | 0,4 | 0,6 | 2,4 | 5,8 |
| FSRS-4.5 | 0,4872 | 1,4003 | 3,7145 | 13,8206 |
| FSRS-5 | 0,40255 | 1,18385 | 3,173 | 15,69105 |
| FSRS-6 | 0,212 | 1,2931 | 2,3065 | 8,2956 |

Ein „Leicht" auf einer neuen Karte ergibt in der App ~6 Tage statt ~14 (FSRS-4.5) bzw.
~16 (FSRS-5). Die App plant also von Anfang an **enger** als der aktuelle Stand — sie
fragt zu häufig, nicht zu selten. Das ist die harmlosere Richtung des Fehlers (mehr
Aufwand, kein Vergessen), aber es ist ein Fehler.

Der Vergleichsmaßstab: Der öffentliche Benchmark der FSRS-Gruppe deckt 9.999
Anki-Sammlungen mit 349.923.850 Wiederholungen ab und meldet für FSRS-6 eine
Überlegenheit gegenüber Anki-SM-2 bei 99,6 % der Nutzer [S-3, V]. FSRS-6 hat 21
Parameter, FSRS-5 hat 19, FSRS-4.5 und v4 haben 17 [S-2, V]. Die App liegt zwei
Generationen zurück, und ihre Gewichte wurden nie an echten Logs optimiert — was FSRS
ausdrücklich vorsieht.

**Einordnung:** Das ist der am wenigsten dringende Mangel der ganzen Liste. Ein
suboptimaler Planer auf 248 Vokabeln kostet Minuten; 248 Vokabeln statt 1000 kosten die
Sprache.

---

### P2 — Abrufübung (Testing Effect)

**(a) Mechanismus: vorhanden.** Karteikarte (Abruf mit Selbsteinschätzung), acht
Übungstypen, freies Schreiben, Prüfungsaufgaben. Nichts davon ist reines Wiederlesen.

**(b) Inhalt: trägt knapp** — dieselbe Deckelung wie P1.

**Beleg.** Adesope, Trevisan & Sundararajan (2017) fanden in ihrer Metaanalyse in
*Review of Educational Research* 87(3), 659–701, dass Übungstests dem Wiederholen des
Stoffs und allen anderen Vergleichsbedingungen überlegen sind, moderiert unter anderem
vom **Format** des Übungstests [S-4, Z]. (Die konkrete Effektstärke ist hier nicht
zitiert: Der Verlag lieferte HTTP 403, und eine Zahl aus zweiter Hand behaupten wäre
genau das, was dieses Projekt nicht tut.)

Für den Vokabelfall speziell: Webb, Yanagisawa & Uchihara (2020) werteten 100
Effektstärken aus 22 Studien zu absichtlichen Vokabellernaktivitäten aus. Unmittelbar
nach der Übung lagen die Lerngewinne bei 60,1 % (Bedeutungsabruf) und 58,5 %
(Formabruf); im verzögerten Test fielen sie auf 39,4 % bzw. **25,1 %** [S-5, Z]. Das ist
die empirische Begründung dafür, dass eine Vokabel-App überhaupt einen Wiederholungsplan
braucht — ohne ihn ist nach ein paar Wochen ein Viertel der Formen übrig.

---

### P3 — Abrufformat: Produktion statt Auswahl

**(a) Mechanismus: teilweise.** Von acht Übungstypen ist **einer** freie Eingabe
(`lib/writing`, Phase 14). Die anderen sieben sind Auswahl mit 3 bis 5 Möglichkeiten.
Die Karteikarte ist Selbsteinschätzung ohne geprüfte Antwort.

**(b) Inhalt: trägt nicht durchgängig.** Der Auftrag benennt es selbst (AE-16): Die
Auswahlübungen speisen bewusst kein FSRS. Das heißt konkret — **sieben von acht
Übungstypen tragen nichts zur Wiederholungsplanung bei.** Wer einen Abend lang Töne hört
und Artikel wählt, hat für den Karteikasten nichts getan; nur die Lernserie zählt mit.

**Beleg — und hier ist die Forschung differenzierter, als AE-16 es darstellt.** Kang,
McDermott & Roediger (2007) verglichen Kurzantwort- und Auswahlaufgaben als Übungsformat.
Ergebnis: **Mit** Rückmeldung war die Kurzantwort etwas wirksamer; **ohne** Rückmeldung
war die Auswahlaufgabe die wirksamere. Die Erklärung der Autoren: Der höhere Abrufaufwand
einer Kurzantwort führt zu gründlicherer Verarbeitung der Rückmeldung [S-6, Z].

Das stützt AE-16 in der Sache (freie Eingabe ist der bessere Messpunkt für FSRS), aber es
widerlegt die stillschweigende Nebenannahme, Auswahlaufgaben seien lernpsychologisch
wertlos. Sie sind es nicht — sie erzeugen einen echten Testing-Effekt, und die App gibt
zu jeder Aufgabe eine Auflösung mit Begründung, also genau die Bedingung, unter der beide
Formate wirken. Der Ausschluss aus FSRS ist eine **Buchhaltungsentscheidung** über das
Rateproblem, keine Aussage über den Lernwert. Der Kommentar in `drill-runner.tsx` sieht
das richtig („bei einer Auswahl mit drei bis fünf Möglichkeiten ist ein Treffer auch mal
geraten, und dann ist die Begründung das eigentlich Nützliche").

**Was daraus folgt:** Der Weg, den AE-16 selbst als sauber bezeichnet — freie Eingabe
statt Auswahl —, ist für den Vokabelabruf gegangen (Phase 14), für die
Merkmalsübungen aber nicht. Artikel schreiben statt anklicken, Perfektform tippen statt
wählen: dieselben Daten, dieselbe Toleranzlogik aus `compare.ts`, und der Großteil der
Übungen würde FSRS speisen. Siehe Priorität 2 in Abschnitt 8.

---

### P4 — Rückmeldung

**(a) Mechanismus: vorhanden, und ungewöhnlich gut.** Die Auflösung erscheint nach
**jeder** Antwort, auch nach richtigen. Bei `toneRule` liefert `reading/syllable.ts` die
sieben Herleitungsschritte mit, statt nur „richtig" zu sagen. Beim freien Schreiben
benennt `compare.ts`, *was* falsch war, und unterscheidet Vertipper vom Lernzielfehler
(AE-41). Bei der Sprechübung stehen fünf Grenzen der Messung neben jeder Rückmeldung
(`SPEAKING_LIMITATIONS`).

**(b) Inhalt: trägt.** Das ist das eine Prinzip, bei dem die Füllung ausreicht — die
Rückmeldung entsteht aus Regeln und Daten, nicht aus einem Vorrat, der sich erschöpft.

**Beleg.** Li (2010) fand in einer Metaanalyse über 33 Primärstudien einen mittleren
Gesamteffekt korrektiver Rückmeldung von d = 0,64, zeitlich stabil, wobei impliziter
Feedback besser gehalten wurde als expliziter [S-7, Z]. Kang et al. (2007) zeigen, dass
Rückmeldung das Übungsformat überhaupt erst zur Geltung bringt [S-6, Z].

**Einschränkung:** Rückmeldung gibt es nur zu Aufgaben, die die App stellt. Auf frei
produzierte Sprache — einen Satz, eine Äußerung — gibt es keine. Siehe P6 und
Abschnitt 7.

---

### P5 — Verständlicher Input · **umstrittene Forschungslage**

**(a) Mechanismus: teilweise.** Es gibt Beispielsätze (nur Thai), vorproduzierte
Sprachsituationen (Generator vorhanden) und Prüfungstexte. Kein Lesetext, keine
Hörstrecke, kein zusammenhängender Diskurs über wenige Zeilen hinaus.

**(b) Inhalt: trägt nicht.** 84 Beispielsätze Thai, 0 für Englisch und Spanisch, 0
Sprachsituationen ausgeliefert, 8 Prüfungstexte auf Deutsch. Das ist kein Input im Sinne
der Forschung, das sind Illustrationen.

**Die Kontroverse, ausdrücklich.** Der Auftrag nennt Krashen zu Recht als Beispiel für
strittige Lage. Der Stand:

- **Unstrittig** ist, dass Input *notwendig* ist. VanPatten & Williams führen ihre
  Theoriensammlung mit Beobachtungen ein, die jede SLA-Theorie erklären muss; „exposure
  to input is necessary for SLA" gehört dazu. VanPatten betont selbst, dass die Rolle des
  verständlichen Inputs oft fälschlich für eine *Theorie* gehalten wird, obwohl sie eine
  Beobachtung ist [S-8, Z].
- **Strittig bis abgelehnt** sind Krashens Hypothesen als Theorie. Gregg (1984) und
  McLaughlin (1987) hielten die Unterscheidung von „acquisition" und „learning" für
  **unfalsifizierbar**: Kein Experiment kann sagen, ob ein Satz aus erworbenem oder
  gelerntem Wissen stammt. Gregg bemängelt zusätzlich, dass Krashen keinen Mechanismus
  angibt, wie verstandener Input zu Kompetenz wird; McLaughlin, dass Krashen keine
  Evidenz im eigentlichen Sinn liefere, sondern Phänomene aus Sicht seiner Theorie
  umdeute [S-9, Z]. Die Kritik ist bis heute nicht ausgeräumt und wird weiterhin
  fortgeschrieben [S-10, V].

**Was für dieses Projekt daraus folgt:** „Viel verständlicher Input" ist keine belegte
Alleinlösung, aber Input-Menge bleibt in jeder Theorie eine notwendige Bedingung — und
davon hat die App fast nichts. Der belastbare, unumstrittene Teil des Feldes ist
extensives Lesen (P12) mit gemessenen Effekten, nicht die Input-Hypothese als Theorie.

---

### P6 — Output und Interaktion

**(a) Mechanismus: teilweise.** Produktion auf **Wortebene**: freies Schreiben in beide
Richtungen aller drei Paare, Sprechen (nur Thai, nur einsilbig, nur Tonhöhenkontur).
Kein Satz, kein Dialog, kein Gegenüber. Die Sprachsituationen wären der Ort dafür — sie
sind bewusst kein Live-Chat, sondern vorproduzierte Skripte, und ausgeliefert sind
**null**.

**(b) Inhalt: trägt nicht.**

**Beleg.** Mackey & Goo (2007) synthetisierten 28 Interaktionsstudien und fanden große
Effekte für Lernende, die interagierten, gegenüber solchen, die es nicht taten — deutlich
klarer noch in verzögerten Nachtests [S-12, Z]. Interaktion in diesem Sinn heißt
Bedeutungsaushandlung, korrektive Rückmeldung und Output unter Druck. Nichts davon kann
eine Offline-App mit vorproduzierten Skripten leisten, und die App behauptet es auch
nicht.

**Das ist die größte strukturelle Lücke der App**, und sie ist nicht durch mehr Inhalt zu
schließen. Siehe Abschnitt 6.

---

### P7 — Explizite Regelvermittlung / Fokus auf Form

**(a) Mechanismus: vorhanden und sehr sauber.** Thai-Tonherleitung aus 44 Konsonanten mit
Klasse, 59 Vokalmustern, Tonregeltabelle und 11 belegten Konsonantenverbindungen,
gegengeprüft an 69 von 69 einsilbigen Grundstockeinträgen (AE-36/AE-38). Spanische
Betonungsregel, gegengeprüft an 79 von 79 Einträgen gegen die enge IPA aus Wiktionary
(AE-45). Englische Schriftstück-Gruppen als Vergleichsübung, weil dort nichts ableitbar
ist (AE-47). Die Regeln sind erhoben, nicht erinnert.

**(b) Inhalt: trägt für Thai und Spanisch, trägt nicht für Englisch** (23 Kandidaten,
zwei Runden). Und es fehlt jede Grammatik jenseits von Genus, Stammformen und
Aussprache: keine Wortstellung, keine Fälle, keine Zeiten, keine Klassifikatoren
(Thai), keine Verbkonjugation über die Nennung der Klasse hinaus (Spanisch).

**Beleg.** Norris & Ortega (2000) fanden über 49 Stichproben große, dauerhafte Gewinne
durch fokussierte Instruktion und eine Überlegenheit **expliziter** über implizite
Vermittlung, besonders wenn metasprachliche Erklärung dabei ist [S-13, Z]. Die App macht
genau das — und die Herleitungsschritte bei `toneRule` sind die metasprachliche Erklärung
in ihrer nützlichsten Form.

Das ist die inhaltlich stärkste Stelle der App.

---

### P8 — Wahrnehmungstraining der Aussprache (HVPT)

**(a) Mechanismus: vorhanden, aber in einer Variante, die eine Kernbedingung verletzt.**
`tone`, `stressHear` und `soundSpelling` sind Erkennungsübungen mit geschlossener Auswahl
und sofortiger Rückmeldung — das ist der HVPT-Aufbau. Es fehlt die namensgebende
**Variabilität**: Es spricht immer *eine* Stimme, nämlich die Systemstimme des Geräts
(`playPronunciation` → `expo-speech`), oder, sobald Clips erzeugt wurden, *eine* KI-Stimme
aus einem Lauf.

**(b) Inhalt: trägt nicht.** 69 Kandidaten Thai, 65 Spanisch, 23 Englisch — und **null**
Hörclips ausgeliefert. Im geprüften Testbrowser ist weder eine thailändische noch eine
spanische noch eine englische Stimme installiert; die Hörübungen laufen dort nur bis zum
Warnpfad (`voiceMissing` in `drill-runner.tsx`). Auf der einzigen vollständig geprüften
Plattform ist die Hörübung für alle drei Zielsprachen faktisch nicht durchführbar.

**Beleg.** Uchihara, Karas & Thomson (2025) werteten 79 HVPT-Studien aus:
g = 0,92 im Vorher-Nachher-Vergleich (k = 96), g = 0,67 gegen Kontrollgruppen (k = 32),
mit bestätigter Langzeitretention und Generalisierung auf neue Stimuli [S-15, V]. Der
Aufbau ist definitionsgemäß „produced by multiple speakers, in varied phonetic contexts"
[S-15, V]. Wang, Spence, Jongman & Sereno (1999) trainierten acht amerikanische
Mandarin-Lernende über acht Sitzungen mit mehreren Muttersprachlern und maßen +21 %
Identifikationsgenauigkeit, Generalisierung auf neue Wörter und Sprecher, gehalten bis
sechs Monate; ein Folgeexperiment zeigte Transfer in die eigene Produktion [S-16, Z].

**Und der unbequemste Befund des ganzen Audits:** Wayland & Guion (2004) trainierten
englische und chinesische Muttersprachler auf den Thai-Kontrast **mittel gegen tief**.
Die chinesische Gruppe verbesserte sich signifikant, die englische **nicht** — unter
beiden geprüften Bedingungen [S-17, Z].

Damit trifft die App an ihrer eigenen Kernstelle auf zwei ungünstige Befunde zugleich:

1. Für Sprecher nicht-tonaler Sprachen (Deutsch wie Englisch) ist genau dieser Kontrast
   selbst mit ordentlichem Training schwer bis nicht trainierbar.
2. Genau bei **mittel und hoch** liegt laut eigener Messung die Schwäche der geprüften
   TTS-Stimmen: „Mittel und hoch sind bei den Microsoft-Stimmen nur schwach getrennt"
   (AE-31), und Google realisiert den steigenden Ton gar nicht. **Keine gemessene Stimme
   trifft alle fünf Töne.**

Ein Lernender übt also möglicherweise die schwierigste Unterscheidung an einer Stimme,
die sie selbst nicht sauber produziert. Die App verspricht das auch nirgends — sie
schreibt „KI-Stimme, keine Muttersprachler-Aufnahme" dazu. Aber die Ehrlichkeit der
Kennzeichnung macht die Übung nicht wirksam.

---

### P9 — Ausspracherückmeldung (CAPT)

**(a) Mechanismus: vorhanden, lokal, ohne Score.** `lib/speaking` misst F0 über normierte
Autokorrelation, wählt die längste stimmhafte Strecke, korrigiert grobe Oktavsprünge und
vergleicht die Kontur mit dem Sollton aus der **verifizierten Silbe**, nie aus einer
Stimme (AE-32). Die Rückmeldung ist qualitativ; ohne Sprecherbaseline meldet sie
ausdrücklich „Register offen" statt „passt". Aufnahmen verlassen das Gerät nicht.

**(b) Inhalt: trägt nicht.** 69 einsilbige Thai-Wörter, nur Richtung `de_to_th`, für
Englisch und Spanisch gar nichts. Ob das F0-Verfahren spanische Betonung erkennen könnte,
ist laut eigenem Protokoll **ungeprüft** (AE-48).

**Beleg.** Eine ReCALL-Metaanalyse zu ASR-gestützter Ausspracheschulung berichtet einen
**großen Effekt auf der segmentalen Ebene, aber nur einen kleinen auf der
suprasegmentalen**; Training unter vier Wochen war selten wirksam, und ASR mit expliziter
korrektiver Rückmeldung war deutlich wirksamer als indirekte [S-18, Z]. Die
suprasegmentale Ebene ist genau die, die diese App bearbeitet — Ton und Betonung. Die
Literatur legt also nahe, dass gerade hier der geringste automatisierte Effekt zu erwarten
ist.

**Ehrlich dazu:** Die App macht das methodisch Richtige (Sollwert aus geprüften Daten,
kein Score, benannte Grenzen). Aber B-2 gilt weiter: **die Sprechübung wurde nie an einer
echten menschlichen Stimme abgenommen** — weder im Browser mit physischem Mikrofon noch
nativ. Alles, was über ihre Wirksamkeit gesagt wird, ist Ableitung aus Code und Tests.

---

### P10 — Bilder und Dual Coding

**(a) Mechanismus: vorhanden und didaktisch durchdacht.** `flashcard.tsx` platziert das
Bild richtungsabhängig: bei `X → Deutsch` erst beim Aufdecken (das Bild *ist* die
Bedeutung, vorne wäre es die Lösung), bei `Deutsch → X` schon vorn, weil es den Begriff
verstärkt, von dem aus abgerufen wird. Das ist genau die Überlegung, die man erwarten
würde.

**(b) Inhalt: trägt nicht — es gibt null Bilder.** 78 konkrete Vokabeln wären Kandidaten;
erzeugt wurden keine, der Bildlauf braucht einen Stability-Schlüssel (B-4). Die fünf
Testbilder wurden nach der Ablageprüfung wieder entfernt.

**Beleg.** Yanagisawa, Webb & Uchihara (2020) meta-analysierten 359 Effektstärken aus 42
Studien (N = 3.802): Lesen mit Glossen führte zu 45,3 % (unmittelbar) und 33,4 %
(verzögert) gelernten Wörtern gegenüber 26,6 % und 19,8 % ohne Glossen [S-19, Z].
Multimediale Unterstützung des Bedeutungszugangs wirkt also messbar — aber nur, wenn sie
existiert.

---

### P11 — Wortschatzumfang und Frequenzauswahl

**(a) Mechanismus: vorhanden, aber ungenutzt.** Der Skalierungsplan in `PROGRESS.md`
sieht ausdrücklich eine **Frequenzliste** als Wortquelle vor (Thai National Corpus bzw.
offene Listen), Abgleich mit CEFR A1–B1 und für die Gegenrichtung die
Goethe-Wortlisten — plus einen siebenstufigen Prüfschritt je Eintrag. Das ist der
richtige Plan. Er ist nicht ausgeführt.

**(b) Inhalt: trägt nicht — und das ist der wichtigste Einzelbefund.**

| Maßstab | Zahl | Quelle |
| --- | --- | --- |
| **Ist: App, je Sprache** | **79–85 Wörter** | selbst gezählt |
| **Ist: deutsche Seite gesamt** | **100 Stichwörter** | selbst gezählt |
| Goethe-Zertifikat A1, Wortliste | ~650 Einträge, davon etwa die Hälfte aktiv zu beherrschen | [S-14, Z] |
| CEFR A1 (X_Lex-Schätzung, Milton 2010) | < 1.500 Wörter | [S-20, Z] |
| CEFR A2 | 1.500–2.500 | [S-20, Z] |
| CEFR B1 | 2.500–3.250 | [S-20, Z] |
| Selbstständiges **Lesen** (98 % Abdeckung) | 8.000–9.000 Wortfamilien | Nation 2006 [S-11, Z] |
| Selbstständiges **Hören** | 6.000–7.000 Wortfamilien | Nation 2006 [S-11, Z] |
| Die ersten 1.000 Wortfamilien decken | 78–81 % eines geschriebenen Textes | [S-21, Z] |

**Das Verhältnis in einem Satz:** Der Wortschatz der App entspricht etwa **13 % der
Goethe-A1-Wortliste** und rund **1 %** dessen, was Nation für selbstständiges Lesen
veranschlagt. Das ursprüngliche Ziel von 1.000 Einträgen hätte A1 abgedeckt und A2
angekratzt; 84 decken nichts ab.

**Zur Zeitrechnung:** LanguageCert setzt für A1 und A2 je etwa 95 geführte Lernstunden
an, für B1 180 [S-22, V]. Die App bietet, großzügig gerechnet, wenige Stunden Material,
bevor sich alles wiederholt.

---

### P12 — Extensives Lesen und Hören

**(a) Mechanismus: fehlt.** Es gibt keinen Lesetext, keine Hörstrecke, keinen
Lesemodus.

**(b) Inhalt: entfällt.**

**Beleg.** Nakanishi (2015) fand über 34 Studien mit 3.942 Teilnehmenden einen mittleren
Effekt extensiven Lesens von d = 0,46 im Gruppenvergleich und d = 0,71 im
Vorher-Nachher-Vergleich [S-23, Z]. Das ist einer der bestbelegten und zugleich
billigsten Hebel im Fremdsprachenerwerb — und der einzige, der die Input-Menge liefert,
die P5 verlangt, ohne die Theoriestreitigkeiten um Krashen mitzuschleppen.

---

### P13 — Kennzeichnung dessen, was nicht belegt ist

Kein Prinzip aus der Lernforschung, aber lernwirksam genug, um es zu nennen: Die App
kennzeichnet unsichere Vokabeln (`sourceVerified: false` mit Grund), synthetische Stimmen
(„KI-Stimme — keine Muttersprachler-Aufnahme"), die Grenzen der Sprechmessung und die
Herkunft der Prüfungsstruktur samt Abrufdatum. Falsches prägt sich mit ein — ein falscher
Ton, über Monate durch FSRS wiederholt, ist teurer als eine Lücke. Diese Linie ist
konsequent durchgehalten und der Grund, warum der vorhandene Inhalt **vertrauenswürdig**
ist, auch wenn er wenig ist.

**Mechanismus: vorhanden. Inhalt: trägt.**

---

## 4. Die vier Fertigkeiten, einzeln

Kein Gesamturteil. Je Fertigkeit, je Sprachpaar, je Richtung.

### Lesen

| Paar | Mechanismus | Inhalt | Urteil |
| --- | --- | --- | --- |
| **de → th** | Karteikarte mit Thai-Schrift; `toneRule` mit sieben Herleitungsschritten aus 44 Konsonanten / 59 Vokalmustern; Tonfarben an der Umschrift | 84 Wörter, davon 69 einsilbig herleitbar; 84 Beispielsätze; keine Texte | **Am stärksten von allem.** Wer die Thai-Schrift lesen lernen will, bekommt hier echte Regelarbeit. Endet aber bei einsilbigen Wörtern: mehrsilbige werden nicht segmentiert (AE-38, offen). |
| **de → es** | Betonungsregel `stressRule`, gegengeprüft an 79/79 | 79 Wörter, 30 Wortgruppen, keine Sätze, keine Texte | Mechanismus sauber, Inhalt zu dünn für Lesekompetenz. |
| **de → en** | `spelling`: gleiche Schreibung, andere Aussprache | **23 Kandidaten** | Nach zwei Runden durch. |
| **th/es/en → de** | Karteikarte, Prüfungsmodule Lesen (A1/A2) | 100 deutsche Stichwörter; 4 Lese-Module | Für die Prüfungsvorbereitung ein echter, wenn auch winziger Anfang: die Formate sind vom Goethe-Einstufungstest abgeschaut, die Struktur belegt und mit Abrufdatum versehen. |

**Was für alle Paare fehlt:** ein einziger zusammenhängender Text. Extensives Lesen (P12)
ist der bestbelegte Hebel und ist gar nicht gebaut.

### Hören

| Paar | Mechanismus | Inhalt | Urteil |
| --- | --- | --- | --- |
| **de → th** | `tone` (5 Töne, geschlossene Auswahl, sofortige Auflösung); Vokabel- und Satzwiedergabe | 69 Kandidaten; **0 Clips**; im Testbrowser keine Thai-Stimme | **Die schwächste Stelle mit dem höchsten Anspruch.** HVPT braucht Sprechervariation [S-15]; hier spricht eine Stimme. Keine gemessene TTS-Stimme trifft alle fünf Töne (AE-31). Und der Kontrast mittel/tief ist für nicht-tonale Muttersprachler laut Wayland & Guion (2004) womöglich gar nicht trainierbar [S-17]. |
| **de → es** | `stressHear` | 65 Kandidaten; 0 Clips; keine spanische Stimme im Testbrowser | Mechanismus da, auf der geprüften Plattform nicht ausführbar. |
| **de → en** | `soundSpelling` | 23 Kandidaten; 0 Clips; keine englische Stimme im Testbrowser | dito, und noch dünner. |
| **X → de** | Prüfungsmodule Hören, gesprochen über de-DE-TTS | 2 Hörmodule | Läuft, weil de-DE die einzige installierte Stimme ist. Ironischerweise die einzige verlässlich funktionierende Hörübung der App. |

**Gemeinsamer Befund:** Der gesamte Hörpfad hängt an einer Sprachausgabe, die auf der
einzigen vollständig geprüften Plattform für alle drei Zielsprachen fehlt, und an Clips,
von denen null existieren. Das ist Mechanismus ohne Betriebszustand.

### Schreiben

| Paar | Mechanismus | Inhalt | Urteil |
| --- | --- | --- | --- |
| **beide Richtungen, alle drei Paare** | Freie Eingabe; Toleranz nach Damerau (1 Zeichen ab Länge 5) im Deutschen und Englischen, **Nulltoleranz im Thai**; geschützt bleiben Großschreibung, Umlaute, ß, Artikel, Tonzeichen, spanische Akzente; Thai-Zeichenpalette (44 Konsonanten, 17 Vokalzeichen, 4 Tonzeichen) wegen fehlender Tastaturbelegung (AE-39); **speist als einzige Übung FSRS** (AE-40) | Alle 248 Vokabeln, beide Richtungen | **Der beste Teil der App.** Genau der Aufgabentyp, den AE-16 als den sauberen bezeichnet, und die einzige Stelle, an der Abruf, Rückmeldung und Wiederholungsplanung zusammenlaufen. |

**Was fehlt:** Schreiben endet beim Einzelwort. Kein Satz, keine Wortgruppe, kein Text.
Die beiden `production`-Module der Prüfung stellen Schreibaufgaben, werden aber
**bewusst nicht bewertet** (AE-20, keine Bestehensgrenzen erhoben). Ein Lernender schreibt
dort ins Leere.

### Sprechen

| Paar | Mechanismus | Inhalt | Urteil |
| --- | --- | --- | --- |
| **de → th** | Lokale F0-Konturmessung, Sollton aus verifizierter Silbe, qualitative Rückmeldung ohne Score, fünf benannte Grenzen, Aufnahme verlässt das Gerät nicht | 69 einsilbige Wörter | Methodisch vorbildlich, empirisch **nie an einer menschlichen Stimme geprüft** (B-2). Die Literatur erwartet auf der suprasegmentalen Ebene ohnehin nur kleine Effekte [S-18]. |
| **de → es / de → en** | **fehlt vollständig** | — | Ob das F0-Verfahren spanische Betonung erkennt, ist ungeprüft (AE-48) und laut eigenem Protokoll vor jedem Umbau zu **messen**, nicht anzunehmen. |
| **X → de** | **fehlt** | 1 Prüfungsmodul `sprechen`, unbewertet | Wer Deutsch lernt, hat keine Sprechübung. |

**Gemeinsam:** Kein Gegenüber, keine Bedeutungsaushandlung, kein Sprechen über die Silbe
hinaus. Interaktion, die laut Mackey & Goo große Effekte trägt [S-12], gibt es nicht.

---

## 5. Bekannte Grenzen — und drei Korrekturen am Auftragstext

Der Auftrag verlangt, die eigenen protokollierten Grenzen nicht zu unterschlagen. Hier
sind sie, jede am Repo nachgeprüft. Drei stimmen so nicht — in zwei Fällen ist die Lage
**schlechter** als im Auftrag beschrieben.

| Im Auftrag genannt | Nachgeprüft | Befund |
| --- | --- | --- |
| 84 TH / 85 EN / 79 ES statt 1000 | ✔ bestätigt | 248 gesamt, 100 verschiedene deutsche Stichwörter. |
| „15 Sprachsituationen statt ~512" | ✘ **falsch** | **Es sind null.** `.agent/state.json → situations.generated: 0`; es gibt keinen Seed und keine Datei mit Situationen. Zwei wurden zum Prüfen der Offline-Wiedergabe eingespielt und wieder entfernt. Ein Testlauf mit gültigem Schlüssel fand am 2026-08-31 auf dem Gerät des Nutzers statt — „die Zahlen des Laufs liegen nicht vor" (Konsolidierte Abnahme, Phase 4). Woher die 15 stammen, ist im Repo nicht belegt. |
| kein natives Audio; keine TTS-Stimme trifft alle fünf Thai-Töne (AE-31) | ✔ bestätigt, und schärfer | Zusätzlich: **null Hörclips ausgeliefert**; die beiden Anbieter der App (Gemini, ChatGPT) wurden nie gemessen (B-6); gemessen wurden drei fremde Stimmen, davon realisiert Google den steigenden Ton nicht. |
| Sprechübung nie an echter menschlicher Stimme geprüft (B-2) | ✔ bestätigt | Weder Browser-Mikrofon physisch noch nativ. |
| Auswahlübungen speisen kein FSRS (AE-16) | ✔ bestätigt | 7 von 8 Übungstypen tragen nichts zur Wiederholungsplanung bei. Zur Bewertung siehe P3 — die Entscheidung ist verteidigbar, die Nebenannahme „Auswahl bringt nichts" ist es nicht [S-6]. |
| FSRS-Gewichte sind Näherungswerte, nie an Logs optimiert | ⚠ **ungenau** | Es sind **exakt die veröffentlichten FSRS-v4-Vorgabewerte**, kombiniert mit der Vergessenskurve von FSRS-4.5 [S-2]. Nicht „genähert", sondern zwei Generationen alt und quer kombiniert. Nie an Logs optimiert: bestätigt. |
| keine Beispielsätze und keine Sprachsituationen für EN/ES | ⚠ **teilweise** | Englisch: **0** Beispiele, bestätigt. Spanisch: **30** Einträge mit `exampleTerm`, aber das sind Wortgruppen aus Artikel + Substantiv (`el libro`), keine Sätze. Der Auftrag hat für „Sätze" recht; „keine Beispiele" wäre für Spanisch falsch. |
| Prüfungsmodul nur X→Deutsch | ✔ bestätigt, und mehr | Zusätzlich: Der Prüfungs-Screen **filtert nicht nach Sprache**; alle Module tragen `direction: 'th_to_de'`, obwohl ihr Inhalt für jedes X→Deutsch gilt. Und: keine Bestehensgrenzen, weil die Durchführungsbestimmungen bewusst nicht erhoben wurden (AE-20) — die App darf deshalb nie „bestanden" sagen. Von 8 Modulen sind 6 mit 20 Aufgaben automatisch bewertbar; 2 sind unbewertete Produktionsaufgaben. |
| *(im Auftrag nicht genannt)* | — | **Null Bilder ausgeliefert.** Der gesamte Dual-Coding-Pfad (P10) ist Mechanismus ohne Inhalt. |

---

## 6. Gegenrede: Warum ein kritischer Sprachdidaktiker sagen würde, dass diese App nicht zum Ziel führt

Ausformuliert, nicht entkräftet.

**1. „Sie hat kein Curriculum, sondern eine Wortliste."**
Es gibt keine Progression, kein Lernziel, keine Reihenfolge, in der Dinge aufeinander
aufbauen. Es gibt 248 Vokabeln, sechs Richtungen und acht Übungen. Was jemand nach vier
Wochen können soll, steht nirgends — weder in der App noch im Protokoll. Ein
Sprachkurs beantwortet diese Frage in der ersten Stunde.

**2. „Der Wortschatz ist nicht frequenzsortiert, also lernt man die falschen Wörter."**
Der Skalierungsplan sieht Frequenzlisten vor, aber die vorhandenen 248 Einträge sind
thematisch entstanden. Die ersten 1.000 Wortfamilien decken rund 80 % eines Textes
[S-21] — das ist der Grund, warum Frequenz die richtige Reihenfolge ist. Ohne sie ist
selbst ein perfekt geplantes Wiederholen Aufwand auf beliebige Ziele.

**3. „Sie trainiert Erkennen, nicht Können."**
Sieben von acht Übungen sind Ankreuzen. Die einzige Produktionsübung endet beim
Einzelwort. Kein Satz wird je produziert und korrigiert. Wer alle Übungen der App perfekt
beherrscht, kann in keiner der drei Sprachen einen Satz sagen — er kann Töne benennen,
Artikel wählen und Einzelwörter tippen.

**4. „Ihre Kernfertigkeit steht auf einer Stimme, die selbst falsch spricht."**
Die Tonhörübung ist das didaktische Herz der Thai-Seite. Sie läuft über eine
Systemstimme oder eine KI-Stimme. Die eigene Messung (AE-31) sagt: keine gemessene Stimme
realisiert alle fünf Töne; mittel und hoch sind bei zwei Stimmen kaum getrennt, Google
hat keinen steigenden Ton. HVPT verlangt außerdem **mehrere** Sprecher [S-15] — hier ist
es immer einer. Ein Didaktiker würde sagen: Diese Übung kann Falsches einschleifen, und
das ist schlimmer als keine Übung.

**5. „Es gibt keinen Menschen."**
Interaktion mit Bedeutungsaushandlung und korrektiver Rückmeldung trägt große,
in verzögerten Tests noch deutlichere Effekte [S-12]. Die App hat davon strukturell
nichts und kann es auch nicht bekommen, solange sie offline und ohne Schlüssel laufen
soll. Die Sprachsituationen wären der Ersatz — und es sind null.

**6. „Sie misst ihren eigenen Erfolg nicht."**
Es gibt keinen Einstufungstest, keinen verzögerten Nachtest, keine Messung, ob jemand
etwas behalten hat. Der Fortschritts-Screen zeigt Kartenzustände und Serien — das misst
Nutzung, nicht Kompetenz. Und die FSRS-Gewichte wurden nie an eigenen Logs optimiert,
obwohl die Logs anfallen.

**7. „Der Aufwand steckt an der falschen Stelle."**
Achtzehn Phasen, 712 Tests, eine Anbieterabstraktion für vier KI-Anbieter, eine
Blob-Ablage, eine lokale F0-Analyse, ein Migrationspfad, drei Sprachmerkmale mit je
eigener Gegenprobe — und 248 Vokabeln. Ein Didaktiker würde das Verhältnis von
Infrastruktur zu Inhalt für die eigentliche Diagnose halten.

### Wäre ein Lernender mit Anki plus wöchentlichem Tandempartner besser dran?

**Ja. Deutlich, und ohne Einschränkung — beim heutigen Inhaltsstand.**

- **Anki** bringt denselben Mechanismus mit, nur besser: FSRS-6 mit 21 optimierbaren
  Parametern statt eines v4-Satzes von 2023er-Vintage, an den eigenen Logs optimierbar,
  gemessen an 9.999 Sammlungen und 350 Millionen Wiederholungen [S-3]. Dazu fertige
  Thai-Decks mit tausenden Karten, viele davon mit **Muttersprachler-Aufnahmen** statt
  KI-Stimmen — womit auch der HVPT-Einwand entfiele, sobald ein Deck mehrere Sprecher
  mitbringt. Der Wortschatzvorsprung ist ein Faktor 20 bis 50.
- **Der wöchentliche Tandempartner** liefert genau das, was die App strukturell nicht
  kann: Interaktion mit Bedeutungsaushandlung und korrektiver Rückmeldung [S-12, S-7],
  echte Produktion auf Satzebene, und ein Ohr, das beurteilen kann, ob ein Ton richtig
  war — was keine F0-Kontur leisten kann und was diese App ausdrücklich nicht behauptet.

**Was diese App dagegen hat, das die Kombination nicht hat:** die Tonherleitung aus der
Schrift mit sieben nachvollziehbaren Schritten und einer 69/69-Gegenprobe (AE-36/AE-37),
die spanische Betonungsregel mit unabhängiger IPA-Gegenprobe (AE-45) und die
durchgehende Kennzeichnung dessen, was nicht belegt ist. Das ist echtes, nicht
triviales, sauber recherchiertes didaktisches Material — und es sind drei Bausteine, kein
Kurs.

**Fazit der Gegenrede:** Die App ist heute kein Ersatz für Anki + Tandem, sondern
bestenfalls eine **Ergänzung** dazu, und zwar für genau eine Sache: das Erlernen des
thailändischen Schriftsystems und der Tonregeln. Das sagt nichts gegen die Bauweise; es
sagt alles über die Inhaltsmenge.

---

## 7. Was ganz fehlt

Nicht aus der Featureliste zurückgeschlossen, sondern aus der Forschungsliteratur
zusammengetragen und dann gegen das Repo gehalten.

| Was die Forschung als wirksam nennt | Beleg | In der App |
| --- | --- | --- |
| **Extensives Lesen** — d = 0,46 (Gruppen), 0,71 (Vorher-Nachher) über 34 Studien | [S-23] | **fehlt vollständig.** Kein Text, kein Lesemodus. |
| **Extensives Hören / zusammenhängende Rede** | [S-11] (Hörschwelle 6.000–7.000 Wortfamilien) | **fehlt.** Längste Hörstrecke ist ein Beispielsatz. |
| **Interaktion mit Bedeutungsaushandlung** — große Effekte, besonders verzögert | [S-12] | **fehlt strukturell.** |
| **Korrektive Rückmeldung auf freie Produktion** — d = 0,64 | [S-7] | **fehlt.** Rückmeldung nur auf App-gestellte Aufgaben; die beiden `production`-Prüfungsmodule bleiben unbewertet (AE-20). |
| **Sprechervariation im Wahrnehmungstraining** — Kernbedingung von HVPT | [S-15, S-16] | **fehlt.** Immer eine Stimme. |
| **Frequenzbasierte Wortauswahl** — erste 1.000 decken ~80 % | [S-21] | **geplant, nicht ausgeführt.** |
| **Wortschatzmenge für funktionale Kompetenz** — 6.000–9.000 Wortfamilien; A1 ~650 Goethe-Einträge / <1.500 (Milton) | [S-11, S-14, S-20] | **248 gesamt, 100 deutsche Stichwörter.** ~13 % von A1. |
| **Formelhafte Wendungen / Chunks** als früher Zugang | (in der App über Beispielsätze angelegt) | **nur Thai (84 Sätze), sonst nichts.** |
| **Grammatikprogression** über Genus und Stammformen hinaus | [S-13] (explizite Instruktion wirkt) | **fehlt.** Keine Wortstellung, keine Zeiten, keine Fälle, keine Klassifikatoren. |
| **Verzögerte Erfolgsmessung / Einstufung** | [S-5] (Abfall auf 25,1 % im verzögerten Test zeigt, warum man verzögert messen muss) | **fehlt.** Kein Test, keine Einstufung, keine Bestehensgrenzen. |
| **Lernzielsetzung und Bedarfsanalyse** | LanguageCert: A1/A2 je ~95 geführte Stunden [S-22] | **fehlt.** Die App sagt nirgends, wo jemand steht oder wie weit es noch ist. |
| **Optimierung des Wiederholungsplaners an eigenen Daten** | [S-3] | **fehlt**, obwohl das Tagesprotokoll die Daten sammelt. |

---

## 8. Priorisiert: Was bringt pro Aufwand den größten Lernzuwachs

Begründet, nicht nach Bauchgefühl. Aufwand grob geschätzt; „Hebel" heißt: erwarteter
Zuwachs an tatsächlicher Sprachkompetenz.

### 1. Wortschatz auf ~650–1.000 Einträge je Sprache, frequenzsortiert — **Hebel: sehr groß, Aufwand: groß**

Das ist der einzige Punkt, der die Kernaussage dieses Audits ändert. Alles andere in der
App ist ein Multiplikator auf die Inhaltsmenge: ein perfekter Wiederholungsplaner auf 84
Vokabeln bleibt ein Planer für 84 Vokabeln. 650 Einträge entsprechen der
Goethe-A1-Wortliste [S-14], 1.000 kratzen an A2 [S-20]. Der Plan steht fertig in
`PROGRESS.md` (Frequenzliste → siebenstufiger Prüfschritt → Blöcke von 50–100 mit
je eigenem Commit, Blöcke unter 90 % Verifikationsquote zurück in die Sichtung). Es ist
Fleißarbeit mit bestehender Werkzeugkette, kein Entwurfsproblem.
**Warum zuerst:** Jeder andere Punkt dieser Liste wird durch ihn wertvoller; er wird
durch keinen anderen wertvoller.

### 2. Freie Eingabe für die Grammatikübungen — **Hebel: groß, Aufwand: klein**

Artikel und Perfektform tippen statt anklicken. Die gesamte Maschinerie existiert:
`writing/compare.ts` mit Toleranzlogik, `writing/rating.ts` mit der Abbildung auf
FSRS-Bewertungen, `writing/session.ts` mit dem Schreibweg in denselben Kartenschlüssel.
Es geht darum, zwei bestehende Aufgabentypen auf den bestehenden Schreibpfad zu legen.
**Warum so weit oben:** Damit tragen statt einer plötzlich drei bis vier Übungen zur
Wiederholungsplanung bei, das Rateproblem aus AE-16 verschwindet an diesen Stellen von
selbst, und die Rückmeldungsbedingung, unter der Produktion die Auswahl schlägt, ist
schon erfüllt [S-6].

### 3. Hörclips erzeugen — und zwar mit mehreren Stimmen — **Hebel: groß, Aufwand: mittel**

Erst damit funktioniert der Hörpfad überhaupt auf Geräten ohne installierte Zielstimme —
und das ist die einzige geprüfte Plattform. Entscheidend ist die Erweiterung gegenüber
dem bestehenden TODO-Punkt: **nicht eine Stimme, sondern mehrere**, weil Sprechervariation
die namensgebende Bedingung von HVPT ist [S-15]. Der Clip-Planer und die Blob-Ablage
tragen das bereits; es fehlt der Schlüssel (B-6) und eine Stimmen-Schleife im Lauf.
**Und danach messen:** die erzeugten Clips durch `scripts/tone-contour.html` ziehen und
gegen AE-31 halten, bevor irgendwo steht, dass die Töne stimmen.

### 4. Beispielsätze für Englisch und Spanisch — **Hebel: mittel, Aufwand: mittel**

84 Thai-Sätze gegen 0 und 30 Wortgruppen. Sätze liefern Kontext, Wortstellung und
formelhafte Wendungen in einem — und sie sind die Vorstufe zu jedem Lesetext. Mit der
Disziplin aus Phase 2: aus verifizierten Wörtern zusammengesetzt, die Zusammensetzung als
ungeprüft gekennzeichnet.

### 5. Ein Lesemodus mit zusammenhängenden Texten — **Hebel: mittel bis groß, Aufwand: mittel**

Extensives Lesen ist einer der bestbelegten Hebel überhaupt [S-23] und in dieser App
gar nicht vorhanden. Sinnvoll erst ab Punkt 1, weil ein Text aus 84 bekannten Wörtern
keiner ist. Die Prüfungs-Textbausteine zeigen, dass der Weg gangbar ist.

### 6. Sprachsituationen tatsächlich erzeugen und ausliefern — **Hebel: mittel, Aufwand: mittel**

Der Generator ist fertig und deterministisch fortsetzbar; der `FULL_RUN` plant 512
Situationen, ausgeliefert sind null. Für Englisch und Spanisch fehlt zusätzlich ein
eigener Aufgabentext samt Recherche zu verbindlichen Anredeformen (AE-48) — das ist
Quellenarbeit wie Phase 7, keine Übersetzung.
**Ehrlich dazu:** Vorproduzierte Dialoge sind kein Ersatz für einen Gesprächspartner
[S-12]. Sie sind Input, nicht Interaktion.

### 7. FSRS-Gewichte auf einen aktuellen Satz heben — **Hebel: klein, Aufwand: sehr klein**

17 Zahlen ersetzen (FSRS-5: 19 Werte, FSRS-6: 21) oder wenigstens die FSRS-4.5-Werte
nehmen, die zur implementierten Kurve gehören [S-2]. Danach — und das ist der eigentliche
Gewinn — die Gewichte an den eigenen Logs optimieren, die das Tagesprotokoll ohnehin
sammelt.
**Warum trotz Kleinstaufwand nicht höher:** Ein besserer Planer auf 248 Vokabeln spart
Minuten pro Woche. Der Punkt gehört erledigt, weil er billig ist, nicht weil er trägt.

### 8. Prüfungsmodule für Englisch und Spanisch, Sprachfilter im Prüfungs-Screen — **Hebel: klein, Aufwand: groß**

Cambridge/IELTS und DELE/Cervantes brauchen dieselbe Quellenarbeit wie Goethe in Phase 7,
inklusive der Disziplin, keine Bestehensgrenzen zu erfinden. Großer Rechercheaufwand für
einen Nutzen, der erst bei deutlich mehr Wortschatz eintritt.

### Ausdrücklich **nicht** empfohlen

- **Die Sprechübung auf Spanisch ausweiten**, bevor gemessen ist, ob das F0-Verfahren
  spanische Betonung erkennt (AE-48). Das eigene Protokoll sagt: messen, nicht annehmen.
- **Die Auswahlübungen an FSRS anschließen**, ohne sie auf freie Eingabe umzustellen. Das
  Rateproblem aus AE-16 ist echt, und ein geratenes „Gut" verlängert Intervalle für etwas,
  das nie abgerufen wurde.
- **Mehr Infrastruktur.** Das Verhältnis von Gerüst zu Inhalt ist die Diagnose, nicht die
  Lösung.

---

## 9. Was aus dieser Position nicht beurteilbar ist

Ausdrücklich benannt, weil es sonst wie ein Urteil aussähe:

1. **Ob eine Thai-Stimme für ein menschliches Ohr richtig klingt.** Eine F0-Konturmessung
   sagt, ob die Tonhöhe die erwartete Richtung nimmt — nicht, ob ein Muttersprachler die
   Silbe als richtig hört. Vokallänge, Stimmqualität und Silbenendrand bleiben
   unbewertet (AE-31 sagt das selbst). Dieser Rechner hat keine Thai-Stimme installiert;
   selbst Hören wäre keine Messung.
2. **Ob die Sprechrückmeldung Lernenden hilft.** Sie wurde nie an einer echten
   menschlichen Stimme ausgeführt (B-2). Ob die Kontur eines realen Sprechers messbar ist,
   ob die Oktavkorrektur reicht, ob „Register offen" verständlich ist — alles offen.
3. **Ob die App auf einem Gerät läuft wie im Browser.** Nativer Bildpfad, native
   Clip-Ablage, `useAudioStream`, Mikrofonfreigabe: typgeprüft, nicht ausgeführt (B-2).
4. **Ob die generierten Sprachsituationen didaktisch brauchbar sind.** Es existiert keine.
   Der Testlauf des Nutzers vom 2026-08-31 ist bestätigt, aber ohne Zahlen und ohne
   Artefakt im Repo.
5. **Ob die Bilder ihre Motive treffen.** Null erzeugt.
6. **Ob die Anbieter (Gemini, ChatGPT) brauchbares Thai-Audio liefern.** Nie gemessen
   (B-6). Gemessen wurden drei andere Stimmen.
7. **Der Lernerfolg selbst.** Keine Lernenden, keine Logs, keine Retentionsmessung. Dieses
   Audit vergleicht Bauweise mit Literatur — mehr nicht.
8. **Ob die FSRS-Abweichung in der Praxis schadet.** Ohne echte Wiederholungslogs ist die
   Aussage „plant enger als FSRS-4.5" rechnerisch richtig und praktisch unbewertet.
9. **Ob Wayland & Guion (2004) auf deutsche Muttersprachler übertragbar sind.** Die Studie
   prüfte englische und chinesische Muttersprachler. Deutsch ist wie Englisch nicht tonal,
   die Übertragung ist plausibel — belegt ist sie nicht.
10. **Effektstärken aus [Z]-Quellen.** Wo nur die Zusammenfassung eines Suchindex
    erreichbar war, ist die Zahl nicht mit eigenen Augen im Original gelesen. Das betrifft
    die meisten Metaanalysen in Abschnitt 11.

---

## 10. Beim Prüfen aufgefallen — aufgeschrieben, nicht behoben

| Nr. | Befund | Fundstelle |
| --- | --- | --- |
| **F-1** | Der Auftragstext nennt „15 Sprachsituationen"; im Repo sind es **null**, und es gibt keinen Beleg für die 15. | `.agent/state.json → situations.generated`, `src/lib/repository.ts:151` |
| **F-2** | `DEFAULT_WEIGHTS` sind die veröffentlichten **FSRS-v4**-Vorgabewerte, nicht eine „Näherung"; die Vergessenskurve daneben ist die von **FSRS-4.5**. Der Modulkommentar beschreibt beides ungenau. | `src/lib/fsrs/fsrs.ts:9-14`, `:29-31` |
| **F-3** | Der Prüfungs-Screen filtert nicht nach Sprache. Alle Module tragen `direction: 'th_to_de'`, obwohl ihr Inhalt (Deutsch) für jedes X→Deutsch gilt. Ein spanischsprachiger Lernender sieht Module, die nach Thai aussehen. | `src/app/exam.tsx`, `src/data/exam-modules.ts` — im Protokoll als offen vermerkt |
| **F-4** | Die Übersicht zählt 8 Prüfungsmodule; automatisch bewertbar sind 6 mit 20 Aufgaben. Die beiden `production`-Module nehmen eine Antwort entgegen und bewerten sie nie (AE-20, bewusst). Für Lernende ist der Unterschied vor dem Start nicht erkennbar. | `src/data/exam-modules.ts:230`, `:267` |
| **F-5** | Auf der einzigen vollständig geprüften Plattform (Testbrowser) ist **keine** der drei Zielstimmen installiert. Die Hörübungen aller drei Sprachen laufen dort nur bis zum Warnpfad. Zusammen mit 0 Clips heißt das: der komplette Hörpfad ist nirgends im Betrieb belegt. | `src/components/drill-runner.tsx` (`voiceMissing`), `.agent/state.json → openBlockers B-2` |
| **F-6** | Die englische Merkmalsübung hat 23 Kandidaten, die Verbformen-Übungen 18–20. Bei 10 Aufgaben je Runde ist der Bestand nach zwei Runden vollständig gesehen. Die Oberfläche weist die Kandidatenzahl aus (`available`), sagt aber nicht, was sie bedeutet. | `DRILL_SESSION_SIZE` in `src/lib/drills/session.ts:47`; Kandidatenzahlen selbst nachgezählt |
| **F-7** | Sprechübung nur Thai, nur einsilbig: 69 von 84 Thai-Einträgen; für 15 mehrsilbige und für Englisch/Spanisch gar keine. | `src/lib/speaking/domain.ts`, `.agent/state.json → speaking.candidates` |
| **F-8** | Der Bildpfad (`isConcrete`, 78 Kandidaten) und der Clip-Pfad sind vollständig gebaut, getestet und mit null Inhalt ausgeliefert. Für Lernende ist das nicht von „gibt es nicht" zu unterscheiden. | `.agent/state.json → images.generated`, `audioClips.generated` |

Keiner dieser Punkte wurde geändert. `npm test` steht unverändert bei 712 grünen Tests.

---

## 11. Quellen

Alle am **2026-09-05** abgerufen.
**[V]** = Abstract/Volltext im Wortlaut gelesen · **[Z]** = nur über
Suchindex-Zusammenfassung erreicht (Bezahlschranke oder PDF in dieser Umgebung nicht in
Text wandelbar); Zahlen daraus sind im Fließtext entsprechend gekennzeichnet.

| Nr. | Quelle | Zugriff |
| --- | --- | --- |
| **S-1** | Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132(3), 354–380. — <https://www.yorku.ca/ncepeda/publications/CPVWR2006.html>, PDF: <https://augmentingcognition.com/assets/Cepeda2006.pdf> | [Z] |
| **S-2** | FSRS-Wiki, „The Algorithm" (Vorgabeparameter je Version, Vergessenskurve FSRS-4.5). — <https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm> | [V] |
| **S-3** | Expertium, „Benchmark of spaced repetition algorithms" (9.999 Sammlungen, 349.923.850 Wiederholungen; FSRS-6 gegen SM-2). — <https://expertium.github.io/Benchmark.html> | [V] |
| **S-4** | Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: A meta-analysis of practice testing. *Review of Educational Research*, 87(3), 659–701. — <https://eric.ed.gov/?id=EJ1141817> (Verlagsseite lieferte HTTP 403) | [Z] |
| **S-5** | Webb, S., Yanagisawa, A., & Uchihara, T. (2020). How effective are intentional vocabulary-learning activities? A meta-analysis. *The Modern Language Journal*, 104(4). — <https://onlinelibrary.wiley.com/doi/abs/10.1111/modl.12671>, <https://eric.ed.gov/?id=EJ1277328> | [Z] |
| **S-6** | Kang, S. H. K., McDermott, K. B., & Roediger, H. L. (2007). Test format and corrective feedback modify the effect of testing on long-term retention. *European Journal of Cognitive Psychology*, 19(4–5), 528–558. — <https://notes.andymatuschak.org/zTxLkeaWCdBHQYW73o5n6Ka> | [Z] |
| **S-7** | Li, S. (2010). The effectiveness of corrective feedback in SLA: A meta-analysis. *Language Learning*, 60(2), 309–365. — <https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-9922.2010.00561.x>, <https://eric.ed.gov/?id=EJ883422> | [Z] |
| **S-8** | VanPatten, B., & Williams, J. (Hrsg.). *Theories in Second Language Acquisition: An Introduction* (Beobachtung: Input ist notwendig; Rolle des verständlichen Inputs ist keine Theorie). — <https://www.routledge.com/Theories-in-Second-Language-Acquisition-An-Introduction/VanPatten-Keating-Wulff/p/book/9781032792347>, Rezension: <https://tesl-ej.org/wordpress/issues/volume12/ej46/ej46r6/> | [Z] |
| **S-9** | Kritik an Krashen (Unfalsifizierbarkeit; fehlender Mechanismus): Gregg (1984), McLaughlin (1987), zusammengefasst u. a. bei Lai, W. — *A Critical Evaluation of Krashen's Monitor Model*, TPLS 9(11). — <https://www.academypublication.com/issues2/tpls/vol09/11/13.pdf>; Überblick: <https://en.wikipedia.org/wiki/Input_hypothesis> | [Z] |
| **S-10** | „Beyond comprehensible input: a neuro-ecological critique of Krashen's hypothesis in language education." *Frontiers in Psychology* (2025). — <https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1636777/full> | [V] |
| **S-11** | Nation, I. S. P. (2006). How large a vocabulary is needed for reading and listening? *The Canadian Modern Language Review*, 63(1), 59–82. — <https://www.lextutor.ca/cover/papers/nation_2006.pdf>, <https://eric.ed.gov/?id=EJ750537> | [Z] |
| **S-12** | Mackey, A., & Goo, J. (2007). Interaction research in SLA: A meta-analysis and research synthesis. In A. Mackey (Hrsg.), *Conversational Interaction in Second Language Acquisition* (28 Studien; große Effekte, deutlicher in verzögerten Nachtests). — <https://onlinelibrary.wiley.com/doi/10.1002/9781405198431.wbeal0551> | [Z] |
| **S-13** | Norris, J. M., & Ortega, L. (2000). Effectiveness of L2 instruction: A research synthesis and quantitative meta-analysis. *Language Learning*, 50(3), 417–528. — <https://eric.ed.gov/?id=EJ611436>, <https://onlinelibrary.wiley.com/doi/abs/10.1111/0023-8333.00136> | [Z] |
| **S-14** | Goethe-Institut, *Goethe-Zertifikat A1: Start Deutsch 1 — Wortliste* (~650 Einträge, davon etwa die Hälfte aktiv). — <https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf> — **Hinweis:** Das PDF ließ sich in dieser Umgebung nicht in Text wandeln; die Angabe stammt aus dem Suchindex **desselben** Dokuments. | [Z] |
| **S-15** | Uchihara, T., Karas, M., & Thomson, R. I. (2025). High variability phonetic training (HVPT): A meta-analysis of L2 perceptual training studies. *Studies in Second Language Acquisition*, 47(3), 794–827. (79 Studien; g = 0,92 Vorher-Nachher, g = 0,67 gegen Kontrolle). — <https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/high-variability-phonetic-training-hvpt-a-metaanalysis-of-l2-perceptual-training-studies/6ABB8C1F32D88D53EA8D05A4565E76F6> | [V] |
| **S-16** | Wang, Y., Spence, M. M., Jongman, A., & Sereno, J. A. (1999). Training American listeners to perceive Mandarin tones. *JASA*. — <https://kuppl.ku.edu/sites/kuppl/files/documents/publications/Wang_Spence_Jongman_Sereno_training_JASA_1999.pdf>; Produktionstransfer: Wang, Jongman & Sereno (2003) — <https://kuppl.ku.edu/sites/kuppl/files/documents/publications/Wang_Jongman_Sereno_training_production_JASA_2003.pdf> | [Z] |
| **S-17** | Wayland, R. P., & Guion, S. G. (2004). Training English and Chinese listeners to perceive Thai tones: A preliminary report. *Language Learning*, 54(4), 681–712. — <https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-9922.2004.00283.x> | [Z] |
| **S-18** | „The effectiveness of automatic speech recognition in ESL/EFL pronunciation: A meta-analysis." *ReCALL*. (großer Effekt segmental, kleiner suprasegmental; <4 Wochen selten wirksam). — <https://www.cambridge.org/core/journals/recall/article/effectiveness-of-automatic-speech-recognition-in-eslefl-pronunciation-a-metaanalysis/A915444CF252B61D14961D2FE733822D> | [Z] |
| **S-19** | Yanagisawa, A., Webb, S., & Uchihara, T. (2020). How do different forms of glossing contribute to L2 vocabulary learning from reading? *Studies in Second Language Acquisition*, 42(2), 411–438. (359 Effektstärken, 42 Studien, N = 3.802). — <https://waseda.elsevierpure.com/en/publications/how-do-different-forms-of-glossing-contribute-to-l2-vocabulary-le/> | [Z] |
| **S-20** | Milton, J. (2010). The development of vocabulary breadth across the CEFR levels. In *EUROSLA Monographs* 1, 211–232. (X_Lex: A1 < 1.500; A2 1.500–2.500; B1 2.500–3.250). — <https://www.eurosla.org/monographs/EM01/211-232Milton.pdf> — **Hinweis:** PDF in dieser Umgebung nicht in Text wandelbar; Angabe aus dem Suchindex desselben Dokuments. | [Z] |
| **S-21** | Lexikalische Abdeckung nach Frequenzbändern (erste 1.000 Wortfamilien 78–81 % geschriebener Text, zweite 1.000 +8–9 %). — <https://files.eric.ed.gov/fulltext/EJ887873.pdf>; Übersicht: <https://www.eapfoundation.com/vocab/general/> | [Z] |
| **S-22** | LanguageCert, „Guided Learning Hours" (A1 95, A2 95, B1 180, B2 180, C1 200, C2 250; ausdrücklich nicht kumulativ). — <https://www.languagecert.org/en/guided-learning-hours> | [V] |
| **S-23** | Nakanishi, T. (2015). A meta-analysis of extensive reading research. *TESOL Quarterly*, 49(1), 6–37. (34 Studien, N = 3.942; d = 0,46 / 0,71). — <https://onlinelibrary.wiley.com/doi/abs/10.1002/tesq.157>, <https://eric.ed.gov/?id=EJ1052150> | [Z] |
| **S-24** | Jiang, X., Rollinson, J., Plonsky, L., Gustafson, E., & Pajak, B. (2021). Evaluating the reading and listening outcomes of beginning-level Duolingo courses. *Foreign Language Annals*. — <https://onlinelibrary.wiley.com/doi/full/10.1111/flan.12600> — **Einordnung:** von Mitarbeitenden des untersuchten Anbieters verfasst; als Beleg für App-Wirksamkeit nur unter diesem Vorbehalt zu lesen. Im Text nicht als Beleg verwendet. | [Z] |

---

## Anhang: Prüfbefehle dieses Audits

```bash
npm test
```

```bash
grep -c "^    id: '" src/data/vocabulary.ts src/data/vocabulary-en.ts src/data/vocabulary-es.ts
```

```bash
grep -h "^    german: " src/data/vocabulary*.ts | sort -u | wc -l
```

```bash
grep -o "syllables: \[[^]]*\]" src/data/vocabulary.ts | awk -F'roman' '{print NF-1}' | sort | uniq -c
```

```bash
grep -c "exampleTerm:" src/data/vocabulary.ts src/data/vocabulary-en.ts src/data/vocabulary-es.ts
```

```bash
grep -c "taskType: '" src/data/exam-modules.ts; grep -c "correctIndex" src/data/exam-modules.ts
```
