import { type ConversationSituation } from './conversation/types';
import { VOCABULARY_TH } from '@/data/vocabulary';

import {
  lesestoffeFuerRichtung,
  tokenisiereFuerAntippen,
  verstaendnisFragen,
} from './reading-texts';

const T0 = Date.UTC(2026, 8, 13, 10);

function szene(overrides: Partial<ConversationSituation> = {}): ConversationSituation {
  return {
    id: 'szene-test',
    level: 'A1',
    topic: 'greeting',
    direction: 'de_to_th',
    title: 'Testszene',
    setting: 'Eine Szene.',
    scriptTurns: [
      { speaker: 'partner', thai: 'สวัสดีครับ', roman: 'sà-wàt-dii kráp', german: 'Hallo!' },
      { speaker: 'learner', thai: 'สวัสดีค่ะ ผมชอบกาแฟ', roman: '', german: 'Hallo, ich mag Kaffee.' },
      { speaker: 'partner', thai: 'อาหาร ดี', roman: '', german: 'Das Essen ist gut.' },
      { speaker: 'learner', thai: 'ขอบคุณครับ', roman: '', german: 'Danke.' },
    ],
    corrections: [],
    generatedAt: T0,
    modelUsed: 'test',
    ...overrides,
  };
}

describe('tokenisiereFuerAntippen — Wörter antippen', () => {
  it('findet Thai-Bestandswörter als längste Übereinstimmung', () => {
    const tokens = tokenisiereFuerAntippen('ผมชอบกาแฟ', VOCABULARY_TH, false);
    const gefundene = tokens.filter((t) => t.entry).map((t) => t.text);
    expect(gefundene.length).toBeGreaterThanOrEqual(2);
    // Zusammengesetzt ergibt die Token wieder den Ausgangstext.
    expect(tokens.map((t) => t.text).join('')).toBe('ผมชอบกาแฟ');
  });

  it('lässt Nicht-Bestand als unangetasteten Rest stehen', () => {
    const tokens = tokenisiereFuerAntippen('xyzq', VOCABULARY_TH, false);
    expect(tokens).toEqual([{ text: 'xyzq' }]);
  });

  it('matcht lateinische Wörter wortweise und ohne Groß-/Kleinschreibung', () => {
    const pool = [
      { id: 'a', term: 'coffee', romanization: '', german: 'Kaffee' },
    ] as never[];
    const tokens = tokenisiereFuerAntippen('One Coffee, please.', pool, true);
    const tippbar = tokens.filter((t) => t.entry);
    expect(tippbar).toHaveLength(1);
    expect(tippbar[0].text.startsWith('Coffee')).toBe(true);
  });
});

describe('verstaendnisFragen — mechanisch aus der Szene', () => {
  it('stellt Bedeutungs- und Sprecherfragen mit richtiger Lösung', () => {
    const probe = szene();
    const fragen = verstaendnisFragen(probe, 7);
    expect(fragen.length).toBeGreaterThan(0);
    const zeilenMitBedeutung = new Map(probe.scriptTurns.map((t) => [t.thai, t.german]));
    for (const frage of fragen) {
      if (frage.art === 'bedeutung') {
        expect(new Set(frage.optionen).size).toBe(frage.optionen.length);
        // Die richtige Option ist die Thai-Zeile mit exactly dieser Bedeutung.
        expect(zeilenMitBedeutung.get(frage.optionen[frage.correctIndex])).toBe(frage.frage);
      } else {
        // Sprecher-Frage: Zeile gehört zu „Du" (0) oder „Gegenüber" (1).
        expect([0, 1]).toContain(frage.correctIndex);
      }
    }
  });

  it('liefert nichts für zu dünne Szenen', () => {
    const basis = szene();
    const duenn = szene({ scriptTurns: [basis.scriptTurns[0]] });
    expect(verstaendnisFragen(duenn, 7)).toEqual([]);
  });
});

describe('lesestoffeFuerRichtung — Freischaltung am Wortschatzstand', () => {
  const cards = (begonnene: string[]) =>
    VOCABULARY_TH.map((entry, i) => ({
      vocabId: entry.id,
      state: i < begonnene.length ? 'review' : 'new',
    })) as never[];

  it('sperrt Szenen unterhalb der Level-Schwelle und nennt den Stand', () => {
    const szene1 = szene();
    const stoffe = lesestoffeFuerRichtung({
      direction: 'de_to_th',
      situationen: [szene1],
      pool: VOCABULARY_TH,
      cards: cards([]),
      latin: false,
    });
    expect(stoffe[0].offen).toBe(false);
    expect(stoffe[0].schwellwert).toBe(20);
    expect(stoffe[0].bekannt).toBe(0);
  });

  it('öffnet die Szene, wenn ihre eigenen Pool-Wörter begonnen sind', () => {
    const stoffe = lesestoffeFuerRichtung({
      direction: 'de_to_th',
      situationen: [szene()],
      pool: VOCABULARY_TH,
      cards: cards(VOCABULARY_TH.map((e) => e.id)),
      latin: false,
    });
    // Kriterium: min(Level-Schwelle, Szenen-Wortschatz) begonnen — mit allen
    // Karten begonnen ist jedes Kriterium erfüllt.
    expect(stoffe[0].offen).toBe(true);
    expect(stoffe[0].bekannt).toBe(stoffe[0].poolWoerter);
  });

  it('filtert nach Richtung und sortiert offene zuerst', () => {
    const fremd = szene({ id: 'fremd', direction: 'th_to_de', title: 'Fremd' });
    const offen = szene({ id: 'offen', title: 'Offen' });
    const stoffe = lesestoffeFuerRichtung({
      direction: 'de_to_th',
      situationen: [fremd, offen],
      pool: VOCABULARY_TH,
      cards: cards(VOCABULARY_TH.map((e) => e.id)),
      latin: false,
    });
    expect(stoffe).toHaveLength(1);
    expect(stoffe[0].situation.id).toBe('offen');
    expect(stoffe[0].offen).toBe(true);
  });
});
