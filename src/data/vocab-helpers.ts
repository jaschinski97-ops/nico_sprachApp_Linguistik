import { Tone } from '@/constants/tones';

import { VocabEntry } from './vocabulary';

export type SyllableView = { roman: string; tone: Tone };

/**
 * Die Silben eines Eintrags — Grundlage der Tonfarbcodierung (AE-7).
 *
 * Thai vergibt Töne je Silbe, nicht je Wort: สวัสดี ist `sà-wàt-dii`, also
 * tief-tief-mittel. Die Anzeige muss deshalb `syllables` auswerten.
 *
 * Das einzelne Feld `tone` ist ausdrücklich nur ein **Notnagel** für
 * Altdatensätze, die noch ohne `syllables` gespeichert wurden — etwa Karten,
 * die vor der Einführung von AE-7 im Gerätespeicher gelandet sind. Im
 * Normalfall wird es nicht benutzt.
 */
export function syllablesOf(entry: VocabEntry): SyllableView[] {
  if (entry.syllables && entry.syllables.length > 0) {
    return entry.syllables;
  }
  return [{ roman: entry.romanization, tone: entry.tone }];
}

/**
 * Der Ton des ganzen Wortes — aber nur, wenn alle Silben denselben haben.
 *
 * Sonst `null`: dann darf die Thai-Schrift nicht in einer einzigen Tonfarbe
 * eingefärbt werden, weil das über die Hälfte des Wortes die Unwahrheit sagen
 * würde. Die Silbenfarben stehen in dem Fall an der Umschrift.
 */
export function uniformTone(entry: VocabEntry): Tone | null {
  const syllables = syllablesOf(entry);
  const first = syllables[0].tone;
  return syllables.every((syllable) => syllable.tone === first) ? first : null;
}

export function isMultiSyllable(entry: VocabEntry): boolean {
  return syllablesOf(entry).length > 1;
}

/** Was auf der Vorderseite steht, hängt an der Lernrichtung. */
export function promptText(entry: VocabEntry, direction: string): string {
  return direction === 'de_to_th' ? entry.german : entry.thai;
}
