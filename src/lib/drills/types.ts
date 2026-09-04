import { Tone } from '@/constants/tones';

import { SpeechLanguage } from '../audio';
import { Direction } from '../fsrs/types';
import { drillsForDirectionViaFeature } from '../languages/feature';
import { HUB_LANGUAGE, LanguageCode } from '../languages/types';
import { DerivationStep } from '../reading/syllable';

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

export const DRILLS = [
  'tone',
  'toneRule',
  'article',
  'verbForms',
  /** Phase 16: das spanische Merkmal - Betonung herleiten. */
  'stressRule',
  /** Phase 16: das englische Merkmal - gleiche Schreibung, andere Aussprache. */
  'spelling',
] as const;
export type DrillId = (typeof DRILLS)[number];

export type DrillMeta = {
  id: DrillId;
  /**
   * Auf welcher Seite des Sprachpaars die Übung liegt.
   *
   * SEIT PHASE 16 KEINE FESTE RICHTUNG MEHR. Vorher stand hier `th_to_de`,
   * und damit hätte die Artikel-Übung für Spanisch nicht funktioniert,
   * obwohl sie **Deutsch** prüft und für jedes Paar gilt (Pflicht 6 aus
   * Phase 15). Die Richtung entsteht jetzt aus Seite und gewählter Sprache.
   *
   *   `toHub`    — „X → Deutsch": die deutschen Grammatikübungen.
   *   `toTarget` — „Deutsch → X": die Merkmalsübungen der Zielsprache.
   */
  side: 'toHub' | 'toTarget';
  /**
   * Zu welchem Sprachmerkmal die Übung gehört, oder `null` für die deutschen
   * Module, die zu jedem Paar gehören.
   */
  feature: LanguageCode | null;
  label: string;
  /** Ein Satz, der sagt, was geübt wird und warum. */
  description: string;
  /** Frage über allen Aufgaben dieses Typs. */
  prompt: string;
};

/** Die Richtung, in der diese Übung für diese Sprache läuft. */
export function directionForDrill(drill: DrillId, language: LanguageCode): Direction {
  return DRILL_META[drill].side === 'toHub'
    ? (`${language}_to_${HUB_LANGUAGE}` as Direction)
    : (`${HUB_LANGUAGE}_to_${language}` as Direction);
}

export const DRILL_META: Record<DrillId, DrillMeta> = {
  tone: {
    id: 'tone',
    side: 'toTarget',
    feature: 'th',
    label: 'Töne hören',
    description:
      'Wort anhören und den Ton bestimmen. Nur einsilbige Wörter — bei mehrsilbigen hat jede Silbe ihren eigenen Ton.',
    prompt: 'Welchen Ton hörst du?',
  },
  toneRule: {
    id: 'toneRule',
    side: 'toTarget',
    feature: 'th',
    label: 'Ton herleiten',
    description:
      'Den Ton aus der Schrift ableiten statt ihn auswendig zu lernen: Konsonantenklasse, Vokallänge, Schlusslaut und Tonzeichen ergeben ihn. Nur einsilbige Wörter.',
    prompt: 'Welchen Ton hat dieses Wort?',
  },
  article: {
    id: 'article',
    side: 'toHub',
    feature: null,
    label: 'Artikel',
    description:
      'Das richtige Genus zum Substantiv. Im Deutschen ist es nicht ableitbar, sondern gehört zum Wort dazu.',
    prompt: 'Welcher Artikel gehört zum Wort?',
  },
  verbForms: {
    id: 'verbForms',
    side: 'toHub',
    feature: null,
    label: 'Stammformen',
    description:
      'Das Perfekt mit dem richtigen Hilfsverb. „haben" gegen „sein" ist eine eigene Fehlerquelle.',
    prompt: 'Wie lautet das Perfekt?',
  },
  stressRule: {
    id: 'stressRule',
    side: 'toTarget',
    feature: 'es',
    label: 'Betonung herleiten',
    description:
      'Welche Silbe betont wird, steht in der Schreibung: Wortende und Akut entscheiden. ' +
      'Wer die Regel kennt, muss sie bei keinem neuen Wort nachschlagen.',
    prompt: 'Welche Silbe wird betont?',
  },
  spelling: {
    id: 'spelling',
    side: 'toTarget',
    feature: 'en',
    label: 'Gleiche Schreibung, anderer Laut',
    description:
      'Im Englischen lässt sich die Aussprache nicht aus der Schreibung ableiten — „ough" ' +
      'allein hat mehrere Lesarten. Geübt wird deshalb der Vergleich, nicht die Herleitung.',
    prompt: 'Wie klingt dieses Schriftstück hier?',
  },
};

/**
 * Welche Übungen zu welcher Richtung gehören.
 *
 * SEIT PHASE 15 EINE FUNKTION (Pflicht 6): Die Grammatikübungen prüfen
 * **Deutsch** — Genus und Stammformen. Sie gehören damit zu jedem „X → Deutsch"
 * und nicht zu Thai allein; sobald Englisch oder Spanisch Inhalte haben, sind
 * sie dort ohne weiteres Zutun verfügbar. Die Ton-Übungen dagegen sind das
 * Thai-**Merkmal** und hängen an der Sprache (AE-44).
 */
export function drillsForDirection(direction: Direction): DrillId[] {
  return drillsForDirectionViaFeature(direction);
}



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
  /**
   * Die Herleitung Schritt für Schritt — nur bei „Ton herleiten" (Phase 13).
   *
   * Der Punkt der Übung ist nicht die richtige Antwort, sondern der Weg
   * dorthin: Wer die vier Schritte einmal nachvollzogen hat, kann den Ton
   * eines Wortes bestimmen, das er noch nie gesehen hat. Deshalb steht das
   * hier als Liste und nicht als Fließtext in `explanation`.
   */
  derivation?: DerivationStep[];
  /** Benannte Unsicherheit der Herleitung, falls die Quelle mehrdeutig ist. */
  uncertain?: string | null;
};

export type DrillAnswer = {
  question: DrillQuestion;
  chosenIndex: number;
  correct: boolean;
};
