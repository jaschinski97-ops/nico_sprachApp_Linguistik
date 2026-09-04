import { TONE_KEYS } from '@/constants/tones';
import { createCardState } from '@/lib/fsrs/fsrs';
import { Direction } from '@/lib/fsrs/types';
import { loadVocabEntry, loadVocabulary, seedVocabulary } from '@/lib/repository';
import { MemoryDataStore } from '@/lib/storage';

// PHASE 16: `VOCABULARY` umfasst jetzt alle drei Sprachen. Was diese Datei
// zusichert, gilt dem Thai-Grundstock aus Phase 2 - deshalb hier
// ausdruecklich der. Unterhalb dieser Zeile hat sich nichts geaendert.
import { VOCABULARY as ALLE_SPRACHEN, findVocab, VERIFIED_VOCABULARY, VOCABULARY_TH as VOCABULARY, VocabEntry } from './vocabulary';

const DIRECTIONS: Direction[] = ['de_to_th', 'th_to_de'];

/** Thai-Schriftbereich plus Leerzeichen - faengt versehentlich lateinische Zeichen ab. */
const THAI_ONLY = /^[฀-๿ ]+$/;

describe('Vokabel-Grundstock: Umfang und Eindeutigkeit', () => {
  it('enthaelt 50 bis 100 Eintraege', () => {
    expect(VOCABULARY.length).toBeGreaterThanOrEqual(50);
    expect(VOCABULARY.length).toBeLessThanOrEqual(100);
  });

  it('hat durchgehend eindeutige IDs', () => {
    const ids = VOCABULARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('hat keine doppelten Thai-Schreibungen', () => {
    const thai = VOCABULARY.map((e) => e.term);
    expect(new Set(thai).size).toBe(thai.length);
  });

  it('findet Eintraege ueber findVocab', () => {
    expect(findVocab('gai')?.term).toBe('ไก่');
    expect(findVocab('gibtesnicht')).toBeUndefined();
  });
});

describe('Vokabel-Grundstock: Schema-Konformitaet', () => {
  it.each(VOCABULARY.map((e) => [e.id, e] as [string, VocabEntry]))(
    '%s ist schema-konform',
    (_id, entry) => {
      expect(entry.term.trim()).not.toBe('');
      expect(THAI_ONLY.test(entry.term)).toBe(true);
      expect(entry.romanization.trim()).not.toBe('');
      expect(entry.german.trim()).not.toBe('');

      expect(TONE_KEYS).toContain(entry.tone);
      expect(entry.syllables.length).toBeGreaterThan(0);
      entry.syllables.forEach((syllable) => {
        expect(TONE_KEYS).toContain(syllable.tone);
        expect(syllable.roman.trim()).not.toBe('');
      });

      // `tone` ist per Definition der Ton der ersten Silbe.
      expect(entry.tone).toBe(entry.syllables[0].tone);
      // Die Silbenzerlegung muss die Umschrift exakt wiedergeben.
      expect(entry.syllables.map((s) => s.roman).join('-')).toBe(entry.romanization);

      expect(typeof entry.isConcrete).toBe('boolean');
      expect(['neutral', 'formal', 'informal']).toContain(entry.register);
    }
  );
});

describe('Vokabel-Grundstock: deutsche Seite', () => {
  it('gibt bei jedem Substantiv Genus und Plural an', () => {
    const nouns = VOCABULARY.filter((e) => e.partOfSpeech === 'noun');
    expect(nouns.length).toBeGreaterThan(0);
    nouns.forEach((entry) => {
      expect(entry.germanNoun).toBeDefined();
      expect(['der', 'die', 'das']).toContain(entry.germanNoun!.article);
      expect(entry.germanNoun!.plural.trim()).not.toBe('');
    });
  });

  it('nennt das Genus auch im deutschen Stichwort', () => {
    VOCABULARY.filter((e) => e.germanNoun).forEach((entry) => {
      expect(entry.german.startsWith(entry.germanNoun!.article + ' ')).toBe(true);
    });
  });

  it('gibt bei jedem Verb die Stammformen an', () => {
    const verbs = VOCABULARY.filter((e) => e.partOfSpeech === 'verb');
    expect(verbs.length).toBeGreaterThan(0);
    verbs.forEach((entry) => {
      expect(entry.germanVerb).toBeDefined();
      expect(entry.germanVerb!.thirdPerson.trim()).not.toBe('');
      expect(entry.germanVerb!.praeteritum.trim()).not.toBe('');
      // Das Perfekt muss das Hilfsverb mitfuehren - "haben" oder "sein" ist
      // fuer Thai-Muttersprachler eine eigene Fehlerquelle.
      expect(entry.germanVerb!.perfekt).toMatch(/^(hat|ist)\b/);
    });
  });

  it('gibt bei jedem Adjektiv die Steigerung an', () => {
    const adjectives = VOCABULARY.filter((e) => e.partOfSpeech === 'adjective');
    expect(adjectives.length).toBeGreaterThan(0);
    adjectives.forEach((entry) => {
      expect(entry.germanAdjective).toBeDefined();
      expect(entry.germanAdjective!.superlative.startsWith('am ')).toBe(true);
    });
  });

  it('begruendet jede unregelmaessige Form mit einem Lernhinweis', () => {
    VOCABULARY.filter(
      (e) => e.germanVerb?.irregular || e.germanAdjective?.irregular
    ).forEach((entry) => {
      // `note` traegt Grammatikhinweise, `verificationNote` nur benannte
      // Unsicherheiten - die zwei ungeprueften Eintraege fuehren beides in
      // einem Text.
      expect(entry.note ?? entry.verificationNote ?? '').not.toBe('');
    });
  });
});

describe('Vokabel-Grundstock: Bidirektionalitaet', () => {
  it('haelt fuer beide Richtungen alle noetigen Felder bereit', () => {
    VOCABULARY.forEach((entry) => {
      // Thai -> Deutsch braucht Schrift, Umschrift, Ton und Bedeutung.
      expect(entry.term && entry.romanization && entry.tone && entry.german).toBeTruthy();
      // Deutsch -> Thai braucht dieselben Felder plus ein Beispiel.
      expect(entry.exampleTerm?.trim()).not.toBe('');
      expect(entry.exampleRoman?.trim()).not.toBe('');
      expect(entry.exampleGerman?.trim()).not.toBe('');
      // Seit Phase 16 ist das Feld im Typ optional (Englisch und Spanisch
      // haben keine erfundenen Saetze). Fuer den Thai-Grundstock gilt
      // unveraendert: jeder Eintrag hat eines.
      expect(entry.exampleTerm).toBeTruthy();
    });
  });

  it('verwendet im Beispiel tatsaechlich das Stichwort', () => {
    VOCABULARY.forEach((entry) => {
      expect(entry.exampleTerm).toContain(entry.term);
    });
  });

  it('laesst zu jedem Eintrag Karten in beiden Richtungen anlegen', () => {
    VOCABULARY.forEach((entry) => {
      DIRECTIONS.forEach((direction) => {
        const card = createCardState(entry.id, direction);
        expect(card.vocabId).toBe(entry.id);
        expect(card.direction).toBe(direction);
      });
    });
  });
});

describe('Vokabel-Grundstock: Quellenlage', () => {
  it('gibt bei jedem geprueften Eintrag die Quelle an', () => {
    VERIFIED_VOCABULARY.forEach((entry) => {
      expect(entry.source).toMatch(/^https:\/\//);
    });
  });

  it('benennt bei jedem ungepruefsten Eintrag die Unsicherheit', () => {
    VOCABULARY.filter((e) => !e.sourceVerified).forEach((entry) => {
      expect(entry.verificationNote ?? '').not.toBe('');
      expect(entry.verificationNote!.length).toBeGreaterThan(30);
    });
  });

  it('setzt verificationNote ausschliesslich bei ungepruefsten Eintraegen', () => {
    // Sonst wuerde das Warnabzeichen in der Lernansicht auch bei geprueften
    // Karten auftauchen und damit bedeutungslos werden.
    VOCABULARY.filter((e) => e.sourceVerified).forEach((entry) => {
      expect(entry.verificationNote).toBeUndefined();
    });
  });

  it('ist nicht pauschal auf sourceVerified true gesetzt', () => {
    // Ein Grundstock, in dem ausnahmslos alles als geprueft gilt, ist ein
    // Warnzeichen - dann wurde die Pruefung vermutlich nicht wirklich gemacht.
    const verifiedRatio =
      VERIFIED_VOCABULARY.filter((e) => e.language === 'th').length / VOCABULARY.length;
    expect(verifiedRatio).toBeGreaterThanOrEqual(0.9);
    expect(verifiedRatio).toBeLessThan(1);
  });
});

describe('Vokabel-Grundstock: isConcrete fuer die Bild-Pipeline (Phase 5)', () => {
  it('markiert keine Partikel, Pronomen, Zahlwoerter oder Adverbien als konkret', () => {
    const neverConcrete = ['particle', 'pronoun', 'numeral', 'adverb', 'interjection'];
    VOCABULARY.filter((e) => neverConcrete.includes(e.partOfSpeech)).forEach((entry) => {
      expect(entry.isConcrete).toBe(false);
    });
  });

  it('markiert kein Adjektiv und kein Verb als konkret', () => {
    VOCABULARY.filter(
      (e) => e.partOfSpeech === 'adjective' || e.partOfSpeech === 'verb'
    ).forEach((entry) => {
      expect(entry.isConcrete).toBe(false);
    });
  });

  it('hat genug konkrete Substantive, damit die Bild-Pipeline etwas zu tun hat', () => {
    const concrete = VOCABULARY.filter((e) => e.isConcrete);
    expect(concrete.length).toBeGreaterThanOrEqual(20);
    concrete.forEach((entry) => expect(entry.partOfSpeech).toBe('noun'));
  });
});

describe('Vokabel-Grundstock: laedt korrekt durch die Persistenzschicht', () => {
  it('schreibt den Grundstock und liest ihn unveraendert zurueck', async () => {
    const store = new MemoryDataStore();
    await store.init();

    // Seit Phase 16 spielt `seedVocabulary` ALLE Sprachen ein - der
    // Grundstock der App ist die Vereinigung. Geprueft wird hier trotzdem
    // weiter der Thai-Teil, Eintrag fuer Eintrag.
    const count = await seedVocabulary(store);
    expect(count).toBe(ALLE_SPRACHEN.length);

    const loaded = await loadVocabulary(store);
    expect(loaded).toHaveLength(ALLE_SPRACHEN.length);

    const byId = new Map(loaded.map((e) => [e.id, e]));
    VOCABULARY.forEach((entry) => {
      expect(byId.get(entry.id)).toEqual(entry);
    });
  });

  it('ist idempotent - zweimal einspielen verdoppelt nichts', async () => {
    const store = new MemoryDataStore();
    await store.init();

    await seedVocabulary(store);
    await seedVocabulary(store);

    expect(await loadVocabulary(store)).toHaveLength(ALLE_SPRACHEN.length);
  });

  it('liefert einen einzelnen Eintrag ueber die ID', async () => {
    const store = new MemoryDataStore();
    await store.init();
    await seedVocabulary(store);

    const entry = await loadVocabEntry('gai', store);
    expect(entry?.term).toBe('ไก่');
    expect(entry?.tone).toBe('low');
    expect(await loadVocabEntry('gibtesnicht', store)).toBeNull();
  });
});
