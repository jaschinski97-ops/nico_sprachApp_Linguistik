/**
 * Das Sprachmodell (Phase 15, seit dem v2-Plan: Paarmatrix).
 *
 * BIS HIERHER WAR ALLES AUF THAI↔DEUTSCH VERDRAHTET: `Direction` war der feste
 * Typ `de_to_th | th_to_de`, die Vokabel hatte ein Feld `thai`, und die
 * Tonfarben lagen als Konstante herum. Diese Datei zieht daraus ein Modell,
 * in dem Thai↔Deutsch das **erste** Sprachpaar ist und kein Sonderfall.
 *
 * DEUTSCH WAR DIE DREHSCHEIBE (AE-42) — und ist es im **Bestand** noch: Jede
 * ausgelieferte Richtung hat Deutsch auf einer Seite, und die deutsche Seite
 * jeder Vokabel (Genus, Stammformen, Steigerung) hängt an dieser Entscheidung.
 *
 * SEIT DEM PAARMATRIX-MODELL (Roadmap v2, 2026-09-08) GIBT ES HIER ZWEI
 * SCHICHTEN:
 *
 *   1. Die **Paarmatrix** (`SUPPORTED_TARGETS`, `Lang`, `Pair`, `pairsFor`):
 *      alle Kombinationen S→T mit S≠T über {de, en, es, fr, th} — 20 Paare.
 *      `BRIDGE_LOCALES` nennt dieselben fünf als Brückensprachen (= künftig
 *      die Systemsprache des Geräts).
 *   2. Der **Bestand** (`LANGUAGE_CODES`, `Direction`, `HUB_LANGUAGE`): die
 *      klassischen de↔th/en/es-Richtungen. `'de_to_th'` und `'th_to_de'`
 *      bleiben wörtlich gültige Werte — gespeicherte Kartenschlüssel
 *      (`vocabId:de_to_th`) sind davon unberührt — und `Direction` wurde nur
 *      um `de_to_fr`/`fr_to_de` erweitert, nie umgebaut.
 *
 * NEUER CODE liest Schicht 1; Schicht 2 trägt den Bestand. Französisch wurde
 * am 09.09.2026 komplett entfernt (Kern 4) — der frühere Grundstoff liegt
 * im Git-Verlauf und ist nicht mehr Teil des Typs.
 */

import { Tone } from '@/constants/tones';

/**
 * Die Drehscheibe. Steht auf einer Seite jedes Sprachpaars.
 *
 * @deprecated SEIT DEM PAARMATRIX-MODELL (Roadmap v2, Phase „Richtungslogik“)
 * ist Deutsch eine **Zielsprache unter fünf** und keine Drehcheibe mehr —
 * gültige Paare sind jetzt alle Kombinationen S→T mit S≠T, siehe
 * `SUPPORTED_TARGETS`, `Pair` und `pairsFor`. Der Export bleibt, bis alle
 * Aufrufer umgestellt sind (`profile.ts`, `backup.ts`, `questions.ts`
 * bauen damit weiterhin die klassischen de↔X-Richtungen). NEUER CODE liest
 * `HUB_LANGUAGE` nicht mehr; er nimmt `pairsFor` und `Pair`.
 */
export const HUB_LANGUAGE = 'de' as const;
export type HubLanguage = typeof HUB_LANGUAGE;

/**
 * Die Zielsprachen mit **ausgeliefertem** Grundstoff im App-Bestand — das,
 * was heute neben Deutsch gelernt werden kann.
 *
 * SEIT DEM PAARMATRIX-MODELL IST DIESE LISTE NICHT MEHR DIE GANZE WAHRHEIT:
 * `SUPPORTED_TARGETS` nennen alle fünf Zielsprachen des v2-Plans, und
 * `TARGET_LANGUAGES` zusätzlich die mit Grundstoff im Repo (Französisch ist
 * dort enthalten, aber noch nicht ausgeliefert — siehe `delivered` in
 * `LanguageDefinition`). Diese Liste hier bleibt die Schranke des
 * App-Bestands: `VocabEntry.language` und die Sprachauswahl lesen sie, und
 * sie wird erst mit der Auslieferung eines Grundstoffs erweitert.
 */
export const LANGUAGE_CODES = ['th', 'en', 'es'] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (LANGUAGE_CODES as readonly string[]).includes(value);
}

/**
 * Alle Zielsprachen mit geprüftem Grundstoff im Repo — die klassischen drei
 * plus Französisch.
 *
 * FRANZÖSISCH WURDE AM 09.09.2026 KOMPLETT ENTFERNT (Nutzerentscheidung):
 * Kern 4 — {de, en, es, th}. Der ganze Französisch-Grundstoff (Vokabeln,
 * Drills, Prüfungsanker, UI-Übersetzungen) liegt im Git-Verlauf (Commits
 * 0c96493/0bae43c) und ließe sich von dort zurückholen; der Sprachkanon ist
 * listengetrieben, ein Wiedereinstieg wäre wieder nur ein Listen-Eintrag.
 */
export const TARGET_LANGUAGES = ['th', 'en', 'es'] as const;
export type TargetLanguage = (typeof TARGET_LANGUAGES)[number];

/**
 * Der Sprachkanon des v2-Plans: **vier** Zielsprachen (09.09.2026, vorher
 * fünf mit Französisch), und die Brückensprache (= Systemsprache des Geräts)
 * ist derselbe Kanon.
 *
 * DEUTSCH STEHT HIER DRIN — als Ziel, nicht mehr als Drehcheibe. `Lang`
 * ist damit die Antwort auf „welche Sprachen gibt es überhaupt“, während
 * `LanguageCode` die engere Frage „welche sind ausgeliefert“ beantwortet.
 */
export const SUPPORTED_TARGETS = ['de', 'en', 'es', 'th'] as const;
export type Lang = (typeof SUPPORTED_TARGETS)[number];

/**
 * Die Brückensprachen — die Sprache, in der eine Vokabel **erklärt** wird.
 *
 * SPÄTER = SYSTEMSPRACHE: Der v2-Plan erkennt sie per `expo-localization`;
 * solange die i18n-Schicht nicht steht, bleibt Deutsch die Brücke. Der Kanon
 * ist absichtlich derselbe wie `SUPPORTED_TARGETS`: Jede Zielsprache ist auch
 * eine Sprache, in der erklärt werden kann.
 */
export const BRIDGE_LOCALES = SUPPORTED_TARGETS;

/**
 * Eine Richtung des Lernens: von `source` (Brückensprache) nach `target`
 * (Zielsprache). `en_to_de` heißt: Englisch als Brücke, Deutsch wird gelernt.
 */
export type Pair = { source: Lang; target: Lang };

/**
 * Stabile ID eines Paars — bewusst im **gewohnten Format**: `'de_to_th'` &
 * Co. sind seit Phase 15 Kartenschlüssel (`vocabId:de_to_th`) und dürfen
 * sich nie ändern. Der Typ schließt Selbstpaare (`de_to_de`) auf Typebene
 * aus; zur Laufzeit prüft `isPairId`.
 */
type PairsFrom<S extends Lang> = `${S}_to_${Exclude<Lang, S>}`;
export type PairId =
  | PairsFrom<'de'>
  | PairsFrom<'en'>
  | PairsFrom<'es'>
  | PairsFrom<'th'>;

/** Die ID eines Paars — im selben Format wie die alten Richtungs-Strings. */
export function pairId(pair: Pair): PairId {
  // Der Cast ist safe: `pair` kann laut Typ kein Selbstpaar sein, und genau
  // solche schließt `PairId` aus.
  return `${pair.source}_to_${pair.target}` as PairId;
}

/** Das Paar zu einer ID — `null` für Selbstpaare und Fremdformat. */
export function parsePairId(id: string): Pair | null {
  const [source, marker, target] = id.split('_');
  if (marker !== 'to' || !source || !target) return null;
  const isLang = (value: string): value is Lang =>
    (SUPPORTED_TARGETS as readonly string[]).includes(value);
  if (!isLang(source) || !isLang(target) || source === target) return null;
  return { source, target };
}

/** Schmale Laufzeitprüfung, passend zum Typ `PairId`. */
export function isPairId(value: unknown): value is PairId {
  return typeof value === 'string' && parsePairId(value) !== null;
}

/** Alle gültigen Paare des Kanons: 4 × 3 = 12, ohne Selbstpaare. */
export const PAIRS: Pair[] = SUPPORTED_TARGETS.flatMap((source) =>
  SUPPORTED_TARGETS.filter((target) => target !== source).map((target) => ({ source, target }))
);

/**
 * Alle Paare einer Brückensprache — „Was kann jemand mit dieser
 * Systemsprache lernen?“ Deutsch als Brücke liefert die klassischen
 * Richtungen `de_to_*`; Englisch als Brücke zusätzlich `en_to_de`,
 * `en_to_es` und `en_to_th`.
 */
export function pairsFor(bridge: Lang): Pair[] {
  return PAIRS.filter((pair) => pair.source === bridge);
}

/**
 * Lernrichtung. `de_to_th` heißt weiterhin: Deutsch verstehen, Thai
 * hervorbringen (AE-11 gilt unverändert).
 *
 * BEWUSST UNVERÄNDERT AUF DEM BESTAND: `Direction` umfasst nur die
 * ausgelieferten Paare (de↔th/en/es). Für die deutsch-geankerten Richtungen
 * über allem Grundstoff gibt es `TargetDirection` — eine reine Erweiterung,
 * und jeder `Direction`-Wert ist zugleich ein gültiger `TargetDirection`. So
 * bleibt jede Profil- und Backup-Stelle (`profile.ts`, `backup.ts`) auf dem
 * alten Typ.
 */
export type Direction = `${HubLanguage}_to_${LanguageCode}` | `${LanguageCode}_to_${HubLanguage}`;

/**
 * Die deutsch-geankerten Richtungen über **allen** Ziel-Grundstücken — die
 * klassischen sechs.
 *
 * WARUM WEITERHIN DEUTSCH-GEANKERT: Prüfungsmodule (Goethe-Format) und die
 * deutschen Grammatikübungen hängen an der deutschen Seite eines Paars; für
 * sie ist diese Union die vollständige Menge. Das freie Kreuzprodukt S≠T
 * leistet separat `Pair`/`pairsFor` — ohne Erbanteil an der Bestandstypung.
 */
export type TargetDirection =
  | `${HubLanguage}_to_${TargetLanguage}`
  | `${TargetLanguage}_to_${HubLanguage}`;

export function directionsFor(language: LanguageCode): Direction[] {
  return [`${HUB_LANGUAGE}_to_${language}`, `${language}_to_${HUB_LANGUAGE}`];
}

/**
 * Welche Zielsprache steckt in dieser Richtung? Deutsch ist ja immer dabei.
 *
 * NUR FÜR DEN BESTAND: Für Richtungen über allen Ziel-Grundstücken (inklusive
 * Französisch) gibt es `languageOfTargetDirection`.
 */
export function languageOfDirection(direction: Direction): LanguageCode {
  const [from, , to] = direction.split('_');
  return (from === HUB_LANGUAGE ? to : from) as LanguageCode;
}

/** Dasselbe für die erweiterten Richtungen. */
export function languageOfTargetDirection(direction: TargetDirection): TargetLanguage {
  const [from, , to] = direction.split('_');
  return (from === HUB_LANGUAGE ? to : from) as TargetLanguage;
}

/**
 * Bringt die lernende Person in dieser Richtung die Zielsprache hervor?
 *
 * SEIT DEN KREUZRICHTUNGEN AUF `PairDirection`: Auch `en_to_es` produziert
 * seine Zielseite — die Frage ist paarsymmetrisch und braucht keinen
 * de-geankerten Vertrag mehr.
 */
export function producesTargetLanguage(direction: PairDirection): boolean {
  return direction.startsWith(`${HUB_LANGUAGE}_to_`);
}

/**
 * Lernrichtung über **allen** zwölf Paaren des Kanons — der de-geankerte
 * Bestand (`Direction`) plus die sechs Kreuzrichtungen (th↔en, th↔es, en↔es).
 *
 * WARUM EIN ZWEITER NAME NEBEN `PairId`: Es ist dieselbe Zeichenketten-Union
 * — `PairId` benennt die Paare des Sprachmodells, `PairDirection` die
 * Lernrichtung einer Sitzung darüber. Zwei Namen für denselben Typ halten die
 * Aufrufstellen lesbar („welche Richtung wird gelernt“ statt „welches Paar
 * ist gemeint“) und kosten nichts.
 *
 * WARUM `Direction` NICHT ANGEFASST WIRD: Gespeicherte Profile, Backups und
 * Kartenschlüssel tragen de-geankerte Richtungen; `Direction` bleibt deren
 * Vertrag. Nur Ziele, Auswahl und Queue (`goals.ts`, `review-session.ts`,
 * Lern-Reiter) arbeiten mit `PairDirection` — jeder `Direction`-Wert ist
 * zugleich ein gültiger `PairDirection`, Bestandsaufrufer ändern sich nicht.
 */
export type PairDirection = PairId;

/** Schmale Laufzeitprüfung, passend zum Typ `PairDirection`. */
export function isPairDirection(value: unknown): value is PairDirection {
  return isPairId(value);
}

/**
 * Die Sprache, deren Stoff eine Richtung abfragt — die „Paarsprache“.
 *
 * BEI DEN DE-GEANKERTEN RICHTUNGEN EXAKT `languageOfDirection` (Bestand):
 * `de_to_th` und `th_to_de` gehören beide zum Thai-Pool. Bei Kreuzrichtungen
 * die **Ziel**-Seite: `en_to_es` fragt den spanischen Pool ab, denn gelernt
 * wird Spanisch — der Englisch-Wortlaut auf der Vorderseite ist nur die
 * Brücke (Stufe 1: Queue über `concept` gekoppelt, siehe `review-session`).
 */
export function pairLanguageOf(direction: PairDirection): LanguageCode {
  const [from, , to] = direction.split('_');
  if (from === HUB_LANGUAGE) return to as LanguageCode;
  if (to === HUB_LANGUAGE) return from as LanguageCode;
  // Kreuzrichtung: die Zielseite trägt den Stoff.
  return to as LanguageCode;
}

/**
 * Ist das eine de-geankerte Richtung (Deutsch auf einer Seite)?
 *
 * ALS TYPE PREDICATE, DAMIT BESTANDSSTELLEN SCHMALER LAUFEN: Wo ein
 * `PairDirection`-Wert weiter an `Direction`-Verträge geht (Profil,
 * Backup, `directionLabel`), beweist dieser Test die Zuteilung statt zu
 * casten. Kreuzrichtungen fallen hier bewusst durch — sie sind Neuland
 * (Stufe 1), nicht Bestand.
 */
export function isDeAnchored(value: PairDirection): value is Direction {
  return value.startsWith(`${HUB_LANGUAGE}_to_`) || value.endsWith(`_to_${HUB_LANGUAGE}`);
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
  /**
   * Der Bestands-Code aus `LANGUAGE_CODES`. SEIT DEM PAARMATRIX-MODELL VOM
   * TYP `TargetLanguage`: auch Deutsch als Ziel trägt seinen Code hier,
   * App-Bestand ist (`delivered: false`).
   */
  code: TargetLanguage;
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
   * Ist der Grundstoff **im App-Bestand** (also in `VOCABULARY` und damit auf
   * jedem Gerät)? `false` heißt: geprüfte Einträge liegen im Repo, aber die
   * Auslieferung kommt noch — die Auswahl zeigt die Sprache ehrlich als „noch
   * nicht lernbar“, der Sprachwechsel lässt sie weg. Französisch steht so da,
 * bis sein Paket ausgeliefert wird (Roadmap v2, Phase 3).
   */
  delivered: boolean;
  /**
   * Trägt diese Sprache die deutschen Module — Prüfungsmodul (Goethe) und die
   * Grammatikübungen? Sie gehören zu „X → Deutsch" und damit zu **jedem**
   * Paar, nicht zu Thai allein (Pflicht 6).
   */
  hasGermanModules: true;
};
