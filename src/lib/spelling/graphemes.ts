import { VocabEntry } from '@/data/vocab-types';
import { vocabularyFor } from '@/data/vocabulary';

/**
 * Das englische Merkmal: gleiche Schreibung, andere Aussprache (Phase 16).
 *
 * WARUM HIER KEINE HERLEITUNG STEHT. Für Thai (Phase 13) und Spanisch (dieses
 * Phase, `lib/stress`) gibt es eine Regel, aus der sich das Merkmal ableiten
 * lässt. Für Englisch gibt es sie **nachweislich nicht**; die in AE-44
 * zitierte Quelle sagt, die Aussprache mancher Buchstabenfolgen sei
 * „unpredictable even for educated native speakers", mit ⟨ough⟩ als
 * Paradebeispiel. Eine Herleitungsübung wäre hier nicht bloß schwer, sondern
 * **sachlich falsch** — sie würde eine Regel lehren, die es nicht gibt.
 *
 * WAS STATTDESSEN GEÜBT WIRD: der Vergleich. Wörter des Grundstocks, die
 * dasselbe Schriftstück tragen, es aber verschieden aussprechen, bilden eine
 * Gruppe: ⟨ough⟩ in enough/through/though/thought, ⟨ea⟩ in eat/bread/great,
 * ⟨oo⟩ in food/book/blood. Die Aufgabe fragt nach dem Laut, und die Antworten
 * sind die **tatsächlichen** Laute der anderen Wörter derselben Gruppe. Es
 * wird also nichts erfunden — auch die falschen Antworten sind echte
 * Lesarten desselben Schriftstücks.
 *
 * DASS DAS ÜBERHAUPT GEHT, ist eine Eigenschaft des Grundstocks und kein
 * Zufall: Die drei Gruppen wurden bei der Auswahl der Wörter mit angelegt.
 * Ohne sie hätte Englisch ein entschiedenes Merkmal ohne Übungsstoff.
 */

export type GraphemeGroup = {
  /** Das Schriftstück, etwa `ough`. */
  grapheme: string;
  /** Die Wörter der Gruppe mit ihrem jeweiligen Laut. */
  members: { entry: VocabEntry; sound: string }[];
  /** Die verschiedenen Laute, in der Reihenfolge ihres ersten Auftretens. */
  sounds: string[];
};

/** Wie viele verschiedene Lesarten eine Gruppe mindestens braucht. */
const MIN_SOUNDS = 2;

/**
 * Die Gruppen aus dem englischen Grundstock.
 *
 * Eine Gruppe mit nur einer Lesart fliegt raus: Sie belegt nichts. Die Frage
 * „wie klingt ⟨ea⟩ hier?" hätte dann nur eine mögliche Antwort, und die Übung
 * wäre eine Behauptung ohne Alternative.
 */
export function graphemeGroups(entries: VocabEntry[] = vocabularyFor('en')): GraphemeGroup[] {
  const byGrapheme = new Map<string, { entry: VocabEntry; sound: string }[]>();
  for (const entry of entries) {
    const spelling = entry.englishSpelling;
    if (!spelling) continue;
    const list = byGrapheme.get(spelling.grapheme) ?? [];
    list.push({ entry, sound: spelling.sound });
    byGrapheme.set(spelling.grapheme, list);
  }

  const groups: GraphemeGroup[] = [];
  for (const [grapheme, members] of byGrapheme) {
    const sounds: string[] = [];
    for (const member of members) if (!sounds.includes(member.sound)) sounds.push(member.sound);
    if (sounds.length >= MIN_SOUNDS) groups.push({ grapheme, members, sounds });
  }
  // Feste Reihenfolge: die aussagekraeftigste Gruppe zuerst.
  return groups.sort((a, b) => b.sounds.length - a.sounds.length || a.grapheme.localeCompare(b.grapheme));
}

/** Die Gruppe, zu der ein Eintrag gehört — oder `null`. */
export function groupFor(
  entry: VocabEntry,
  groups: GraphemeGroup[] = graphemeGroups()
): GraphemeGroup | null {
  const spelling = entry.englishSpelling;
  if (!spelling) return null;
  return groups.find((group) => group.grapheme === spelling.grapheme) ?? null;
}

/**
 * Wie das Schriftstück im Wort hervorgehoben wird.
 *
 * Ohne Hervorhebung wäre bei „thought" nicht zu erkennen, wonach gefragt ist.
 * Die Zerlegung ist bewusst stumpf — erstes Vorkommen, Rest drumherum; bei
 * den Wörtern dieses Grundstocks kommt jedes Schriftstück genau einmal vor,
 * und ein Test hält das fest.
 */
export function highlight(term: string, grapheme: string): { before: string; hit: string; after: string } {
  const at = term.toLowerCase().indexOf(grapheme.toLowerCase());
  if (at < 0) return { before: term, hit: '', after: '' };
  return {
    before: term.slice(0, at),
    hit: term.slice(at, at + grapheme.length),
    after: term.slice(at + grapheme.length),
  };
}
