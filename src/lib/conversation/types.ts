import { Direction } from '../fsrs/types';

/**
 * Vorproduzierte Sprachsituationen.
 *
 * BEWUSST KEIN LIVE-CHAT. Der frühere Web-Prototyp fragte bei jeder
 * Nutzernachricht die API an. Das ist hier verworfen: die App muss ohne
 * Internet und ohne Schlüssel benutzbar sein. Die Dialoge werden einmalig
 * erzeugt (`scriptTurns`), gespeichert und danach offline abgespielt.
 *
 * ZUR BEDEUTUNG VON `direction` siehe AE-11 in PROGRESS.md: sie benennt die
 * Sprache, die der oder die Lernende **aktiv produziert** — passend zur
 * bereits etablierten `Direction` aus dem FSRS-Modul (`de_to_th` heißt:
 * Deutsch verstehen, Thai hervorbringen). Es gibt daher **zwei getrennte
 * Sätze** von Situationen, nicht einen Satz mit vertauschten Seiten.
 */

export const LEVELS = ['A1', 'A2'] as const;
export type Level = (typeof LEVELS)[number];

export const TOPICS = [
  { id: 'greeting', label: 'Begrüßung & Kennenlernen' },
  { id: 'market', label: 'Markt & Einkaufen' },
  { id: 'restaurant', label: 'Restaurant & Essen' },
  { id: 'travel', label: 'Unterwegs' },
] as const;

export type TopicId = (typeof TOPICS)[number]['id'];

export const TOPIC_LABELS: Record<TopicId, string> = TOPICS.reduce(
  (acc, topic) => ({ ...acc, [topic.id]: topic.label }),
  {} as Record<TopicId, string>
);

/** Eine Zeile im Dialog. */
export type ConversationTurn = {
  /**
   * `learner` markiert die Zeilen, die geübt werden sollen; `partner` ist die
   * Gegenseite und wird vorgegeben.
   */
  speaker: 'learner' | 'partner';
  thai: string;
  roman: string;
  german: string;
};

/** Typischer Fehler samt Erklärung — je Richtung andere Stolperstellen. */
export type CorrectionHint = {
  issue: string;
  explanation: string;
};

export type ConversationSituation = {
  id: string;
  level: Level;
  topic: TopicId;
  direction: Direction;
  title: string;
  /** Kurze Szenenbeschreibung auf Deutsch. */
  setting: string;
  scriptTurns: ConversationTurn[];
  corrections: CorrectionHint[];
  generatedAt: number;
  modelUsed: string;
};

/** Was erzeugt werden soll — vor dem Lauf bekannt, damit er fortsetzbar ist. */
export type SituationSpec = {
  id: string;
  level: Level;
  topic: TopicId;
  direction: Direction;
  /** Laufende Nummer innerhalb derselben Kombination. */
  variant: number;
};

export function situationId(
  topic: TopicId,
  level: Level,
  direction: Direction,
  variant: number
): string {
  return `${topic}-${level}-${direction}-${String(variant).padStart(3, '0')}`;
}
