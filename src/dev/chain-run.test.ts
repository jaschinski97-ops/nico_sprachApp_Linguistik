import type { BatchProgress } from '@/lib/generation/batch';

import { planChain, fahreKette } from './chain-run';

/**
 * Die Steuerung der „Alle Sprachen“/„Alle Richtungen“/„Alle Levels“-Ketten:
 * Cap je Schritt, Dedup über die Schritte (sonst zahle man identische Pläne
 * doppelt), ein Fortschritt über die ganze Kette und ein Abbruch, der sie
 * sauber beendet.
 */

const spec = (id: string) => ({ id });

/** Ein Fortschrittsruf — fahreKette reicht ihn unverändert durch. */
const fortschritt = (processed: number, total: number): BatchProgress => ({
  processed, total, ok: 0, failed: 0, skipped: 0, current: null, errors: [], done: false, cancelled: false,
});

describe('planChain', () => {
  it('schneidet je Schritt auf max. neue zu und entfernt Doppelungen über die Schritte', async () => {
    // Schritt „en“ enthält denselben Eintrag wie Schritt „th“ — er darf nur
    // in „th“ angefragt werden, sonst würde er zweimal bezahlt.
    const { steps, all } = await planChain(
      [{ key: 'th', label: 'Thai' }, { key: 'en', label: 'Englisch' }],
      async (key) => [spec(`${key}-a`), spec(`${key}-b`), spec('gemeinsam')],
      async (specs) => specs,
      3
    );

    expect(steps[0].missing.map((s) => s.id)).toEqual(['th-a', 'th-b', 'gemeinsam']);
    // Cap 3 hätte „gemeinsam“ in Schritt 2 erneut enthalten — der Dedup
    // nimmt es heraus, statt es ein zweites Mal zu generieren.
    expect(steps[1].missing.map((s) => s.id)).toEqual(['en-a', 'en-b']);
    expect(all.map((s) => s.id)).toEqual(['th-a', 'th-b', 'gemeinsam', 'en-a', 'en-b']);
  });

  it('bestimmt die Fehlenden vor dem Cap: Vorhandenes zählt nicht gegen ihn', async () => {
    const { all } = await planChain(
      [{ key: 'th', label: 'Thai' }],
      async () => [spec('a'), spec('b'), spec('c'), spec('d')],
      async (specs) => specs.filter((s) => s.id !== 'a'), // 'a' existiert schon
      2
    );

    // Der Cap schneidet die NOCH fehlenden — nicht den Roheplan.
    expect(all.map((s) => s.id)).toEqual(['b', 'c']);
  });

  it('ohne Cap bleibt alles Fehlende, in fester Schrittreihenfolge geplant', async () => {
    const reihenfolge: string[] = [];
    const { all } = await planChain(
      [{ key: 'th', label: 'Thai' }, { key: 'es', label: 'Spanisch' }],
      async (key) => {
        reihenfolge.push(key);
        return [spec(`${key}-1`)];
      },
      async (specs) => specs
    );

    expect(reihenfolge).toEqual(['th', 'es']);
    expect(all.map((s) => s.id)).toEqual(['th-1', 'es-1']);
  });
});

describe('fahreKette', () => {
  it('fährt die Schritte hintereinander und summiert den Fortschritt über die Kette', async () => {
    const aufgerufen: number[][] = [];
    const meldungen: string[] = [];
    const letzter: { processed: number; total: number }[] = [];
    const schritte = [
      { key: 'th', label: 'Thai', missing: [1, 2] },
      { key: 'en', label: 'Englisch', missing: [3] },
      { key: 'es', label: 'Spanisch', missing: [4] },
    ];

    await fahreKette(schritte, 4, {
      onChainStep: (s) => meldungen.push(`${s.index}/${s.total} ${s.label}`),
      onProgress: (p) => letzter.push({ processed: p.processed, total: p.total }),
    }, async (missing, onStepProgress) => {
      aufgerufen.push(missing);
      for (let i = 1; i <= missing.length; i++) onStepProgress?.(fortschritt(i, missing.length));
    });

    expect(aufgerufen).toEqual([[1, 2], [3], [4]]);
    expect(meldungen).toEqual(['1/3 Thai', '2/3 Englisch', '3/3 Spanisch']);
    // Der letzte Stand zeigt die KETTE, nicht den letzten Schritt allein.
    expect(letzter[letzter.length - 1]).toEqual({ processed: 4, total: 4 });
  });

  it('bricht die Kette sauber ab: kein weiterer Schritt nach „Anhalten“', async () => {
    const aufgerufen: number[][] = [];
    const meldungen: string[] = [];
    let abgebrochen = false;
    const schritte = [
      { key: 'th', label: 'Thai', missing: [1] },
      { key: 'en', label: 'Englisch', missing: [2] },
    ];

    await fahreKette(schritte, 2, {
      onChainStep: (s) => meldungen.push(`${s.index}/${s.total} ${s.label}`),
      shouldCancel: () => abgebrochen,
    }, async (missing) => {
      aufgerufen.push(missing);
      abgebrochen = true; // wie ein Tipp auf „Anhalten“ im ersten Schritt
    });

    expect(aufgerufen).toEqual([[1]]);
    // Schritt 2 wird nicht einmal mehr angekündigt.
    expect(meldungen).toEqual(['1/2 Thai']);
  });

  it('meldet leere Schritte, fragt sie aber nicht an', async () => {
    const aufgerufen: number[][] = [];
    const meldungen: string[] = [];
    const schritte = [
      { key: 'th', label: 'Thai', missing: [1] },
      { key: 'en', label: 'Englisch', missing: [] },
      { key: 'es', label: 'Spanisch', missing: [2] },
    ];

    await fahreKette(schritte, 2, {
      onChainStep: (s) => meldungen.push(`${s.index}/${s.total} ${s.label}`),
    }, async (missing) => { aufgerufen.push(missing); });

    expect(meldungen).toEqual(['1/3 Thai', '2/3 Englisch', '3/3 Spanisch']);
    expect(aufgerufen).toEqual([[1], [2]]);
  });
});
