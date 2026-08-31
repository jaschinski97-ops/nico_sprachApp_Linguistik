import { VOCABULARY, VocabEntry } from '@/data/vocabulary';

import { assertUniqueIds, limitPlan } from '../generation/plan';

import { motifFor } from './motifs';
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
  return entry.isConcrete === true;
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
    thai: entry.thai,
    romanization: entry.romanization,
    german: entry.german,
    partOfSpeech: entry.partOfSpeech,
    // Wirft, wenn kein Motiv hinterlegt ist - lieber ein sichtbarer Fehler
    // beim Planen als ein geratenes Bild.
    motif: motifFor(entry.id),
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
  /** Standardmäßig der ausgelieferte Grundstock. */
  entries?: VocabEntry[];
  /** Höchstzahl für einen Probelauf; ohne Angabe alle konkreten Einträge. */
  limit?: number;
};

export function planImages(options: ImagePlanOptions = {}): ImageSpec[] {
  const entries = options.entries ?? VOCABULARY;
  const specs = entries.filter(canHaveImage).map(imageSpecFor);
  return limitPlan(assertUniqueIds(specs), options.limit);
}

/** Wie viele Vokabeln überhaupt bildfähig sind. */
export function countImageCandidates(entries: VocabEntry[] = VOCABULARY): number {
  return entries.filter(canHaveImage).length;
}
