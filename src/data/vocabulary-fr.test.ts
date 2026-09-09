import { findVocab, VOCABULARY, VOCABULARY_FR } from './vocabulary';
import { FrenchVocabEntry } from './vocab-types';

import { accentGraphemesOf } from './french-spelling';

/**
 * Der französische Grundstoff (Roadmap v2, Runde 1 + 2).
 *
 * DIESELBEN FRAGEN WIE IN PHASE 2 UND 16, für die vierte Sprache: Ist die
 * Quelle genannt und abschnittsgenau? Ist die deutsche Seite vollständig und
 * — wo ein Thai-Gegenstück existiert — wörtlich von dort übernommen? Und die
 * französische Sonderfrage: Folgt die Silbenauszeichnung der Regel
 * (Betonung auf der letzten vollen Silbe, stummes Schluss-e gekennzeichnet)?
 */

describe('Umfang und Quellenlage', () => {
  it('umfasst genau 150 Einträge', () => {
    // Runde 1 lieferte 40 saubere A1-Wörter; Runde 2 hat den Grundstoff auf
    // den vereinbarten Umfang von 150 aufgebaut, frequenzorientiert über die
    // Alltagsdomänen verteilt (Zahlen, Familie, Essen, Körper, Kleidung,
    // Wohnen, Zeit, Wetter, Farben, Verben, Fragewörter, Orte, Verkehr).
    expect(VOCABULARY_FR).toHaveLength(150);
  });

  it('nennt zu jedem Eintrag eine abschnittsgenaue Quelle', () => {
    // Die Ankerform #French macht nachprüfbar, wo nachgesehen wurde — der
    // Fehler aus Phase 2 (ดี) war eine Bedeutung aus dem falschen
    // Sprachabschnitt.
    for (const entry of VOCABULARY_FR) {
      expect(entry.source).toContain('#French');
      expect(entry.source).toContain(entry.term);
    }
  });

  it('hat eindeutige IDs mit Sprachpräfix, die nicht mit dem Bestand kollidieren', () => {
    // Der Kartenschlüssel ist `vocabId:direction` — zwei gleiche IDs in
    // verschiedenen Sprachen würden sich denselben Lernfortschritt teilen.
    const ids = VOCABULARY_FR.map((entry) => entry.id);
    for (const id of ids) expect(id.startsWith('fr_')).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    const bestand = VOCABULARY.map((entry) => entry.id);
    for (const id of ids) expect(bestand).not.toContain(id);
  });

  it('steht NICHT im ausgelieferten Bestand', () => {
    // Die Ehrlichkeit dieser Runde: geprüfter Stoff im Repo, aber kein
    // App-Bestand. `VOCABULARY` bleibt die Vereinigung der drei
    // ausgelieferten Grundstoffe.
    for (const entry of VOCABULARY_FR) {
      expect(VOCABULARY).not.toContain(entry);
    }
  });
});

describe('Schema-Konformität', () => {
  it.each(VOCABULARY_FR.map((e) => [e.id, e] as [string, FrenchVocabEntry]))(
    '%s ist schema-konform',
    (_id, entry) => {
      expect(entry.language).toBe('fr');
      expect(entry.term.trim()).not.toBe('');
      expect(entry.german.trim()).not.toBe('');
      expect(['neutral', 'formal', 'informal']).toContain(entry.register);
      expect(typeof entry.isConcrete).toBe('boolean');
      expect(entry.syllables.length).toBeGreaterThan(0);
      // Die Silbenzerlegung muss die Umschrift exakt wiedergeben.
      expect(entry.syllables.map((s) => s.roman).join('-')).toBe(entry.romanization);
    }
  );

  it('trägt zu jedem Substantiv Genus und Plural', () => {
    const nouns = VOCABULARY_FR.filter((entry) => entry.partOfSpeech === 'noun');
    expect(nouns.length).toBeGreaterThanOrEqual(10);
    for (const entry of nouns) {
      expect(entry.germanNoun).toBeTruthy();
      expect(['der', 'die', 'das']).toContain(entry.germanNoun!.article);
      expect(entry.german.startsWith(entry.germanNoun!.article + ' ')).toBe(true);
      expect(entry.germanNoun!.plural.length).toBeGreaterThan(0);
    }
  });

  it('trägt zu jedem Verb die Stammformen mit Hilfsverb', () => {
    const verbs = VOCABULARY_FR.filter((entry) => entry.partOfSpeech === 'verb');
    expect(verbs.length).toBeGreaterThanOrEqual(8);
    for (const entry of verbs) {
      expect(entry.germanVerb).toBeTruthy();
      expect(entry.germanVerb!.perfekt).toMatch(/^(hat|ist) /);
    }
  });

  it('verteilt die Wortarten breit genug für einen Grundwortschatz', () => {
    const arten = new Set(VOCABULARY_FR.map((entry) => entry.partOfSpeech));
    expect(arten.size).toBeGreaterThanOrEqual(5);
    expect(arten.has('noun')).toBe(true);
    expect(arten.has('verb')).toBe(true);
    expect(arten.has('adjective')).toBe(true);
    expect(arten.has('numeral')).toBe(true);
  });

  it('trägt einen Beispielsatz mit deutscher Übersetzung', () => {
    for (const entry of VOCABULARY_FR) {
      expect(entry.exampleTerm?.trim()).toBeTruthy();
      expect(entry.exampleGerman?.trim()).toBeTruthy();
    }
  });
});

describe('Die Silbenauszeichnung folgt der französischen Regel', () => {
  it('setzt die Betonung auf die letzte volle Silbe', () => {
    // Die Regel aus French phonology (zitiert in french-spelling.ts): letzte
    // volle Silbe, das stumme Schluss-e zählt nicht mit. Diese Prüfung ist
    // für Französisch das, was für Spanisch der Vergleich gegen die
    // Herleitung ist: Der Grundstock als Ganzes muss der Regel folgen.
    for (const entry of VOCABULARY_FR) {
      const betont = entry.syllables.map((s) => s.stressed).indexOf(true);
      expect(betont).toBeGreaterThanOrEqual(0);
      const voll = entry.syllables.map((s) => !s.mute).lastIndexOf(true);
      expect(`${entry.id}:${betont}`).toBe(`${entry.id}:${voll}`);
    }
  });

  it('trägt genau eine Betonung je Eintrag', () => {
    for (const entry of VOCABULARY_FR) {
      const betonte = entry.syllables.filter((s) => s.stressed);
      expect(betonte).toHaveLength(1);
    }
  });

  it('kennt Stummheit nur am Wortende', () => {
    for (const entry of VOCABULARY_FR) {
      entry.syllables.forEach((silbe, index) => {
        if (silbe.mute) {
          expect(`${entry.id}:${index}`).toBe(`${entry.id}:${entry.syllables.length - 1}`);
        }
      });
    }
  });

  it('hat genug mehrsilbigen Stoff für die Betonungsübung', () => {
    const mehrsilbig = VOCABULARY_FR.filter((entry) => entry.syllables.length >= 2);
    expect(mehrsilbig.length).toBeGreaterThanOrEqual(25);
  });

  it('hat genug Stoff für das stumme e (mindestens 15 Einträge)', () => {
    const stummesE = VOCABULARY_FR.filter(
      (entry) => entry.syllables[entry.syllables.length - 1].mute
    );
    // Der Runde-2-Ausbau sollte den muteE-Topf gezielt gefüllt haben — die
    // Zahl ist Absicht, kein Zufall (Auftrag: ≥ 15).
    expect(stummesE.length).toBeGreaterThanOrEqual(15);
  });

  it('hat genug Stoff für die Akzentübung (mindestens 12 Einträge, alle vier Zeichen)', () => {
    const mitAkzent = VOCABULARY_FR.filter(
      (entry) => new Set(accentGraphemesOf(entry.term)).size === 1
    );
    expect(mitAkzent.length).toBeGreaterThanOrEqual(12);
    // Und jedes der vier gelernten Zeichen (é, è, ê, ç) kommt vor — sonst
    // würde die Übung ein Zeichen lehren, das der Grundstoff nie zeigt.
    const zeichen = new Set(mitAkzent.flatMap((entry) => accentGraphemesOf(entry.term)));
    for (const gelernt of ['é', 'è', 'ê', 'ç']) {
      expect(zeichen.has(gelernt)).toBe(true);
    }
  });

  it('Stichproben: das stumme Schluss-e senkt die gesprochene Silbenzahl', () => {
    // fe-nê-tre: drei geschriebene Silben, zwei gesprochene, betont ist die
    // zweite — die Zwillingsprüfung zu fr_fromage aus Runde 1, jetzt an den
    // Runde-2-Stoff gerichtet.
    const fenetre = VOCABULARY_FR.find((entry) => entry.id === 'fr_fenetre');
    expect(fenetre).toBeTruthy();
    expect(fenetre!.syllables.map((s) => s.roman)).toEqual(['fe', 'nê', 'tre']);
    expect(fenetre!.syllables[2].mute).toBe(true);
    expect(fenetre!.syllables[1].stressed).toBe(true);
    expect(fenetre!.syllables.filter((s) => !s.mute)).toHaveLength(2);

    // fa-mi-lle: das stumme e hängt hier an einem Doppelkonsonanten.
    const famille = VOCABULARY_FR.find((entry) => entry.id === 'fr_famille');
    expect(famille!.syllables.map((s) => s.roman).join('-')).toBe('fa-mi-lle');
    expect(famille!.syllables.filter((s) => !s.mute)).toHaveLength(2);
  });

  it('Stichprobe: où trägt sein Zeichen in Schreibung und Umschrift', () => {
    // Der Accent grave steht im `term` UND in der Silbe — er darf nirgends
    // zur ASCII-Vereinfachung verschwinden.
    const ou = VOCABULARY_FR.find((entry) => entry.id === 'fr_ou');
    expect(ou!.term).toBe('où');
    expect(ou!.romanization).toBe('où');
    expect(ou!.syllables[0].roman).toBe('où');
  });
});

describe('Die deutsche Seite kommt aus dem Thai-Grundstock (AE-42)', () => {
  it('stimmt bei jedem gemeinsamen Begriff Feld für Feld überein', () => {
    const abweichungen: string[] = [];
    for (const entry of VOCABULARY_FR) {
      if (!entry.concept) continue;
      const thai = findVocab(entry.concept);
      expect(thai).toBeTruthy();
      if (!thai) continue;
      if (entry.germanNoun && JSON.stringify(entry.germanNoun) !== JSON.stringify(thai.germanNoun)) {
        abweichungen.push(`${entry.id}: germanNoun weicht von ${thai.id} ab`);
      }
      if (entry.germanVerb && JSON.stringify(entry.germanVerb) !== JSON.stringify(thai.germanVerb)) {
        abweichungen.push(`${entry.id}: germanVerb weicht von ${thai.id} ab`);
      }
      if (
        entry.germanAdjective &&
        JSON.stringify(entry.germanAdjective) !== JSON.stringify(thai.germanAdjective)
      ) {
        abweichungen.push(`${entry.id}: germanAdjective weicht von ${thai.id} ab`);
      }
    }
    expect(abweichungen).toEqual([]);
  });
});

describe('Die Brückentexte', () => {
  it('tragen Englisch und Spanisch überall, Thai am Gegenstück', () => {
    for (const entry of VOCABULARY_FR) {
      expect(entry.translations?.en?.trim()).toBeTruthy();
      expect(entry.translations?.es?.trim()).toBeTruthy();
      if (entry.concept) {
        // Thai nur dort, wo es geprüft ist: wörtlich das Thai-Gegenstück.
        const thai = findVocab(entry.concept)!;
        expect(entry.translations?.th).toBe(thai.term);
      } else {
        expect(entry.translations?.th).toBeUndefined();
      }
    }
  });

  it('pflegt Deutsch nie ins translations-Feld — der Quelltext bleibt deutsch', () => {
    // Doppelte Wahrheiten fangen an zu lügen, sobald eine von beiden
    // gepflegt wird. Die deutsche Seite IST `german` (AE-42).
    for (const entry of VOCABULARY_FR) {
      expect(entry.translations?.de).toBeUndefined();
    }
  });
});

describe('Kein Feld einer anderen Sprache', () => {
  it('trägt weder Ton noch spanische oder englische Merkmale', () => {
    for (const entry of VOCABULARY_FR) {
      expect(entry.tone).toBeUndefined();
      expect(entry.spanishNoun).toBeUndefined();
      expect(entry.spanishVerb).toBeUndefined();
      expect(entry.englishVerb).toBeUndefined();
      expect(entry.englishSpelling).toBeUndefined();
      expect(entry.ipaSyllables).toBeUndefined();
    }
  });
});
