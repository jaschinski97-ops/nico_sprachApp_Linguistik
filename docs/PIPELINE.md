# Pipeline — Inhalt erzeugen, prüfen, ausliefern (Admin-Ablauf)

Ziel: Nutzer bekommen alle Inhalte **offline mit dem App-Build**. Die
KI-Anbieter braucht nur der Admin zum Erzeugen — auf seinem Gerät, mit seinen
Schlüsseln. Nichts davon landet im Release.

## 1. Schlüssel hinterlegen (Einstellungen → Entwicklerstudio → Anbieter & Schlüssel)

Einen Anbieter öffnen, Schlüssel eintragen und speichern. Es gibt einen
Schlüssel je Anbieter (Anthropic, OpenAI, Google, Stability AI); alle passenden
Generatoren verwenden diesen Zugang. Der lokale OpenAI-Helper verwendet
seinen serverseitigen Schlüssel und hat hier kein Eingabefeld.

Die Anbieterwahl bleibt beim jeweiligen Generator. Gespeicherte Modelle,
Stimmen und Schlüssel bleiben beim Umbau erhalten. Im lokalen Web-Studio
werden Schlüssel wie bisher im Browser gespeichert und beim Öffnen sichtbar
angezeigt (Nutzerentscheidung 09.09.2026). Das Studio ist ausschließlich im
Debug-Web-Build auf localhost:8081 zugänglich; Release-Builds enthalten es nicht.

## 2. Generieren (Debug-Studio, localhost:8081)

Im Entwicklerstudio Bilder, Audio, Dialoge oder Prüfungsaufgaben öffnen.
Modell und Stimme stehen unter „Erweitert“. Umfang und Kostenbestätigung
bleiben vor dem Start sichtbar. Prüfberichte und Diagnose haben einen eigenen
Bereich in der Studio-Übersicht.

Generator-Karte starten. **Nach jedem Hörclip läuft automatisch die
Tonhöhenprüfung** (`src/lib/clips/batch.ts` → `checkThaiTone`):

- **Ton bestanden / abgelehnt / ungeprüft** erscheinen im Fortschrittspanel.
- **Abgelehnt** = die gemessene F0-Kontur widerspricht dem verifizierten
  Sollton. Der Clip wird **nicht gespeichert** und steht mit Grund in der
  Fehlerliste; der nächste Lauf erzeugt ihn neu.
- **Ungeprüft** = kein verifizierter Thai-Einsilbler (Sätze, Mehrsilbler,
  Fremdsprachen) oder mp3 ohne In-App-Decoder.

Grenze: Das ist eine Konturmessung, keine Hörprüfung — sie sagt, ob die
Tonhöhe die erwartete Richtung nimmt, nicht ob Muttersprachler zustimmen.

## 3. Publish (Studio)

Beim Stage/Publish prüft die Node-Pipeline (`scripts/content/pipeline.cjs`)
jeden Clip **erneut und verbindlich** — mit ffmpeg-Dekodierung, also auch
mp3 — und nimmt nur bestandene bzw. ungeprüfte Thai-Clips in den Katalog
auf. Danach: `src/content/catalog.json`, `assets/content/`,
`content/automatic-checks.json`, `content/size-report.json`.

## 4. Gegenmessung über alles

```bash
node scripts/content/measure-tones.cjs        # Katalog + Studio-Entwürfe
npm run content:measure-tones                 # zusätzlich die Fixtures-Stimmen
node scripts/content/measure-speaker-reference.cjs   # Sprecherreferenz ableiten
```

Ergebnis: `content/tone-calibration.json` (je Clip F0-Zusammenfassung und
Gate-Entscheid). Offene Registerprüfungen (mittel/tief/hoch) bleiben dort
ehrlich als „ungeprüft" markiert.

## 5. Release

```bash
npm run pipeline:release   # 1) Messkern-Check  2) Integrität Katalog↔Assets
                           # 3) Gegenmessung    4) Testreihe
```

(Vollständigkeitslücken des gestoppten Inhaltsausbaus meldet
`npm run content:check` separat — sie sind bekannt und blockieren nicht.)

Erst wenn die Pipeline durchläuft: Build (`eas build` oder lokal) und
GitHub-Push. Das EAS-Gate (`scripts/content/eas-gate.cjs`) verhindert
Builds, bei denen Katalog und gebundelte Assets auseinanderliegen.

## 6. Auf GitHub hochladen

Repo ist upload-ready: nur App, Inhalt, Werkzeuge, Docs sind verfolgt;
alles Lokale ist ignoriert (`.gitignore`, Konvention `*_Local`). Erste
Einrichtung:

```bash
git remote add origin git@github.com:<nutzer>/<repo>.git
git push -u origin main
```

Vor dem Push lohnt einmalig `git gc` (verdichtet die Historie).
