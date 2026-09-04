/**
 * Das Sprachmodell (Phase 15).
 *
 * BIS HIERHER WAR ALLES AUF THAI↔DEUTSCH VERDRAHTET: `Direction` war der feste
 * Typ `de_to_th | th_to_de`, die Vokabel hatte ein Feld `thai`, und die
 * Tonfarben lagen als Konstante herum. Diese Datei zieht daraus ein Modell,
 * in dem Thai↔Deutsch das **erste** Sprachpaar ist und kein Sonderfall.
 *
 * DEUTSCH IST DIE DREHSCHEIBE (AE-42). Jedes Paar hat Deutsch auf einer Seite;
 * `Direction` ist deshalb `de_to_<X>` oder `<X>_to_de` und nicht ein freies
 * Kreuzprodukt. Das ist eine Entscheidung, keine Bequemlichkeit — die
 * Begründung steht in AE-42.
 *
 * DER TYP IST ABSICHTLICH EINE ERWEITERUNG, KEINE ABLÖSUNG: `'de_to_th'` und
 * `'th_to_de'` bleiben wörtlich gültige Werte. Dadurch bleiben alle
 * gespeicherten Kartenschlüssel (`vocabId:de_to_th`) unverändert lesbar, und
 * die 180 Richtungsliterale im Bestand mussten nicht angefasst werden. Was
 * migriert werden muss, ist allein der **Vokabel**-Datensatz — siehe AE-43.
 */

import { Tone } from '@/constants/tones';

/** Die Drehscheibe. Steht auf einer Seite jedes Sprachpaars. */
export const HUB_LANGUAGE = 'de' as const;
export type HubLanguage = typeof HUB_LANGUAGE;

/** Die Zielsprachen — das, was neben Deutsch gelernt wird. */
export const LANGUAGE_CODES = ['th', 'en', 'es'] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (LANGUAGE_CODES as readonly string[]).includes(value);
}

/**
 * Lernrichtung. `de_to_th` heißt weiterhin: Deutsch verstehen, Thai
 * hervorbringen (AE-11 gilt unverändert).
 */
export type Direction = `${HubLanguage}_to_${LanguageCode}` | `${LanguageCode}_to_${HubLanguage}`;

export function directionsFor(language: LanguageCode): Direction[] {
  return [`${HUB_LANGUAGE}_to_${language}`, `${language}_to_${HUB_LANGUAGE}`];
}

/** Welche Zielsprache steckt in dieser Richtung? Deutsch ist ja immer dabei. */
export function languageOfDirection(direction: Direction): LanguageCode {
  const [from, , to] = direction.split('_');
  return (from === HUB_LANGUAGE ? to : from) as LanguageCode;
}

/** Bringt die lernende Person in dieser Richtung die Zielsprache hervor? */
export function producesTargetLanguage(direction: Direction): boolean {
  return direction.startsWith(`${HUB_LANGUAGE}_to_`);
}

/**
 * Eine Silbe mit dem, was das Merkmal über sie sagt.
 *
 * SEIT PHASE 16 HIER statt in `feature.ts`: Der Vokabeltyp braucht ihn, und
 * `feature.ts` importiert den Vokabeltyp — der Zirkel wäre sonst unvermeidlich.
 *
 * Die Felder sind bewusst optional und schließen sich nicht aus: Thai trägt
 * einen `tone`, Spanisch ein `stressed`, Englisch keines von beiden. Ein
 * Pflichtfeld hier hieße, jede Sprache müsse das Merkmal jeder anderen
 * mitschleppen.
 */
export type SyllableAnnotation = {
  /** Die Silbe in Umschrift, Schreibung oder Lautschrift. */
  roman: string;
  /** Thai: der Ton — er wird zur Farbe und zur Konturglyphe. */
  tone?: Tone;
  /** Spanisch: trägt diese Silbe die Betonung? */
  stressed?: boolean;
};

/**
 * Was die App über eine Sprache weiß, unabhängig davon, ob es schon Inhalte
 * gibt.
 */
export type LanguageMeta = {
  code: LanguageCode;
  /** Name auf Deutsch, wie er in der Auswahl steht. */
  label: string;
  /** Eigenbezeichnung — hilft beim Wiedererkennen. */
  endonym: string;
  /** Locale für die Sprachausgabe (`expo-speech`). */
  speechLocale: string;
  /**
   * Was diese Sprache besonders schwer macht — ein Satz, der in der Auswahl
   * steht. Für Thai die Töne, für Englisch die Aussprache, für Spanisch die
   * Betonung.
   */
  challenge: string;
};

/**
 * Das sprachspezifische Merkmal als **einhängbarer Baustein** (Pflicht 3).
 *
 * Thai bringt Tonfarben, Konturglyphen und die Herleitungsübung mit; Spanisch
 * bekäme später Betonungsregeln, Englisch die Aussprache je Wort. Damit die
 * App das tragen kann, ohne für jede Sprache umgebaut zu werden, steht hier
 * die Naht — dieselbe Bauart wie die Anbieter-Naht aus Phase 10.
 *
 * WAS BEWUSST **NICHT** IN DIESEN VERTRAG WANDERT: die Darstellung selbst.
 * Die Tonfarben bleiben in `constants/tones.ts`, die Schriftregeln in
 * `data/thai-script.ts`. Ein Merkmal sagt hier nur, **dass** es sie gibt und
 * wie sie heißen — sonst entstünde ein zweites Darstellungssystem neben dem
 * geprüften, und genau das verbietet Pflicht 3.
 */
export type LanguageFeature = {
  /** Kurzname des Merkmals, etwa „Töne". */
  label: string;
  /** Ein Satz: was das Merkmal ist und warum es zählt. */
  description: string;
  /**
   * Wie es erlernt wird — bestimmt, ob eine Herleitungsübung überhaupt Sinn
   * ergibt.
   *
   *   `derivable`  — aus der Schrift ableitbar (Thai-Töne, spanische Betonung).
   *                  Dann lohnt eine Regelübung wie in Phase 13.
   *   `per-word`   — steht nicht in der Schrift und muss je Wort hinterlegt
   *                  werden (englische Aussprache).
   *   `none`       — kein eigenes Merkmal.
   */
  kind: 'derivable' | 'per-word' | 'none';
  /** Ist es gebaut, oder bisher nur entschieden? */
  implemented: boolean;
  /** Quelle der Entscheidung — Pflicht 4 verlangt Recherche, nicht Meinung. */
  source?: { title: string; url: string; retrieved: string; quote: string };
};

export type LanguageDefinition = LanguageMeta & {
  feature: LanguageFeature;
  /**
   * Wie viele geprüfte Vokabeln vorliegen. `0` heißt: die Sprache steht in
   * der Auswahl, ist aber **nicht lernbar** — und wird genau so gekennzeichnet
   * (Pflicht 5).
   */
  entryCount: number;
  /**
   * Trägt diese Sprache die deutschen Module — Prüfungsmodul (Goethe) und die
   * Grammatikübungen? Sie gehören zu „X → Deutsch" und damit zu **jedem**
   * Paar, nicht zu Thai allein (Pflicht 6).
   */
  hasGermanModules: true;
};
