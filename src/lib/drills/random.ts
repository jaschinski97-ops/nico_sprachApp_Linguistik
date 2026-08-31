/**
 * Kleiner, aussaatbarer Zufallsgenerator (mulberry32).
 *
 * WARUM NICHT `Math.random()`: Eine Übungssitzung soll sich in einem Test
 * exakt nachstellen lassen — sonst prüft der Test nur, dass *irgendeine*
 * Aufgabe herauskam, und ein vertauschter Index oder ein Ablenker, der in
 * Wahrheit richtig ist, fiele nur zufällig auf. Mit einer Aussaat ist
 * dieselbe Sitzung reproduzierbar, und im Betrieb liefert die Uhrzeit als
 * Aussaat trotzdem jedes Mal eine andere.
 */

export type Random = () => number;

export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates auf einer Kopie — die Eingabe bleibt unberührt. */
export function shuffled<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
