import { ConversationSituation } from '../conversation/types';
import type { VocabEntry } from '@/data/vocab-types';

/**
 * Bekannter-Wortschatz-Anteil eines Dialogs (Phase 2, Schritt 4).
 *
 * Die Regel aus dem Ausbau: neue Dialoge sollen bevorzugt Wörter verwenden,
 * die der Lernende schon hat (~95 % bekannt). Messbar gemacht wird der
 * Anteil je Situation: Wörter des Dialogtexts (Latein: wortweise; Thai:
 * Bestandswörter per Enthaltensein, grob aber ehrlich) geteilt durch alle
 * Wörter des Dialogtexts. Die Zahl ist eine ANZEIGE — sie behauptet keine
 * grammatische Analyse.
 */

function latinWoerter(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .split(/\s+/)
    .filter((wort) => wort.length > 0);
}

export function bekannterAnteil(
  situation: ConversationSituation,
  pool: VocabEntry[]
): { bekannt: number; gesamt: number; quote: number } {
  const latin = situation.direction.startsWith('de_to_') === false;
  void latin;
  const alleTexte = situation.scriptTurns.map((zeile) => zeile.german).join(' ');
  // Gemessen wird auf der DEUTSCHEN Seite (die Bedeutung ist, was der
  // Lernende schon kennt — die Zielsprache ist ja gerade neu).
  const woerter = latinWoerter(alleTexte);
  const poolBegriffe = new Set(
    pool.flatMap((e) => latinWoerter(e.german))
  );
  let bekannt = 0;
  for (const wort of woerter) {
    if (poolBegriffe.has(wort)) bekannt += 1;
  }
  const gesamt = woerter.length;
  return { bekannt, gesamt, quote: gesamt === 0 ? 1 : bekannt / gesamt };
}

/** Der durchschnittliche Anteil über mehrere Situationen, in Prozent. */
export function durchschnittsAnteil(
  situationen: ConversationSituation[],
  pool: VocabEntry[]
): number {
  if (situationen.length === 0) return 1;
  const summe = situationen.reduce(
    (summe, situation) => summe + bekannterAnteil(situation, pool).quote,
    0
  );
  return summe / situationen.length;
}
