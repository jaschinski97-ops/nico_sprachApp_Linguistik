import { GenerationSpec } from './types';

/**
 * Bausteine, die sich alle Generierungspläne teilen.
 *
 * Die Pläne selbst bleiben bei ihrem Thema: Sprachsituationen entstehen als
 * Kreuzprodukt aus Thema, Niveau, Richtung und Variante
 * (`conversation/plan.ts`), Bilder dagegen als Auswahl aus dem
 * Vokabel-Grundstock (`images/plan.ts`). Das ist keine Doppelung, sondern
 * zweierlei Inhalt; gemeinsam sind nur die Zusicherungen darunter.
 */

/**
 * Kürzt einen Plan auf die ersten `max` Einträge — für einen kleinen,
 * bezahlbaren Probelauf.
 *
 * Bewusst „die ersten" statt einer Zufallsauswahl: der Plan ist
 * deterministisch sortiert, ein Probelauf soll also zweimal dieselben
 * Einträge treffen und beim Fortsetzen nichts doppelt bezahlen.
 */
export function limitPlan<S extends GenerationSpec>(specs: S[], max?: number): S[] {
  if (max === undefined || max < 0) return specs;
  return specs.slice(0, max);
}

/** Prüft beim Bauen eines Plans, dass keine ID doppelt vorkommt. */
export function assertUniqueIds<S extends GenerationSpec>(specs: S[]): S[] {
  const seen = new Set<string>();
  for (const spec of specs) {
    if (seen.has(spec.id)) {
      throw new Error(`Doppelte ID im Plan: ${spec.id}`);
    }
    seen.add(spec.id);
  }
  return specs;
}
