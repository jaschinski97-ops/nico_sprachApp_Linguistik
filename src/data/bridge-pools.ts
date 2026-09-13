import type { ForeignBridge } from '@/lib/languages/types';

import { BridgeEntry } from './vocab-types';
import { VOCABULARY_AR } from './vocabulary-ar';
import { VOCABULARY_BN } from './vocabulary-bn';
import { VOCABULARY_FR } from './vocabulary-fr';
import { VOCABULARY_HI } from './vocabulary-hi';
import { VOCABULARY_ID } from './vocabulary-id';
import { VOCABULARY_JA } from './vocabulary-ja';
import { VOCABULARY_KO } from './vocabulary-ko';
import { VOCABULARY_MR } from './vocabulary-mr';
import { VOCABULARY_PT } from './vocabulary-pt';
import { VOCABULARY_RU } from './vocabulary-ru';
import { VOCABULARY_TA } from './vocabulary-ta';
import { VOCABULARY_TE } from './vocabulary-te';
import { VOCABULARY_TR } from './vocabulary-tr';
import { VOCABULARY_VI } from './vocabulary-vi';
import { VOCABULARY_UR } from './vocabulary-ur';
import { VOCABULARY_ZH } from './vocabulary-zh';

/**
 * Die Ankerwörter aller Brücken außerhalb des Ziel-Kanons — GENERIERT durch
 * `scripts/content/generate-bridge-vocab.cjs` (ar war der Pilot 10.09., seit
 * dem 20-Sprachen-Ausbau 13.09.2026 alle 16 Heimatsprachen ohne eigenen
 * Lernkanon).
 *
 * WAS EIN BRÜCKEN-POOL IST (und was nicht): pro Begriff EIN Wort der
 * Oberflächensprache für die Karten-VORDERSEITE (`BridgeEntry` — keine
 * Beispiele, keine Quellprüfung, kein Ziel-Sprachstoff). Gelernt wird
 * weiterhin eine der vier Hauptsprachen th/en/es/de; die Brücke sorgt nur
 * dafür, dass jemand mit fremdsprachlicher Oberfläche die Vorderseite in
 * seiner Sprache liest. Die Kopplung läuft über `concept` (die ID des
 * Thai-Ankers) — siehe `review-session` und `goals`.
 */
export const BRIDGE_POOLS: Record<ForeignBridge, BridgeEntry[]> = {
  ar: VOCABULARY_AR,
  bn: VOCABULARY_BN,
  fr: VOCABULARY_FR,
  hi: VOCABULARY_HI,
  id: VOCABULARY_ID,
  ja: VOCABULARY_JA,
  ko: VOCABULARY_KO,
  mr: VOCABULARY_MR,
  pt: VOCABULARY_PT,
  ru: VOCABULARY_RU,
  ta: VOCABULARY_TA,
  te: VOCABULARY_TE,
  tr: VOCABULARY_TR,
  ur: VOCABULARY_UR,
  vi: VOCABULARY_VI,
  zh: VOCABULARY_ZH,
};

/** Der Brücken-Pool zu einem Code — `null` für Kanon-Sprachen und Fremdformat. */
export function bridgePoolFor(code: string): BridgeEntry[] | null {
  return (BRIDGE_POOLS as Record<string, BridgeEntry[]>)[code] ?? null;
}
