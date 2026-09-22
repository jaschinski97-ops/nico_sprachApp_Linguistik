# Lokaler Release-Kandidat RC1, begonnen am 21.09.2026

Status am 22.09.2026: lokal geprüfter Quellkandidat mit offenen Freigabepunkten.
Keine Freigabe zur Veröffentlichung oder zur abschließenden Geräteabnahme.
Es wurden keine Store-Einreichung, kein TestFlight-Upload, kein Git-Push,
kein Cloud-Build und keine kostenpflichtige KI-Generierung ausgeführt.

## Änderungen

- Fortschritt zeigt die Lernziele der aktuellen App-Sprache einschließlich
  Deutsch auf fremdsprachigen Oberflächen. Kartenzahlen gehören genau zur
  gewählten Lernrichtung. Gespeicherte Karten und ihre IDs bleiben erhalten.
- Tagesverlauf, Wiederholungen, Übungen und Lernserie stehen oberhalb der
  Zielauswahl. Diese Zähler sind sprachübergreifend; historische Übungen
  enthalten keine Sprachzuordnung. Beim erneuten Öffnen werden Daten frisch geladen.
- Beim Wechsel der App-Sprache bleibt auch ein Deutsch-Lernziel erhalten.
- Die schon vorhandene Diktat-Übersetzungskorrektur und die acht dokumentierten
  Vereinfachungen sind Bestandteil des Kandidaten.
- Die Produktionsprüfung fand einen zusätzlichen Fehler: Trotz gesperrtem
  Studio-Bildschirm enthielt der Export Entwickler- und Anbieter-Module.
  Der Import liegt jetzt direkt im Entwicklungszweig. Im erneut gebauten
  Web-, iOS- und Android-Paket sind diese Module nachweislich entfernt.
- Der EAS-Inhaltscheck verwendet jetzt den Projektordner statt `scripts/`.
- Das zusätzliche Profil `rc-ios` ist für interne iPhone-Builds vorbereitet.
  Die bestehenden Simulatorprofile bleiben erhalten.
- Der Build begrenzt parallele Datei-Lese- und Schreibzugriffe beim Medienexport.
  Damit werden die beobachteten Windows-Fehler durch zu viele offene Dateien
  vermieden. SHA-256-benannte Inhalts-MP3s werden direkt aufgelöst, statt für
  jede Datei den gesamten Ordner erneut nach Varianten zu durchsuchen.
  Metadaten-Parität mit der installierten Metro-Version ist getestet; andere
  Dateien, Plattformvarianten und Asset-Plugins bleiben im Standardverfahren.
  Dieser Adapter nutzt eine interne Metro-Schnittstelle und muss bei einem
  SDK-/Metro-Upgrade erneut gegen Metro und den vollständigen Export geprüft werden.
  Die Prüflogik vergleicht Webmedien am aktuellen Pfad `content/` und die
  nativen Medien über die Exportmanifeste bytegenau mit dem Original.
- ESLint überspringt erzeugte Arbeitsverzeichnisse. Regeln für App-Code werden
  weder abgeschaltet noch herabgestuft.

## Inhaltsumfang und offene Punkte

Der Katalog enthält 22.075 Einträge: 7.502 Vokabeln, 14.525 Audioreferenzen,
20 Bilder und 28 Situationen. Mehrere Referenzen können dieselbe Datei nutzen.
Die Medien des Kandidaten werden eingebettet ausgeliefert. Ein zusätzlicher
Sprachpaketdownload ist kein notwendiger Installationsschritt; dessen noch
unkonfiguriertes Hosting wird hier nicht veröffentlicht oder erfunden.

Der Inhaltscheck vom 21.09.2026 um 20:14 UTC meldet keine Integritätsfehler;
358.075.217 Inhaltsbytes liegen innerhalb des konfigurierten Budgets.
2.135 ausgelieferte Thai-Clips sind bezüglich ihres Tons ausdrücklich
„ungeprüft“, nicht „bestanden“. Sie dürfen nicht als sprachlich zertifiziert
beschrieben werden. Für das Tonquiz gelten weiterhin dessen strengere Filter.

Der Vollständigkeitscheck bezieht sich auf den bisherigen **gesamten Ausbauplan**.
Seine Lücken sind nicht gleichbedeutend mit einer kaputten Datei:

| Bereich | Im Plan noch nicht im Katalog vorhanden |
| --- | ---: |
| Thai-Wortclips | 215 |
| Thai-Beispielsatzclips | 413 |
| Deutsche Wortclips einschließlich Bedeutungsseiten anderer Pools | 4.821 |
| Deutsche Beispiel-/Prüfungsclips | 13 |
| Bilder für konkrete Vokabeln | 3.803 |
| Situationen des vollständigen Plans | 996 |

Einige deutsche Bedeutungsseiten werden in der aktuellen Oberfläche gar nicht
mehr vorgelesen. Die 4.821 sind deshalb eine Planabweichung und keine Behauptung
über 4.821 sichtbare kaputte Audioknöpfe. Die Thai-Lücken sind dagegen konkrete
Wörter und Sätze des aktuellen Wortschatzes. Systemstimmen garantieren deren
Offline-Wiedergabe auf dem iPhone nicht. Bereits verworfene Clips werden nicht
ohne Tonprüfung freigegeben. Das strenge EAS-Vollständigkeitsgate bleibt aktiv.

Die englischen Satzumschriften bleiben sprachlich zu prüfen. Beispiel aus dem
aktuellen Katalog: „Can I pay by card?“ / „kən eye pay by kahrd?“. Es wurde keine
automatische Ersetzung oder bezahlte Neuerzeugung vorgenommen. Die aufgeschobene
Entscheidung über Goethe-Teilbeschreibungen bleibt ebenfalls bestehen.

## Automatische Prüfung

Rohberichte liegen lokal unter `build-verification/rc-2026-09-21/`.

| Prüfung | Ergebnis |
| --- | --- |
| TypeScript | Bestanden, erneut nach der Studio-Korrektur |
| Vollständige Jest-Suite | 89 Testsuiten, 1.227 Tests bestanden |
| Studio-Schutz nach letzter Korrektur | 2 Tests erneut bestanden |
| Pipeline, Pakete, EAS-Gate, Datei-Queue, Metro-Parität und Exportprüfer | 32 Node-Tests bestanden, einschließlich 4 Build-Tests und des Tests für die neue Einstellungsroute |
| Spiegel des Tonanalyse-Werkzeugs | Aktuell |
| Inhaltsintegrität einschließlich Mediendekodierung | Keine Integritätsfehler im vollständigen Check |
| Vollständiger Inhaltsplan | Nicht bestanden, Lücken siehe oben |
| Produktions-Webexport | Bestanden, mit Source-Map |
| Ausschluss von Entwickler-/Anbietercode | Alle 3 Produktionsgraphen bestanden, jeweils 0 verbotene Module |
| Gemeinsamer iOS-/Android-/Webexport | Vollständig gespeichert, Exit 0 |
| Medienvergleich | 14.545 Referenzen × 3 Plattformen = 43.635 bytegleiche Vergleiche |
| Browser-Stichprobe des Produktionsbuilds | Fortschritt de/en, Deutsch-Ziel, spanische 1.502 Karten, Einstellungen und Studio-Sperre geprüft |
| Native Xcode-Kompilierung, Signierung, echtes iPhone | Hier nicht durchgeführt |

Die volle Jest-Suite lief vor der letzten Studio-Korrektur; danach wurden die
betroffenen Schutztests, TypeScript und der tatsächliche Webexport erneut
geprüft. Nach den Änderungen an den Build-Werkzeugen wurde der vollständige
Export erneut erstellt und geprüft; Einstellungen, Fortschritt und Übersicht
wurden auch aus diesem endgültigen Export im Browser geöffnet.
Die Browser-Stichprobe ist kein vollständiger Gerätetest. Die lokale
Testoberfläche wurde anschließend auf ihre ursprüngliche Systemsprache gesetzt.

Der erste vollständige Export scheiterte beim Schreiben mit `EMFILE`. Dieser
unvollständige Versuch gilt nicht als Erfolg. Der abschließende Lauf mit
begrenzten Schreibzugriffen wurde vollständig gespeichert. Mit dem direkten
MP3-Zugriff sanken die gemessenen Bundle-Zeiten auf diesem Rechner von rund
42/59 Minuten auf 117/89 Sekunden für iOS/Android. Das sind Exportzeiten,
keine Aussage über die Dauer eines späteren Xcode-Builds.

Die alte Produktionsprüfung erwartete `settings.html`; sie prüft jetzt auch
den tatsächlichen Pfad `settings/index.html`. Die Sicherheits- und
Eingabefeldprüfungen bleiben erhalten. Der vollständige Medienbericht liegt
unter `build-verification/rc-2026-09-21/assets-detail.json`.

Zusätzliche Abhängigkeitsprüfung vom 22.09.2026:

- `npm audit --omit=dev`: 0 hohe, 0 kritische, 15 mittlere Paketmeldungen.
  Diese gehen auf zwei zugrunde liegende Advisories zurück:
  [decode-uri-component](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)
  (über URL-Verarbeitung) und [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
  (betroffene Varianten bei Verwendung eines übergebenen Puffers).
  Die tatsächliche Erreichbarkeit in dieser App wurde nicht als ausgeschlossen
  nachgewiesen. Kein `npm audit fix --force`: die vorgeschlagenen Downgrades
  von Expo/Router würden die geprüfte SDK-Kombination verlassen.
- `expo install --check`: 21 neuere Expo-Patchversionen werden empfohlen.
  Der Kandidat behält die bestehenden, im Lockfile festgehaltenen Versionen.
  Der Versionscheck ist damit nicht grün; das ist kein nachgewiesener Absturz,
  aber vor einer öffentlichen Freigabe gesondert zu behandeln.
- Vollständiger ESLint-Lauf: 29 Fehler / 51 Warnungen; 28 Fehler im App-Bestand entsprechen dem dokumentierten
  Ausgangsstand, ein weiterer stammt aus der Node-Umgebungsdatei
  `scripts/pipeline/env.cjs`. Der Vergleich der Regeln und Meldungen mit dem
  Ausgangsstand zeigt keine zusätzlichen Befunde unter `src/`.

Die automatische Gesamtfreigabe ist damit **nicht grün**. Die verbleibenden
Punkte werden nicht durch abgeschaltete Prüfregeln oder ein gelockertes
Vollständigkeitsgate verdeckt. Es wird noch keine manuelle Testrunde angefordert.

## Festgehaltener Stand

Das lokale Paket `build-verification/rc-2026-09-21/ThaiSpeaker-RC1-source.zip`
enthält den festgehaltenen Quellcode, die zugehörigen Medien, das Lockfile und
diese Anleitung. Es ist kein installierbares iPhone-Paket. Lokale Schlüssel,
Studio-Entwürfe, Generierungsprotokolle und `node_modules/` sind nicht enthalten.
Der genaue Git-Commit, die Dateigröße und die SHA-256-Prüfsumme stehen in der
danebenliegenden Datei `rc-manifest.json`. Eine spätere Änderung am
Arbeitsordner verändert dieses ZIP nicht.

Die Anfänger-Erklärung steht in `docs/ordnerstruktur-einstieg.md`.

## Späterer Test auf dem iPhone

Der Nutzer hat einen Mac mit Xcode. Ein lokaler Gerätebuild benötigt keine
Veröffentlichung und keinen TestFlight-Upload. Der Expo-Export ist **keine
signierte IPA** und belegt weder native Kompilierung noch Mikrofon- oder
Offline-Funktion auf einem echten Gerät.

Erst nach Klärung der offenen Prüfpunkte den festgehaltenen Quellstand auf den
Mac übertragen und in einem eigenen Ordner entpacken. Nicht einen inzwischen
weiterentwickelten Arbeitsordner für denselben Test verwenden.

Voraussetzungen laut Expo SDK 57: Node.js mindestens 22.13, Xcode mindestens
26.4 und iOS mindestens 16.4. Apple-Signierung und Gerätevertrauen werden lokal
in Xcode eingerichtet. Zugangsdaten gehören nicht in die App oder den Bericht.

Im entpackten Projektordner:

```sh
npm ci
npx expo run:ios --device --configuration Release
```

Expo erzeugt bei fehlendem `ios/`-Ordner das native Projekt. Falls die Signierung
eine manuelle Einrichtung verlangt, die erzeugte `.xcworkspace` unter `ios/`
in Xcode öffnen und im App-Target unter „Signing & Capabilities“ das eigene
Team auswählen. Bei einem Konflikt mit dem Bundle Identifier zuerst eine eigene
Testkennung festlegen. Die individuelle Signierung muss auf dem Mac geprüft
werden; sie wurde auf diesem Windows-Rechner nicht simuliert.

Geplante Geräteabnahme, jeweils Ergebnis und iOS-Version festhalten:

1. Neuinstallation und Kaltstart: Sprache korrekt, Übersicht bedienbar.
2. Je Lernziel Karten, Schreiben, Diktat und Hörübungen starten und abschließen.
3. Lernfortschritt nach App-Neustart erhalten; Deutsch getrennt von Thai prüfen.
4. Flugmodus, App vollständig schließen und erneut starten; eingebettete Medien
   und Übungen prüfen. Fehlende Clips ausdrücklich protokollieren.
5. Mikrofon erlauben und ablehnen; Aufnahme beenden, Hintergrundwechsel und
   Rückkehr prüfen. Kein laufendes Mikrofon nach Verlassen der Übung.
6. Sicherung exportieren und auf einem entbehrlichen Testprofil wiederherstellen.
   Persönlichen Lernfortschritt nicht für den Wiederherstellungstest überschreiben.
7. Große Systemschrift, Dark Mode und VoiceOver stichprobenartig prüfen.
   Keine abgeschnittenen Knöpfe oder unbenannten Bedienelemente.

Offizielle Grundlagen:
- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Lokaler Build und Geräteauswahl](https://docs.expo.dev/guides/local-app-development/)
- [Interne Verteilung](https://docs.expo.dev/build/internal-distribution/)

Auch bei erfolgreichem Gerätecheck bleibt eine Veröffentlichung eine eigene,
ausdrücklich noch nicht beauftragte Handlung.
