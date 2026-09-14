import type { ConversationSituation } from '../conversation/types';

/**
 * Ähnlichkeits-Erkennung für Dialoge (Phase 2, Schritt 6).
 *
 * „Gleiche oder fast gleiche Situation" wird messbar gemacht: Der
 * normalisierte Text beider Dialoge (deutsche Bedeutungsseite, Kleinbuch-
 * staben, ohne Satzzeichen) wird als Wortmenge gelesen und per Jaccard-
 * Schnitt verglichen. Über der Schwelle gilt eine Situation als Duplikat
 * und wird verworfen, statt sie doppelt zu speichern.
 *
 * Die Schwelle 0,85 ist eine Werkstattentscheidung: 0,85 bedeutet, dass
 * sich die Wortmengen zu mindestens 85 % überschneiden — kleiner Wortlaut-
 * Varianten fallen herein, echte Themenwechsel nicht.
 */

export const AEHNLICHKEITSSCHWELLE = 0.85;

export function normalisiereDialogText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wortMenge(text: string): Set<string> {
  return new Set(normalisiereDialogText(text).split(' ').filter(Boolean));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let schnitt = 0;
  for (const wort of a) if (b.has(wort)) schnitt += 1;
  const vereinigung = a.size + b.size - schnitt;
  return vereinigung === 0 ? 1 : schnitt / vereinigung;
}

export function dialogText(situation: ConversationSituation): string {
  return situation.scriptTurns.map((zeile) => zeile.german).join(' ');
}

export function aehnlichkeit(a: ConversationSituation, b: ConversationSituation): number {
  return jaccard(wortMenge(dialogText(a)), wortMenge(dialogText(b)));
}

/**
 * Ist `kandidat` ein (fast) Duplikat einer der Vorhandenen? Liefert die
 * ähnlichste Situation mit ihrem Ähnlichkeitswert, falls über der Schwelle.
 */
export function findeDuplikat(
  kandidat: ConversationSituation,
  vorhandene: ConversationSituation[],
  schwelle: number = AEHNLICHKEITSSCHWELLE
): { situation: ConversationSituation; aehnlichkeit: number } | null {
  let bestes: { situation: ConversationSituation; aehnlichkeit: number } | null = null;
  for (const andere of vorhandene) {
    const wert = aehnlichkeit(kandidat, andere);
    if (wert >= schwelle && (!bestes || wert > bestes.aehnlichkeit)) {
      bestes = { situation: andere, aehnlichkeit: wert };
    }
  }
  return bestes;
}
