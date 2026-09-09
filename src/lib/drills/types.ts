import { Tone } from '@/constants/tones';

import { SpeechLanguage } from '../audio';
import { Direction } from '../fsrs/types';
import { drillsForDirectionViaFeature } from '../languages/feature';
import { HUB_LANGUAGE, TargetDirection, TargetLanguage } from '../languages/types';
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
  /** Phase 18: Betonung HOEREN - das Gegenstueck zu 'tone' fuer Spanisch. */
  'stressHear',
  /** Phase 18: Wort hoeren und die richtige Schreibung waehlen (Englisch). */
  'soundSpelling',
  /**
   * Paarmatrix-Start (Roadmap v2): das franzoesische Merkmal — drei
   * Lese-Uebungen an der Betonungsregel. Sie laufen erst, wenn der
   * franzoesische Grundstoff ausgeliefert ist (`delivered`), sind aber
   * registriert und gegen `VOCABULARY_FR` getestet.
   */
  'stressFr',
  'muteE',
  'accentFr',
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
   * Welche Fertigkeit geübt wird.
   *
   * SEIT PHASE 18, WEIL DIE LEISTE SONST EINE FLACHE LISTE WÄRE: „Töne hören",
   * „Ton herleiten", „Artikel" und „Schreiben" nebeneinander sagen nicht, dass
   * das vier verschiedene Fertigkeiten sind. Gruppiert man sie, sieht man auf
   * einen Blick, was eine Sprache abdeckt — und was ihr fehlt.
   */
  skill: 'hoeren' | 'lesen' | 'grammatik';
  /**
   * Zu welchem Sprachmerkmal die Übung gehört, oder `null` für die deutschen
   * Module, die zu jedem Paar gehören.
   *
   * SEIT DEM PAARMATRIX-START VOM TYP `TargetLanguage`: Französische Übungen
   * tragen `'fr'`, obwohl der Grundstoff noch nicht ausgeliefert ist — die
   * Registrierung ist die Vorbereitung, nicht die Auslieferung.
   */
  feature: TargetLanguage | null;
  label: string;
  /** Ein Satz, der sagt, was geübt wird und warum. */
  description: string;
  /** Frage über allen Aufgaben dieses Typs. */
  prompt: string;
};

/**
 * Die Richtung, in der diese Übung für diese Sprache läuft.
 *
 * SEIT DEM PAARMATRIX-START TYP `TargetLanguage` AUF DER SPRACHE UND
 * `TargetDirection` AUF `drillsForDirection`: Auch die französischen Übungen
 * bauen hier ihre Richtung; `DrillQuestion.direction` selbst bleibt beim
 * Bestandstyp `Direction` — der französische Grundstoff ist nicht
 * ausgeliefert, und solange niemand eine französische Aufgabe in den
 * Bestand schreibt, verlässt kein französischer Richtungswert diese Datei.
 */
export function directionForDrill(drill: DrillId, language: TargetLanguage): Direction {
  return DRILL_META[drill].side === 'toHub'
    ? (`${language}_to_${HUB_LANGUAGE}` as Direction)
    : (`${HUB_LANGUAGE}_to_${language}` as Direction);
}

export const DRILL_META: Record<DrillId, DrillMeta> = {
  tone: {
    id: 'tone',
    side: 'toTarget',
    feature: 'th',
    skill: 'hoeren',
    label: 'Töne hören',
    description:
      'Wort anhören und den Ton bestimmen. Nur einsilbige Wörter — bei mehrsilbigen hat jede Silbe ihren eigenen Ton.',
    prompt: 'Welchen Ton hörst du?',
  },
  toneRule: {
    id: 'toneRule',
    side: 'toTarget',
    feature: 'th',
    skill: 'lesen',
    label: 'Ton herleiten',
    description:
      'Den Ton aus der Schrift ableiten statt ihn auswendig zu lernen: Konsonantenklasse, Vokallänge, Schlusslaut und Tonzeichen ergeben ihn. Nur einsilbige Wörter.',
    prompt: 'Welchen Ton hat dieses Wort?',
  },
  article: {
    id: 'article',
    side: 'toHub',
    feature: null,
    skill: 'grammatik',
    label: 'Artikel',
    description:
      'Das richtige Genus zum Substantiv. Im Deutschen ist es nicht ableitbar, sondern gehört zum Wort dazu.',
    prompt: 'Welcher Artikel gehört zum Wort?',
  },
  verbForms: {
    id: 'verbForms',
    side: 'toHub',
    feature: null,
    skill: 'grammatik',
    label: 'Stammformen',
    description:
      'Das Perfekt mit dem richtigen Hilfsverb. „haben" gegen „sein" ist eine eigene Fehlerquelle.',
    prompt: 'Wie lautet das Perfekt?',
  },
  stressRule: {
    id: 'stressRule',
    side: 'toTarget',
    feature: 'es',
    skill: 'lesen',
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
    skill: 'lesen',
    label: 'Gleiche Schreibung, anderer Laut',
    description:
      'Im Englischen lässt sich die Aussprache nicht aus der Schreibung ableiten — „ough" ' +
      'allein hat mehrere Lesarten. Geübt wird deshalb der Vergleich, nicht die Herleitung.',
    prompt: 'Wie klingt dieses Schriftstück hier?',
  },
  stressHear: {
    id: 'stressHear',
    side: 'toTarget',
    feature: 'es',
    skill: 'hoeren',
    label: 'Betonung hören',
    description:
      'Wort anhören und die betonte Silbe bestimmen. Die Silben stehen ohne Akzentzeichen da — ' +
      'sonst wäre die Antwort abzulesen statt zu hören.',
    prompt: 'Welche Silbe hörst du betont?',
  },
  soundSpelling: {
    id: 'soundSpelling',
    side: 'toTarget',
    feature: 'en',
    skill: 'hoeren',
    label: 'Wort hören',
    description:
      'Wort anhören und aus Wörtern mit demselben Schriftstück das richtige heraushören — ' +
      'though, through, thought und enough klingen verschieden, obwohl sie gleich aussehen.',
    prompt: 'Welches Wort hörst du?',
  },
  stressFr: {
    id: 'stressFr',
    side: 'toTarget',
    feature: 'fr',
    skill: 'lesen',
    label: 'Betonung bestimmen',
    description:
      'Im Französischen liegt die Betonung fast immer auf der letzten vollen Silbe — sie ist ' +
      'Regel und kein Gedächtnisstoff. Geübt wird das Ablesen: Welche Silbe bleibt übrig, ' +
      'wenn das stumme e wegfällt?',
    prompt: 'Welche Silbe wird betont?',
  },
  muteE: {
    id: 'muteE',
    side: 'toTarget',
    feature: 'fr',
    skill: 'lesen',
    label: 'Stummes e',
    description:
      'Ein unbetontes ⟨e⟩ am Wortende hat in der Regel keinen Laut (e muet). Aus der ' +
      'geschriebenen Silbenzahl wird so eine kleinere gesprochene — und genau daran ' +
      'scheitert das laute Lesen.',
    prompt: 'Wie viele Silben hörst du?',
  },
  accentFr: {
    id: 'accentFr',
    side: 'toTarget',
    feature: 'fr',
    skill: 'lesen',
    label: 'Akzentzeichen lesen',
    description:
      'é klingt geschlossen (/e/), è und ê offen (/ɛ/), ç wie ein s — die Akzentzeichen ' +
      'sagen, wie der Buchstabe klingt. Sie verschieben die Betonung NICHT (anders als im ' +
      'Spanischen steht hier keine Betonungsangabe), sie steuern den Vokalklang.',
    prompt: 'Wie klingt das hervorgehobene Zeichen?',
  },
};

/** Die vier Fertigkeiten, in der Reihenfolge, in der sie angezeigt werden. */
export const SKILL_LABELS: Record<DrillMeta['skill'], string> = {
  hoeren: 'Hören',
  lesen: 'Lesen',
  grammatik: 'Deutsche Grammatik',
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
export function drillsForDirection(direction: TargetDirection): DrillId[] {
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
