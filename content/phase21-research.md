# Phase 21: Belege, Entscheidungen und Grenzen

**Aktualisierung 06.09.2026, AE-64:** Der Nutzer hat ungeprüfte Thai-Clips
ausdrücklich für Vokabelwiedergabe und die drei Satzmodi zugelassen. Tonerkennung
bleibt auf `passed` beschränkt, ohne System-TTS. Diese Produktentscheidung
ersetzt die unten historisch dokumentierte offene Rückfrage, nicht den
Forschungsbefund von C-0a. Kennzeichnung stammt jetzt je abgespieltem Clip aus
seinem Gate-Status. Der genehmigte Generierungslauf wartet nur auf den
Gemini-Schlüssel in der lokalen Sitzung; siehe `audio-run-2026-09-06.json`.

Abrufdatum aller folgenden Webquellen: **05.09.2026**. Forschungsaussagen,
lokale Messbefunde und Entscheidungen für die Übung sind getrennt dokumentiert.

## C-0a: Keine fachlich begründete pauschale Satz-Ausnahme

Die Behauptung „Sätze sind keine Tonprüfungsfälle“ wird in dieser Allgemeinheit
**abgelehnt**. Abramson und Svastikula finden in den untersuchten deklarativen
Thai-Sätzen trotz Intonation und Koartikulation alle fünf Tonkontraste wieder
(S. 150–152). Satzintonation macht falsche lexikalische Töne nicht bedeutungslos.
[Primärstudie, Haskins Status Report, PDF S. 154–156](https://files.eric.ed.gov/fulltext/ED236753.pdf).

Charnvivit et al. (2003) modellieren F0 als Zusammenspiel von Phrasenkomponente,
Silbenton und Sprecherbasis; auch die Tonspannweite hängt von Intonation ab.
Das stützt die engere Aussage: Ein ganzer Satz darf nicht anhand seines globalen
Anstiegs oder Falls wie ein isoliertes Wort bewertet werden. Es belegt keine
grundsätzliche Unmöglichkeit kontextbezogener Silbentonprüfung.
[Charnvivit et al., Abschnitte 1–2](https://www.isca-archive.org/eurospeech_2003/charnvivit03_eurospeech.pdf).

**Entscheidung:** Keine neue Durchlasskategorie aus dieser unzutreffenden
Prämisse ableiten. Das bisherige Wort-Tontor bleibt bestehen. Ungeprüfte
Satzclips bewusst auszuliefern wäre eine gesonderte Produktentscheidung,
kein Ergebnis dieser Forschung. Die zu Beginn gestellte Rückfrage ändert ohne
Antwort keine Auslieferungsregel. Satzübungen verwenden den bestehenden
Clip-/System-TTS-Resolver und kennzeichnen „Tonverlauf nicht geprüft“;
ohne verfügbares Audio bleiben Hörantworten gesperrt. Kein verdeckter Zugriff
auf ausgeschlossene lokale Entwürfe.

## C-0b: Ein Median ist noch keine Registerreferenz

Die Studie *Inter- and intraspeaker variability in fundamental frequency of
Thai tones* (1991) berichtet stärkere Unterschiede zwischen als innerhalb von
Sprechern und tonabhängige Variation. Das spricht für kontrollierte,
sprecherbezogene Daten, liefert aber keine universelle Mindestzahl von Clips
für unser TTS-Tor. Hier ist nur der öffentlich verfügbare Abstract ausgewertet.
[Primärstudie, Speech Communication](https://www.sciencedirect.com/science/article/abs/pii/016763939190003C).

`speaker-reference-audit.json`, reproduzierbar mit
`node scripts/content/measure-speaker-reference.cjs`, wertet die aktuellen
F0-Spuren aus. Pro Clip wird ein Median gebildet, anschließend werden Clips
gleich gewichtet; benachbarte Frames zählen nicht als unabhängige Aufnahmen.

| Stimme | Clips | Median der Clipmediane | Quartile | Spannweite |
| --- | ---: | ---: | --- | --- |
| Gemini Kore | 10 | 192,80 Hz | 166,89–220,72 Hz | 150,94–291,01 Hz |
| Microsoft Premwadee | 5 | 156,86 Hz | 156,86–160,00 Hz | 152,39–190,48 Hz |
| Microsoft Niwat | 5 | 131,15 Hz | 115,94–136,76 Hz | 115,94–150,94 Hz |

Der früher erwähnte Median von etwa 199 Hz ist kein unveränderlicher
Kalibrierwert: Kernversion, Gewichtung und einbezogene stimmhafte Abschnitte
beeinflussen den Wert. Ein enger Gesamtbereich kann ebenfalls täuschen: Zwei
verschiedene Premwadee-Töne haben im Vergleich dieselbe Kontur, die Stichprobe
enthält nur ein Token pro Wort/Ton. Gemini ist nicht nach Tönen ausgewogen.
Weder unabhängige Wiederholungen noch ein sprachlich annotierter Kontrollsatz
liegen vor. Aus diesen Daten lässt sich **keine belastbare Mindestzahl und
keine zulässige Streuung** ableiten.

Für eine positive Registerprüfung fehlen je Anbieter/Modell/Stimme getrennte,
unabhängig verifizierte Wiederholungen über alle fünf Töne, verschiedene
Lautumgebungen und Längen sowie zurückgehaltene Testaufnahmen. Erst daraus
lassen sich Tonüberlappung, Fehlerquote und erforderliche Stichprobengröße
bestimmen. Keine erfundene Mindestzahl; mittel/tief/hoch bleiben ungeprüft.

## C-0c: Vor dem Bezahlen sichtbare Prüfbarkeit

Der bestehende vollständige Plan enthält 462 eindeutige Clips: **22 Thai-Clips
tonprüfbar, 297 nicht-thailändische Clips nur technisch prüfbar, 0 Thai-Clips
ungeprüft ausgeliefert, 143 ausgeschlossen**. Höchstens 319/462 = **69,0 %**
können die aktuelle Pipeline passieren. Dies ist eine Obergrenze aus dem
Textplan, keine gemessene Erfolgswahrscheinlichkeit: fehlerhafte Konturen oder
Dateien können die tatsächliche Quote weiter reduzieren.

Die 143 Ausschlüsse: 81 Beispiel-/Dialogtexte, 15 mehrsilbige Wörter, 45
Registerfälle, 2 unzureichend belegte Wortbezüge. Vorschau und Gründe erscheinen
vor derselben einmaligen Kostenbestätigung; die Anzahl der kostenpflichtigen
Aufrufe zählt zusätzlich nur fehlende lokale Generierungen. Doppelte Clip-IDs
werden nicht doppelt gezählt. Kein Vollmengenlauf während dieses Umbaus.

## C0: Lerntheorie ohne Wirkungsversprechen

**Declarative/Procedural:** Ullman und Lovelett beschreiben ein theoretisches
Modell mit deklarativen und prozeduralen Gedächtnissystemen und leiten
Vorhersagen für verteiltes Lernen und Abrufübungen ab. Das begründet keine
Gleichsetzung „Wortkarte = deklarativ, Satzübung = nachgewiesen prozedural“ und
keinen Wirksamkeitsnachweis dieser App. Öffentlich zugänglicher Abstract,
Onlinepublikation 2016, Zeitschriftenjahrgang 2018.
[Ullman/Lovelett](https://journals.sagepub.com/doi/10.1177/0267658316675195).

**4/3/2:** Nation (1989) untersucht wiederholte Vorträge: Vorbereitung, derselbe
Inhalt, drei verschiedene Zuhörer, vier/drei/zwei Minuten; Zuhörer unterbrechen
nicht. Der Wechsel erhält einen Kommunikationszweck, ohne neue Informationen
für einen gelangweilten bekannten Zuhörer ergänzen zu müssen. Fallstudien zeigen
kurzfristige Veränderungen; schnelleres Sprechen kann auch Zeitdruck abbilden.
[Autorenarchiv](https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/paul-nations-publications/publications/documents/1989-Fluency.pdf),
[zugänglicher Volltext des Originalartikels](https://www.scribd.com/document/1066266480/Nation-1989).
Das Autoren-PDF war über den Abrufdienst nicht vollständig ladbar; der Wortlaut
wurde am Originalartikel in der zweiten Ablage geprüft.

**Shadowing:** Die systematische Übersicht enthält zunächst 44 Studien;
nach Zusammenführung mehrfach publizierter/zusammengehöriger Untersuchungen
werden 34 beschrieben. Hinweise auf Verbesserungen von Verständlichkeit,
Akzentwahrnehmung und einigen suprasegmentalen Merkmalen; Einzellaute bleiben
uneindeutig. Keine metaanalytische Garantie für Thai, diese kurzen Sätze oder
diese lokale Rückmeldung. Die Übersicht benennt eingeschränkte ökologische
Validität und wenige Vergleiche mit anderen Aussprachemethoden.
[Systematische Übersicht 2025](https://www.tandfonline.com/doi/full/10.1080/29984475.2025.2546827).

**Planung:** Li, Shadiev und Chiu untersuchen 25 Studien zu **GenAI-gestütztem**
ESL/EFL-Lernen (2.431 Teilnehmende), überwiegend Schreibaufgaben. Tabelle 5:
mit Planung g=0,98 (17 Studien), ohne g=0,28 (8). Moderatorvergleich,
kein randomisierter Nachweis, dass ein bestimmter Timer die Differenz erzeugt.
Interner Widerspruch: Fließtext nennt p<0,05 für „ohne Planung“, Tabelle 5 nennt
p=0,09 und ein Intervall über null. Daher keine pauschale Signifikanzbehauptung.
Keine Übertragung dieser Effektgrößen auf die App oder Thai.
[Verlagsfassung, Tabelle 5](https://link.springer.com/article/10.1007/s11528-025-01140-7).

## C1–C4: Umsetzung und genaue Anpassung

34 bestehende vollständige Satzlesarten, individuell mit Kontrastantworten
versehen. Shadowing startet das Vorbild erst nach erfolgreicher Mikrofonfreigabe;
Kopfhörer werden bestätigt, damit möglichst wenig Vorbild in die Aufnahme
gerät. Eine technische Trennung fremder und eigener Stimme wird nicht behauptet.
Mikrofondaten bleiben flüchtig lokal. Rückmeldung: Aufnahmedauer, messbare
Periodizität und längster zusammenhängender F0-Abschnitt. Keine Worterkennung,
Satzvollständigkeits-, Aussprache-, Flüssigkeits- oder FSRS-Note.

Wiederholungsmodus: **12/9/6 Sekunden**, Verhältnis 4:3:2 für einen kurzen Satz.
Kein Minutenmonolog; wechselnde Zuhörer, echte Mitteilungsabsicht und Transfer
auf neue Gespräche werden nicht reproduziert. Vorbereitung **15 Sekunden vor
jeder Produktion**, nicht abschaltbar; Bedeutung und Form planen, Satz vorher
hören. Zeiten sind Produktentscheidungen, keine erforschten optimalen Dauern.
Nach Aufnahmefehlern bleibt eine Wiederholung möglich. Beim Verlassen oder
Hintergrundwechsel werden Aufnahme und Wiedergabe beendet.

Hörverstehen zeigt vor der Antwort weder Thai-Text noch Umschrift. Die drei
deutschen Bedeutungen unterscheiden Rollen, Verneinung oder Frageinhalt.
Antworten sind bis zum Start eines verfügbaren Hörbeispiels gesperrt; danach
Auflösung samt Satz und Erklärung. Keine isolierte Worterkennungsaufgabe.

## C5: Audit der 84 Beispiele und Satzbildungslücken

Der Datenkopf von `src/data/vocabulary.ts` sagt ausdrücklich: Wörter geprüft,
Beispielsätze **nicht einzeln als ganze Sätze quellengeprüft**. Außerdem sind
einige Beispiele Mengenangaben, Nominalgruppen oder Formeln. Der neue
`sentence-data-audit.json` führt alle 84 Fälle mit Text, Bedeutung, Eignung,
Begründung, Wortquellen und gegebenenfalls Satzregel auf. Die 34 geeigneten
Satzlesarten wurden **regelbasiert nachvollzogen**, nicht als wörtliche
Korpusfundstellen oder menschlich geprüfte Aufnahmen umetikettiert. Original-
Vokabeln, IDs und `sourceVerified` bleiben unangetastet.

Grundregeln: [NIU SVO](https://seasite.niu.edu/Thai/maanii1/lesson1/structureUni.htm),
[Fragen und Verneinung](https://seasite.niu.edu/thai/FLTH/1styearthai.htm),
[stative Prädikate und Nominalgruppen](https://seasite.niu.edu/thai/maanii1/lesson6/structure.htm),
[Wunschkomplemente](https://seasite.niu.edu/Thai/spokenthai/unit2/word_study.htm),
[geben und Empfänger](https://seasite.niu.edu/thai/maanii1/lesson15/dai/hai.htm).
Die geprüften Einzelwortquellen stehen je Auditfall. Fragen haben die
Fragewörter an ihrer Funktionsstelle; Negation steht vor dem Prädikat.
Adjektivische Prädikate brauchen keine pauschal ergänzte Kopula; Nomen plus
Adjektiv kann kontextabhängig auch eine Nominalgruppe sein. Deshalb wird die
vorhandene Satzlesart ausdrücklich beibehalten, nicht als einzige Lesart behauptet.

Systematische Lücken des Wortbestands:

- **Zählen:** Zahlen und Nomen sind vorhanden, eine Zuordnung von Nomen zu
  Klassifikatoren fehlt. `คน` steht als Person im Wortschatz; das ersetzt kein
  Klassifikatorwissen. Das Mango-Beispiel im Auftrag hat die Reihenfolge falsch:
  gewöhnlich **Nomen + Zahl + Klassifikator**, nicht Klassifikator zwischen Zahl
  und Nomen. „Mango“ selbst fehlt ebenfalls im Grundstock. Zahlen vor Zeitmaßen
  wie „zwei Tage“ sind kein Gegenbeweis; deren Einheiten funktionieren anders.
  [NIU Word Study, Classifiers/Time](https://seasite.niu.edu/Thai/spokenthai/unit2/word_study.htm),
  [Royal Institute, Struktur des Nominalausdrucks](https://www.orst.go.th/FILEROOM/CABROYINWEB/DRAWER004/GENERAL/DATA0000/00000654.FLP/html/68/).
- **Fragen/Antworten:** Vorhandene Fragewörter ersetzen keine Regeln für
  Ja/Nein-Fragen, Verbwiederholung in Antworten oder kontextgerechte Partikeln.
  Ein pauschales „ja“ passt nicht als einziges Antwortmuster.
- **Ort/Zeit/Aspekt:** `gehen + Haus` belegt nicht automatisch idiomatisches
  „nach Hause“; Lokativkonstruktionen und zeitliche/Aspektpartikeln fehlen im
  Modell. Der betreffende Beispielsatz wird nicht automatisch freigegeben.
- **Valenz/Referenz:** Geben verlangt Wissen über Gegenstand/Empfänger;
  Rollenreihenfolge, nicht markierter Numerus/Artikel und kontextabhängige
  Pronomen lassen sich nicht aus einer deutschen Wortliste ablesen.
- **Beleglücken:** `ร้าน` und `นอน` sind im vorhandenen Wortvertrag nicht
  vollständig quellenverifiziert. Betroffene neue Satzaufgaben bleiben außen.

Es werden hier keine neuen Thai-Lemmata oder erfundenen Tondaten eingeführt.
Klassifikator- und Gebrauchsdaten benötigen später eigene Quellen pro Eintrag;
der dokumentierte Befund wird nicht als vollständiger Grammatikausbau ausgegeben.

## C6: Grenze im Lernbildschirm

In allen drei Satzmodi steht, dass kein unvorhersehbares Gegenüber nachfragt
oder Umformulieren erzwingt und die App allein für echte Gespräche nicht genügt.
Vorbereitung und Wiederholung unterstützen Üben; sie ersetzen keine Interaktion
mit Menschen. Vollmengen- und physische Geräteabnahmen bleiben getrennte Gates.

## Technische Prüfung und offenes Abnahmekriterium

Abschlussstand dokumentiert am 06.09.2026: 741 Jest-Tests in 43 Suites,
TypeScript, acht Node-/FFmpeg-Pipeline-Tests, Integritätsprüfung und generierter
gemeinsamer Tonkern grün. Web-, Android- und iOS-Produktions-Export unter
`build-verification/phase21`; keine Generator-/Schlüsselmodule im Produktionsgraph.
Sechs bestehende Medien in allen drei Exporten bytegleich (18 Vergleiche).

Der installierte iOS-Code von `expo-audio` 57 setzt beim Streamstart die
Audiositzung auf reine Aufnahme. Shadowing aktiviert deshalb anschließend
`allowsRecording` und `playsInSilentMode`; Clipplayer halten die Sitzung bei
ihrem Ende aktiv, bis der Mikrofonstream beendet wird. System-Speech nutzt
die Anwendungssitzung. Startreihenfolge, Fehlerfreigabe und Player-Ende sind
automatisch geprüft; reale iOS-/Android-Audiorouten bleiben ungetestet.
[Versionierte Expo-57-Audiodokumentation](https://docs.expo.dev/versions/v57.0.0/sdk/audio/).

**C1/C2/C4 sind nicht vollständig abgenommen:** Der tatsächliche Testbrowser
meldet weder verfügbaren Satzclip noch Thai-Systemstimme; der Start bleibt
gesperrt. Die neuen Abläufe und Pflichtvorbereitung sind mit kontrollierten
Audio-/Mikrofontestdoubles geprüft, das beweist keine echte Satzwiedergabe.
Eine vorhandene Systemstimme wäre ein gekennzeichneter Ausweichweg, kein
Nachweis ausgelieferter Satzclips. Die gewünschte vollständige Spielbarkeit
und ein Vollmengenlauf werden nicht behauptet. Die bewusste Auslieferung
ungeprüfter Satzclips ist weiterhin nicht autorisiert; die wissenschaftliche
Prämisse allein kann diese Entscheidung nicht ersetzen (C-0a).
