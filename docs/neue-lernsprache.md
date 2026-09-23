# Eine neue Lernsprache hinzufügen

Stand: Sprach-Umbau vom 23.09.2026. Seitdem steht alles, was die App über eine
Lernsprache wissen muss, an **einer** Stelle. Deutsch ist dabei eine Lernsprache
wie jede andere, ohne Sonderregeln.

Beispiel: Französisch (`fr`). Der Code muss eine der 20 App-Sprachen sein
(`src/lib/i18n/types.ts`), weil der Sprachname und die Bedeutungen dort herkommen.

## 1. Code eintragen

`src/lib/languages/types.ts`:

```ts
export const LANGUAGE_CODES = ['th', 'en', 'es', 'de', 'fr'] as const;
```

Danach meldet `npx tsc --noEmit` jede Stelle, die für `fr` noch etwas braucht.
Normalerweise ist das nur die Definition aus Schritt 2.

## 2. Definition anlegen

`src/lib/languages/definitions.ts` bekommt in `LEARNING_LANGUAGES` einen
Eintrag `fr` mit diesen Feldern:

| Feld | Bedeutung | Französisch z. B. |
| --- | --- | --- |
| `label`, `endonym` | Name auf Deutsch (Studio) und Eigenname | `'Französisch'`, `'français'` |
| `speechLocale`, `speechRate` | Gerätestimme | `'fr-FR'`, `0.95` |
| `script` | `'thai'` oder `'latin'` | `'latin'` |
| `palette` | Zeichenleiste für Diktat/Schreiben (`null` = keine) | `null` oder eine neue Leiste |
| `nearMiss` | was beim Schreiben als „fast richtig“ gilt | `'accent'` |
| `legend` | Merkhilfe in der Übersicht (`null` = keine) | `null` |
| `wordSpeaking` | Wortübung: `'repeat'` (Nachsprechen), `'tone-contour'`, `null` | `'repeat'` |
| `drills` | sprachspezifische Übungen (leer ist erlaubt) | `[]` |
| `greeting` | Gruß im Kopf der Übersicht | `{ word: 'Bonjour', hint: null }` |
| `dictation` | Diktat-Regeln | `{ foldCase: true, eszettEquivalence: false, strictDiacritics: true }` |
| `prompts` | eigene Aufgabentexte oder `null` für die allgemeinen | `{ writing: null, dictation: null }` |
| `placeholders` | Platzhalter im Eingabefeld (in der Zielsprache) | `{ word: 'ta réponse', sentence: 'ta phrase' }` |
| `challenge`, `feature` | Texte und Quelle des Sprachmerkmals | `'language.fr.description'` … |
| `generatorRules` | sprachspezifische Pflichtfelder für den Wortschatz-Erzeuger | z. B. Genus bei Nomen |
| `checkPoint3` | Prüfpunkt 3 der KI-Kreuzprüfung | `'ist die Lautschrift plausibel?'` |
| `dialogRules` | Sprachhinweis für den Dialog-Erzeuger | `'Natürliches Französisch …'` |

`feature.source` braucht einen Beleg mit Link und wörtlichem Zitat. Ein Test
prüft das.

## 3. Zwei Texte übersetzen

In allen 20 Wörterbüchern (`src/lib/i18n/dictionaries/*.ts`):

- `language.fr.feature`: Kurzname des Merkmals
- `language.fr.description`: ein Satz, was die Sprache besonders macht

Der Paritätstest und `src/lib/languages/definitions.test.ts` melden fehlende Texte.

## 4. Prüfen

```bash
npx tsc --noEmit
npx jest src/lib/languages
node --test scripts/content/pipeline.test.cjs
```

`definitions.test.ts` ist die Checkliste als Test. Er prüft für jede Sprache
die Definition, alle Texte in den 20 App-Sprachen, die Inhalts-Richtung und die
Quelle.

## 5. Inhalte erzeugen

Im Entwicklerstudio erscheint die neue Sprache automatisch in allen Karten:
Wortschatz, Gespräche, Audio und Bilder. Reihenfolge wie immer:

1. Wortschatz (die Pflichtfelder kommen aus `generatorRules`)
2. Gespräche
3. Audio
4. Bilder

Danach veröffentlichen.

## Was die neue Sprache damit automatisch bekommt

- Ein Lernziel in jeder App-Sprache außer ihrer eigenen.
- Karteikarten mit Vorderseite in der App-Sprache (`translations[anker]`).
- Satz verstehen, Shadowing, Satz wiederholen, Diktat, Schreiben, „Sag es“,
  Rollenspiel, Lesetexte und die Heutige Runde.
- Fortschritt: Fälligkeiten, Trefferquote je Übung und Wortschatz-Meilensteine.
- Gesprächs-Reiter, Studio-Auswahl und Pipeline-Vertrag (`LANGUAGE_CODES`).

## Was optional ist

Eigene Übungen wie die Thai-Töne oder die spanische Betonung sind Zusatzmodule:

- neue Drill-ID in `src/lib/drills/types.ts` mit `feature: 'fr'`
- Fragenbau in `src/lib/drills/questions.ts`
- ID in `drills` der Definition eintragen

Ohne eigene Übungen ist die Sprache trotzdem vollständig lernbar.

## Gespeicherte Richtungen

Inhalte einer Sprache liegen unter `contentDirectionOf(code)`:

- für neue Sprachen `de_to_<code>`
- für Deutsch historisch `th_to_de`

Karten liegen je Lernziel unter `vocabId:anker_to_ziel`. Diese Schlüssel sind
gespeicherte Daten und dürfen sich nicht ändern.
