import { Lang } from './types';

/**
 * Der Brückentext einer Vokabel — und ob er wirklich eine Brücke war.
 *
 * WARUM DIESE DATEI EXISTS (Roadmap v2, „Richtungslogik“): Bisher war Deutsch
 * beides — Ziel- UND Brückensprache. Jeder Karteikartentext, jede
 * drill-Frage stand auf Deutsch, weil die lernende Person Deutsch konnte.
 * Mit der Paarmatrix wird die Brücke künftig die **Systemsprache** des Geräts
 * sein: Ein Englischsprecher lernt Spanisch, und „casa“ wird ihm mit „house“
 * erklärt, nicht mit „Haus“.
 *
 * DIE AUFLÖSUNG IST EHRLICH, NICHT OPTIMISTISCH: Es gibt keinen Grundstock,
 * der in allen Brückensprachen vollständig ist. `bridgeText` fällt zurück —
 * aber es **sagt**, dass es gefallen ist (`usedFallback`). Die Oberfläche
 * kann eine Übersetzung dann kennzeichnen, statt dem Englischsprecher
 * stillschweigend Deutsch vorzusetzen.
 *
 * DIE KETTE:
 *
 *   1. `translations[bridge]` — der echte Brückentext.
 *   2. `german` — der deutsche Quelltext (jeder Eintrag trägt ihn; das ist
 *      die historische Brücke, AE-42).
 *   3. `translations.en` — Englisch als Notnagel, falls ein Eintrag ohne
 *      deutsche Seite autoriert wurde (geplant für de-Ziel-Inhalte).
 *   4. `term` — die fremdsprachige Form selbst; besser ein fremdes Wort als
 *      ein leerer Bildschirm.
 */

/** Was `bridgeText` von einem Eintrag braucht — strukturell, je Grundstoff. */
export type BridgeTextSource = {
  /** Die deutsche Seite — historisch die Brücke, heute die zweitwahl. */
  german: string;
  /** Die fremdsprachige Form — letzte Rückfallebene. */
  term?: string;
  /** Brückentexte, siehe `VocabEntry.translations`. */
  translations?: Partial<Record<Lang, string>>;
};

/** Der aufgelöste Brückentext samt Ehrlichkeits-Kennzeichen. */
export type BridgeText = {
  /** Der Text, der angezeigt werden darf. */
  text: string;
  /**
   * `true`, wenn **gefallen** wurde — der Eintrag trägt keinen Brückentext in
   * dieser Sprache, und der gezeigte Text stammt aus einer tieferen Ebene der
   * Kette. Die UI kann das kennzeichnen; stillschweigend bleibt es nicht.
   */
  usedFallback: boolean;
};

/**
 * Der Brückentext eines Eintrags in einer Sprache — mit Rückfall-Kennzeichen.
 *
 * ZWEI GRENZFÄLLE, BEWUSST SO:
 * - `bridge: 'de'` liefert typischerweise `usedFallback: true` und `german` —
 *   genau richtig, denn `translations.de` soll niemand pflegen (siehe
 *   JSDoc am Feld); Deutsch IST der Quelltext.
 * - Ein leerer Eintrag liefert den Leerstring statt zu werfen. Eine fehlende
 *   Übersetzung darf die Karteikarte nicht zum Absturz bringen.
 */
export function bridgeText(entry: BridgeTextSource, bridge: Lang): BridgeText {
  const direct = entry.translations?.[bridge];
  if (direct) return { text: direct, usedFallback: false };

  const text = entry.german || entry.translations?.en || entry.term || '';
  return { text, usedFallback: true };
}
