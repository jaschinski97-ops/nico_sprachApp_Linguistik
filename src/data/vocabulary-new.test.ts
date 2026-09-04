import { planClips } from '@/lib/clips/plan';
import { drillsForDirection } from '@/lib/drills/types';
import { canHaveImage, planImages } from '@/lib/images/plan';
import { LANGUAGE_CODES } from '@/lib/languages/types';

import { PartOfSpeech } from './vocab-types';
import {
  findVocab,
  vocabularyFor,
  VOCABULARY,
  VOCABULARY_EN,
  VOCABULARY_ES,
  VOCABULARY_TH,
} from './vocabulary';

/**
 * Die beiden neuen Grundstöcke (Phase 16).
 *
 * DIESELBEN FRAGEN WIE IN PHASE 2, für zwei weitere Sprachen: Ist die Quelle
 * genannt? Ist sie abschnittsgenau? Ist die deutsche Seite vollständig? Und
 * die eine Frage, die dazugekommen ist: Stimmt die deutsche Seite mit dem
 * überein, was in Phase 2 für denselben Begriff geprüft wurde? Denn genau das
 * ist der Nutzen der Drehscheibe — wenn er nicht eingelöst wird, hat der
 * Umbau aus Phase 15 nichts gebracht.
 */

const NEUE = [...VOCABULARY_EN, ...VOCABULARY_ES];

describe('Umfang und Quellenlage', () => {
  it('führt für beide Sprachen mindestens 40 Einträge', () => {
    // Die Untergrenze aus Pflicht 1: lieber 40 belegte als 90 halbgeratene.
    expect(VOCABULARY_EN.length).toBeGreaterThanOrEqual(40);
    expect(VOCABULARY_ES.length).toBeGreaterThanOrEqual(40);
  });

  it('nennt zu jedem Eintrag eine abschnittsgenaue Quelle', () => {
    // Der Fehler aus Phase 2 (ดี) war eine Bedeutung aus dem falschen
    // Sprachabschnitt. Die Ankerform #Spanish / #English macht nachprüfbar,
    // wo nachgesehen wurde.
    for (const entry of VOCABULARY_ES) {
      expect(entry.source).toContain('#Spanish');
      expect(entry.source).toContain(entry.term);
    }
    for (const entry of VOCABULARY_EN) {
      expect(entry.source).toContain('#English');
    }
  });

  it('markiert unsichere Einträge, statt sie stillschweigend als geprüft zu führen', () => {
    for (const entry of NEUE) {
      if (!entry.sourceVerified) expect(entry.verificationNote).toBeTruthy();
      if (entry.verificationNote) expect(entry.sourceVerified).toBe(false);
    }
  });

  it('gibt jedem Eintrag eine eigene ID mit Sprachpräfix', () => {
    for (const entry of VOCABULARY_EN) expect(entry.id.startsWith('en_')).toBe(true);
    for (const entry of VOCABULARY_ES) expect(entry.id.startsWith('es_')).toBe(true);
    // Und die IDs kollidieren ueber alle Sprachen nicht - der Kartenschluessel
    // ist `vocabId:direction`, zwei gleiche IDs teilten sich den Fortschritt.
    expect(new Set(VOCABULARY.map((entry) => entry.id)).size).toBe(VOCABULARY.length);
  });
});

describe('Die deutsche Seite kommt aus Phase 2 (AE-42)', () => {
  it('stimmt bei jedem gemeinsamen Begriff Feld für Feld mit dem Thai-Eintrag überein', () => {
    // DAS IST DER EINGELOESTE NUTZEN DER DREHSCHEIBE. Genus, Plural,
    // Stammformen und Steigerung mussten kein zweites Mal erhoben werden -
    // und wenn sie hier abweichen, ist an einer Stelle etwas verrutscht.
    const abweichungen: string[] = [];
    for (const entry of NEUE) {
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

  it('trägt zu jedem deutschen Substantiv Genus und Plural', () => {
    for (const entry of NEUE) {
      if (entry.partOfSpeech !== 'noun') continue;
      expect(entry.germanNoun).toBeTruthy();
      expect(['der', 'die', 'das']).toContain(entry.germanNoun!.article);
      expect(entry.germanNoun!.plural.length).toBeGreaterThan(0);
    }
  });

  it('trägt zu jedem Verb die Stammformen mit Hilfsverb', () => {
    for (const entry of NEUE) {
      if (entry.partOfSpeech !== 'verb') continue;
      expect(entry.germanVerb).toBeTruthy();
      expect(entry.germanVerb!.perfekt).toMatch(/^(hat|ist) /);
    }
  });
});

describe('Die sprachspezifische Seite', () => {
  it('gibt jedem spanischen Substantiv Genus, Artikel und Plural', () => {
    for (const entry of VOCABULARY_ES) {
      if (entry.partOfSpeech !== 'noun') continue;
      expect(entry.spanishNoun).toBeTruthy();
      expect(['m', 'f']).toContain(entry.spanishNoun!.gender);
      expect(['el', 'la']).toContain(entry.spanishNoun!.article);
    }
  });

  it('hält den Fall fest, in dem Genus und Artikel auseinanderfallen', () => {
    // „el agua" ist weiblich und steht trotzdem mit „el". Genau deshalb sind
    // es zwei Felder und nicht eines.
    const agua = VOCABULARY_ES.find((entry) => entry.id === 'es_agua')!;
    expect(agua.spanishNoun).toEqual({ gender: 'f', article: 'el', plural: 'aguas' });
    expect(agua.note).toContain('el');
  });

  it('gibt jedem spanischen Verb seine Konjugationsklasse', () => {
    for (const entry of VOCABULARY_ES) {
      if (entry.partOfSpeech !== 'verb') continue;
      expect(['ar', 'er', 'ir']).toContain(entry.spanishVerb!.conjugation);
      expect(entry.term.endsWith(entry.spanishVerb!.conjugation)).toBe(true);
    }
  });

  it('gibt jedem englischen Verb Vergangenheit und Partizip', () => {
    for (const entry of VOCABULARY_EN) {
      if (entry.partOfSpeech !== 'verb') continue;
      expect(entry.englishVerb!.past.length).toBeGreaterThan(0);
      expect(entry.englishVerb!.participle.length).toBeGreaterThan(0);
    }
  });

  it('führt genug unregelmäßige englische Verben, damit die Angabe etwas bedeutet', () => {
    const unregelmaessig = VOCABULARY_EN.filter((entry) => entry.englishVerb?.irregular);
    expect(unregelmaessig.length).toBeGreaterThanOrEqual(10);
    const go = VOCABULARY_EN.find((entry) => entry.id === 'en_go')!;
    expect(go.englishVerb).toEqual({ past: 'went', participle: 'gone', irregular: true });
  });

  it('hält „read" als das Wort fest, an dem das Merkmal hängt', () => {
    // Gleiche Schreibung, andere Aussprache - und zwar innerhalb desselben
    // Verbs. Deutlicher laesst sich AE-44 nicht belegen.
    const read = VOCABULARY_EN.find((entry) => entry.id === 'en_read')!;
    expect(read.englishVerb).toEqual({ past: 'read', participle: 'read', irregular: true });
    expect(read.ipa).toBe('/ɹiːd/');
    expect(read.note).toContain('ɹɛd');
  });
});

describe('Beispiele: da, wo sie belegt sind — sonst gar nicht', () => {
  it('gibt spanischen Substantiven die Wortgruppe aus Artikel und Wort', () => {
    const libro = VOCABULARY_ES.find((entry) => entry.id === 'es_libro')!;
    expect(libro.exampleTerm).toBe('el libro');
    expect(libro.exampleGerman).toBe('das Buch');
  });

  it('erfindet für alles andere keinen Satz', () => {
    // Pflicht 1: lieber kein Beispiel als ein ausgedachtes. Wo eines steht,
    // ist es die Wortgruppe mit dem quellengeprueften Genus.
    for (const entry of NEUE) {
      if (!entry.exampleTerm) continue;
      expect(entry.spanishNoun).toBeTruthy();
      expect(entry.exampleTerm).toBe(`${entry.spanishNoun!.article} ${entry.term}`);
    }
    for (const entry of VOCABULARY_EN) expect(entry.exampleTerm).toBeUndefined();
  });
});

describe('Die bestehenden Übungstypen greifen (Pflicht 4)', () => {
  it('gibt jedem „X → Deutsch" die deutschen Grammatikübungen', () => {
    for (const code of LANGUAGE_CODES) {
      expect(drillsForDirection(`${code}_to_de`)).toEqual(['article', 'verbForms']);
    }
  });

  it('hat in beiden neuen Sprachen genug Stoff für Artikel und Stammformen', () => {
    for (const liste of [VOCABULARY_EN, VOCABULARY_ES]) {
      expect(liste.filter((entry) => entry.germanNoun).length).toBeGreaterThanOrEqual(20);
      expect(liste.filter((entry) => entry.germanVerb).length).toBeGreaterThanOrEqual(15);
    }
  });

  it('verteilt die Wortarten breit genug für einen Grundwortschatz', () => {
    for (const liste of [VOCABULARY_EN, VOCABULARY_ES]) {
      const arten = new Set<PartOfSpeech>(liste.map((entry) => entry.partOfSpeech));
      expect(arten.size).toBeGreaterThanOrEqual(5);
      expect(arten.has('noun')).toBe(true);
      expect(arten.has('verb')).toBe(true);
      expect(arten.has('adjective')).toBe(true);
    }
  });
});

describe('Thai bleibt unverändert (Regressionsnachweis)', () => {
  it('trägt weiter 84 Einträge mit Ton und Beispielsatz', () => {
    expect(VOCABULARY_TH).toHaveLength(84);
    for (const entry of VOCABULARY_TH) {
      expect(entry.tone).toBeTruthy();
      expect(entry.syllables.length).toBeGreaterThan(0);
      expect(entry.exampleTerm).toBeTruthy();
    }
  });

  it('lässt สวัสดี tief-tief-mittel — die Aussage aus Phase 3', () => {
    const sawatdii = findVocab('sawatdii')!;
    expect(sawatdii.language).toBe('th');
    expect(sawatdii.syllables.map((syllable) => syllable.tone)).toEqual(['low', 'low', 'mid']);
  });

  it('gibt keinem Thai-Eintrag ein Feld einer anderen Sprache', () => {
    for (const entry of VOCABULARY_TH) {
      expect(entry.spanishNoun).toBeUndefined();
      expect(entry.englishVerb).toBeUndefined();
      expect(entry.englishSpelling).toBeUndefined();
      expect(entry.ipaSyllables).toBeUndefined();
    }
  });

  it('gibt keinem neuen Eintrag einen Ton', () => {
    // Der Spiegel dazu: Ein spanischer Eintrag mit `tone: 'mid'` waere eine
    // Behauptung ueber eine Sprache ohne Toene.
    for (const entry of NEUE) expect(entry.tone).toBeUndefined();
  });
});

describe('Bilder und Clips für die neuen Sprachen (Phase 18)', () => {
  it('gibt jeder konkreten Vokabel ein Motiv — auch ohne gemeinsamen Begriff', () => {
    // Ohne diesen Test faellt es nicht auf: Ein fehlendes Motiv heisst kein
    // Bild, und kein Bild ist kein Fehler. Drei englische Woerter (bread,
    // blood, door) haben kein Thai-Gegenstueck und brauchen ein eigenes.
    for (const entry of NEUE) {
      if (!entry.isConcrete) continue;
      expect(canHaveImage(entry)).toBe(true);
    }
  });

  it('plant für jede Sprache genau ihre eigenen Bilder', () => {
    for (const language of LANGUAGE_CODES) {
      const specs = planImages({ language });
      expect(specs.length).toBeGreaterThan(0);
      const ids = new Set(vocabularyFor(language).map((entry) => entry.id));
      for (const spec of specs) expect(ids.has(spec.vocabId)).toBe(true);
    }
  });

  it('plant für jede Sprache Hörclips in ihrer eigenen Sprache', () => {
    for (const language of LANGUAGE_CODES) {
      const specs = planClips({ language });
      expect(specs.length).toBeGreaterThan(0);
      for (const spec of specs) expect(spec.language).toBe(language);
    }
  });
});
