import { MemoryDataStore } from './storage';

import {
  bereichVerfuegbar,
  buildTodayRound,
  KARTEN_MAX,
  planTodayRound,
  ROUND_MINUTES,
  schwaecheAusLog,
  type RoundPlanInput,
  type RoundSegment,
} from './today-round';
import { type ReviewDayLog } from './review-log';

const T0 = Date.UTC(2026, 8, 13, 10); // Sonntag, lokal

function eingabe(overrides: Partial<RoundPlanInput> = {}): RoundPlanInput {
  return {
    dueCount: 10,
    verfuegbar: { hoeren: true, satz: true, diktat: true, shadowing: true },
    ...overrides,
  };
}

const minuten = (segment: RoundSegment): number =>
  segment.items * { cards: 0.35, hoeren: 0.3, satz: 0.5, diktat: 0.75, shadowing: 0.75 }[segment.kind];

describe('planTodayRound — Mischung', () => {
  it('stellt Karten voran und mischt alle verfügbaren Bereiche', () => {
    const plan = planTodayRound(eingabe());
    expect(plan.map((s) => s.kind)).toEqual(['cards', 'hoeren', 'satz', 'diktat', 'shadowing']);
    expect(plan[0].kind).toBe('cards');
    for (const segment of plan) {
      expect(segment.items).toBeGreaterThanOrEqual(2);
    }
  });

  it('hält die Ziel-Dauer ein', () => {
    const plan = planTodayRound(eingabe({ dueCount: KARTEN_MAX }));
    const gesamt = plan.reduce((summe, s) => summe + minuten(s), 0);
    expect(gesamt).toBeLessThanOrEqual(ROUND_MINUTES + 1);
  });

  it('ist deterministisch', () => {
    expect(planTodayRound(eingabe())).toEqual(planTodayRound(eingabe()));
  });
});

describe('planTodayRound — Fälligkeit', () => {
  it('deckelt die Karten, damit die anderen Bereiche Platz haben', () => {
    const plan = planTodayRound(eingabe({ dueCount: 84 }));
    expect(plan.find((s) => s.kind === 'cards')!.items).toBe(KARTEN_MAX);
  });

  it('lässt Karten weg, wenn nichts fällig ist', () => {
    const plan = planTodayRound(eingabe({ dueCount: 0 }));
    expect(plan.some((s) => s.kind === 'cards')).toBe(false);
  });
});

describe('planTodayRound — Verfügbare Stoffe', () => {
  it('nimmt nur Bereiche mit Stoff auf', () => {
    const plan = planTodayRound(eingabe({ verfuegbar: { diktat: true } }));
    expect(plan.map((s) => s.kind)).toEqual(['cards', 'diktat']);
  });

  it('streicht Bereiche statt Mini-Segmente zu erzeugen, wenn die Zeit fehlt', () => {
    const plan = planTodayRound(eingabe({ dueCount: KARTEN_MAX, zielMinuten: 5 }));
    for (const segment of plan) {
      expect(segment.items).toBeGreaterThanOrEqual(2);
    }
    expect(plan.reduce((summe, s) => summe + minuten(s), 0)).toBeLessThanOrEqual(6);
  });
});

describe('planTodayRound — Gewichtung schwacher Bereiche', () => {
  it('gibt einem Bereich mit hoher Fehlerquote mehr Anteil', () => {
    const basis = planTodayRound(eingabe({ verfuegbar: { hoeren: true, diktat: true } }));
    const geschwaecht = planTodayRound(eingabe({
      verfuegbar: { hoeren: true, diktat: true },
      schwaeche: { diktat: { total: 30, correct: 0 } },
    }));
    // 100 % Fehler verdoppelt das Gewicht — mehr Zeit fürs Diktat als fürs
    // fehlerfreie Hören, obwohl das Diktat pro Aufgabe langsamer ist.
    const diktatMinuten = geschwaecht.find((s) => s.kind === 'diktat')!.items * 0.75;
    const hoerenMinuten = geschwaecht.find((s) => s.kind === 'hoeren')!.items * 0.3;
    expect(diktatMinuten).toBeGreaterThan(hoerenMinuten);
    // Und gegen den ungewichteten Plan: das Diktat wächst.
    expect(
      geschwaecht.find((s) => s.kind === 'diktat')!.items
    ).toBeGreaterThanOrEqual(basis.find((s) => s.kind === 'diktat')!.items);
  });

  it('interpretiert fehlende Daten nie als Schwäche', () => {
    const plan = planTodayRound(eingabe({ schwaeche: {} }));
    const ohne = planTodayRound(eingabe());
    expect(plan).toEqual(ohne);
  });
});

describe('schwaecheAusLog — das Tagesprotokoll wird zu Bereichsquoten', () => {
  it('zählt die letzten 7 Tage je Aufgaben-Art zusammen', () => {
    const tag = (date: string, byDrill: ReviewDayLog['byDrill']): ReviewDayLog => ({
      date,
      total: 0,
      byDirection: {},
      byRating: {},
      byDrill,
    });
    const tage = [
      tag('2026-09-13', { tone: { total: 10, correct: 4 }, dictation: { total: 4, correct: 4 } }),
      tag('2026-09-08', { tone: { total: 10, correct: 9 } }),
      // zu alt — kein Einfluss
      tag('2026-08-01', { tone: { total: 50, correct: 0 } }),
      // alte Dokumente ohne byDrill
      { date: '2026-09-12', total: 3, byDirection: {}, byRating: {} },
    ];
    const schwaeche = schwaecheAusLog(tage, T0);
    expect(schwaeche.hoeren).toEqual({ total: 20, correct: 13 });
    expect(schwaeche.diktat).toEqual({ total: 4, correct: 4 });
  });
});

describe('bereichVerfuegbar — Stoff je Sprache', () => {
  it('hat Satzstoff, wo Beispielsätze mit deutscher Bedeutung liegen', () => {
    expect(bereichVerfuegbar('de_to_th', 'satz')).toBe(true);
    expect(bereichVerfuegbar('de_to_en', 'satz')).toBe(true);
    // Satzbedeutungen gibt es nur auf Deutsch — andere Oberflächen überspringen ehrlich.
    expect(bereichVerfuegbar('en_to_th', 'satz')).toBe(false);
  });

  it('hat Diktatstoff, wo es Sätze gibt, und eine Hörübung laut Sprachdefinition', () => {
    expect(bereichVerfuegbar('de_to_th', 'diktat')).toBe(true);
    // Die deutschen Test-Wörter tragen keine Beispielsätze.
    expect(bereichVerfuegbar('th_to_de', 'diktat')).toBe(false);
    expect(bereichVerfuegbar('de_to_th', 'hoeren')).toBe(true);
    // Deutsch hat keine eigene Wort-Hörübung.
    expect(bereichVerfuegbar('th_to_de', 'hoeren')).toBe(false);
  });
});

describe('buildTodayRound — der Lauf über dem echten Bestand', () => {
  it('plant mit den fälligen Karten der Richtung', async () => {
    const store = new MemoryDataStore();
    await store.init();
    const { plan, due } = await buildTodayRound('de_to_th', store, T0);
    expect(plan[0].kind).toBe('cards');
    // Neue Karten sind sofort fällig — der Grundstock ist größer als die Deckelung.
    expect(due.length).toBeGreaterThanOrEqual(plan[0].items);
    expect(plan[0].items).toBeLessThanOrEqual(KARTEN_MAX);
  });
});
