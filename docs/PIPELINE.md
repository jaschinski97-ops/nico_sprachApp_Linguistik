# Pipeline — Inhalt erzeugen, prüfen, ausliefern (Admin-Ablauf)

Ziel: Nutzer bekommen alle Inhalte **offline mit dem App-Build**. Die
KI-Anbieter braucht nur der Admin zum Erzeugen — auf seinem Gerät, mit seinen
Schlüsseln. Nichts davon landet im Release.

## 1. Schlüssel hinterlegen (Einstellungen → „API-Schlüssel (Debug)")

Genau drei Felder, je eines pro Fähigkeit:

| Feld | Erzeugt | Anbieter (Standard) |
|---|---|---|
| **1 · Text** | Vokabeltexte, Sätze, Gesprächssituationen | Claude |
| **2 · Audio** | Hörclips für Vokabeln, Sätze, Übungsgespräche | Gemini TTS |
| **3 · Bilder** | Vokabelbilder | Stability AI |

Anbieter antippen, Schlüssel eintippen, speichern. Die Wahl gilt für die
zugehörigen Generator-Gruppen; das Web-Studio darf je Lauf abweichen.
Ablage: nativ Keychain/Keystore, im Web nur für die Sitzung (AE-10).
In Release-Builds sind die Felder weg.

## 2. Generieren (Debug-Studio, localhost:8081)

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
