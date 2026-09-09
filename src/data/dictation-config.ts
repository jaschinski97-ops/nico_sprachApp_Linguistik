/**
 * Diktat-Toleranzen je Zielsprache.
 *
 * Das Diktat vergleicht Gehörtes mit Getipptem — und nicht jede Sprache
 * verzeiht dieselben Abweichungen. Diese Datei ist der EINZIGE Ort, an dem
 * steht, was in welcher Sprache als Fehler zählt; `lib/dictation/scoring.ts`
 * liest sie nur. Eine neue Zielsprache braucht hier einen Eintrag, sonst
 * wirft `dictationConfigFor` — absichtlich — einen Fehler statt still
 *Deutsch-Regeln auf fremde Schrift anzuwenden.
 *
 * DIE ENTSCHEIDUNGEN UND WARUM:
 *
 * - **Interpunktion wird ignoriert** (in allen Sprachen). Ein Audioclip
 *   enthält keine hörbare Interpunktion; wer sie verlangt, bewertet Raten,
 *   kein Diktat. Sie steht weiterhin in der Lösung sichtbar da.
 * - **Deutsch faltet die Groß-/Kleinschreibung NICHT** (Substantive werden
 *   großgeschrieben — dieselbe Entscheidung wie im freien Schreiben,
 *   `lib/writing/compare.ts`), toleriert aber den Satzanfang: Nach einem
 *   Punkt hört man den Großbuchstaben nicht.
 * - **ß ≡ ss** ist eine gleichwertige Schreibung (Straße/Strasse), kein
 *   Fehler. **ä ≠ ae** bleibt ein Fehler — „März" und „Maerz" sind zwei
 *   Schreibkonventionen, und das Diktat übt die eigene der Zielsprache.
 * - **Thai vergleicht zweistufig** (Basisschrift ohne Tonzeichen, dann
 *   Tonzeichen separat) — die Aufteilung steht in `scoring.ts`, hier stehen
 *   nur die Schwellen.
 * - **`ignoreFinalSilentLetters` ist bewusst AUS** und nur dokumentiert
 *   (Scoring-Spec: „VORSICHTIG"). Französisches stummes Auslaut-n zu
 *   tolerieren hieße, Plural und Singular gleichzubewerten; diese
 *   Entscheidung wird erst mit echtem französischem Stoff getroffen, nicht
 *   im Vorhinein.
 */

/** Sprachen, für die es Diktat-Regeln geben kann. `de` und `fr` sind Ziel­sprachen der Roadmap v2 (Phase 1/3) und noch ohne Stoff. */
export type DictationLanguage = 'th' | 'de' | 'en' | 'es' | 'fr';

export type DictationLanguageConfig = {
  /** Thai vergleicht zeichenweise zweistufig, Latein wortweise. */
  script: 'thai' | 'latin';
  /** Groß-/Kleinschreibung vor dem Vergleich absenken (en, es, fr). */
  foldCase: boolean;
  /** Den Großbuchstaben am Satzanfang tolerieren — man hört ihn nicht. */
  tolerateSentenceInitialCase: boolean;
  /** Interpunktion aus dem Vergleich nehmen (das Ohr hört sie nicht). */
  ignorePunctuation: boolean;
  /** Deutsch: ß und ss als gleichwertige Schreibungen. */
  eszettEquivalence: boolean;
  /**
   * Diakritika hart werten: ein Wort, dessen einzige Abweichung ein
   * Akzent/Umlaut ist, zählt dann als Fehler und nicht durch das
   * Tippfehler-Fenster (de: ja — Rechtschreibung zählt; fr: nein — der
   * Akzentfehler wird weich über `diacriticScore` gemeldet). Thai ist
   * unabhängig davon immer zweistufig.
   */
  strictDiacritics: boolean;
  /** Nur dokumentiert, Default aus — siehe Dateikommentar. */
  ignoreFinalSilentLetters: boolean;
  /** Bestanden ab dieser Basisschrift-Punktzahl (0–100). */
  passThreshold: number;
  /** Weiche Schwelle für Tonzeichen/Diakritika (0–100). */
  diacriticThreshold: number;
  /**
   * Latein: bis zu so viele Zeichen Abweichung machen ein Wort (ab 5
   * Zeichen) noch zu einem Tippfehler-Wort statt zu einem Fehler —
   * derselbe Wert wie `typoTolerance` im freien Schreiben.
   */
  wordTypoWindow: number;
};

const BASE: Omit<DictationLanguageConfig, 'script' | 'foldCase' | 'eszettEquivalence' | 'strictDiacritics'> = {
  tolerateSentenceInitialCase: true,
  ignorePunctuation: true,
  ignoreFinalSilentLetters: false,
  passThreshold: 90,
  diacriticThreshold: 50,
  wordTypoWindow: 1,
};

export const DICTATION_CONFIG: Record<DictationLanguage, DictationLanguageConfig> = {
  th: { ...BASE, script: 'thai', foldCase: false, eszettEquivalence: false, strictDiacritics: true },
  de: { ...BASE, script: 'latin', foldCase: false, eszettEquivalence: true, strictDiacritics: true },
  en: { ...BASE, script: 'latin', foldCase: true, eszettEquivalence: false, strictDiacritics: true },
  es: { ...BASE, script: 'latin', foldCase: true, eszettEquivalence: false, strictDiacritics: true },
  // Französisch: Akzentfehler werden weich gewertet (strictDiacritics: false),
  // bis mit echtem französischem Stoff entschieden ist, wie hart ein
  // Volltext-Diktat sie zählen soll. Stumme Auslaute bleiben Fehler.
  fr: { ...BASE, script: 'latin', foldCase: true, eszettEquivalence: false, strictDiacritics: false },
};

/** Wirft für eine Sprache ohne Eintrag, statt still falsche Regeln anzuwenden. */
export function dictationConfigFor(language: DictationLanguage): DictationLanguageConfig {
  const config = DICTATION_CONFIG[language];
  if (!config) throw new Error(`Keine Diktat-Regeln für „${language}" hinterlegt.`);
  return config;
}
