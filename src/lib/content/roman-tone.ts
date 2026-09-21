/**
 * Die Soll-Tonfolge aus der Paiboon-artigen Roman-Umschrift lesen.
 *
 * WARUM DIESER WEG (18.09., Thai-Audio-Lauf): Das Tontor braucht einen Sollton
 * JE SILBE. Fuer Woerter steht er in `syllables[].tone` — fuer Beispielsaetze
 * und spaeter Dialogzuege aber nicht. Die Erzeugungs-Prompts verlangen seit
 * Phase 2 eine Umschrift, die die Silben BINDESTRICH-getrennt fuehrt und den
 * Ton DIAKRITISCH am Vokal traegt (Kalibrierung 18.09. gegen alle 2000
 * Katalogwoerter: 3853/3907 Silben exakt, Rest Erzeuger-Inkonsistenzen und
 * ein fehlendes ʉ in der ersten Vokalmenge). Damit ist die Umschrift selbst
 * die Silben- und Tonquelle — eine Segmentierung der Thai-Schrift (AE-8,
 * bewusst nie gebaut) ist dafuer nicht noetig.
 *
 * Das System (an `syllables[].roman` gegen `syllables[].tone` gemessen):
 *   á (acute)      -> high
 *   à (grave)      -> low
 *   â (circumflex) -> falling
 *   ǎ (caron)      -> rising
 *   unmarkiert     -> mid
 *
 * NFD zerlegt auch vorfertigte Zeichen (á = a + U+0301), sodass precomposed
 * und kombinierende Schreibungen dasselbe Ergebnis liefern. Alles, was nicht
 * eindeutig ist — mehrere Markierungen in einem Token, kein Vokalbuchstabe,
 * leere Eingabe — liefert `null`; der Aufrufer behandelt das als „kein Soll“,
 * nie als geratener Ton.
 */

import { TONE_KEYS, type Tone } from '@/constants/tones';

const MARKIERUNG_ZU_TON: Record<string, Tone> = {
  '\u0301': 'high',
  '\u0300': 'low',
  '\u0302': 'falling',
  // Rising traegt im Katalog ueberwiegend den Caron (U+030C, 412 Belege),
  // vereinzelt aber den Brevis (U+0306, z. B. „hăan") — derselbe Sollton,
  // an syllables[].tone gegen alle 2000 Woerter nachgemessen.
  '\u030C': 'rising',
  '\u0306': 'rising',
};

/** Vokalbuchstaben der Umschrift inklusive ʉ und æ (mʉʉ, khæ̂ng & Co.). */
const VOKALZEICHEN = /[aeiouəɛɔɯɪʉæ]/;

/** Ton eines einzelnen Umschrift-Segments (z. B. „kǎao") oder null. */
export function tonAusRomanToken(token: string): Tone | null {
  const zerlegt = token.normalize('NFD');
  const gefundeneToene = new Set<Tone>();
  let hatVokal = false;

  for (let i = 0; i < zerlegt.length; i++) {
    const zeichen = zerlegt[i];
    if (VOKALZEICHEN.test(zeichen)) hatVokal = true;
    const ton = MARKIERUNG_ZU_TON[zeichen];
    if (!ton) continue;
    // Die Verabredung traegt den Ton am VOKAL. Eine Markierung auf einem
    // Konsonanten ist ein fremdes System oder ein Erzeugerfehler — dann
    // lieber kein Soll als ein still gemeinter Mittelton.
    if (i === 0 || !VOKALZEICHEN.test(zerlegt[i - 1])) return null;
    gefundeneToene.add(ton);
  }

  if (!hatVokal) return null;
  if (gefundeneToene.size === 0) return 'mid';
  if (gefundeneToene.size === 1) {
    const ton = [...gefundeneToene][0];
    return TONE_KEYS.includes(ton) ? ton : null;
  }
  return null;
}

/**
 * Tonfolge einer ganzen Umschrift, Silben getrennt durch Bindestrich oder
 * Leerzeichen (z. B. „sii-íu-kǎao" -> [mid, high, rising]).
 * Ein einziges unlesbares Segment macht die ganze Folge unbrauchbar: null.
 */
export function tonfolgeAusRoman(roman: string): Tone[] | null {
  const tokens = roman.split(/[-\s]+/).filter(Boolean);
  if (!tokens.length) return null;
  const toene: Tone[] = [];
  for (const token of tokens) {
    const ton = tonAusRomanToken(token);
    if (!ton) return null;
    toene.push(ton);
  }
  return toene;
}
