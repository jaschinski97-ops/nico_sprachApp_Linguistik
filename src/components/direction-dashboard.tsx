import { useEffect, useState } from 'react';

import { LanguageCode } from '@/lib/languages/types';
import { DirectionSummary, summarizeAllDirections } from '@/lib/review-session';

/**
 * Fällige Karten je Lernrichtung — bewusst getrennt, nicht als eine Zahl.
 *
 * „Deutsch für Thailänder“ und „Thai für Deutsche“ sind unterschiedliche
 * Lernprobleme mit eigenem Kartenbestand. Eine gemeinsame Summe würde
 * verschleiern, dass eine Richtung schon lange liegen geblieben ist.
 *
 * SEIT DEM LERNZIEL-UMBAU (Nutzerentscheidung 2026-09-10) liefert diese Datei
 * nur noch die Zahlen: Die frühere Komponente mit den zwei Richtungskarten ist
 * entfallen — die Fällig-Badges hängen jetzt an den Lernziel-Zeilen der
 * Sprachauswahl (language-picker), und der CTA der Übersicht rechnet aus
 * denselben Summaries seine Summe über beide Richtungen der Paarsprache. Ein
 * Lesevorgang versorgt beides.
 */
export type DirectionSummaries = {
  summaries: DirectionSummary[] | null;
  error: string | null;
};

/**
 * Lädt die Richtungs-Zahlen einer Sprache. Mit `enabled = false` bleibt der
 * Lauf aus: Die Übersicht hebt diesen Zustand einmal hierher, zeigt daraus
 * ihr CTA-Badge und reicht ihn durch.
 */
export function useDirectionSummaries(language: LanguageCode, enabled = true): DirectionSummaries {
  const [summaries, setSummaries] = useState<DirectionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setSummaries(null);
    setError(null);
    summarizeAllDirections(language)
      .then((result) => {
        if (!cancelled) setSummaries(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [language, enabled]);

  return { summaries, error };
}
