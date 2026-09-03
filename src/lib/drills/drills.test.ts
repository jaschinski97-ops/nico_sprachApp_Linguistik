import { TONE_KEYS, TONES } from '@/constants/tones';
import { VOCABULARY, VocabEntry } from '@/data/vocabulary';

import { createCardState } from '../fsrs/fsrs';
import { cardKey } from '../fsrs/types';
import { loadProfile, setDefaultDirection } from '../profile';
import { dayIsActive, dayKey, drillCount, loadReviewLog, recordDrill } from '../review-log';
import { rateCard } from '../repository';
import { DataStore, MemoryDataStore } from '../storage';

import {
  bareNoun,
  buildArticleQuestion,
  buildToneQuestion,
  buildVerbFormQuestion,
  canBuildArticleQuestion,
  canBuildToneQuestion,
  canBuildVerbFormQuestion,
  swapAuxiliary,
} from './questions';
import { seededRandom, shuffled } from './random';
import { buildDrillSession, DRILL_SESSION_SIZE, scoreAnswers } from './session';
import { DRILL_META, DRILLS, DRILLS_BY_DIRECTION, DrillId } from './types';

const T0 = Date.UTC(2026, 8, 1, 10);

async function freshStore(): Promise<DataStore> {
  const store = new MemoryDataStore();
  await store.init();
  return store;
}

function entryById(id: string): VocabEntry {
  const entry = VOCABULARY.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Testdaten erwarten den Eintrag "${id}".`);
  return entry;
}

const singleSyllable = () => VOCABULARY.filter(canBuildToneQuestion);
const multiSyllable = () => VOCABULARY.filter((entry) => entry.syllables.length > 1);

describe('Ton-Uebung', () => {
  it('nimmt nur einsilbige Woerter', () => {
    // Bei mehrsilbigen Woertern hat jede Silbe ihren eigenen Ton (AE-7); die
    // Frage "welchen Ton?" haette dann gar keine richtige Antwort.
    expect(singleSyllable().length).toBeGreaterThan(20);
    for (const entry of multiSyllable()) {
      expect(canBuildToneQuestion(entry)).toBe(false);
    }
  });

  it('weigert sich, eine Aufgabe zu einem mehrsilbigen Wort zu bauen', () => {
    const sawatdii = entryById('sawatdii');
    expect(sawatdii.syllables.length).toBeGreaterThan(1);
    expect(() => buildToneQuestion(sawatdii)).toThrow(/mehrsilbig/);
  });

  it('zeigt vor der Antwort weder Schrift noch Bedeutung', () => {
    // Die Thai-Schrift traegt das Tonzeichen, die Bedeutung erlaubt es, die
    // Antwort aus dem Gedaechtnis zu holen statt sie zu hoeren.
    const question = buildToneQuestion(entryById('gai'));
    expect(question.visible).toBeNull();
    expect(question.visibleHint).toBeNull();
    expect(question.speak).toEqual({ text: 'ไก่', language: 'th' });
  });

  it('bietet genau die fuenf Toene in fester Reihenfolge an', () => {
    const question = buildToneQuestion(entryById('gai'));
    expect(question.options.map((option) => option.tone)).toEqual(TONE_KEYS);
    expect(question.options.map((option) => option.label)).toEqual(
      TONE_KEYS.map((key) => TONES[key].label)
    );
  });

  it('markiert den richtigen Ton', () => {
    // ไก่ ist tief - der Referenzfall aus Phase 2, den eine Fliesstext-Quelle
    // faelschlich als "falling" fuehrte.
    const question = buildToneQuestion(entryById('gai'));
    expect(question.options[question.correctIndex].tone).toBe('low');
    expect(question.explanation).toContain(TONES.low.adjective);
  });

  it('trifft fuer jedes einsilbige Wort den Ton aus den Daten', () => {
    for (const entry of singleSyllable()) {
      const question = buildToneQuestion(entry);
      expect(question.options[question.correctIndex].tone).toBe(entry.syllables[0].tone);
    }
  });

  it('loest erst nach der Antwort auf, was das Wort war', () => {
    const question = buildToneQuestion(entryById('nam'));
    expect(question.solution).toContain('น้ำ');
    expect(question.solution).toContain('das Wasser');
  });
});

describe('Artikel-Uebung', () => {
  it('nimmt nur Substantive', () => {
    for (const entry of VOCABULARY) {
      expect(canBuildArticleQuestion(entry)).toBe(Boolean(entry.germanNoun));
    }
  });

  it('streicht den Artikel aus dem Stichwort', () => {
    expect(bareNoun(entryById('baan'))).toBe('Haus');
    expect(bareNoun(entryById('khaao'))).toBe('Reis');
    expect(bareNoun(entryById('rongrian'))).toBe('Schule');
  });

  it('fragt bei mehreren Bedeutungen nur nach der ersten', () => {
    // "der Laden, der Verkaufsstand" - die zweite Bedeutung stuende sonst
    // mitten in der Luecke.
    expect(bareNoun(entryById('raan'))).toBe('Laden');
  });

  it('zeigt die Luecke und den thailaendischen Kontext', () => {
    const question = buildArticleQuestion(entryById('baan'));
    expect(question.visible).toBe('___ Haus');
    expect(question.visibleHint).toContain('บ้าน');
  });

  it('bietet der/die/das in fester Reihenfolge an und trifft das Genus', () => {
    for (const entry of VOCABULARY.filter(canBuildArticleQuestion)) {
      const question = buildArticleQuestion(entry);
      expect(question.options.map((option) => option.label)).toEqual(['der', 'die', 'das']);
      expect(question.options[question.correctIndex].label).toBe(entry.germanNoun!.article);
    }
  });

  it('nennt in der Erklaerung auch den Plural', () => {
    const question = buildArticleQuestion(entryById('baan'));
    expect(question.explanation).toContain('Plural: die Häuser');
  });

  it('weigert sich bei einem Wort ohne Genus-Daten', () => {
    expect(() => buildArticleQuestion(entryById('kin'))).toThrow(/kein Substantiv/);
  });
});

describe('Stammform-Uebung', () => {
  const random = () => seededRandom(7);
  const verbs = () => VOCABULARY.filter(canBuildVerbFormQuestion);

  it('nimmt nur Verben', () => {
    for (const entry of VOCABULARY) {
      expect(canBuildVerbFormQuestion(entry)).toBe(Boolean(entry.germanVerb));
    }
  });

  it('vertauscht hat und ist', () => {
    expect(swapAuxiliary('hat gegessen')).toBe('ist gegessen');
    expect(swapAuxiliary('ist gegangen')).toBe('hat gegangen');
    expect(swapAuxiliary('hat sich entschuldigt')).toBe('ist sich entschuldigt');
    expect(swapAuxiliary('gegessen')).toBeNull();
  });

  it('hat immer die Form mit vertauschtem Hilfsverb als Ablenker dabei', () => {
    // "haben" gegen "sein" ist die eigentliche Fehlerquelle. Wer nur zwischen
    // fremden Partizipien waehlen muesste, koennte die Aufgabe loesen, ohne je
    // ueber das Hilfsverb nachzudenken.
    for (const entry of verbs()) {
      const question = buildVerbFormQuestion(entry, VOCABULARY, random());
      const swapped = swapAuxiliary(entry.germanVerb!.perfekt);
      expect(question.options.map((option) => option.label)).toContain(swapped);
    }
  });

  it('markiert die richtige Form und wiederholt keine Antwort', () => {
    for (const entry of verbs()) {
      const question = buildVerbFormQuestion(entry, VOCABULARY, random());
      const labels = question.options.map((option) => option.label);
      expect(labels[question.correctIndex]).toBe(entry.germanVerb!.perfekt);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it('erfindet keine Ablenker - jede falsche Antwort ist eine echte Form oder ein vertauschtes Hilfsverb', () => {
    const echteFormen = new Set(
      verbs().map((entry) => entry.germanVerb!.perfekt)
    );
    for (const entry of verbs()) {
      const question = buildVerbFormQuestion(entry, VOCABULARY, random());
      question.options.forEach((option, index) => {
        if (index === question.correctIndex) return;
        const istEchteForm = echteFormen.has(option.label);
        const istVertauscht = swapAuxiliary(option.label) === entry.germanVerb!.perfekt;
        expect(istEchteForm || istVertauscht).toBe(true);
      });
    }
  });

  it('nennt in der Erklaerung alle Stammformen', () => {
    const question = buildVerbFormQuestion(entryById('kin'), VOCABULARY, random());
    expect(question.explanation).toContain('isst');
    expect(question.explanation).toContain('aß');
    expect(question.explanation).toContain('hat gegessen');
    expect(question.explanation).toContain('unregelmäßig');
  });

  it('ist mit derselben Aussaat reproduzierbar', () => {
    const first = buildVerbFormQuestion(entryById('kin'), VOCABULARY, seededRandom(42));
    const second = buildVerbFormQuestion(entryById('kin'), VOCABULARY, seededRandom(42));
    expect(first.options).toEqual(second.options);
    expect(first.correctIndex).toBe(second.correctIndex);
  });
});

describe('Uebungen je Richtung', () => {
  it('ordnet jede Uebung genau einer Richtung zu', () => {
    for (const drill of DRILLS) {
      const direction = DRILL_META[drill].direction;
      expect(DRILLS_BY_DIRECTION[direction]).toContain(drill);
      const andere = direction === 'de_to_th' ? 'th_to_de' : 'de_to_th';
      expect(DRILLS_BY_DIRECTION[andere]).not.toContain(drill);
    }
  });

  it('gibt jeder Richtung mindestens eine eigene Uebung', () => {
    // Der Kern von Phase 6: beide Zielgruppen scheitern an anderen Stellen.
    expect(DRILLS_BY_DIRECTION.de_to_th.length).toBeGreaterThan(0);
    expect(DRILLS_BY_DIRECTION.th_to_de.length).toBeGreaterThan(0);
  });

  it('uebt fuer Thai-Lernende Toene und fuer Deutsch-Lernende Grammatik', () => {
    // Seit Phase 13 zweimal Ton fuer de_to_th, und das mit Absicht: „Toene
    // hoeren" trainiert das Ohr, „Ton herleiten" die Schriftregel. Beides
    // fuehrt zum selben Ton, aber ueber verschiedene Wege - wer nur hoert,
    // bleibt bei jedem neuen Wort auf das Ohr angewiesen.
    expect(DRILLS_BY_DIRECTION.de_to_th).toEqual(['tone', 'toneRule']);
    expect(DRILLS_BY_DIRECTION.th_to_de).toEqual(['article', 'verbForms']);
  });
});

describe('buildDrillSession', () => {
  it('stellt eine Runde aus geeigneten Vokabeln zusammen', async () => {
    const store = await freshStore();
    for (const drill of DRILLS) {
      const session = await buildDrillSession({ drill, store, now: T0, seed: 1 });
      expect(session.questions).toHaveLength(DRILL_SESSION_SIZE);
      expect(session.available).toBeGreaterThanOrEqual(DRILL_SESSION_SIZE);
      expect(session.questions.every((question) => question.drill === drill)).toBe(true);
    }
  });

  it('vergibt keine Vokabel zweimal in derselben Runde', async () => {
    const store = await freshStore();
    const session = await buildDrillSession({ drill: 'tone', store, now: T0, seed: 3 });
    const ids = session.questions.map((question) => question.vocabId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('legt keine eigenen Karten an und veraendert keine (AE-16)', async () => {
    const store = await freshStore();
    await buildDrillSession({ drill: 'article', store, now: T0, seed: 1 });

    const cards = await store.getAll<{ vocabId: string; direction: string }>('cards');
    // Genau die Vokabelkarten der Richtung, keine zusaetzliche Sorte.
    expect(cards.every((card) => card.direction === 'th_to_de')).toBe(true);
    expect(new Set(cards.map((card) => card.vocabId)).size).toBe(cards.length);
    expect(cards).toHaveLength(VOCABULARY.length);
  });

  it('schreibt keinen Kartenzustand zurueck', async () => {
    const store = await freshStore();
    await buildDrillSession({ drill: 'article', store, now: T0, seed: 1 });
    const before = await store.get('cards', cardKey('baan', 'th_to_de'));

    await buildDrillSession({ drill: 'article', store, now: T0 + 60_000, seed: 2 });
    const after = await store.get('cards', cardKey('baan', 'th_to_de'));

    expect(after).toEqual(before);
  });

  it('zieht nur aus den am schlechtesten sitzenden Kandidaten', async () => {
    const store = await freshStore();
    await buildDrillSession({ drill: 'article', store, now: T0, seed: 1 });

    // Sechs Substantive wacklig, alle uebrigen fest. Das Fenster, aus dem
    // gezogen wird, ist dreimal so gross wie die Runde - bei zwei Aufgaben
    // also genau diese sechs. Was gezogen wird, muss daraus stammen.
    const nouns = VOCABULARY.filter((entry) => entry.germanNoun);
    const wacklig = new Set(nouns.slice(0, 6).map((entry) => entry.id));

    for (const entry of nouns) {
      const card = createCardState(entry.id, 'th_to_de', T0);
      await store.put('cards', cardKey(entry.id, 'th_to_de'), {
        ...card,
        state: 'review',
        difficulty: 5,
        stability: wacklig.has(entry.id) ? 0.2 : 5000,
        lastReview: T0 - 10 * 24 * 3600 * 1000,
        reps: 3,
      });
    }

    for (const seed of [1, 2, 3, 4, 5]) {
      const session = await buildDrillSession({
        drill: 'article',
        store,
        now: T0,
        seed,
        size: 2,
      });
      for (const question of session.questions) {
        expect(wacklig.has(question.vocabId)).toBe(true);
      }
    }
  });

  it('liefert mit derselben Aussaat dieselbe Runde', async () => {
    const store = await freshStore();
    const a = await buildDrillSession({ drill: 'tone', store, now: T0, seed: 11 });
    const b = await buildDrillSession({ drill: 'tone', store, now: T0, seed: 11 });
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
  });

  it('liefert mit anderer Aussaat eine andere Runde', async () => {
    // Sonst bekaeme man bei jedem Start dieselben zehn Aufgaben - die
    // Uebungen veraendern den Kartenzustand ja bewusst nicht.
    const store = await freshStore();
    const a = await buildDrillSession({ drill: 'tone', store, now: T0, seed: 11 });
    const b = await buildDrillSession({ drill: 'tone', store, now: T0, seed: 99 });
    expect(a.questions.map((q) => q.id)).not.toEqual(b.questions.map((q) => q.id));
  });
});

describe('scoreAnswers', () => {
  it('zaehlt richtige und gesamte Antworten', () => {
    const frage = buildToneQuestion(entryById('gai'));
    expect(
      scoreAnswers([
        { question: frage, chosenIndex: frage.correctIndex, correct: true },
        { question: frage, chosenIndex: 0, correct: false },
      ])
    ).toEqual({ correct: 1, total: 2 });
  });
});

describe('Tagesprotokoll mit Uebungen', () => {
  it('zaehlt Uebungen getrennt von Wiederholungen', async () => {
    // "Wiederholungen" heisst im UI genau das. Uebungen mit hineinzuzaehlen
    // wuerde die Beschriftung zur Unwahrheit machen (AE-16).
    const store = await freshStore();
    await recordDrill(true, T0, store);
    await recordDrill(false, T0, store);
    await recordDrill(true, T0, store);

    const [day] = await loadReviewLog(store);
    expect(day.date).toBe(dayKey(T0));
    expect(day.total).toBe(0);
    expect(day.drills).toBe(3);
    expect(day.drillsCorrect).toBe(2);
  });

  it('laesst Wiederholungen und Uebungen nebeneinander stehen', async () => {
    const store = await freshStore();
    const card = createCardState('gai', 'de_to_th', T0);
    await store.put('cards', cardKey('gai', 'de_to_th'), card);
    await rateCard(card, 3, store, T0);
    await recordDrill(true, T0, store);

    const [day] = await loadReviewLog(store);
    expect(day.total).toBe(1);
    expect(drillCount(day)).toBe(1);
  });

  it('zaehlt einen Tag mit nur Uebungen als Lerntag', async () => {
    const store = await freshStore();
    await recordDrill(true, T0, store);
    const [day] = await loadReviewLog(store);
    expect(dayIsActive(day)).toBe(true);
  });

  it('vertraegt Tagesdokumente aus aelteren Versionen ohne die Felder', () => {
    const alt = {
      date: '2026-08-01',
      total: 4,
      byDirection: { de_to_th: 4, th_to_de: 0 },
      byRating: { '1': 0, '2': 0, '3': 4, '4': 0 },
    };
    expect(drillCount(alt)).toBe(0);
    expect(dayIsActive(alt)).toBe(true);
  });
});

describe('Lernprofil', () => {
  it('startet ohne Standard-Richtung', async () => {
    const store = await freshStore();
    expect(await loadProfile(store)).toEqual({ defaultDirection: null });
  });

  it('merkt sich eine Richtung und gibt sie wieder heraus', async () => {
    const store = await freshStore();
    await setDefaultDirection('de_to_th', store);
    expect((await loadProfile(store)).defaultDirection).toBe('de_to_th');
  });

  it('laesst den Standard wieder aufheben', async () => {
    const store = await freshStore();
    await setDefaultDirection('th_to_de', store);
    await setDefaultDirection(null, store);
    expect((await loadProfile(store)).defaultDirection).toBeNull();
  });

  it('ignoriert einen unsinnigen gespeicherten Wert', async () => {
    // Ein Profil aus einer aelteren Version darf die App nicht in die
    // Richtungsauswahl sperren oder gar abstuerzen lassen.
    const store = await freshStore();
    await store.put('meta', 'profile', { defaultDirection: 'quer' });
    expect((await loadProfile(store)).defaultDirection).toBeNull();
  });
});

describe('seededRandom / shuffled', () => {
  it('liefert zur selben Aussaat dieselbe Folge', () => {
    const a = seededRandom(5);
    const b = seededRandom(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('bleibt zwischen 0 und 1', () => {
    const random = seededRandom(123);
    for (let i = 0; i < 200; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('mischt, ohne die Eingabe zu veraendern oder etwas zu verlieren', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const output = shuffled(input, seededRandom(9));
    expect(input).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect([...output].sort()).toEqual([...input].sort());
  });
});
