# Content-Authoring — Leitfaden für Runde 2

Stand: 2026-09-09 · gilt für den Sprachkanon des v2-Plans
**(AMENDMENT 09.09.2026: Französisch komplett entfernt — Kanon ist Kern 4: Deutsch, Englisch, Spanisch, Thai.** Quelle: `docs/ROADMAP-v2-sprachplattform.md`).

Diese Datei ist die **Arbeitsanweisung für alle, die nach dieser Runde Inhalt
anlegen**. Sie dokumentiert das Vokabel-Schema genau so, wie es in
`src/data/vocab-types.ts` (`VocabEntry`) definiert und in den Grundstoffen
`src/data/vocabulary.ts` (Thai, 84 Einträge), `vocabulary-en.ts`,
`vocabulary-es.ts` und `vocabulary-fr.ts` — ENTFERNT 09.09.2026, im Git-Verlauf)
verwendet wird. Wer sich an diesen Leitfaden hält, fällt automatisch durch
alle unten genannten Tests — wer dagegen verstößt, macht einen davon rot.

---

## 1. Die drei Grundbegriffe

| Begriff | Bedeutung | Wo definiert |
|---|---|---|
| **Zielsprache** | Die Sprache, die gelernt wird. Kanon: `de, en, es, th` (Kern 4) (`SUPPORTED_TARGETS` in `src/lib/languages/types.ts`). | `Lang` |
| **Brückensprache** | Die Sprache, in der erklärt wird (= künftig die Systemsprache des Geräts). Derselbe Kanon: `BRIDGE_LOCALES`. | `Lang` |
| **Paar / Richtung** | S→T mit S≠T; 20 Paare. IDs im Format `en_to_de`, kompatibel zu allen bestehenden Richtungs-Strings. | `Pair`, `PairId`, `pairsFor(bridge)` in `types.ts` |

Deutsch ist **kein Hub mehr**, sondern eine Zielsprache unter fünf. In den
Vokabeldaten lebt die deutsche Seite eines Eintrags trotzdem weiterhin im
Feld `german` (+ `germanNoun` / `germanVerb` / `germanAdjective`) — jedes
Paar mit deutscher Seite liest von dort.

**Ausgeliefert vs. geprüft:** `LANGUAGE_CODES = ['th','en','es']` ist die
Schranke des App-Bestands. Französisch liegt quellengeprüft vor
(`VOCABULARY_FR`, 40 Einträge), ist aber `delivered: false` und damit noch
nicht im Gerätebestand. Wer Französisch ausliefert: Grundstoff in
`VOCABULARY` aufnehmen, `LANGUAGE_CODES` erweitern, in
`src/lib/languages/registry.ts` `delivered: true` setzen, und die
Audio-Naht (`SpeechLanguage` in `src/lib/audio.ts`) um `'fr'` erweitern.

---

## 2. Der Vokabel-Eintrag — Pflichtfelder

Typ: `VocabEntry` in `src/data/vocab-types.ts`. Jeder Eintrag braucht:

```ts
{
  id: 'es_libro',                  // PFLICHT 1
  language: 'es',                  // PFLICHT 2
  concept: 'nangsue',              // PFLICHT 3 (wenn es ein Thai-Gegenstück gibt)
  term: 'libro',                   // PFLICHT 4
  romanization: 'li-bro',          // PFLICHT 5
  syllables: [ … ],                // PFLICHT 6
  german: 'das Buch',              // PFLICHT 7
  germanNoun: { article: 'das',   // PFLICHT 8 — je Wortart (siehe unten)
    plural: 'die Bücher' },        //   germanNoun / germanVerb / germanAdjective
  partOfSpeech: 'noun',            // PFLICHT 9
  register: 'neutral',             // PFLICHT 10
  isConcrete: true,                // PFLICHT 11
  translations: { en: 'book',     // PFLICHT 12 (siehe Abschnitt 4)
    fr: 'livre' },
  exampleTerm: 'el libro',         // siehe Abschnitt 6
  exampleGerman: 'das Buch',
  sourceVerified: true,            // PFLICHT 13
  source: 'https://en.wiktionary.org/wiki/libro#Spanish',  // PFLICHT 14
}
```

### Die Pflichtfelder im Einzelnen

1. **`id`** — eindeutig **über alle Sprachen** (Test: `vocabulary-new.test.ts`,
   `vocabulary-fr.test.ts`). Präfixkonvention: `th_` nicht nötig (der
   Thai-Bestand ist älter und ohne Präfix), sonst `en_`, `es_`, `fr_`. Bei
   Kollision innerhalb der Sprache: sinnvolles Suffix wie im Thai-Bestand
   (`maa_dog`, `mai_new`).
   Die ID landet in Kartenschlüsseln (`vocabId:direction`) — nach dem ersten
   Release nie mehr ändern.
2. **`language`** — die Zielsprache des Eintrags. Typebene: `LanguageCode`
   (ausgeliefert) bzw. `'fr'` über `FrenchVocabEntry` für den
   französischen Grundstoff.
3. **`concept`** — die ID des Thai-Eintrags, der denselben Begriff zuerst
   trug (AE-46). **Pflicht, wenn ein Thai-Gegenstück existiert** — über das
   Konzept hängen Bildmotive und die Feldgleichheit der deutschen Seite
   (nächster Punkt). Es gibt kein Konzept → Feld weglassen (z. B. `le pain`,
   `être`).
4. **`term`** — die fremdsprachige Form, orthographisch korrekt inkl.
   Akzenten (`marché`, nicht `marche`). Die ID darf Umlaute/Akzente
   auslassend transliterieren (`fr_marche`, `fr_ecole`), das Feld nie.
5. **`romanization`** — die Lesehilfe, **mit Silbengrenzen**, exakt die
   Verkettung der Silben mit `-` (Test fährt jeden Eintrag dagegen):
   - Thai: Paiboon-Umschrift (`sà-wàt-dii`).
   - Spanisch: Silbentrennung mit geschriebenem Akzent (`mé-di-co`).
   - Englisch: IPA des Wortes (`/ˈθæŋk/`).
   - Französisch: orthographische Silbentrennung, Akzente erhalten
     (`fro-ma-ge`, `é-co-le`).
6. **`syllables`** — Liste von `SyllableAnnotation { roman, tone?, stressed?, mute? }`,
   deren `roman`-Verkettung `romanization` ergibt. Die optionalen Flags sind
   **sprachgebunden** (Test pro Grundstoff):
   - Thai: `tone` je Silbe (aus der IPA-Tonkontur abgeleitet, nie aus
     Tonnamen im Fließtext); `tone` am Eintrag = Ton der ersten Silbe.
   - Spanisch: `stressed: true` auf genau einer Silbe (der betonten).
   - Englisch: leere Liste `[]` — das Merkmal hängt am ganzen Wort (AE-44).
   - Französisch: `stressed: true` auf der **letzten vollen** Silbe und
     `mute: true` auf einem stummen Schluss-**e** (nur dort, nur am Ende).
     Genau eine Betonung je Eintrag.
7. **`german`** — der deutsche Quelltext. Substantive **mit Artikel**
   (`'das Wasser'`), Stichwort ohne Klammern-Erklärungen wo möglich.
8. **Deutsche Grammatikblöcke** — Pflicht je Wortart (die App bringt ja auch
   Thai-/Englisch-/Spanisch-/Französisch-Muttersprachlern Deutsch bei):
   - Substantiv: `germanNoun: { article: 'der'|'die'|'das', plural }`,
     `'—'` wenn das Wort keinen Plural hat (wie `der Reis`).
   - Verb: `germanVerb: { thirdPerson, praeteritum, perfekt, irregular }`;
     `perfekt` beginnt mit `'hat '` oder `'ist '`.
   - Adjektiv: `germanAdjective: { comparative, superlative, irregular }`.
   - **AE-42-Disziplin:** Gibt es ein `concept`, müssen diese Blöcke
     **feldgleich** mit dem Thai-Eintrag sein — sie werden einmal geprüft,
     nicht dreimal erhoben. Tests: `vocabulary-new.test.ts` (en/es),
     `vocabulary-fr.test.ts` (fr).
9. **`partOfSpeech`** — ein Wert aus `PartOfSpeech` (`noun, verb, adjective,
   adverb, pronoun, numeral, particle, interjection, preposition,
   conjunction`). Ein Grundstoff braucht laut Test mindestens 5 Wortarten,
   darunter noun, verb, adjective.
10. **`register`** — `'neutral' | 'formal' | 'informal'`.
11. **`isConcrete`** — `true` nur für Begriffe mit Bildmotiv; steuert die
    Bild-Pipeline. Abstrakta (`merci`, `aller`, `dix`) sind `false`.
12. **`translations`** — siehe Abschnitt 4.
13. **`sourceVerified`** — `true` nur, wenn die Quelle Form, Bedeutung (und
    wo geführt: Aussprache) des Eintrags wirklich deckt. Bei `false`:
    **`verificationNote` ist Pflicht** (Test) und erklärt genau, was unsicher
    ist (Vorbild: Thai-Eintrag `noon`).
14. **`source`** — URL **mit Abschnitts-Anker**, der belegt, in welchem
    Sprachabschnitt nachgesehen wurde: `#French`, `#Spanish`, `#English`
    (Thai: Link auf die Seite). Test verlangt den Anker und das `term` in der
    URL. Der Fehler, der diese Regel gebar: eine Bedeutung aus dem falschen
    Sprachabschnitt (Phase 2, ดี).

---

## 3. Optionale Felder (nur wenn belegt — nie geraten)

| Feld | Wann | Vorbild |
|---|---|---|
| `ipa`, `ipaAccent` | Wenn die Quelle Lautschrift liefert; bei Englisch **das Merkmal selbst**, `ipaAccent` nennt die Varietät (`'RP'`, `'ohne Angabe'`). | `vocabulary-en.ts` |
| `ipaSyllables` | Nur Spanisch: die enge IPA-Umschrift mit Silbengrenzen — der **unabhängige Beleg** gegen die Betonungsregel (AE-45). | `vocabulary-es.ts` |
| `spanishNoun` / `spanishVerb` | Genus+Artikel+Plural bzw. Konjugationsklasse — Pflicht bei spanischen Substantiven/Verben (Test). | `vocabulary-es.ts` |
| `englishVerb`, `englishSpelling` | Stammformen bzw. das Merkmal „dieses Schriftstück klingt so“ (nur an Wörtern, die eine Vergleichsgruppe bilden). | `vocabulary-en.ts` |
| `audioAssetId`, `imageAssetId` | Erst nach erfolgreichem Pipeline-Lauf. Nicht von Hand setzen. | Phase 4/5 |
| `note` | Lernhinweis zur Grammatik (Genus-Fallen, Stammformen, Homonyme). | überall |
| `exampleTerm` / `exampleRoman` / `exampleGerman` | Siehe Abschnitt 6. | — |

**Nie in fremde Felder greifen:** Ein französischer Eintrag trägt kein `tone`,
kein `spanishNoun`, kein `englishVerb` (Tests fangen das ab); ein
nicht-thailändischer Eintrag hat keinen `tone`.

---

## 4. `translations` — Brückentexte (NEU in Runde 1)

```ts
translations: { en: 'house', es: 'casa', th: 'บ้าน' }   // Partial<Record<Lang, string>>
```

- Zweck: das Wort in der **Brückensprache** erklären (= künftig
  Systemsprache des Geräts). Auflösung über `bridgeText(entry, bridge)` in
  `src/lib/languages/bridge.ts`:
  `translations[bridge]` → `german` → `translations.en` → `term`;
  Rückgabe `{ text, usedFallback }` — die UI kann fehlende Übersetzungen
  **ehrlich kennzeichnen** statt stillschweigend Deutsch zu zeigen.
- **Regeln:**
  - `de` steht **nie** im Feld — die deutsche Seite ist `german` (Test beim
    fr-Grundstoff). Doppelte Wahrheiten fangen an zu lügen.
  - Eine Übersetzung nur eintragen, wenn sie sicher ist; der Fallback fängt
    Fehlendes ab (`usedFallback: true`), ein falscher Brückentext wäre eine
    falsche Wahrheit.
  - Thai-Übersetzungen nur gegen ein geprüftes Thai-Gegenstück
    (`concept`) — wörtlich dessen `term`.
- Der französische Startgrundstoff trägt `en` + `es` für alle 40 Einträge
  und `th` am jeweiligen Thai-Gegenstück — das ist das Muster für Runde 2.

---

## 5. Audio-Bedarf pro Eintrag

Pro Eintrag entstehen (Pipeline `src/lib/clips/plan.ts`, Sprachpaket:
Roadmap v2 „Sprachpakete via GitHub Releases“):

1. **Wort-Clip** — `entry.term`, Sprache = Zielsprache.
2. **Beispiel-Clip** — `entry.exampleTerm`, falls vorhanden (deshalb:
   Beispiele nur, wenn man sie auch vertonen will).
3. **Deutscher Gegen-Clip** — `entry.german` (bringt ja die deutsche Seite
   mit). Der Bild-/Clip-Bedarf ist damit **deterministisch aus der Datei
   lesbar**: Jede Autorin weiß beim Schreiben, welche Clips dieser Eintrag
   einmal braucht.
- Französisch-Nachtrag: Die TTS-Naht (`SpeechLanguage` in
  `src/lib/audio.ts`) kennt bislang `'th','de','en','es'`. Vor jedem
  fr-Audio-Lauf muss sie `'fr'` (und die fr-Sprechervariante) bekommen —
  **Runde 2 / Audio-Verantwortlicher**, nicht der Content selbst.
  Deshalb hat Französisch in Runde 1 nur **Lese**-Drills.

---

## 6. Bilder und Beispiele

- **Bilder** (`src/lib/images/plan.ts`): genau ein Bild je Eintrag, nur bei
  `isConcrete: true`, und nur wenn ein Motiv existiert — Motive hängen am
  **Begriff** (`concept`), nicht an der Sprache (AE-46): `casa`, `house` und
  `maison` teilen das Motiv von `บ้าน`. Ein konkreter Eintrag ohne
  `concept` braucht ein eigenes Motiv (`src/lib/images/motifs.ts`), sonst
  gibt es ehrlich kein Bild.
- **Beispiele — die ehrliche Staffelung:**
  - Thai: vollständige, aus geprüften Wörtern komponierte Sätze.
  - Spanisch: nur Nominalgruppen aus Artikel + Substantiv (`el libro`), weil
    das Genus quellengeprüft ist, der Satz nicht (Test erzwingt das Muster).
  - Englisch: gar keine Beispiele (erfundene Sätze gibt es nicht).
  - Französisch (Runde 1): einfache A1-Mustersätze (Subjekt–Verb–Objekt,
    Kopula + Eigenschaft), zusammengesetzt aus Grundstoffwörtern plus
    dokumentierten Strukturwörtern (Artikel, `de/du/à`, `est`, `c'est`);
    als Ganzes nicht einzeln quellengeprüft — gekennzeichnet im Dateikopf.
    Runde 2 kann hier auf die quellengeprüfte Tiefe des Thai-Bestands heben.
- Für **Satz-Übungen** (`src/data/sentence-tasks.ts`) zählt nur, was ein
  Audit bestanden hat — neue Sprachen starten ehrlich mit `[]` und einem
  ehrlichen Fußtext, bis geprüfte Sätze vorliegen.

---

## 7. Was `registry.ts` automatisch prüft und ableitet

`src/lib/languages/registry.ts` ist die Stelle, die alles weiß — gepflegte
Zahlen sind dort verboten:

- **`entryCount`** wird **immer aus der Datendatei** gelesen
  (`entryCount: VOCABULARY_FR.length`), nie als Literal. Eine Testdatei
  prüft die Übereinstimmung (`french.test.ts`).
- **`delivered`** trennt „geprüfter Stoff“ von „auf jedem Gerät“.
  `hasContent(code) = entryCount > 0 && delivered` entscheidet über
  Lernbarkeit (Sprachwechsel, Profil). Französisch steht aktuell auf
  `delivered: false` und erscheint deshalb nur in der Grundstoff-Übersicht
  als „noch nicht lernbar“.
- **`hasGermanModules: true`** für jede Zielsprache: die deutschen
  Grammatikübungen (Artikel, Stammformen) gehören zu jedem „X → Deutsch“.
- **Feature-Eintrag** (`label`, `description`, `kind`, `implemented`,
  `source`) — Pflicht 4: jedes behauptete Merkmal trägt eine
  Wikipedia-Quelle mit Abrufdatum und wörtlichem Zitat
  (fr: `French phonology`, Betonung auf der letzten vollen Silbe).
- Eine neue Sprache = **einer** Registrie-Eintrag + Grundstoff-Datei + (bei
  Aufnahme in den Bestand) Erweiterung von `LANGUAGE_CODES`; alles andere
  (Auswahl, Zählung, Beschriftung) zieht von selbst.

## 8. Übungen (Drills) — was automatisch entsteht

Aus dem Grundstoff entstehen ohne Autor-Zutat: Karteikarten, Schreiben,
Deutsche Grammatik (`X → de`) und — über das **Sprachmerkmal**
(`src/lib/languages/feature.ts`, `featureRuntime`) — die Merkmalsübungen:

| Sprache | Merkmal | Übungen (DrillIds) |
|---|---|---|
| Thai | Töne (ableitbar aus der Schrift) | `tone`, `toneRule` |
| Spanisch | Betonung (aus der Schreibung herleitbar) | `stressHear`, `stressRule` |
| Englisch | Aussprache (nicht herleitbar, je Wort) | `soundSpelling`, `spelling` |
| Französisch | Betonung (letzte volle Silbe, stummes e, Akzentzeichen) | `stressFr`, `muteE`, `accentFr` |

Neue Merkmalsübungen brauchen: `DRILLS` + `DRILL_META` (in
`src/lib/drills/types.ts`), Builder + Gate in
`src/lib/drills/questions.ts`, Dispatch in `src/lib/drills/session.ts`,
Registrierung im `feature.ts` der Sprache — und einen Test, der den ganzen
Grundstock gegen die Regel fährt (Vorbild: `drills/french.test.ts`).

---

## 9. Namenskonventionen (Zusammenfassung)

- Datendateien: `src/data/vocabulary-<sprache>.ts`, Export
  `VOCABULARY_<SPRACHE>`; union-type pro Sprache in `vocab-types.ts`
  (`FrenchVocabEntry` als Muster).
- Eintrags-IDs: `<sprachprefix>_<lemma-in-ascii>` (`fr_marche`, `es_medico`);
  Disambiguierung per Suffix (`maa_dog`, `kao_old`).
- Regel-Datendateien: `<sprache>-<thema>.ts` (`spanish-stress.ts`,
  `french-spelling.ts`) — Regeln stehen als **zitierte Daten** mit Quelle,
  Abrufdatum und wörtlichem Zitat, nie als behaupteter Satz.
- Tests neben der Datei: `vocabulary-fr.test.ts` / `french.test.ts` /
  `pairs.test.ts` sind die Muster zum Kopieren.

## 10. Der kürzeste Check vor dem Anlegen eines Eintrags

1. Quelle im **richtigen Sprachabschnitt** gefunden? Anker in `source`?
2. `id` eindeutig (auch über Sprachen), `concept` gesetzt wenn möglich?
3. `romanization` = Silbenverkettung? Silbenflags sprachrichtig?
4. Deutsche Seite vollständig — und bei `concept` **feldgleich** mit Thai?
5. `translations.en`/`.es` sicher? (`.de` nie, `.th` nur am Gegenstück)
6. Beispiele: belegt oder nach der ehrlichen Staffelung weggelassen?
7. `npx jest src/data src/lib/languages src/lib/drills` — alles grün?

Bei offenen Fragen: Eintrag weglassen oder `sourceVerified: false` +
`verificationNote` setzen. Ein ehrliches Fehlen ist ein Zustand, eine
erfundene Angabe ist ein Defekt.
