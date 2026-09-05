# Inhalte mit der App ausliefern

Die Generatoren sind Entwicklerwerkzeuge. Sie erscheinen ausschließlich im
Web-Entwicklungsbuild auf `http://localhost:8081/settings`. Release-Bundles
enthalten weder diese Oberfläche noch die Anbieter- und Schlüsselmodule.

## Lokaler Ablauf

1. `npm ci` ausführen. `ffmpeg-static` ist nur eine Entwicklungsabhängigkeit;
   der Encoder wird weder in die App noch ins Repo kopiert.
2. In einem Terminal `npm run content:studio` starten, in einem zweiten
   `npx expo start --web --localhost --port 8081`.
3. In den lokalen Einstellungen den benötigten Anbieterschlüssel für diese
   Sitzung eintragen und zunächst den **Probelauf** starten. Schlüssel gehören
   weder in Dateien noch in `EXPO_PUBLIC_*`. Nach einem Reload erneut eingeben.
4. **Laufzeitdaten exportieren und Audio komprimieren** übernimmt Dokumente aus
   dem bestehenden Speicher und Mediendaten aus IndexedDB einzeln nach
   `.content-studio/`. Dieser Ordner ist ignoriert. Kein Sammel-JSON mit dem
   gesamten PCM-Bestand entsteht. Fehler werden mit ID aufgelistet.
5. Den eigenen Prüfernamen eintragen. Jede Situation und Prüfungsaufgabe
   vollständig lesen, jedes Bild ansehen, jeden **bereits komprimierten** Clip
   bis zum Ende anhören. Metadaten, Prompt/Modell, Transkript, Original- und
   MP3-Größe stehen beim Inhalt. **Einzeln** freigeben oder mit Grund ablehnen.
   Es gibt keine Sammelfreigabe. Die prüfende Person verantwortet sprachliche
   Richtigkeit, Tonverläufe, Bildpassung und Hörqualität; ein technischer Test
   ist keine menschliche Prüfung.
6. **Freigegebenes ins Repo übernehmen** schreibt die unveränderlichen Medien
   nach `assets/content/`, den geprüften Katalog nach `src/content/catalog.json`
   und statische `require`-Verweise nach `src/content/assets.ts`. Die Ist-Größen
   stehen danach in `content/size-report.json`. Ungeprüfte und abgelehnte
   Einträge werden mit Anzahl ausgewiesen, nicht stillschweigend ausgeliefert.
7. Für die vollständige Vertonung im Cliplauf bewusst **Auslieferung: alle
   Sprachen und Deutsch** wählen. Dieser Plan ergänzt den bisherigen Plan um
   deutsche Kartenwörter, Hörtexte der Prüfungen und gesprochene Musterantworten.
   Er verwendet den aktuellen Dialog- und Aufgabenbestand. Anschließend die
   neuen Clips wieder exportieren, anhören und einzeln prüfen.
8. `npm run content:check`, `npm test -- --runInBand`,
   `npm run test:content-pipeline` und `npx tsc --noEmit` ausführen.
   Katalog, Asset-Verweise, Medien, Größenbericht und Ablehnungsliste gemeinsam
   committen. Neue Inhalte kommen über neue App-Binaries.

## Ablehnung und Änderungen

`content/rejections.json` enthält dauerhafte Sperren je Inhaltsart und stabiler
ID. Vor jedem Generatorstart wird die Repo-Liste mit der lokalen Metadatenablage
abgeglichen. Die vier bestehenden Batch-Läufer überspringen diese IDs **vor**
jedem Anbieteraufruf. Das Löschen von Entwürfen oder Browserdaten hebt eine
Ablehnung nicht auf. Ein bereits übernommener Inhalt wird bei Ablehnung aus
dem nächsten Katalog entfernt; alte installierte App-Versionen ändern sich
erst mit einem Update.

Eine abgelehnte ID wird nicht automatisch durch einen neuen Versuch ersetzt.
Eine spätere redaktionelle Neubewertung braucht eine bewusste Änderung der
versionierten Sperre samt Begründung und erneute Inhaltsprüfung. Der Generator
selbst bietet kein Zurücksetzen der Sperre an.

Freigaben binden SHA-256 von Metadaten und endgültigen Mediendaten. Ändert sich
ein Entwurf, ist eine neue Prüfung erforderlich. Vor der Übernahme wird der
gesamte freigegebene Bestand nochmals auf Schema, Hash und Bytes geprüft.
Lernkarten, FSRS-Zustände, Profil und Tagesprotokoll werden nie exportiert.

## Bündelung und Offline-Prüfung

Der bestehende Aussprache-Resolver bleibt erhalten: gebündelter Clip zuerst,
lokaler Entwurf ausschließlich im Entwicklerbetrieb, danach System-TTS.
Produktion liest Situationen, Bilder, Clips und zusätzliche Prüfungsaufgaben
aus dem freigegebenen Katalog. Alte lokale Entwürfe können sie nicht verdrängen.
Das Vokabular und die acht vorhandenen Prüfungsaufgaben bleiben erhalten.

Statische `require`-Verweise werden von Metro in die nativen App-Ressourcen
übernommen; `expo-asset` löst sie dort lokal auf. Es gibt keinen Inhaltsserver
für Endnutzer. Ein Web-Export benötigt weiterhin einen lokalen/statischen
Webserver und ist keine neu hinzugefügte Offline-PWA.

`npm run content:integrity` prüft Schema, menschliche Freigabe, Hash, Bytes und
statische Asset-Verweise. `npm run content:check` verlangt darüber hinaus den
vollständigen bekannten Bestand. Der EAS-Hook sperrt Preview-/Release-Builds
bei fehlender Vollständigkeit; Entwicklungsbuilds bleiben möglich. Ein direkter
`expo export` ist nur eine technische Bundle-Prüfung und keine Freigabe zur
Auslieferung. System-TTS zählt wegen möglicherweise fehlender Stimmen nicht
als garantierte Offline-Abdeckung.

Produktionsnachweis:

```sh
npx expo export --platform all --source-maps --output-dir build-verification/production
npm run verify:production
node scripts/verify-content-assets.cjs
```

Das Prüfskript kontrolliert alle drei Modulgraphen sowie JS/HTML auf
Generator-/Schlüsselfeld- und Anbietercode. Der Jest-Test rendert zusätzlich
den Produktionspfad mit `__DEV__ = false`.

## Audiomessung und Größenbudget

MP3, `libmp3lame`, 64 kbit/s, Mono, 24 kHz. Kompression findet auf dem
Entwicklungsrechner statt, vor der Hörprüfung. Roh-WAV bleibt außerhalb des
Repos. Fünf lokale SAPI-Sprachclips mit Microsoft Hedda Desktop wurden real
komprimiert: **1.414.190 → 239.265 Byte**, **83,08 % weniger**. Einzeldateien und
Prüfsummen: [compression-measurement.json](compression-measurement.json).
Dies ist ein deutsches Referenzsample, **kein Gemini-Gesamtbestand und kein
Thai-Qualitätsnachweis**. Die ca. 700 MB aus Phase 11 waren eine Hochrechnung.

Reproduzierbar unter Windows:

```powershell
powershell -NoProfile -File scripts/measure-sapi.ps1
node scripts/measure-audio.cjs .content-studio/measurement-source .content-studio/measurement-mp3 "Lokale SAPI-Referenz, kein Gemini-Lauf"
```

`measure-audio.cjs` akzeptiert auch einen Ordner echter generierter WAV/MP3-Dateien.
Die tatsächliche Messung des kompletten Entwicklerlaufs steht noch aus.

Am **05.09.2026** offiziell geprüft: [Google Play](https://support.google.com/googleplay/android-developer/answer/9859372?hl=en)
nennt **500 MB** komprimierten Download pro Basismodul, **4 GB** insgesamt für
Module plus Install-time-Asset-Packs. Über 200 MB erscheint ein Mobilfunkhinweis;
200 MB ist hier nicht mehr die harte Basismodulgrenze.
[Apple](https://developer.apple.com/help/app-store-connect/reference/app-uploads/maximum-build-file-sizes/)
nennt **4 GB unkomprimierte iOS-App**, daneben 500 MB für die Summe der
`__TEXT`-Sektionen des ausführbaren Codes, nicht für Medien.

Lokales Inhaltsbudget: **150 MiB einschließlich Katalogmetadaten**, damit Platz
für Framework, Code und sonstige Assets bleibt. Das ist ein Projektbudget,
keine behauptete Store-Grenze. Überschreitung stoppt die gesamte Übernahme;
es gibt keine automatische Teilmenge. Der volle reale Bestand muss gemessen
werden. Falls er nicht passt, sind Umfang oder ein späteres Nachladeverfahren
gesondert zu entscheiden. Native AAB-/IPA-Endgrößen bleiben B-5.

## Aktueller Abnahmestand

Die technische Pipeline, Tests, Produktionsausschluss und Asset-Exporte sind
geprüft. Seit dem 05.09.2026 sind **5 echte Gemini-Bilder und 10 echte Gemini-Clips**
nach menschlicher Prüfung und ausdrücklicher Chat-Freigabe ins Repo übernommen.
Beide Probeläufe liefen ohne Fehler. Die Clips
wurden von **632.120 Byte WAV auf 112.194 Byte MP3** komprimiert (-82,25 %).
Alle 15 Dateien wurden technisch dekodiert und bytegenau in den drei
Plattformexporten nachgewiesen. Einzelmessungen: `gemini-probelauf-2026-09-05.json`
(historischer Stand vor Freigabe), Freigaben im Katalog, aktuelle Größen in
`size-report.json`. Neue Inhalte benötigen eine eigene Prüfung.
Es fehlen bereits ohne Dialog-Clips **452 Clips**, **73 Bilder**, **512
Thai-Situationen** sowie Gespräche für Englisch/Spanisch (AE-48). Letztere
brauchen weiterhin einen eigenen Sprachvertrag; Phase 19 erfindet ihn nicht.
Der Vollständigkeitscheck schlägt deshalb absichtlich fehl. Phase 19 und die
Offline-Vollständigkeit sind noch **nicht abgenommen**.

Technische Testfreigaben und Platzhalter liegen ausschließlich unter dem
ignorierten `build-verification/`; sie sind kein ausgeliefertes Lernmaterial.

Quellen zur Umsetzung: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[Asset API 57](https://docs.expo.dev/versions/v57.0.0/sdk/asset/),
[lokale Asset-Bündelung](https://docs.expo.dev/develop/user-interface/assets/),
[Entfernung von Entwicklungscode](https://docs.expo.dev/guides/tree-shaking/),
[Audio API 57](https://docs.expo.dev/versions/v57.0.0/sdk/audio/),
[FFmpeg MP3-Encoder](https://ffmpeg.org/ffmpeg-codecs.html#libmp3lame-1).
