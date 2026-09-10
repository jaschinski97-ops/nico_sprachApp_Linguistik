import { VocabEntry } from '@/data/vocabulary';
import { BridgeEntry } from '@/data/vocab-types';
import { VOCABULARY_AR } from '@/data/vocabulary-ar';

import { createCardState, dueCards, retrievability } from './fsrs/fsrs';
import { Direction, FSRSCardState } from './fsrs/types';
import { directionLabel } from './languages/registry';
import {
  AR_BRIDGE,
  directionsFor,
  Lang,
  LanguageCode,
  PairDirection,
  pairLanguageOf,
  parsePairId,
  SUPPORTED_TARGETS,
} from './languages/types';
import { loadCardStatesForDirection, loadVocabulary, seedVocabulary } from './repository';
import { DataStore, getStore } from './storage';

/**
 * Zusammenstellung einer Lernsitzung.
 *
 * Die beiden Lernrichtungen werden strikt getrennt gehalten: eine Sitzung
 * fragt entweder Deutsch -> Thai oder Thai -> Deutsch ab, nie beides
 * durcheinander. Jede Vokabel hat deshalb zwei eigene Karten mit eigenem
 * FSRS-Zustand.
 *
 * SEIT STUFE 1 (2026-09-10) AUCH KREUZRICHTUNGEN: Paare ohne Deutsch
 * (th↔en, th↔es, en↔es) koppeln Brückenwort und Zielwort über `concept` —
 * die Begriffs-ID, über die en/es-Einträge ohnehin auf ihren Thai-Anker
 * verweisen. Ohne Concept-Partner gibt es keinen Kartenstoff: Ehrlichkeit
 * geht vor Vollzahl.
 *
 * SEIT DEM AR-PILOTEN (2026-09-10) AUCH DIE BRÜCKE 'ar': Die Richtungen
 * ar_to_en/es/th koppeln gegen den GENERIERTEN Pool `VOCABULARY_AR`
 * (Ankerwörter der Oberflächensprache, siehe generate-bridge-vocab.cjs) —
 * dieselbe concept-Kopplung, nur kommt die Brückenseite nicht aus dem
 * Vokabel-Bestand, sondern aus dem Brücken-Pool. `ar_to_de` bleibt bewusst
 * ohne Stoff: Es gibt keinen deutschen Pool, mit dem sich koppeln ließe
 * (Deutsch lebt als `german`-Feld auf den bestehenden Pools) — Stufe 2.
 */

/**
 * Die Richtungen der aktuell gewaehlten Sprache.
 *
 * Seit Phase 15 keine Konstante mehr: Welche zwei Richtungen es gibt, haengt
 * an der Sprache (AE-42). `DIRECTIONS` bleibt als Thai-Vorgabe erhalten, damit
 * bestehende Aufrufer unveraendert weiterlaufen.
 */
export const DIRECTIONS: Direction[] = directionsFor('th');

export { directionLabel, directionsFor };

export type ReviewItem = {
  entry: VocabEntry;
  card: FSRSCardState;
  /**
   * Die Vorderseite einer Kreuzrichtung (Stufe 1): der Eintrag der
   * BRÜCKENsprache mit demselben `concept`. `null` bei de-geankerten
   * Richtungen — deren Vorderseite baut die Karte wie bisher aus dem
   * deutschen Feld des Eintrags selbst.
   *
   * SEIT DEM AR-PILOTEN AUCH `BridgeEntry`: Bei ar_to_* kommt die
   * Brückenseite aus dem generierten Brücken-Pool und ist kein
   * `VocabEntry` — die Karte liest nur `term`, und das hat beide Typen.
   */
  bridgeEntry: VocabEntry | BridgeEntry | null;
};

/**
 * Die Brückenseite einer Quelle: bei th/en/es der Pool aus dem Vokabel-
 * Bestand, bei 'ar' der generierte Brücken-Pool (kein `VocabEntry` — er
 * trägt keinen Ziel-Sprachstoff).
 */
function brueckenPoolFuer(
  alle: VocabEntry[],
  quelle: Lang | typeof AR_BRIDGE
): (VocabEntry | BridgeEntry)[] {
  if (quelle === AR_BRIDGE) return VOCABULARY_AR;
  return alle.filter((entry) => entry.language === quelle);
}

/**
 * Die Quelle und das Ziel einer Richtung — `parsePairId` für den Bestand
 * über dem Ziel-Kanon, die ar-Brücke wörtlich aus dem Präfix (sie ist kein
 * `Lang` und wird deshalb vom Bestands-Parser bewusst nicht erkannt).
 */
function paarVon(direction: PairDirection): { source: Lang | typeof AR_BRIDGE; target: Lang } | null {
  if (direction.startsWith(`${AR_BRIDGE}_to_`)) {
    const ziel = direction.slice(`${AR_BRIDGE}_to_`.length);
    const istKanon = (value: string): value is Lang =>
      (SUPPORTED_TARGETS as readonly string[]).includes(value);
    return istKanon(ziel) ? { source: AR_BRIDGE, target: ziel } : null;
  }
  return parsePairId(direction);
}

/**
 * Die Kopplung einer Kreuzrichtung: Brückenpool und Zielpool je Begriff.
 *
 * DREI FÄLLE, EINE WAHRHEIT (aus den Daten, nicht aus einer Annahme):
 *   1. Ziel = en/es, Brücke = th — das Ziel-`concept` IST die Thai-ID
 *      (`brueckeNachId`).
 *   2. Ziel und Brücke beide en/es — beide tragen dieselbe `concept`-ID des
 *      gemeinsamen Thai-Ankers (`brueckeNachConcept` auf dem concept).
 *   3. Ziel = th, Brücke = en/es — der Thai-Eintrag trägt selbst kein
 *      `concept`, er WIRD referenziert: die Brücken-`concept` zeigt auf
 *      seine ID (Lookup über die Ziel-ID).
 *
 * Ein Paar existiert genau dann, wenn einer der Fälle zutrifft. Ohne
 * Kopplung kein Kartenstoff: Ehrlichkeit geht vor Vollzahl. Für die
 * ar-Brücke greifen Fall 2 (ar-`concept` = Ziel-`concept`) und Fall 3
 * (ar-`concept` = Thai-ID).
 */
function kreuzStoff(
  alle: VocabEntry[],
  // Der Brückenpool wird explizit übergeben statt per Sprache gefiltert —
  // die ar-Brücke hat keinen `VocabEntry`-Bestand (siehe `brueckenPoolFuer`).
  brueckenPool: (VocabEntry | BridgeEntry)[],
  ziel: LanguageCode
): {
  entries: VocabEntry[];
  brueckeNachId: Map<string, VocabEntry | BridgeEntry>;
  brueckeNachConcept: Map<string, VocabEntry | BridgeEntry>;
} {
  const brueckeNachId = new Map(brueckenPool.map((entry) => [entry.id, entry]));
  const brueckeNachConcept = new Map(
    brueckenPool
      .filter((entry) => entry.concept !== undefined)
      .map((entry) => [entry.concept as string, entry])
  );
  const entries = alle.filter((entry) => {
    if (entry.language !== ziel) return false;
    if (entry.concept !== undefined) {
      return brueckeNachId.has(entry.concept) || brueckeNachConcept.has(entry.concept);
    }
    return brueckeNachConcept.has(entry.id);
  });
  return { entries, brueckeNachId, brueckeNachConcept };
}

/** Die Brückenseite eines gekoppelten Zieleintrags — dieselben drei Fälle. */
function brueckeVon(
  entry: VocabEntry,
  brueckeNachId: Map<string, VocabEntry | BridgeEntry>,
  brueckeNachConcept: Map<string, VocabEntry | BridgeEntry>
): VocabEntry | BridgeEntry | null {
  const ueberConcept =
    entry.concept !== undefined
      ? (brueckeNachId.get(entry.concept) ?? brueckeNachConcept.get(entry.concept))
      : undefined;
  return ueberConcept ?? brueckeNachConcept.get(entry.id) ?? null;
}

/**
 * Sorgt dafür, dass zu jeder Vokabel eine Karte in dieser Richtung existiert.
 *
 * Neue Karten werden in EINEM Schreibvorgang angelegt, nicht einzeln: beim
 * allerersten Start sind das 84 Karten je Richtung, und `putMany` fasst das
 * nativ in einer Transaktion zusammen.
 */
export async function ensureCardStates(
  direction: PairDirection,
  store?: DataStore,
  now: number = Date.now()
): Promise<{ entries: VocabEntry[]; cards: FSRSCardState[] }> {
  const db = store ?? (await getStore());

  let alle = await loadVocabulary(db);
  if (alle.length === 0) {
    // Erster Start: Grundstock ist noch nicht im Speicher.
    await seedVocabulary(db);
    alle = await loadVocabulary(db);
  }

  // SEIT PHASE 16 DIE ENTSCHEIDENDE ZEILE. Der Speicher traegt jetzt drei
  // Grundstoecke; ohne diesen Filter bekaeme eine Thai-Sitzung Karten fuer
  // spanische Vokabeln, und die Faelligkeitszahl auf der Uebersicht waere die
  // Summe ueber alle Sprachen. Die Sprache steht in der Richtung - es braucht
  // dafuer keinen zusaetzlichen Parameter, den ein Aufrufer vergessen koennte.
  //
  // SEIT STUFE 1 ÜBER `pairLanguageOf`: de-geankerte Richtungen liefern
  // exakt das alte Ergebnis (die Nicht-Deutsch-Seite), Kreuzrichtungen die
  // ZIEL-Seite — gelernt wird dort ja die Zielsprache.
  const sprache = pairLanguageOf(direction);
  const paar = paarVon(direction);
  const istKreuz = paar !== null && paar.source !== 'de' && paar.target !== 'de';

  const entries = istKreuz && paar
    ? kreuzStoff(alle, brueckenPoolFuer(alle, paar.source), sprache).entries
    : alle.filter((entry) => entry.language === sprache);

  const existing = await loadCardStatesForDirection(direction, db);
  const byVocabId = new Map(existing.map((card) => [card.vocabId, card]));

  const missing = entries
    .filter((entry) => !byVocabId.has(entry.id))
    .map((entry) => createCardState(entry.id, direction, now));

  if (missing.length > 0) {
    await db.putMany(
      'cards',
      missing.map((card) => ({ id: `${card.vocabId}:${card.direction}`, value: card }))
    );
    missing.forEach((card) => byVocabId.set(card.vocabId, card));
  }

  return {
    entries,
    cards: entries.map((entry) => byVocabId.get(entry.id)!),
  };
}

/**
 * Die fälligen Karten einer Richtung, am ehesten Vergessenes zuerst.
 *
 * Die Sortierung nach aufsteigender Retrievability kommt aus `dueCards` und
 * deckt beide Fälle ohne Sonderlogik ab: im Alltag stehen die schwächsten
 * Karten vorn, und nach einer längeren Pause zuerst das, was am tiefsten
 * abgesackt ist.
 */
export async function buildReviewQueue(
  direction: PairDirection,
  store?: DataStore,
  now: number = Date.now()
): Promise<ReviewItem[]> {
  const { entries, cards } = await ensureCardStates(direction, store, now);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  // KREUZRICHTUNGEN: die Brückenseite je Begriff — in beide Richtungen
  // geschlagen (siehe `kreuzStoff`). Nur in diesem Zweig wird der
  // Vokabelbestand ein zweites Mal gelesen; die de-geankerten Sitzungen
  // bleiben exakt auf ihrem alten Pfad.
  const paar = paarVon(direction);
  const istKreuz = paar !== null && paar.source !== 'de' && paar.target !== 'de';
  let brueckeNachId = new Map<string, VocabEntry | BridgeEntry>();
  let brueckeNachConcept = new Map<string, VocabEntry | BridgeEntry>();
  if (istKreuz && paar) {
    const db = store ?? (await getStore());
    const frisch = await loadVocabulary(db);
    ({ brueckeNachId, brueckeNachConcept } = kreuzStoff(
      frisch,
      brueckenPoolFuer(frisch, paar.source),
      pairLanguageOf(direction)
    ));
  }

  return dueCards(cards, now)
    .map((card) => {
      const entry = byId.get(card.vocabId);
      if (!entry) return null;
      const bridgeEntry = istKreuz
        ? brueckeVon(entry, brueckeNachId, brueckeNachConcept)
        : null;
      return { entry, card, bridgeEntry };
    })
    .filter((item): item is ReviewItem => item !== null);
}

export type DirectionSummary = {
  direction: PairDirection;
  due: number;
  total: number;
  /** Karten, die noch nie bewertet wurden. */
  fresh: number;
  /** Stabilität über 21 Tage. */
  mastered: number;
};

/** Kennzahlen je Richtung — das Dashboard zeigt sie bewusst getrennt. */
export async function summarizeDirection(
  // SEIT DEN KREUZRICHTUNGEN AUF `PairDirection`: Auch Kreuz-Ziele bekommen
  // ehrliche Fälligkeitszahlen — über die gekoppelten Karten, nie über den
  // vollen Ziel-Pool. `summarizeAllDirections` bleibt beim de-geankerten
  // Bestand (Fortschritts-Reiter).
  direction: PairDirection,
  store?: DataStore,
  now: number = Date.now()
): Promise<DirectionSummary> {
  const { cards } = await ensureCardStates(direction, store, now);
  return {
    direction,
    due: dueCards(cards, now).length,
    total: cards.length,
    fresh: cards.filter((card) => card.state === 'new').length,
    mastered: cards.filter((card) => card.state === 'mastered').length,
  };
}

/**
 * Kennzahlen beider Richtungen einer Sprache.
 *
 * SEIT PHASE 16 MIT SPRACHE: Ohne sie zeigte die Uebersicht nach einem Wechsel
 * auf Spanisch weiter die Thai-Zahlen - und zwar ohne dass etwas kaputt
 * aussaehe, was die schlimmere Art Fehler ist.
 */
export async function summarizeAllDirections(
  language: LanguageCode = 'th',
  store?: DataStore,
  now: number = Date.now()
): Promise<DirectionSummary[]> {
  const summaries: DirectionSummary[] = [];
  for (const direction of directionsFor(language)) {
    summaries.push(await summarizeDirection(direction, store, now));
  }
  return summaries;
}

/** Nur für Anzeige: wie gut die Karte gerade sitzt, in Prozent. */
export function retrievabilityPercent(card: FSRSCardState, now: number = Date.now()): number {
  return Math.round(retrievability(card, now) * 100);
}
