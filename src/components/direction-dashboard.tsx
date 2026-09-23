import { useEffect, useState } from 'react';

import type { PairDirection } from '@/lib/languages/types';
import { DirectionSummary, summarizeDirection } from '@/lib/review-session';

export type DirectionSummaries = {
  summaries: DirectionSummary[] | null;
  error: string | null;
};

/**
 * Kennzahlen (fällig, gesamt, neu, gemeistert) je Lernrichtung — für genau
 * die Richtungen, die die Oberfläche zeigt.
 *
 * SPRACH-UMBAU 23.09.2026: Vorher wurde je SPRACHE über die deutsch-
 * geankerten Richtungen gezählt; auf nicht-deutschen Oberflächen (`en_to_th`
 * & Co.) standen die Ziele deshalb ohne Fällig-Zahl da.
 */
export function useDirectionSummariesFor(
  directions: readonly PairDirection[],
  enabled = true
): DirectionSummaries {
  const [summaries, setSummaries] = useState<DirectionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Effekt am Richtungs-Satz, nicht an der Array-Identität — die Liste wird
  // bei jedem Render neu gebaut.
  const schluessel = directions.join('|');

  useEffect(() => {
    if (!enabled || !schluessel) return;
    let cancelled = false;
    setSummaries(null);
    setError(null);
    const liste = schluessel.split('|') as PairDirection[];
    // Nacheinander statt parallel: jede Zusammenfassung legt fehlende Karten
    // an, und parallele Schreibvorgänge auf denselben Speicher bringen nichts.
    (async () => {
      const ergebnis: DirectionSummary[] = [];
      for (const direction of liste) ergebnis.push(await summarizeDirection(direction));
      return ergebnis;
    })()
      .then((result) => {
        if (!cancelled) setSummaries(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [schluessel, enabled]);

  return { summaries, error };
}
