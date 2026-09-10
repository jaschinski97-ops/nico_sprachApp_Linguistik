import { languageOf } from './registry';
import { Direction, LanguageCode, producesTargetLanguage } from './types';

/**
 * Das Lernziel — die Wahl der lernenden Person als „Sprache“.
 *
 * NUTZERENTSCHEIDUNG (2026-09-10, wörtlich): „Ich wollte dieses ‚Deutsch →
 * Thai‘ und ‚Thai → Deutsch‘ weghaben. Deutsch muss noch als eigene Sprache
 * eingefügt werden.“ Die Richtungs-Formulierungen („Deutsch → Thai“) werden
 * überall dort aus der Oberfläche genommen, wo sie eine Wahl benennen; Deutsch
 * steht als eigene Wahl in den Listen.
 *
 * DIE 1:1-ABBILDUNG: Intern bleibt ALLES richtungsbasiert — Kartenschlüssel
 * (`vocabId:direction`), FSRS, Clips und Situationen hängen an Richtungen, und
 * das Datenmodell wird nicht umgebaut. Jedes Lernziel IST daher genau eine
 * Richtung, und sein Label ist der Sprachname des Gelehrten:
 *
 *   Thai      = de_to_th   (Profil-Sprache th)
 *   Englisch  = de_to_en   (Profil-Sprache en)
 *   Spanisch  = de_to_es   (Profil-Sprache es)
 *   Deutsch   = th_to_de   (Profil-Sprache th — Deutsch wird, ohne eigenen
 *                           Grundstoff, von Thai aus gelernt)
 *
 * `en_to_de`/`es_to_de` halten KEIN Lernziel (dorthin gibt es keinen Inhalt):
 * Sie tauchen in keiner Wahl auf, bleiben aber intern gültig, damit gemerkte
 * Profile und Adressen (`?direction=en_to_de`) weiter funktionieren — die
 * Screens validieren Richtungen bereits.
 */
export type Lernziel = {
  /** Die Richtung, die intern alles trägt — sie wird nie als solche angezeigt. */
  direction: Direction;
  /** Die Profil-Sprache des Ziels (Paarsprache) — bei Deutsch (th_to_de) Thai. */
  language: LanguageCode;
};

/** Die vier Ziele in fester Anzeigereihenfolge: Thai, Englisch, Spanisch, Deutsch. */
export const LERNZIELE: readonly Lernziel[] = [
  { direction: 'de_to_th', language: 'th' },
  { direction: 'de_to_en', language: 'en' },
  { direction: 'de_to_es', language: 'es' },
  { direction: 'th_to_de', language: 'th' },
];

/**
 * Das Ziel zu einer Richtung — `null` für Richtungen ohne Lernziel
 * (`en_to_de`/`es_to_de`), die nur als interner Bestand weiterleben.
 */
export function zielFuerDirection(direction: Direction): Lernziel | null {
  return LERNZIELE.find((ziel) => ziel.direction === direction) ?? null;
}

/**
 * Die Sprache, DIE das Ziel lehrt — Quelle seines Anzeigenamens
 * (`languageName('de')` existiert, weil Deutsch zugleich UI-Sprache ist) und
 * seines Merkmals: Die Tonpunkte hängen an der PRODUZIERTEN Sprache, und
 * `th_to_de` produziert Deutsch — also keine Punkte, anders als der alte Code,
 * der der Paar-Sprache Thai die Punkte gab.
 */
export function goalLanguage(ziel: Lernziel): LanguageCode | 'de' {
  return producesTargetLanguage(ziel.direction) ? ziel.language : 'de';
}

/**
 * Eigenbezeichnung des Ziels. Deutsch steht nicht im Registry-Bestand
 * (`LANGUAGES` kennt nur th/en/es) und trägt sein Endonym hier.
 */
export function goalEndonym(ziel: Lernziel): string {
  return goalLanguage(ziel) === 'de' ? 'Deutsch' : languageOf(ziel.language).endonym;
}
