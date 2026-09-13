import { SENTENCE_TASKS_BY_LANGUAGE } from '@/data/sentence-tasks';

import { retrievability } from '../fsrs/fsrs';
import { type FSRSCardState } from '../fsrs/types';
import { type PairDirection, pairLanguageOf } from '../languages/types';
import { ensureCardStates } from '../review-session';
import { seededRandom, shuffled } from '../drills/random';
import { type DataStore } from '../storage';

/**
 * Aufgaben für „Sag es auf …“ (Schritt 3, Lern-Reiter-Ausbau).
 *
 * Der Stoff folgt der vorhandenen Wahrheit je Sprache: Wo geprüfte Sätze
 * liegen (Thai), bildet die lernende Person SÄTZE; wo es nur geprüfte
 * Wörter gibt (Englisch, Spanisch, und Deutsch als Ziel ohne eigenen
 * Satzbestand), eben WÖRTER. Nichts wird erfunden — derselbe Grundsatz wie
 * bei den Satzübungen (AE-66).
 *
 * DIE RICHTUNG ENTSCHEIDET DIE SEITEN: In `de_to_th` heißt es „Sag es auf
 * Thai“ — Bedeutung deutsch, Ziel thai. Im Deutsch-Ziel (`th_to_de`) ist es
 * umgekehrt: Bedeutung thai, Ziel deutsch. Die FSRS-Karte ist dieselbe wie
 * bei Karteikarte, Diktat und freiem Schreiben (AE-16).
 */

/** Aufgaben je Runde. */
export const PRODUKTION_ANZAHL = 8;

/** Aus wie vielen der schwächsten Kandidaten gezogen wird. */
const FENSTER = 3;

export type ProduktionsAufgabe = {
  /** Eindeutig innerhalb der Runde. */
  id: string;
  /** FSRS-Karte, die die Antwort fortschreibt. */
  vocabId: string;
  /** `satz` nur, wo geprüfte Sätze liegen. */
  art: 'wort' | 'satz';
  /** Die Bedeutung, die gezeigt wird (Vorderseite). */
  bedeutung: string;
  /** Die zu produzierende Zielform (Lösung). */
  ziel: string;
  /** Lesehilfe der ZIELsprache — erst nach der Antwort gezeigt. */
  roman?: string;
};

export function zielSprache(direction: PairDirection): 'th' | 'en' | 'es' | 'de' {
  return direction.endsWith('_to_de') ? 'de' : pairLanguageOf(direction);
}

function wortAufgaben(
  entries: { id: string; term: string; romanization: string; german: string }[],
  cards: FSRSCardState[],
  anzahl: number,
  random: ReturnType<typeof seededRandom>,
  produziertDeutsch: boolean
): ProduktionsAufgabe[] {
  const byVocabId = new Map(cards.map((card) => [card.vocabId, card]));
  const schwaeche = (card: FSRSCardState | undefined): number =>
    card ? retrievability(card, Date.now()) : 0;
  const ranked = [...entries].sort(
    (a, b) => schwaeche(byVocabId.get(a.id)) - schwaeche(byVocabId.get(b.id))
  );
  const fenster = ranked.slice(0, Math.max(anzahl, anzahl * FENSTER));
  return shuffled(fenster, random).slice(0, anzahl).map((entry) =>
    produziertDeutsch
      ? {
          id: `produktion-wort-${entry.id}`,
          vocabId: entry.id,
          art: 'wort' as const,
          bedeutung: `${entry.term} · ${entry.romanization}`,
          ziel: entry.german,
        }
      : {
          id: `produktion-wort-${entry.id}`,
          vocabId: entry.id,
          art: 'wort' as const,
          bedeutung: entry.german,
          ziel: entry.term,
          roman: entry.romanization || undefined,
        }
  );
}

export async function produktionsAufgaben(options: {
  direction: PairDirection;
  anzahl?: number;
  store?: DataStore;
  seed?: number;
}): Promise<ProduktionsAufgabe[]> {
  const anzahl = options.anzahl ?? PRODUKTION_ANZAHL;
  const random = seededRandom(options.seed ?? Date.now());
  const sprache = pairLanguageOf(options.direction);
  const produziertDeutsch = options.direction.endsWith('_to_de');

  // Sätze zuerst — wo geprüfte Sätze liegen, werden sie gebildet.
  if (!produziertDeutsch) {
    const saetze = SENTENCE_TASKS_BY_LANGUAGE[sprache] ?? [];
    if (saetze.length >= Math.min(anzahl, 4)) {
      return shuffled([...saetze], random)
        .slice(0, anzahl)
        .map((task) => ({
          id: `produktion-satz-${task.vocabId}`,
          vocabId: task.vocabId,
          art: 'satz' as const,
          bedeutung: task.german,
          ziel: task.text,
          roman: task.roman,
        }));
    }
  }

  // Wörter: schwächste zuerst, aus einem Fenster gezogen.
  const { entries, cards } = await ensureCardStates(options.direction, options.store, Date.now());
  return wortAufgaben(entries, cards, anzahl, random, produziertDeutsch);
}
