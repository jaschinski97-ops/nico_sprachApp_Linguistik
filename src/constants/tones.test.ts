import { Colors } from './theme';
import { ColorScheme, Tone, TONE_KEYS, toneColor, TONES } from './tones';

/**
 * Kontrastprüfung nach WCAG 2.1 — gerechnet, nicht geschätzt.
 *
 * WARUM ALS TEST UND NICHT ALS EINMALIGE MESSUNG: Farben werden im Vorbeigehen
 * geändert. Eine Tabelle im Protokoll altert dann still, und niemand merkt es,
 * bis sich jemand beschwert, dass er die Umschrift nicht lesen kann. Als Test
 * fällt jede Änderung sofort auf.
 *
 * Die Formeln stehen hier ausgeschrieben statt aus einer Bibliothek zu kommen:
 * es sind zehn Zeilen, sie sind in der Norm nachlesbar, und eine Abhängigkeit
 * mehr im Projekt wäre der schlechtere Tausch.
 *
 * Grenzwerte (WCAG 2.1 AA):
 *   1.4.3 Kontrast (Minimum)     — 4,5:1 für normalen Text
 *   1.4.11 Nicht-Text-Kontrast   — 3:1 für grafische Objekte und Bedienelemente
 *
 * Die Tonfarben werden als **Text** verwendet (die Silben der Umschrift in
 * `ThaiWord`, die Beschriftung in `ToneLegend`) — für sie gilt also 4,5:1, der
 * strengere Wert. Dass sie zusätzlich als Konturglyphe und als Rahmen
 * auftauchen, ist damit mit abgedeckt.
 */

function kanal(wert: number): number {
  const c = wert / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative Leuchtdichte nach WCAG 2.1, Definition „relative luminance". */
export function relativeLeuchtdichte(hex: string): number {
  const wert = hex.replace('#', '');
  const r = parseInt(wert.slice(0, 2), 16);
  const g = parseInt(wert.slice(2, 4), 16);
  const b = parseInt(wert.slice(4, 6), 16);
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
}

/** Kontrastverhältnis nach WCAG 2.1: (L_hell + 0,05) / (L_dunkel + 0,05). */
export function kontrastVerhaeltnis(vorne: string, hinten: string): number {
  const a = relativeLeuchtdichte(vorne);
  const b = relativeLeuchtdichte(hinten);
  const [hell, dunkel] = a > b ? [a, b] : [b, a];
  return (hell + 0.05) / (dunkel + 0.05);
}

const AA_TEXT = 4.5;
const AA_GRAFIK = 3;

/** Alle Untergründe, auf denen Text tatsächlich landet. */
const UNTERGRUENDE: Record<ColorScheme, string[]> = {
  light: [Colors.light.background, Colors.light.backgroundElement, Colors.light.backgroundSelected],
  dark: [Colors.dark.background, Colors.dark.backgroundElement, Colors.dark.backgroundSelected],
};

const MODI: ColorScheme[] = ['light', 'dark'];

describe('Kontrast der Tonfarben (WCAG 2.1 AA)', () => {
  it('rechnet die Norm-Beispiele richtig', () => {
    // Schwarz auf Weiss ist per Definition 21:1, Gleiches auf Gleichem 1:1.
    expect(kontrastVerhaeltnis('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(kontrastVerhaeltnis('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // Ein bekannter Zwischenwert: mittleres Grau gegen Weiss.
    expect(kontrastVerhaeltnis('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(kontrastVerhaeltnis('#777777', '#ffffff')).toBeLessThan(4.6);
  });

  it.each(MODI)('erreicht im Modus %s auf jedem Untergrund mindestens 4,5:1', (modus) => {
    for (const ton of TONE_KEYS) {
      for (const grund of UNTERGRUENDE[modus]) {
        const verhaeltnis = kontrastVerhaeltnis(toneColor(ton, modus), grund);
        expect({
          ton,
          modus,
          grund,
          verhaeltnis: Number(verhaeltnis.toFixed(2)),
        }).toEqual({
          ton,
          modus,
          grund,
          verhaeltnis: expect.any(Number),
        });
        expect(verhaeltnis).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it('erfüllt als Konturglyphe auch die Nicht-Text-Grenze', () => {
    // Ergibt sich aus 4,5, wird aber eigens geprueft: die Kontur traegt die
    // Toninformation fuer alle, die Farben schlecht unterscheiden.
    for (const modus of MODI) {
      for (const ton of TONE_KEYS) {
        for (const grund of UNTERGRUENDE[modus]) {
          expect(kontrastVerhaeltnis(toneColor(ton, modus), grund)).toBeGreaterThanOrEqual(
            AA_GRAFIK
          );
        }
      }
    }
  });

  it('hält die fünf Töne auch untereinander unterscheidbar', () => {
    // Zwei Toene mit fast gleicher Farbe waeren zwar lesbar, aber nutzlos.
    for (const modus of MODI) {
      const gesehen: { ton: Tone; hex: string }[] = [];
      for (const ton of TONE_KEYS) {
        const hex = toneColor(ton, modus);
        for (const anderer of gesehen) {
          expect(hex).not.toBe(anderer.hex);
        }
        gesehen.push({ ton, hex });
      }
    }
  });

  it('behält je Ton denselben Farbton in beiden Modi', () => {
    // Die helle und die dunkle Fassung duerfen sich in der Helligkeit
    // unterscheiden, nicht in der Farbe - sonst waere "tief" im Dunkelmodus
    // ploetzlich gruen und die Legende im Kopf waere hinfaellig.
    for (const ton of TONE_KEYS) {
      expect(farbwinkel(toneColor(ton, 'light'))).toBeCloseTo(
        farbwinkel(toneColor(ton, 'dark')),
        0
      );
    }
  });

  it('gibt je Ton eine Farbe für beide Modi heraus', () => {
    for (const ton of TONE_KEYS) {
      expect(TONES[ton].colors.light).toMatch(/^#[0-9a-f]{6}$/i);
      expect(TONES[ton].colors.dark).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('Kontrast der Grundfarben (WCAG 2.1 AA)', () => {
  it.each(MODI)('liest sich im Modus %s auf jedem Untergrund', (modus) => {
    for (const grund of UNTERGRUENDE[modus]) {
      expect(kontrastVerhaeltnis(Colors[modus].text, grund)).toBeGreaterThanOrEqual(AA_TEXT);
      // textSecondary traegt Hinweise und Erklaerungen - also echter Text,
      // nicht Dekoration. Derselbe Grenzwert.
      expect(kontrastVerhaeltnis(Colors[modus].textSecondary, grund)).toBeGreaterThanOrEqual(
        AA_TEXT
      );
    }
  });
});

/** Farbwinkel in Grad — nur für die Prüfung, ob der Farbton erhalten bleibt. */
function farbwinkel(hex: string): number {
  const wert = hex.replace('#', '');
  const r = parseInt(wert.slice(0, 2), 16) / 255;
  const g = parseInt(wert.slice(2, 4), 16) / 255;
  const b = parseInt(wert.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  // Auf zehn Grad gerundet: die Loesung der Helligkeit verschiebt den Winkel
  // minimal, ein Farbwechsel waere dagegen ein Sprung.
  return Math.round((h * 360) / 10);
}
