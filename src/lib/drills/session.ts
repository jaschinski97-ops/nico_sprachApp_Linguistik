import { VocabEntry } from '@/data/vocab-types';

import { retrievability } from '../fsrs/fsrs';
import { FSRSCardState } from '../fsrs/types';
import { TargetLanguage } from '../languages/types';
import { ensureCardStates } from '../review-session';
import { DataStore, getStore } from './../storage';

import {
  buildArticleQuestion,
  buildSoundSpellingQuestion,
  buildSpellingQuestion,
  buildStressHearQuestion,
  buildStressQuestion,
  buildToneQuestion,
  buildToneRuleQuestion,
  buildVerbFormQuestion,
  canBuildArticleQuestion,
  canBuildSoundSpellingQuestion,
  canBuildSpellingQuestion,
  canBuildStressHearQuestion,
  canBuildStressQuestion,
  canBuildToneQuestion,
  canBuildToneRuleQuestion,
  canBuildVerbFormQuestion,
} from './questions';
import { Random, seededRandom, shuffled } from './random';
import { directionForDrill, DrillAnswer, DrillId, DrillQuestion } from './types';

/**
 * Eine Übungssitzung zusammenstellen.
 *
 * DIE ÜBUNGEN PLANEN NICHTS, SIE LESEN NUR (AE-16). Sie legen keine eigenen
 * FSRS-Karten an und schreiben keine zurück. Aber sie sind auch nicht blind:
 * **welche** Wörter drankommen, entscheidet der vorhandene FSRS-Zustand
 * derselben Richtung — am schwächsten Sitzendes zuerst, genau die Sortierung,
 * die auch `buildReviewQueue` benutzt.
 *
 * Anders als beim Karteikasten wird aber nicht stur der schwächste Kopf
 * genommen: Da eine Übungsantwort den Kartenzustand bewusst nicht verändert,
 * käme sonst bei jedem Start dieselbe Liste heraus. Deshalb wird aus einem
 * **Fenster** der schwächsten Kandidaten zufällig gezogen — der Schwerpunkt
 * bleibt auf dem Wackligen, die Sitzung wiederholt sich aber nicht wörtlich.
 */

/** Aufgaben je Sitzung. */
export const DRILL_SESSION_SIZE = 10;

/** Aus wie vielen der schwächsten Kandidaten gezogen wird. */
const CANDIDATE_WINDOW = 3;

export type DrillSessionOptions = {
  drill: DrillId;
  /**
   * Welche Sprache geuebt wird.
   *
   * SEIT PHASE 16 NOETIG UND BEWUSST OHNE VORGABEWERT: Die Artikel-Uebung
   * gilt fuer jedes "X -> Deutsch" (Pflicht 6 aus Phase 15), und welches X
   * gemeint ist, kann diese Datei nicht wissen. Ein stiller Vorgabewert
   * 'th' wuerde spanische Sitzungen klammheimlich mit Thai-Karten fuellen.
   *
   * SEIT DEM PAARMATRIX-START VOM TYP `TargetLanguage`: Jede Zielsprache
   * ohne eigenen Bestand liefert schlicht `available: 0` — ehrlich leer
   * statt falsch gefuellt.
   */
  language: TargetLanguage;
  store?: DataStore;
  now?: number;
  size?: number;
  /** Für Tests und reproduzierbare Sitzungen. */
  seed?: number;
  /** Runtime media eligibility, applied before ranking/windowing the candidates. */
  isEligible?: (entry: VocabEntry) => boolean | Promise<boolean>;
};

export type DrillSession = {
  drill: DrillId;
  questions: DrillQuestion[];
  /** Wie viele Vokabeln für diese Übung überhaupt taugen. */
  available: number;
};

function canBuild(drill: DrillId, entry: VocabEntry): boolean {
  switch (drill) {
    case 'tone':
      return canBuildToneQuestion(entry);
    case 'toneRule':
      return canBuildToneRuleQuestion(entry);
    case 'article':
      return canBuildArticleQuestion(entry);
    case 'verbForms':
      return canBuildVerbFormQuestion(entry);
    case 'stressRule':
      return canBuildStressQuestion(entry);
    case 'spelling':
      return canBuildSpellingQuestion(entry);
    case 'stressHear':
      return canBuildStressHearQuestion(entry);
    case 'soundSpelling':
      return canBuildSoundSpellingQuestion(entry);
  }
}

function buildQuestion(
  drill: DrillId,
  entry: VocabEntry,
  pool: VocabEntry[],
  random: Random
): DrillQuestion {
  switch (drill) {
    case 'tone':
      return buildToneQuestion(entry);
    case 'toneRule':
      return buildToneRuleQuestion(entry);
    case 'article':
      return buildArticleQuestion(entry);
    case 'verbForms':
      return buildVerbFormQuestion(entry, pool, random);
    case 'stressRule':
      return buildStressQuestion(entry);
    case 'spelling':
      return buildSpellingQuestion(entry);
    case 'stressHear':
      return buildStressHearQuestion(entry);
    case 'soundSpelling':
      return buildSoundSpellingQuestion(entry);
  }
}

/** Wie gut die Vokabel in dieser Richtung gerade sitzt — kleiner heißt wackliger. */
function weakness(card: FSRSCardState | undefined, now: number): number {
  if (!card) return 0;
  return retrievability(card, now);
}

export async function buildDrillSession(options: DrillSessionOptions): Promise<DrillSession> {
  const drill = options.drill;
  const direction = directionForDrill(drill, options.language);
  const now = options.now ?? Date.now();
  const size = options.size ?? DRILL_SESSION_SIZE;
  const random = seededRandom(options.seed ?? now);

  const db = options.store ?? (await getStore());
  const { entries, cards } = await ensureCardStates(direction, db, now);

  const cardByVocabId = new Map(cards.map((card) => [card.vocabId, card]));
  const potential = entries.filter((entry) => canBuild(drill, entry));
  const eligibility = options.isEligible ? await Promise.all(potential.map(options.isEligible)) : potential.map(() => true);
  const candidates = potential.filter((_, i) => eligibility[i]);

  const ranked = [...candidates].sort(
    (a, b) => weakness(cardByVocabId.get(a.id), now) - weakness(cardByVocabId.get(b.id), now)
  );

  const window = ranked.slice(0, Math.max(size, size * CANDIDATE_WINDOW));
  const chosen = shuffled(window, random).slice(0, size);

  return {
    drill,
    questions: chosen.map((entry) => buildQuestion(drill, entry, candidates, random)),
    available: candidates.length,
  };
}

export function scoreAnswers(answers: DrillAnswer[]): { correct: number; total: number } {
  return {
    correct: answers.filter((answer) => answer.correct).length,
    total: answers.length,
  };
}
