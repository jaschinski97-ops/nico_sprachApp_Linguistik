import { Tone } from '@/constants/tones';

import { SpeechLanguage } from '../audio';
import { Direction } from '../fsrs/types';

/**
 * Übungstypen (Phase 6).
 *
 * WAS SIE VON DEN KARTEIKARTEN UNTERSCHEIDET: Eine Karteikarte prüft die
 * Vokabel als Ganzes — Form gegen Bedeutung. Die Übungen hier drillen genau
 * die **eine** Stelle, an der die jeweilige Zielgruppe scheitert, und zwar
 * für beide Gruppen eine andere:
 *
 *   de_to_th (Deutsche lernen Thai) → der **Ton**. Er trägt Bedeutung und
 *     ist im Deutschen kein Merkmal; wer ihn nicht hört, kann ihn auch nicht
 *     sprechen. Deshalb eine reine Hörübung.
 *   th_to_de (Thailänder lernen Deutsch) → **Genus** und **Stammformen**.
 *     Thai hat weder Artikel noch Konjugation; beides ist keine Regel, die
 *     man ableitet, sondern eine Liste, die man kennt.
 *
 * Alle Aufgaben entstehen aus dem bereits quellengeprüften Vokabel-Grundstock
 * (Phase 2). Es wird nichts erzeugt und nichts erfunden — auch die falschen
 * Antworten sind echte Formen aus derselben Datei oder mechanisch daraus
 * abgeleitet (vertauschtes Hilfsverb).
 */

export const DRILLS = ['tone', 'article', 'verbForms'] as const;
export type DrillId = (typeof DRILLS)[number];

export type DrillMeta = {
  id: DrillId;
  direction: Direction;
  label: string;
  /** Ein Satz, der sagt, was geübt wird und warum. */
  description: string;
  /** Frage über allen Aufgaben dieses Typs. */
  prompt: string;
};

export const DRILL_META: Record<DrillId, DrillMeta> = {
  tone: {
    id: 'tone',
    direction: 'de_to_th',
    label: 'Töne hören',
    description:
      'Wort anhören und den Ton bestimmen. Nur einsilbige Wörter — bei mehrsilbigen hat jede Silbe ihren eigenen Ton.',
    prompt: 'Welchen Ton hörst du?',
  },
  article: {
    id: 'article',
    direction: 'th_to_de',
    label: 'Artikel',
    description:
      'Das richtige Genus zum Substantiv. Im Deutschen ist es nicht ableitbar, sondern gehört zum Wort dazu.',
    prompt: 'Welcher Artikel gehört zum Wort?',
  },
  verbForms: {
    id: 'verbForms',
    direction: 'th_to_de',
    label: 'Stammformen',
    description:
      'Das Perfekt mit dem richtigen Hilfsverb. „haben" gegen „sein" ist eine eigene Fehlerquelle.',
    prompt: 'Wie lautet das Perfekt?',
  },
};

/** Welche Übungen zu welcher Richtung gehören. */
export const DRILLS_BY_DIRECTION: Record<Direction, DrillId[]> = {
  de_to_th: ['tone'],
  th_to_de: ['article', 'verbForms'],
};

export type DrillOption = {
  label: string;
  /** Zweite Zeile, etwa die Tonkontur-Beschriftung. */
  hint?: string;
  /** Nur bei der Ton-Übung gesetzt: färbt die Antwort wie in der Legende. */
  tone?: Tone;
};

export type DrillQuestion = {
  /** Eindeutig innerhalb einer Sitzung. */
  id: string;
  drill: DrillId;
  direction: Direction;
  vocabId: string;
  /**
   * Was **vor** der Antwort sichtbar ist. Bei der Ton-Übung bewusst leer:
   * die Thai-Schrift trägt das Tonzeichen und wäre die halbe Lösung.
   */
  visible: string | null;
  /** Zweite Zeile unter `visible`, etwa die Bedeutung als Kontext. */
  visibleHint: string | null;
  /** Wird abgespielt, sobald die Aufgabe erscheint. */
  speak: { text: string; language: SpeechLanguage } | null;
  options: DrillOption[];
  correctIndex: number;
  /** Wird nach der Antwort gezeigt — immer, auch wenn richtig geantwortet wurde. */
  explanation: string;
  /** Die Auflösung in Klartext, für die Anzeige nach der Antwort. */
  solution: string;
};

export type DrillAnswer = {
  question: DrillQuestion;
  chosenIndex: number;
  correct: boolean;
};
