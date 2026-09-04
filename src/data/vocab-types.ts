import { Tone } from '@/constants/tones';

import { LanguageCode, SyllableAnnotation } from '@/lib/languages/types';

/**
 * Die Form eines Vokabeleintrags.
 *
 * SEIT PHASE 16 EINE EIGENE DATEI. Vorher stand der Typ in `vocabulary.ts`
 * neben dem Thai-Grundstock; mit drei Grundstöcken hätte das einen Zirkel
 * ergeben (`vocabulary` → `vocabulary-es` → `vocabulary`). Der Typ steht
 * deshalb hier, die Listen dort.
 *
 * WAS ALLEN SPRACHEN GEMEINSAM IST, steht flach: Form, Bedeutung, Wortart,
 * die deutsche Seite. WAS EINER SPRACHE GEHÖRT, steht in einem eigenen,
 * optionalen Block (`spanishNoun`, `englishVerb`, …) — dann ist an jedem Feld
 * ablesbar, wofür es gilt, und ein englischer Eintrag trägt kein Feld `tone`
 * mit einem erfundenen Wert.
 */

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'numeral'
  | 'particle'
  | 'interjection'
  /** Seit Phase 16: „through" ist eine Präposition, „though" eine Konjunktion. */
  | 'preposition'
  | 'conjunction';

export type Register = 'neutral' | 'formal' | 'informal';

export type VocabEntry = {
  id: string;
  /**
   * Welche Zielsprache (Phase 15). Deutsch ist die Drehscheibe und steht
   * deshalb nicht hier, sondern auf der anderen Seite jedes Paars (AE-42).
   */
  language: LanguageCode;
  /**
   * Der gemeinsame Begriff, auf den sich dieser Eintrag und sein Gegenstück
   * in den anderen Sprachen beziehen — die ID des Thai-Eintrags, an dem der
   * Begriff zuerst geprüft wurde.
   *
   * WOFÜR DAS GUT IST: Ein Bildmotiv gehört zum **Begriff**, nicht zur
   * Sprache — „a small simple house" passt zu บ้าน, casa und house gleich gut.
   * Über den Begriff greift der Bildgenerator auf ein bereits formuliertes
   * Motiv zurück, statt es dreimal zu erfinden (AE-46). Zugleich macht das
   * Feld nachprüfbar, woher die deutsche Seite stammt: aus dem in Phase 2
   * geprüften Eintrag mit dieser ID.
   */
  concept?: string;
  /**
   * Die fremdsprachige Form. Hieß bis Phase 15 `thai` — der Name war eine
   * Festlegung auf eine Sprache, die es nicht mehr gibt (AE-43).
   */
  term: string;
  /**
   * Die Lesehilfe, je Sprache eine andere Art von Angabe:
   * Thai die Paiboon-Umschrift, Spanisch die Silbentrennung mit dem
   * geschriebenen Akzent (`mé-di-co`), Englisch die Lautschrift.
   */
  romanization: string;
  /**
   * SPRACHSPEZIFISCH (Thai): Ton der ersten Silbe. Seit Phase 16 optional —
   * ein englischer oder spanischer Eintrag hat keinen Ton, und ein
   * Vorgabewert wäre eine Behauptung (AE-45).
   */
  tone?: Tone;
  /**
   * Silbenweise Auszeichnung. Thai trägt den Ton je Silbe (Phase 3),
   * Spanisch die Betonung (Phase 16). Englisch lässt die Liste leer: sein
   * Merkmal hängt am ganzen Wort, nicht an der Silbe (AE-44).
   */
  syllables: SyllableAnnotation[];
  /**
   * Lautschrift aus der Quelle.
   *
   * Bei Englisch ist sie **das Merkmal selbst** — die Aussprache lässt sich
   * dort nicht ableiten und muss je Wort dastehen. Bei Spanisch ist sie der
   * **unabhängige Beleg**, gegen den die Betonungsregel geprüft wird; ohne
   * sie wäre die Gegenprobe zirkulär.
   */
  ipa?: string;
  /** Welche Aussprachevariante die Quelle für `ipa` angibt (RP, UK, …). */
  ipaAccent?: string;
  /**
   * Die **enge** Umschrift aus der Quelle, mit Silbengrenzen.
   *
   * Nur bei Spanisch, und dort der ganze Punkt: Wiktionary markiert in dieser
   * Form die Silbengrenzen selbst (`[ˈme.ð̞i.ko]`, wobei der Betonungsstrich
   * eine Grenze mit vertritt). Damit lässt sich die Betonungsregel gegen eine
   * Angabe prüfen, die **nicht** aus der Regel stammt — sonst wäre die
   * Gegenprobe zirkulär. Ein Test fährt den ganzen spanischen Grundstock
   * dagegen (AE-45).
   */
  ipaSyllables?: string;
  german: string;
  /** Pflicht bei deutschen Substantiven: Genus und Plural. */
  germanNoun?: { article: 'der' | 'die' | 'das'; plural: string };
  /** Stammformen — für Thai-Muttersprachler die eigentliche Hürde. */
  germanVerb?: {
    thirdPerson: string;
    praeteritum: string;
    perfekt: string;
    irregular: boolean;
  };
  germanAdjective?: { comparative: string; superlative: string; irregular: boolean };
  /**
   * SPRACHSPEZIFISCH (Spanisch): Genus und der Artikel, der davorsteht.
   * Beides zusammen, weil sie auseinanderfallen können — „el agua" ist
   * weiblich und steht trotzdem mit „el".
   */
  spanishNoun?: { gender: 'm' | 'f'; article: 'el' | 'la'; plural: string };
  /** SPRACHSPEZIFISCH (Spanisch): Konjugationsklasse und Unregelmäßigkeit. */
  spanishVerb?: { conjugation: 'ar' | 'er' | 'ir'; irregular: boolean };
  /** SPRACHSPEZIFISCH (Englisch): Vergangenheit und Partizip. */
  englishVerb?: { past: string; participle: string; irregular: boolean };
  /**
   * SPRACHSPEZIFISCH (Englisch): das Merkmal aus AE-44 — welches
   * Schriftstück sich hier nicht ableiten lässt und wie es klingt.
   * Steht nur an Wörtern, die mit anderen im Grundstock ein Paar bilden.
   */
  englishSpelling?: { grapheme: string; sound: string };
  partOfSpeech: PartOfSpeech;
  register: Register;
  /** Steuert die Bild-Pipeline in Phase 5: nur konkrete Begriffe bekommen Bilder. */
  isConcrete: boolean;
  /**
   * Beispiel in der Zielsprache. Seit Phase 16 optional: für Englisch und
   * Spanisch gibt es keine erfundenen Sätze (siehe PROGRESS.md, Phase 16).
   */
  exampleTerm?: string;
  exampleRoman?: string;
  exampleGerman?: string;
  audioAssetId?: string;
  imageAssetId?: string;
  /** true nur, wenn die Quelle Aussprache, Form UND Bedeutung deckt. */
  sourceVerified: boolean;
  source?: string;
  /**
   * Benannte Unsicherheit — nur bei `sourceVerified: false` gesetzt und in der
   * Lernansicht als Warnhinweis sichtbar.
   */
  verificationNote?: string;
  /** Lernhinweis zur Grammatik (Genus, Stammformen, Steigerung, Homonyme). */
  note?: string;
};
