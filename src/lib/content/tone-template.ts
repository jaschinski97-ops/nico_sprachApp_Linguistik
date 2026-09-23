import type { Tone } from '@/constants/tones';
import { TONE_KEYS } from '@/constants/tones';

import type { F0Frame } from '../speaking/analysis';

/**
 * VORLAGENABGLEICH FÜR DAS TON-TOR (23.09.2026) — ohne Silbengrenzen.
 *
 * WOFÜR: Das silbenweise Tor braucht erkennbare Silbengrenzen. Bei rund 40 %
 * der Mehrsilber-Clips gehen die Silben ineinander über (Grund Nr. 1 für
 * „ungeprüft“). Hier wird stattdessen die GANZE Tonkurve des Clips mit einer
 * Vorlage aus den Soll-Tönen verglichen: Eine dynamische Programmierung
 * zerlegt die Kurve selbst in genau so viele Abschnitte, wie der Soll Silben
 * hat, und passt jedem Abschnitt die gelernte Tonform an.
 *
 * WIE ENTSCHIEDEN WIRD — zwei Bedingungen, beide nötig:
 *   1. Die Soll-Tonfolge erklärt die Kurve besser als fast alle ZUFÄLLIGEN
 *      Tonfolgen gleicher Länge (p ≤ 0,02 bei 100 Vergleichsfolgen).
 *   2. Jede fallende/steigende Soll-Silbe passt besser als JEDER andere Ton an
 *      ihrer Stelle — genau die Töne, an denen TTS-Stimmen nachweislich
 *      scheitern (coral, 18.09.).
 *
 * NUR HOCHSTUFEN, NIE VERWERFEN: Das Verfahren macht aus „ungeprüft“ höchstens
 * „bestanden“. Ein Verwurf kostet Geld (der Clip wird neu erzeugt), deshalb
 * bleibt er dem silbenweisen Tor mit echten Grenzen vorbehalten.
 *
 * KALIBRIERT AM ECHTEN BESTAND (3.380 Thai-Clips, Stimme wie ausgeliefert):
 * Formen per Viterbi-Training aus 534 silbenweise bestandenen Mehrsilbern
 * gelernt; getestet auf der ANDEREN Hälfte. Ergebnis: echte Tonfolge 18 %
 * bestanden, fremde Tonfolge 1,0 %, verschobene Tonfolge 1,0 %, genau EINE
 * vertauschte Kontur-Silbe 4,6 %. Das ist ein Filter gegen grobe Tonfehler,
 * kein Nachweis jeder einzelnen Silbe — der Fehlertext sagt es genauso.
 */

/** Gelernte Tonformen: 5 Stützstellen in Halbtönen zur Clip-Mitte (Viterbi-Training, 23.09.2026). */
export const GELERNTE_TONFORMEN: Record<Tone, readonly number[]> = {
  mid: [0.77, 0.16, -0.63, -1.36, -1.71],
  low: [0.92, -0.14, -1.26, -2.11, -1.92],
  falling: [1.78, 2.78, 2.58, -0.5, -2.56],
  high: [-0.37, 0.1, 0.88, 2.18, 2.44],
  rising: [-0.59, -2.58, -2.99, -0.17, 2.75],
};

/** Zahl der zufälligen Vergleichsfolgen. */
export const VORLAGE_VERGLEICHE = 100;
/** Höchster p-Wert für „bestanden“. */
export const VORLAGE_P_MAX = 0.02;
/** Punkte je Soll-Silbe nach dem Verdichten. */
const PUNKTE_JE_SILBE = 8;
/** Spielraum der Silbenlage gegen die Clip-Mitte (Halbtöne). */
const LAGE_SPIELRAUM = 1.5;

function median(werte: readonly number[]): number {
  const s = [...werte].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/**
 * Stimmhafte Fenster → Halbtonfolge: Oktavsprünge gefaltet, Median-3-geglättet,
 * bei ≥ 4 Silben die lineare Deklination herausgerechnet, auf 8 Punkte je
 * Silbe verdichtet und um den Mittelwert zentriert. `null`, wenn zu wenig
 * stimmhaftes Material da ist.
 */
export function tonfolgeKurve(frames: readonly F0Frame[], silben: number): number[] | null {
  const stimmhaft = frames.filter((frame) => frame.f0 > 0);
  if (stimmhaft.length < silben * 3) return null;
  const ref = median(stimmhaft.map((frame) => frame.f0));
  let st = stimmhaft
    .map((frame) => 12 * Math.log2(frame.f0 / ref))
    .map((x) => (x > 8 ? x - 12 : x < -8 ? x + 12 : x));
  st = st.map((x, i) => median([st[Math.max(0, i - 1)], x, st[Math.min(st.length - 1, i + 1)]]));
  if (silben >= 4) {
    const n = st.length;
    const mx = (n - 1) / 2;
    const my = st.reduce((a, b) => a + b, 0) / n;
    let zaehler = 0;
    let nenner = 0;
    for (let i = 0; i < n; i++) {
      zaehler += (i - mx) * (st[i] - my);
      nenner += (i - mx) ** 2;
    }
    const steigung = nenner ? zaehler / nenner : 0;
    st = st.map((x, i) => x - steigung * (i - mx));
  }
  const ziel = silben * PUNKTE_JE_SILBE;
  if (st.length > ziel) {
    const schritt = st.length / ziel;
    const quelle = st;
    st = Array.from({ length: ziel }, (_, i) => {
      const a = Math.floor(i * schritt);
      const b = Math.max(a + 1, Math.floor((i + 1) * schritt));
      const fenster = quelle.slice(a, b);
      return fenster.reduce((u, v) => u + v, 0) / fenster.length;
    });
  }
  const mitte = st.reduce((a, b) => a + b, 0) / st.length;
  return st.map((x) => x - mitte);
}

/** Tonform auf n Punkte abgetastet (lineare Interpolation). */
function form(ton: Tone, n: number): number[] {
  const s = GELERNTE_TONFORMEN[ton];
  const letzte = s.length - 1;
  return Array.from({ length: n }, (_, i) => {
    const p = n === 1 ? letzte / 2 : (i / (n - 1)) * letzte;
    const a = Math.floor(p);
    const b = Math.min(letzte, a + 1);
    const w = p - a;
    return s[a] * (1 - w) + s[b] * w;
  });
}

/**
 * Mittlerer quadratischer Fehler der besten Zerlegung der Kurve in so viele
 * Abschnitte, wie `toene` Silben hat (segmentale dynamische Programmierung).
 */
export function vorlagenKosten(kurve: readonly number[], toene: readonly Tone[]): number {
  const n = kurve.length;
  const m = toene.length;
  const minL = Math.max(2, Math.floor(n / m / 3));
  const maxL = Math.min(n, Math.ceil((n / m) * 2.5));
  const dp = Array.from({ length: m + 1 }, () => new Float64Array(n + 1).fill(Infinity));
  dp[0][0] = 0;
  for (let k = 1; k <= m; k++) {
    const ton = toene[k - 1];
    for (let ende = k * minL; ende <= n; ende++) {
      for (let laenge = minL; laenge <= maxL && laenge <= ende; laenge++) {
        const start = ende - laenge;
        const vorher = dp[k - 1][start];
        if (vorher === Infinity) continue;
        const f = form(ton, laenge);
        let lage = 0;
        for (let i = 0; i < laenge; i++) lage += kurve[start + i] - f[i];
        lage = Math.max(-LAGE_SPIELRAUM, Math.min(LAGE_SPIELRAUM, lage / laenge));
        let fehler = 0;
        for (let i = 0; i < laenge; i++) {
          const d = kurve[start + i] - (f[i] + lage);
          fehler += d * d;
        }
        if (vorher + fehler < dp[k][ende]) dp[k][ende] = vorher + fehler;
      }
    }
  }
  return dp[m][n] / n;
}

/** Deterministischer Zufall aus dem Clip-Text — dasselbe Urteil bei jedem Lauf. */
function zufall(text: string): () => number {
  let s = 2166136261;
  for (const zeichen of text) s = Math.imul(s ^ zeichen.codePointAt(0)!, 16777619) >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export type VorlagenUrteil = { bestanden: boolean; p: number; konturenHalten: boolean };

/**
 * Das Urteil des Vorlagenabgleichs für einen Clip. `null`, wenn die Kurve zu
 * wenig stimmhaftes Material für die Silbenzahl hat.
 */
export function vorlagenUrteil(frames: readonly F0Frame[], toene: readonly Tone[], saat: string): VorlagenUrteil | null {
  if (toene.length < 2) return null;
  const kurve = tonfolgeKurve(frames, toene.length);
  if (!kurve) return null;
  const soll = vorlagenKosten(kurve, toene);
  const r = zufall(saat);
  let gleichGut = 0;
  for (let k = 0; k < VORLAGE_VERGLEICHE; k++) {
    let alternative: Tone[];
    do {
      alternative = toene.map(() => TONE_KEYS[Math.floor(r() * TONE_KEYS.length)]);
    } while (alternative.join() === toene.join());
    if (vorlagenKosten(kurve, alternative) <= soll) gleichGut++;
  }
  const p = (gleichGut + 1) / (VORLAGE_VERGLEICHE + 1);
  if (p > VORLAGE_P_MAX) return { bestanden: false, p, konturenHalten: false };
  // Jede Kontur-Silbe muss gegen jeden anderen Ton an ihrer Stelle gewinnen.
  for (let i = 0; i < toene.length; i++) {
    if (toene[i] !== 'falling' && toene[i] !== 'rising') continue;
    for (const anderer of TONE_KEYS) {
      if (anderer === toene[i]) continue;
      const variante = [...toene];
      variante[i] = anderer;
      if (vorlagenKosten(kurve, variante) <= soll) return { bestanden: false, p, konturenHalten: false };
    }
  }
  return { bestanden: true, p, konturenHalten: true };
}

/**
 * Einsilbiger HOHER Ton an der Form erkennbar? Die ausgelieferte Stimme
 * spricht den hohen Ton mit deutlichem Anstieg zum Ende; mittel, tief und
 * fallend tun das fast nie. Gemessen (23.09.2026, Einsilber des Bestands):
 * Anstieg ≥ 2 Halbtöne ohne tiefe Senke davor bei 45 % der hohen, 0,6 % der
 * mittleren, 2,5 % der tiefen, 0,7 % der fallenden Silben.
 * Längster stimmhafter Zug, 8 % Rand weg, Viertel-Mediane.
 */
export function hoherTonSteigtAn(frames: readonly F0Frame[]): boolean {
  let bester: F0Frame[] = [];
  let aktuell: F0Frame[] = [];
  for (const frame of frames) {
    if (frame.f0 > 0) aktuell.push(frame);
    else {
      if (aktuell.length > bester.length) bester = aktuell;
      aktuell = [];
    }
  }
  if (aktuell.length > bester.length) bester = aktuell;
  if (bester.length < 8) return false;
  const ref = median(bester.map((frame) => frame.f0));
  let st = bester
    .map((frame) => 12 * Math.log2(frame.f0 / ref))
    .map((x) => (x > 8 ? x - 12 : x < -8 ? x + 12 : x));
  const rand = Math.floor(st.length * 0.08);
  st = st.slice(rand, st.length - rand);
  const viertel = [0, 1, 2, 3].map((k) => median(st.slice(Math.floor((k * st.length) / 4), Math.floor(((k + 1) * st.length) / 4))));
  const tal = Math.min(viertel[1], viertel[2]);
  const anstieg = viertel[3] - tal;
  const gesamt = viertel[3] - viertel[0];
  const senke = viertel[0] - tal;
  return anstieg >= 2 && gesamt >= 0.5 && senke <= 1;
}
