# Automatisch geprüfte Inhalte ausliefern

Die Generatoren laufen im Web-Entwicklungsbuild auf `http://localhost:8081/settings`.
Release-Bundles enthalten weder Studio noch Anbieterclients oder Schlüsselfelder.

## Ein Lauf

1. `npm ci`, dann `npm run content:studio` und in einem zweiten Terminal
   `npx expo start --web --localhost --port 8081` starten.
2. Anbieter, Modell, Sprache und Umfang wählen, Sitzungsschlüssel eintragen und
   **Start** drücken. Schlüssel bleiben im Browser-Arbeitsspeicher; keine Keys
   in Dateien, Logs oder `EXPO_PUBLIC_*` schreiben.
3. Vor dem ersten Anbieteraufruf erscheinen die noch fehlende Anzahl und die
   Kostenschätzung. **Kosten bestätigen und Lauf starten** bestätigt einmal
   den ganzen Lauf. Für unbekannte Modelltarife ist eine eigene Gesamtschätzung
   erforderlich. Bekannte Gemini-Tarife und Dauer-/Tokenannahmen stehen dabei;
   die Schätzung ist keine Kostenobergrenze.
4. Danach folgen Generierung, Einzelexport, MP3-Kompression, automatische
   Prüfung und Katalogübernahme ohne weitere Freigabe. Fehler werden gesammelt;
   der lesbare Prüfbericht unterscheidet übernommen, aussortiert und ungeprüft.
   Bestehende lokale Entwürfe werden ebenfalls geprüft. Abbrechen stoppt weitere
   Generierungsaufrufe; bereits erzeugte Inhalte durchlaufen die Prüfungen.

Es gibt keinen Prüfernamen, keine Hörpflicht, keine Freigabetaste und keine
dauerhafte Sperrliste mehr. Die drei alten Einträge mit „nico“ und leerem Grund
waren bewusste Nutzertests. AE-59 ersetzt das Verfahren aus Phase 19.

## Was geprüft wird

Schema, IDs, SHA-256 von Metadaten und Dateien, Bytezahlen, Asset-Verweise und
Dekodierbarkeit bleiben technische Prüfungen. SHA-256 schützt Integrität und
bindet keine menschliche Freigabe. Audio wird vor der Tonmessung mit FFmpeg nach
MP3, 64 kbit/s, mono, 24 kHz konvertiert und wieder dekodiert.

Jeder Thai-Clip erhält eine F0-Messung aus demselben Kern wie die lokale
Sprechübung. Ein positiver Tonbefund braucht einen exakt passenden,
quellengeprüften einsilbigen Vokabeleintrag samt `syllables[0].tone`.
Fallend/steigend sind relativ prüfbar. Mittel/tief/hoch bleiben ohne kalibrierte
Sprecherreferenz ungeprüft; ein deutlicher Fall beim hohen Sollton kann bereits
als Widerspruch aussortiert werden. Mehrsilbige Wörter und Sätze bleiben ohne
verifizierte zeitliche Silbengrenzen ungeprüft (AE-7/AE-8).

**Filter gegen grobe Tonhöhenfehler, kein Qualitätsnachweis:** Konsonanten,
Vokallänge und Aspiration werden nicht geprüft. Für Bilder/Text bedeutet
„automatisch geprüft“ ausschließlich Schema/Integrität/Dekodierbarkeit, keine
sprachliche oder inhaltliche Qualitätsprüfung. Ungeprüfte oder durchgefallene
Thai-Clips gelangen nicht in den Lieferkatalog; dort verwendet die App
System-TTS. Auch lokale Thai-Entwürfe umgehen dieses Tor nicht. System-TTS ist
selbst ungeprüft und keine garantierte Offline-Stimme.

Beim Abspielen bleibt **„KI-Stimme, keine Muttersprachler-Aufnahme“** sichtbar.
Mikrofonanalyse bleibt lokal; FSRS, Lernfortschritt und Vokabel-IDs bleiben
unverändert. Das Studio exportiert keine Lernerdaten.

## Berichte und reproduzierbare Prüfungen

**Seit der pipeline/-Struktur (09.09.2026) werden generierte Berichte nach
`pipeline/reports/` geschrieben, und jedes KI-Lauf wird unter `pipeline/logs/`
protokolliert** (`scripts/pipeline/protocol.cjs`: ein JSON je Lauf plus
`index.ndjson`). Die hier liegenden JSON-Dateien sind **veraltete Kopien**;
weitergeschrieben wird nur noch nach `pipeline/reports/`:

- `automatic-checks.json` → `pipeline/reports/automatic-checks.json`
- `size-report.json` → `pipeline/reports/size-report.json`
- `tone-calibration.json` → `pipeline/reports/tone-calibration.json`
- `speaker-reference-audit.json` → `pipeline/reports/speaker-reference-audit.json`
- `asset-bundling-verification.json` → `pipeline/reports/asset-bundling-verification.json`
- `completeness-report.json` und `production-verification.json` haben keinen
  aktiven Schreiber mehr; künftige Fassungen gehören ebenfalls nach
  `pipeline/reports/`.

Der TTS-Proxy für das Web-Studio läuft im Helper (`npm run content:studio`,
nur Loopback): `POST http://127.0.0.1:8082/api/openai/tts` mit
`{ text, voice, model, purpose }` — Schlüssel ausschließlich aus
`OPENAI_API_KEY` der Helper-Umgebung, max. 2000 Zeichen, max. 30 Aufrufe/Minute.
Pakete für GitHub Releases: `node scripts/pipeline/publish-pack.cjs --lang th
--version 1 --file dist/packs/pack-th-v1.zip`.

- `automatic-checks.json`: Status, Grund, verifiziertes Tonziel, Konturwerte und
  vollständige F0-Spuren des letzten übernommenen/ausgeschlossenen Bestands.
- `tone-calibration.json`: zehn Gemini-Clips vorher/nachher und zehn Microsoft-
  Vergleichsclips. Die Originaldateien aus AE-31 waren nicht mehr vorhanden.
  `scripts/content/fixtures/tones/index.json` dokumentiert ausdrücklich neue
  Reproduktionen derselben fünf Wörter mit Premwadee und Niwat vom 05.09.2026,
  einschließlich Dateihashes. Kein Vergleich mit den ursprünglichen Bytes.
- `size-report.json`: aktuelle echte Liefergröße, kein hochgerechneter Vollbestand.
- `structure-audit.json` und `structure-render-comparison.json`: Importgraph,
  Abhängigkeitsprüfung und acht identische statisch gerenderte Seiten vor/nach B.
- `production-verification.json` und `asset-bundling-verification.json`:
  Generatorausschluss und bytegleiche gebündelte Medien für alle drei Plattformen.

```sh
npm test -- --runInBand
npm run test:content-pipeline
npx tsc --noEmit
npm run content:integrity
npm run content:tone-tool
npm run content:measure-tones
npm run audit:structure
npx expo export --platform all --source-maps --output-dir build-verification/production
npm run verify:production
node scripts/content/verify-assets.cjs
```

`scripts/tone-contour.html` bleibt als Messwerkzeug erhalten. Sein generiertes
`tone-analysis.js` stammt aus `src/lib/speaking/analysis.ts`; nach Änderungen
`node scripts/build-tone-tool.cjs` ausführen, der Check verhindert Abweichungen.
Die aktuelle Korrektur ergänzt nur dann schwach periodische Nachbarfenster
(r ≥ 0,18, maximal 2 Halbtöne je Schritt), wenn r ≥ 0,6 keine vier zusammenhängenden
Fenster findet. Sie beginnt nie an einem schwachen Fenster und überbrückt keine
Lücken. Vorhandene sichere Verläufe werden nicht verlängert (AE-58).

## Lieferstand und offene Abnahme

Am 05.09.2026: **5 Bilder und 1 Thai-Clip** automatisch übernommen, **9 Thai-Clips
ungeprüft ausgeschlossen**. ค่ะ ist jetzt messbar (−5,10 Halbtöne; vorher keine
ausreichende Strecke). Alle zehn Microsoft-Reproduktionen behalten exakt ihre
bisherigen Messergebnisse. Die zehn ursprünglichen Gemini-Mediendateien bleiben
als Messbeleg erhalten; ausschließlich statisch referenzierte Dateien werden
gebündelt. `gemini-probelauf-2026-09-05.json` ist historische Herkunftsevidenz.

`content:integrity` ist grün. `content:check` verlangt zusätzlich Vollständigkeit
und bleibt absichtlich rot: 461 Clips bereits ohne Dialoge, 73 Bilder und 512
Thai-Situationen fehlen, außerdem der Sprachvertrag für EN/ES-Gespräche (AE-48).
Der EAS-Hook sperrt unvollständige Preview-/Release-Builds. Ein technischer
Expo-Export ist keine vollständige Release-Abnahme.

Das Inhaltsbudget beträgt 150 MiB einschließlich Metadaten. Überschreitung
stoppt die gesamte Übernahme; keine stille Kürzung. Vollmenge, signierte
AAB-/IPA-Endgrößen und echtes Offline-Playback auf Geräten bleiben offen
(B-19/B-2/B-5). Ein neuer kostenpflichtiger Vollmengenlauf wurde bei diesem
Umbau nicht gestartet. Block C ist mit allen Anforderungen in PROGRESS.md als
TODO festgehalten; insbesondere sind die 84 Beispielsätze laut Datenkopf
**nicht als ganze Sätze einzeln quellengeprüft**.

Umsetzungsquellen: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[Audio API 57](https://docs.expo.dev/versions/v57.0.0/sdk/audio/),
[Asset API 57](https://docs.expo.dev/versions/v57.0.0/sdk/asset/),
[Gemini-Preise](https://ai.google.dev/gemini-api/docs/pricing)
(Tarife am 05.09.2026 abgerufen).
