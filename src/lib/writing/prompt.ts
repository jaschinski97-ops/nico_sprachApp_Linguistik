import { VocabEntry } from '@/data/vocab-types';
import { VOCABULARY } from '@/data/vocabulary';

import { HUB_LANGUAGE, languageOfDirection } from '../languages/types';

import { Direction } from '../fsrs/types';

import { WritingLanguage } from './compare';

/**
 * Was bei der freien Eingabe gefragt wird — und was als Antwort zählt.
 *
 * BEIDE RICHTUNGEN, mit je eigener Hürde:
 *
 *   `th_to_de` — Thai steht da, die deutsche Form ist zu schreiben. Der
 *     Artikel gehört dazu: Genus ist laut Phase 2 der eigentliche
 *     Stolperstein für Thai-Muttersprachler, und ihn wegzulassen hieße, die
 *     Aufgabe an der interessanten Stelle abzuschneiden.
 *
 *   `de_to_th` — die deutsche Form steht da, das thailändische Wort ist zu
 *     schreiben, in Thai-Schrift und mit Tonzeichen. Zur Eingabe siehe AE-39.
 *
 * KEINE ERFUNDENEN ZIELFORMEN: Beide Seiten stehen wortwörtlich im
 * quellengeprüften Grundstock aus Phase 2. Dieses Modul schneidet nur weg,
 * was niemand tippen soll.
 */

export type WritingPrompt = {
  id: string;
  vocabId: string;
  direction: Direction;
  /** Sprache der **Antwort** — bestimmt Toleranz und Eingabehilfe. */
  language: WritingLanguage;
  /** Was sichtbar ist. */
  shown: string;
  /** Zweite Zeile unter der Aufgabe, oder `null`. */
  shownHint: string | null;
  /** Alle zulässigen Antworten; bei mehreren Bedeutungen zählt jede. */
  targets: string[];
  /** Die Form, die in der Auflösung steht. */
  solution: string;
  /** Zusatzangaben für die Auflösung (Plural, Stammformen, Hinweis). */
  extras: string[];
};

/**
 * Der Teil eines deutschen Stichworts, den man wirklich tippt.
 *
 * Der Grundstock schreibt Erläuterungen in Klammern — „ich (männlicher
 * Sprecher)" oder „Höflichkeitspartikel (weibliche Sprecherin)". Das ist eine
 * Lesehilfe und keine Zielform; wer sie mittippen müsste, übte Abschreiben
 * statt Produzieren. Die Klammer fällt deshalb weg und steht danach in der
 * Auflösung.
 */
export function typeableGerman(text: string): string {
  return text.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

/** Mehrere Bedeutungen sind mit Komma getrennt; jede zählt als richtig. */
export function germanTargets(entry: VocabEntry): string[] {
  return entry.german
    .split(',')
    .map((part) => typeableGerman(part))
    .filter(Boolean);
}

function extrasFor(entry: VocabEntry): string[] {
  const extras: string[] = [];
  if (entry.germanNoun) extras.push(`Plural: ${entry.germanNoun.plural}`);
  if (entry.germanVerb) {
    extras.push(
      `${entry.germanVerb.thirdPerson} · ${entry.germanVerb.praeteritum} · ${entry.germanVerb.perfekt}`
    );
  }
  if (entry.germanAdjective) {
    extras.push(`${entry.germanAdjective.comparative} · ${entry.germanAdjective.superlative}`);
  }
  if (entry.note) extras.push(entry.note);
  if (entry.verificationNote) extras.push(`⚠ ${entry.verificationNote}`);
  return extras;
}

/**
 * Taugt der Eintrag für eine Schreibaufgabe in dieser Richtung?
 *
 * Ausgeschlossen wird nur, was keine tippbare Zielform hätte — etwa ein
 * Stichwort, das nach dem Entfernen der Klammer leer wäre.
 */
/**
 * Schreibt die lernende Person in dieser Richtung Deutsch?
 *
 * SEIT PHASE 16 AUS DER FORM DER RICHTUNG STATT AUS EINEM LITERAL. Vorher
 * stand hier `direction === 'th_to_de'`, und eine spanische Schreibaufgabe
 * waere in beiden Richtungen als „Zielsprache tippen" gelaufen.
 */
function writesGerman(direction: Direction): boolean {
  return direction.endsWith(`_to_${HUB_LANGUAGE}`);
}

export function canBuildWritingPrompt(entry: VocabEntry, direction: Direction): boolean {
  if (writesGerman(direction)) return germanTargets(entry).length > 0;
  return Boolean(entry.term.trim());
}

export function buildWritingPrompt(entry: VocabEntry, direction: Direction): WritingPrompt {
  if (!canBuildWritingPrompt(entry, direction)) {
    throw new Error(`"${entry.id}" hat in Richtung ${direction} keine tippbare Zielform.`);
  }

  if (writesGerman(direction)) {
    return {
      id: `writing:${direction}:${entry.id}`,
      vocabId: entry.id,
      direction,
      language: 'de',
      shown: entry.term,
      // Die Umschrift als Lesehilfe: Wer Deutsch lernt, soll an der deutschen
      // Form scheitern duerfen, nicht am Entziffern der eigenen Schrift.
      shownHint: entry.romanization,
      targets: germanTargets(entry),
      solution: entry.german,
      extras: extrasFor(entry),
    };
  }

  return {
    id: `writing:${direction}:${entry.id}`,
    vocabId: entry.id,
    direction,
    // `languageOfDirection` bleibt auf dem Bestandstyp `Direction` und
    // liefert deshalb nur die drei ausgelieferten Sprachen — der Wert passt
    // ohne Cast in die Schreib-Schicht. Ein französisches Schreibziel ist
    // heute unerreichbar: es gibt keinen ausgelieferten französischen
    // Grundstoff (delivered: false), damit keine Kandidaten und keine
    // Prompts.
    language: languageOfDirection(direction),
    shown: typeableGerman(entry.german.split(',')[0]),
    shownHint: entry.german.includes(',') ? entry.german : null,
    targets: [entry.term],
    solution: `${entry.term} · ${entry.romanization}`,
    extras: extrasFor(entry),
  };
}

export function writingCandidates(
  direction: Direction,
  entries: VocabEntry[] = VOCABULARY
): VocabEntry[] {
  // Auch hier gilt der Filter aus Phase 16: Ein spanisches Wort in einer
  // Thai-Schreibsitzung waere ein Fehler, kein Zufallsfund.
  const sprache = languageOfDirection(direction);
  return entries.filter(
    (entry) => entry.language === sprache && canBuildWritingPrompt(entry, direction)
  );
}
