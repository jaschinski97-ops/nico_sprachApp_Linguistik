import { vocabularyFor } from '@/data/vocabulary';

import { languageOf } from './registry';
import {
  isDeAnchored,
  isLanguageCode,
  Lang,
  LanguageCode,
  LANGUAGE_CODES,
  PairDirection,
  pairLanguageOf,
} from './types';

/**
 * Das Lernziel — die Wahl der lernenden Person als „Sprache“.
 *
 * NUTZERENTSCHEIDUNG (2026-09-10, wörtlich): „Ich wollte dieses ‚Deutsch →
 * Thai‘ und ‚Thai → Deutsch‘ weghaben. Deutsch muss noch als eigene Sprache
 * eingefügt werden.“ Die Richtungs-Formulierungen („Deutsch → Thai“) werden
 * überall dort aus der Oberfläche genommen, wo sie eine Wahl benennen; Deutsch
 * steht als eigene Wahl in den Listen.
 *
 * SEIT STUFE 1 (2026-09-10) HÄNGT DIE WAHL AN DER BRÜCKE: Die Ziele einer
 * Oberfläche folgen der App-/Systemsprache („Brücke“), nicht mehr dem festen
 * Anker Deutsch. Jemand mit englischer Oberfläche sieht „Thai“ und
 * „Spanisch“ — intern Paare `en_to_th`/`en_to_es`, deren Queue über
 * `concept` gekoppelt ist (siehe `review-session`). Deutsch-geankerte Paare
 * behalten vollen Umfang; Kreuzpaare starten mit dem concept-gekoppelten
 * Wortschatz und ehrlichen Leerzuständen für Fertigkeiten ohne Stoff.
 *
 * DIE 1:1-ABBILDUNG BLEIBT: Intern bleibt ALLES richtungsbasiert —
 * Kartenschlüssel (`vocabId:direction`), FSRS, Clips und Situationen hängen
 * an Richtungen, und das Datenmodell wird nicht umgebaut. Jedes Lernziel IST
 * daher genau eine Richtung, und sein Label ist der Sprachname des Gelehrten.
 *
 * `en_to_de`/`es_to_de` halten KEIN Lernziel (dorthin gibt es keinen Inhalt):
 * Sie tauchen in keiner Wahl auf, bleiben aber intern gültig, damit gemerkte
 * Profile und Adressen (`?direction=en_to_de`) weiter funktionieren — die
 * Screens validieren Richtungen bereits.
 */
export type Lernziel = {
  /** Die Richtung, die intern alles trägt — sie wird nie als solche angezeigt. */
  direction: PairDirection;
  /** Die Paar-Sprache des Ziels (`pairLanguageOf`) — bei Deutsch (th_to_de) Thai. */
  language: LanguageCode;
  /**
   * Nur beim Brücken-Lernziel gesetzt: die Sprache, AUS DER die Brücke selbst
   * gelernt wird. `de_to_th` ist für die Brücke Thai „Thai (von Deutsch)“,
   * für die Brücke Deutsch aber schlicht „Thai“ — dieselbe Richtung, zwei
   * Sichten. Die UI setzt daraus den i18n-Baustein `goal.fromSource` zusammen;
   * dieses Modul bleibt übersetzungsfrei.
   */
  vonSprache?: Lang;
};

/**
 * Die Ziele einer Brückensprache — „Was kann jemand mit dieser App-Sprache
 * lernen?“
 *
 * ZWEI QUELLEN, BEIDE EHRLICH:
 *
 *   a) Für jede ausgelieferte Zielsprache X ≠ Brücke das Paar `Brücke → X`.
 *      Kreuzrichtungen (beide Seiten aus {th,en,es}) tragen genau den
 *      concept-gekoppelten Wortschatz — die Wortzahl im Picker zählt Paare,
 *      nicht Pools.
 *   b) Das Brücken-Lernziel (die Brücke selbst von einer anderen Sprache
 *      lernen) NUR, wo echter Dialog-/Grammatik-Bestand existiert. Das ist
 *      aktuell das Paar th↔de: Brücke de lernt Deutsch (th_to_de, wie heute),
 *      Brücke th lernt Thai von Deutsch (de_to_th) — und liest als Ziel
 *      „Deutsch“ (th_to_de) mit, denn dieses Paar ist vollständig
 *      ausgebaut. Für Brücken en/es bleibt das Brücken-Lernziel außen vor
 *      (Stufe 2): Es gäbe heute weder Dialoge noch deutsche Grammatikstoff
 *      ehrlich anzubieten.
 *
 * REIHENFOLGE: die Pool-Sprachen in `LANGUAGE_CODES`-Ordnung, dann die
 * th↔de-Ziele — Brücke de liefert damit EXAKT die vier Ziele von vor Stufe 1
 * (Thai, Englisch, Spanisch, Deutsch), kein Regression für den Hauptnutzer.
 */
export function zieleFuerBruecke(bridge: Lang): Lernziel[] {
  const ziele: Lernziel[] = (LANGUAGE_CODES as readonly LanguageCode[])
    .filter((code) => code !== bridge)
    .map((code) => {
      // Kein Selbstpaar: der Filter oben nimmt die Brücke selbst heraus,
      // und `de` steht gar nicht in `LANGUAGE_CODES`. Der Cast beweist nur,
      // was der Filter garantiert.
      const direction = `${bridge}_to_${code}` as PairDirection;
      return { direction, language: pairLanguageOf(direction) };
    });

  // Das th↔de-Paar — der einzige Ort mit deutschem Dialog-/Grammatik-Bestand.
  if (bridge === 'de') {
    ziele.push({ direction: 'th_to_de', language: 'th' });
  } else if (bridge === 'th') {
    ziele.push({ direction: 'th_to_de', language: 'th' });
    ziele.push({ direction: 'de_to_th', language: 'th', vonSprache: 'de' });
  }
  return ziele;
}

/**
 * Die vier Ziele der Brücke Deutsch — der Bestands-Blick vor Stufe 1, als
 * Konstante erhalten, damit bestehende Aufrufer und Tests eine feste
 * Referenz haben. Neue Oberflächen lesen `zieleFuerBruecke`.
 */
export const LERNZIELE: readonly Lernziel[] = zieleFuerBruecke('de');

/**
 * Alle Ziele über allen Brücken, ohne Doppelnennung — das Nachschlagewerk
 * hinter `zielFuerDirection`. Die ersten Einträge SIND `LERNZIELE` (dieselben
 * Objekte), damit Bestandsaufrufer identitätsstabil zurückbekommen, was sie
 * von `LERNZIELE` her kennen. Bei Richtungen, die unter mehreren Brücken
 * vorkommen (`de_to_th` als „Thai“ und als „Thai (von Deutsch)“), gewinnt die
 * erste Nennung: die deutsch-geankerte Sicht des Bestands.
 */
const ALLE_ZIELE: readonly Lernziel[] = [
  ...LERNZIELE,
  ...zieleFuerBruecke('th'),
  ...zieleFuerBruecke('en'),
  ...zieleFuerBruecke('es'),
];

/**
 * Das Ziel zu einer Richtung — `null` für Richtungen ohne Lernziel
 * (`en_to_de`/`es_to_de`), die nur als interner Bestand weiterleben.
 *
 * SEIT STUFE 1 ÜBER ALLE PAARRICHTUNGEN: Auch Kreuzrichtungen tragen ein
 * Ziel, damit der Lern-Reiter sie betiteln kann, wenn sie über eine Adresse
 * (`?direction=en_to_es`) oder die Queue erreicht werden.
 */
export function zielFuerDirection(direction: PairDirection): Lernziel | null {
  return ALLE_ZIELE.find((ziel) => ziel.direction === direction) ?? null;
}

/**
 * Die Sprache, DIE das Ziel lehrt — Quelle seines Anzeigenamens
 * (`languageName('de')` existiert, weil Deutsch zugleich UI-Sprache ist) und
 * seines Merkmals: Die Tonpunkte hängen an der PRODUZIERTEN Sprache, und
 * `th_to_de` produziert Deutsch — also keine Punkte, anders als der alte Code,
 * der der Paar-Sprache Thai die Punkte gab.
 *
 * SEIT DEN KREUZRICHTUNGEN DIE ZIELSEITE, NICHT MEHR DIE HUB-REGEL: Vorher
 * hieß „produziert“ `startsWith('de_to_')`; ein Kreuzpaar wie `en_to_es`
 * produziert aber ebenfalls seine Zielseite. Gelehrt ist jetzt schlicht die
 * Seite NACH `to_` — und nur wenn das Deutsch ist, lehrt das Ziel Deutsch.
 * (`ziel.language` ist die Nicht-Deutsch-Seite, also die Zielseite außer bei
 * `_to_de`.)
 */
export function goalLanguage(ziel: Lernziel): LanguageCode | 'de' {
  return ziel.direction.endsWith('_to_de') ? 'de' : ziel.language;
}

/**
 * Eigenbezeichnung des Ziels. Deutsch steht nicht im Registry-Bestand
 * (`LANGUAGES` kennt nur th/en/es) und trägt sein Endonym hier.
 */
export function goalEndonym(ziel: Lernziel): string {
  return goalLanguage(ziel) === 'de' ? 'Deutsch' : languageOf(ziel.language).endonym;
}

/**
 * Wie viele Wörter ein Ziel ehrlich hat.
 *
 * DE-GEANKERT: die Pool-Größe der Paar-Sprache — der ganze Grundstock wird
 * abgefragt (bei Deutsch als Ziel der Thai-Pool: die Richtung fragt
 * Thai-Wörter auf Deutsch ab, es gibt keinen eigenen deutschen Pool).
 *
 * KREUZRICHTUNG: nur die concept-gekoppelten Paare — ein Kreuzziel zeigt
 * Brückenwort und Zielwort desselben Begriffs, und ein Eintrag ohne Partner
 * wäre Kartenstoff ohne Vorderseite. Die Kopplung kennt drei Fälle (dieselbe
 * Regel wie `kreuzStoff` in review-session): Ziel-`concept` = Brücken-ID
 * (Brücke th), gleiche `concept`-ID auf beiden Seiten (en↔es), oder
 * Brücken-`concept` = Ziel-ID (Ziel th, das selbst kein `concept` trägt).
 * Die Zahl lügt nicht nach oben, auch wenn der Ziel-Pool größer ist.
 */
export function wortschatzFuerZiel(ziel: Lernziel): number {
  if (isDeAnchored(ziel.direction)) return languageOf(ziel.language).entryCount;
  // Für Kreuzrichtungen ist die Brücke die Quelle des Paars — sie steht im
  // Richtungs-Präfix, `ziel.language` ist die Zielseite.
  const [quelle] = ziel.direction.split('_to_');
  if (!isLanguageCode(quelle)) return 0;
  const brueckenPool = vocabularyFor(quelle);
  const brueckenIds = new Set(brueckenPool.map((entry) => entry.id));
  const brueckenConcepts = new Set(
    brueckenPool.filter((entry) => entry.concept !== undefined).map((entry) => entry.concept!)
  );
  return vocabularyFor(ziel.language).filter((entry) =>
    entry.concept !== undefined
      ? brueckenIds.has(entry.concept) || brueckenConcepts.has(entry.concept)
      : brueckenConcepts.has(entry.id)
  ).length;
}
