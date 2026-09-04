import { VocabEntry } from '@/data/vocab-types';
import { VOCABULARY, vocabularyFor } from '@/data/vocabulary';

import { LanguageCode } from '../languages/types';

import { assertUniqueIds, limitPlan } from '../generation/plan';

import { hasMotif, motifFor, motifKey } from './motifs';
import { ImageSpec } from './types';

/**
 * Der Bauplan eines Bilderlaufs — und zugleich das Tor, das abstrakte
 * Einträge draußen hält (AE-15).
 *
 * Anders als bei den Sprachsituationen entsteht der Plan nicht aus einem
 * Kreuzprodukt, sondern aus dem vorhandenen Vokabel-Grundstock: **je Vokabel
 * höchstens ein Bild**, und nur, wenn `isConcrete` gesetzt ist. Die
 * Reihenfolge folgt der Datei `data/vocabulary.ts` und ist damit
 * deterministisch — ein Probelauf trifft zweimal dieselben Einträge und
 * bezahlt beim Fortsetzen nichts doppelt.
 */

/** Ein kleiner, bezahlbarer Probelauf. */
export const IMAGE_TEST_RUN = 5;

export function canHaveImage(entry: VocabEntry): boolean {
  // Seit Phase 16 zusaetzlich: ein Motiv muss vorliegen. Fuer Englisch und
  // Spanisch kommt es ueber den gemeinsamen Begriff aus dem Thai-Eintrag
  // (AE-46); wo keines hinterlegt ist, gibt es kein Bild statt eines
  // geratenen.
  return entry.isConcrete === true && hasMotif(motifKey(entry));
}

/**
 * Baut den Auftrag für eine Vokabel — und wirft, wenn sie nicht konkret ist.
 *
 * Erste von drei Sperren: hier, in `imageTask.produce` vor dem Netzaufruf und
 * im API-Client selbst. Dreifach, weil eine einzelne Sperre irgendwann durch
 * einen neuen Aufrufer umgangen wird; das Tor soll aber an keiner Stelle
 * passierbar sein.
 */
export function imageSpecFor(entry: VocabEntry): ImageSpec {
  if (!canHaveImage(entry)) {
    throw new Error(
      `"${entry.id}" (${entry.german}) ist nicht konkret — für diesen Eintrag wird ` +
        'kein Bild erzeugt.'
    );
  }
  return {
    id: entry.id,
    vocabId: entry.id,
    thai: entry.term,
    romanization: entry.romanization,
    german: entry.german,
    partOfSpeech: entry.partOfSpeech,
    // Wirft, wenn kein Motiv hinterlegt ist - lieber ein sichtbarer Fehler
    // beim Planen als ein geratenes Bild.
    motif: motifFor(motifKey(entry)),
    isConcrete: true,
  };
}

/**
 * Prüft einen Auftrag noch einmal gegen den Grundstock.
 *
 * Nötig, weil ein `ImageSpec` auch aus dem Speicher oder aus altem Code
 * kommen kann; dort ist der Literaltyp `isConcrete: true` längst verloren.
 */
export function assertConcreteSpec(spec: ImageSpec): void {
  const entry = VOCABULARY.find((candidate) => candidate.id === spec.vocabId);
  if (!entry) {
    throw new Error(`Unbekannte Vokabel "${spec.vocabId}" — kein Bild ohne geprüften Eintrag.`);
  }
  if (!canHaveImage(entry)) {
    throw new Error(
      `"${entry.id}" (${entry.german}) ist nicht konkret — für diesen Eintrag wird ` +
        'kein Bild erzeugt.'
    );
  }
}

export type ImagePlanOptions = {
  /**
   * Welche Sprache bebildert wird (Phase 16, Pflicht 4). Ohne diese Angabe
   * liefe ein Lauf ueber alle drei Grundstoecke.
   */
  language?: LanguageCode;
  /** Standardmäßig der Grundstock der gewaehlten Sprache. */
  entries?: VocabEntry[];
  /** Höchstzahl für einen Probelauf; ohne Angabe alle konkreten Einträge. */
  limit?: number;
};

export function planImages(options: ImagePlanOptions = {}): ImageSpec[] {
  const entries = options.entries ?? vocabularyFor(options.language ?? 'th');
  const specs = entries.filter(canHaveImage).map(imageSpecFor);
  return limitPlan(assertUniqueIds(specs), options.limit);
}

/** Wie viele Vokabeln überhaupt bildfähig sind. */
export function countImageCandidates(
  entries: VocabEntry[] = vocabularyFor('th')
): number {
  return entries.filter(canHaveImage).length;
}
