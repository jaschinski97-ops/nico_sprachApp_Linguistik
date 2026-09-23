import type { Tone } from '@/constants/tones';

import type { F0Frame } from '../speaking/analysis';
import { GELERNTE_TONFORMEN, hoherTonSteigtAn, tonfolgeKurve, vorlagenKosten, vorlagenUrteil } from './tone-template';

/** Stimmhafte Fenster aus Halbton-Verläufen je Silbe (um 200 Hz, 10 ms-Raster). */
function frames(silben: [number, number][], fensterJeSilbe = 20): F0Frame[] {
  const out: F0Frame[] = [];
  silben.forEach(([von, bis]) => {
    for (let i = 0; i < fensterJeSilbe; i++) {
      const st = von + ((bis - von) * i) / (fensterJeSilbe - 1);
      out.push({ t: out.length * 0.01, start: out.length * 80, f0: 200 * 2 ** (st / 12), correlation: 0.9, rms: 0.1 });
    }
  });
  return out;
}

/** Kurve, wie die ausgelieferte Stimme sie spricht: gelernte Formen aneinandergereiht. */
function gesprochen(toene: Tone[], fensterJeSilbe = 20): F0Frame[] {
  const out: F0Frame[] = [];
  for (const ton of toene) {
    const s = GELERNTE_TONFORMEN[ton];
    for (let i = 0; i < fensterJeSilbe; i++) {
      const p = (i / (fensterJeSilbe - 1)) * (s.length - 1);
      const a = Math.floor(p);
      const b = Math.min(s.length - 1, a + 1);
      const st = s[a] + (s[b] - s[a]) * (p - a);
      out.push({ t: out.length * 0.01, start: out.length * 80, f0: 200 * 2 ** (st / 12), correlation: 0.9, rms: 0.1 });
    }
  }
  return out;
}

describe('Vorlagenabgleich', () => {
  const fallendSteigend = gesprochen(['falling', 'rising']);

  it('erkennt eine klare Fall-Steig-Kurve an der richtigen Tonfolge', () => {
    const urteil = vorlagenUrteil(fallendSteigend, ['falling', 'rising'], 'test');
    expect(urteil).toMatchObject({ bestanden: true, konturenHalten: true });
    expect(urteil!.p).toBeLessThanOrEqual(0.02);
  });

  it('stuft eine vertauschte oder ebene Tonfolge nicht hoch', () => {
    expect(vorlagenUrteil(fallendSteigend, ['rising', 'falling'], 'test')?.bestanden).toBe(false);
    expect(vorlagenUrteil(frames([[0, 0], [0, 0]]), ['falling', 'rising'], 'test')?.bestanden).toBe(false);
  });

  it('liefert kein Urteil bei Einsilbern oder zu wenig stimmhaftem Material', () => {
    expect(vorlagenUrteil(fallendSteigend, ['falling'], 'test')).toBeNull();
    expect(vorlagenUrteil(frames([[3, -3]], 4), ['falling', 'rising', 'mid'], 'test')).toBeNull();
  });

  it('ist deterministisch je Clip-Text', () => {
    const toene: Tone[] = ['mid', 'high', 'low'];
    const kurve = frames([[0, 0], [1, 4], [-2, -3]]);
    expect(vorlagenUrteil(kurve, toene, 'ก')).toEqual(vorlagenUrteil(kurve, toene, 'ก'));
  });

  it('bewertet die passende Tonfolge günstiger als die falsche', () => {
    const kurve = tonfolgeKurve(fallendSteigend, 2)!;
    expect(vorlagenKosten(kurve, ['falling', 'rising'])).toBeLessThan(vorlagenKosten(kurve, ['rising', 'falling']));
  });
});

describe('hoherTonSteigtAn', () => {
  it('erkennt den Anstieg zum Ende, nicht aber eben, fallend oder tief-dann-hoch', () => {
    expect(hoherTonSteigtAn(frames([[0, 0], [0, 4]]))).toBe(true);
    expect(hoherTonSteigtAn(frames([[0, 0]]))).toBe(false);
    expect(hoherTonSteigtAn(frames([[3, -3]]))).toBe(false);
    // Steigender Ton: erst tiefe Senke, dann Anstieg — gehört nicht zu „hoch".
    expect(hoherTonSteigtAn(frames([[0, -4], [-4, 3]]))).toBe(false);
  });
});
