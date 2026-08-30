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
 */

export const TONES = {
  mid: {
    label: 'Mittel',
    adjective: 'Mittlerer',
    color: '#6F8A6A',
    /** contour path drawn in a 34x21 viewBox */
    path: 'M3 10 L31 10',
    mark: 'kein Zeichen',
  },
  low: {
    label: 'Tief',
    adjective: 'Tiefer',
    color: '#4F6076',
    path: 'M3 16 L31 16',
    mark: '่ (mai ek)',
  },
  falling: {
    label: 'Fallend',
    adjective: 'Fallender',
    color: '#9B5340',
    path: 'M3 5 Q17 5 31 17',
    mark: '้ (mai tho)',
  },
  high: {
    label: 'Hoch',
    adjective: 'Hoher',
    color: '#AE8B3F',
    path: 'M3 5 L31 5',
    mark: '๊ (mai tri)',
  },
  rising: {
    label: 'Steigend',
    adjective: 'Steigender',
    color: '#5F7D74',
    path: 'M3 16 Q17 16 31 4',
    mark: '๋ (mai chattawa)',
  },
} as const;

export type Tone = keyof typeof TONES;

export const TONE_KEYS = Object.keys(TONES) as Tone[];
