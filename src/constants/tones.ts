/**
 * Thai tone metadata.
 *
 * Colours, labels and contour paths are carried over from the verified web
 * reference prototype ("Thai Lernbegleiter.html"). The five tones are the
 * standard Thai tone inventory; `mark` names the tone mark that (in the most
 * common spelling class) produces the tone.
 *
 * NOTE: the tone mark alone does not determine the tone in Thai — the
 * consonant class and syllable type matter too. `mark` is a learning aid for
 * the tone legend, not a spelling rule.
 *
 * FARBEN JE MODUS (Phase 9, AE-24): Der Referenzprototyp hatte **eine**
 * Farbe je Ton. Nachgerechnet nach WCAG 2.1 verfehlte die in beiden
 * Anzeigemodi die Stufe AA — im hellen Modus fielen „mittel", „hoch" und
 * „steigend" durch, im dunklen „tief", „fallend" und teils „mittel". Die
 * Farbtöne sind deshalb erhalten, aber die Helligkeit ist je Modus so gesetzt,
 * dass jede Farbe gegen den ungünstigsten Untergrund (`backgroundSelected`)
 * mindestens 4,5:1 erreicht. `tones.test.ts` rechnet das bei jedem Testlauf
 * nach.
 */

export const TONES = {
  mid: {
    label: 'Mittel',
    adjective: 'Mittlerer',
    colors: { light: '#546850', dark: '#88a083' },
    /** contour path drawn in a 34x21 viewBox */
    path: 'M3 10 L31 10',
    mark: 'kein Zeichen',
  },
  low: {
    label: 'Tief',
    adjective: 'Tiefer',
    colors: { light: '#4f6076', dark: '#8a9bb1' },
    path: 'M3 16 L31 16',
    mark: '่ (mai ek)',
  },
  falling: {
    label: 'Fallend',
    adjective: 'Fallender',
    colors: { light: '#95503e', dark: '#c88b7a' },
    path: 'M3 5 Q17 5 31 17',
    mark: '้ (mai tho)',
  },
  high: {
    label: 'Hoch',
    adjective: 'Hoher',
    colors: { light: '#78602b', dark: '#ba9443' },
    path: 'M3 5 L31 5',
    mark: '๊ (mai tri)',
  },
  rising: {
    label: 'Steigend',
    adjective: 'Steigender',
    colors: { light: '#4f6861', dark: '#82a097' },
    path: 'M3 16 Q17 16 31 4',
    mark: '๋ (mai chattawa)',
  },
} as const;

export type Tone = keyof typeof TONES;

export const TONE_KEYS = Object.keys(TONES) as Tone[];

export type ColorScheme = 'light' | 'dark';

/**
 * Die Farbe eines Tons im jeweiligen Anzeigemodus.
 *
 * Bewusst eine Funktion statt eines Feldes `color`: So gibt es keine Stelle
 * mehr, an der sich versehentlich „die" Tonfarbe abgreifen lässt, ohne den
 * Modus zu nennen — genau der Fehler, der vor Phase 9 durch die ganze App ging.
 */
export function toneColor(tone: Tone, scheme: ColorScheme): string {
  return TONES[tone].colors[scheme];
}
