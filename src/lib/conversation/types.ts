import { Direction } from '../fsrs/types';
import { LanguageCode } from '../languages/types';

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

/**
 * Sprachcode eines Gesprächs-Eintrags. Deutsch ist als Dialogsprache dabei,
 * obwohl es im Stoff-Registry (`LanguageCode`) nur die Brücke ist — die
 * th_to_de-Situationen SIND die deutschen Gespräche.
 */
export type Situationssprache = 'de' | LanguageCode;

/**
 * Der Gesprächs-Reiter listet SPRACHEN statt Richtungen (14.09.): Je Eintrag
 * zeigt die Menge, in der diese Sprache die Dialog- und Übungsseite ist — es
 * gibt keine zweite Reihe von Sprach-Buttons mehr. Deutsch steht oben
 * (th_to_de — die Dialoge mit deutschen Zeilen), Thai dahinter (de_to_th);
 * Englisch/Spanisch haben noch keine Situationen und zeigen den ehrlichen
 * Leerzustand, bis ihr Grundstoff Gespräche bekommt. Die GEGENSEITE der
 * Dialoge (die Bedeutungszeilen) hängt an der App-Systemsprache, nicht an
 * einer Wahl in diesem Reiter.
 */
export const SITUATION_SPRACHEN: readonly {
  sprache: Situationssprache;
  direction: Direction;
}[] = [
  { sprache: 'de', direction: 'th_to_de' },
  { sprache: 'th', direction: 'de_to_th' },
  { sprache: 'en', direction: 'de_to_en' },
  { sprache: 'es', direction: 'de_to_es' },
];

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

/**
 * Prüft eine Situation aus dem Speicher, bevor der Gespräch-Screen sie
 * anzeigt.
 *
 * Dieselbe Lücke wie bei den Prüfungsaufgaben (Phase 9): Der Generator prüft
 * beim Schreiben streng, das Lesen vertraute blind. Ein Dokument ohne
 * `scriptTurns` ließ den Reiter abstürzen, statt einfach zu fehlen.
 */
export function isValidSituation(value: unknown): value is ConversationSituation {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;

  if (typeof s.id !== 'string' || s.id === '') return false;
  if (typeof s.title !== 'string' || typeof s.setting !== 'string') return false;
  if (s.direction !== 'de_to_th' && s.direction !== 'th_to_de') return false;
  if (!Array.isArray(s.scriptTurns) || s.scriptTurns.length === 0) return false;

  const zuegeOk = s.scriptTurns.every((raw) => {
    const turn = raw as Record<string, unknown>;
    return (
      (turn?.speaker === 'learner' || turn?.speaker === 'partner') &&
      typeof turn.thai === 'string' &&
      typeof turn.roman === 'string' &&
      typeof turn.german === 'string'
    );
  });
  if (!zuegeOk) return false;

  return (
    Array.isArray(s.corrections) &&
    s.corrections.every((raw) => {
      const hint = raw as Record<string, unknown>;
      return typeof hint?.issue === 'string' && typeof hint.explanation === 'string';
    })
  );
}
