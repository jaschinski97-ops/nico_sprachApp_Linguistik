import { VOCABULARY_ES, VOCABULARY_TH, vocabularyFor } from '@/data/vocabulary';

import { goalEndonym, goalLanguage, LERNZIELE, zielFuerDirection, zieleFuerBruecke, wortschatzFuerZiel } from './goals';
import { isDeAnchored, isPairDirection, pairLanguageOf, type PairDirection } from './types';

/**
 * Das Lernziel (Nutzerentscheidung 2026-09-10): „Deutsch → Thai" und
 * „Thai → Deutsch" verschwinden als Formulierungen aus der Wahl, Deutsch
 * rückt als eigene Wahl in die Listen — intern bleibt alles richtungsbasiert.
 *
 * SEIT STUFE 1 HÄNGT DIE LISTE AN DER BRÜCKE: `zieleFuerBruecke` liefert je
 * App-Sprache ihre Ziele; die Brücke Deutsch muss den Bestand 1:1 erhalten.
 */
describe('Lernziele — Deutsch als eigene Wahl (Brücke de, Bestand)', () => {
  it('bildet die vier Ziele 1:1 auf Richtungen ab, in fester Reihenfolge', () => {
    expect(LERNZIELE.map((ziel) => ziel.direction)).toEqual([
      'de_to_th',
      'de_to_en',
      'de_to_es',
      'th_to_de',
    ]);
    expect(zieleFuerBruecke('de').map((ziel) => ziel.direction)).toEqual([
      'de_to_th',
      'de_to_en',
      'de_to_es',
      'th_to_de',
    ]);
  });

  it('gibt zu jeder Ziel-Richtung genau dieses Ziel zurück', () => {
    for (const ziel of LERNZIELE) {
      expect(zielFuerDirection(ziel.direction)).toBe(ziel);
    }
  });

  it('hält Richtungen ohne Lernziel bewusst leer — der Bestand bleibt gültig', () => {
    // en_to_de/es_to_de werden nicht mehr angeboten, dürfen aber als gemerkte
    // Richtung oder Adressparameter weiter funktionieren.
    expect(zielFuerDirection('en_to_de')).toBeNull();
    expect(zielFuerDirection('es_to_de')).toBeNull();
  });

  it('bleibt für die Profil-Sprache bei der Paar-Sprache — Deutsch (th_to_de) zählt zu Thai', () => {
    expect(zielFuerDirection('th_to_de')!.language).toBe('th');
    expect(zielFuerDirection('de_to_th')!.language).toBe('th');
    expect(zielFuerDirection('de_to_en')!.language).toBe('en');
    expect(zielFuerDirection('de_to_es')!.language).toBe('es');
  });

  it('nennt als Ziel-Sprache das Gelehrte: de_to_X lehrt X, X_to_de lehrt Deutsch', () => {
    expect(goalLanguage(zielFuerDirection('de_to_th')!)).toBe('th');
    expect(goalLanguage(zielFuerDirection('de_to_en')!)).toBe('en');
    expect(goalLanguage(zielFuerDirection('de_to_es')!)).toBe('es');
    expect(goalLanguage(zielFuerDirection('th_to_de')!)).toBe('de');
  });

  it('trägt für Deutsch das Endonym selbst — die Registry kennt nur th/en/es', () => {
    expect(goalEndonym(zielFuerDirection('th_to_de')!)).toBe('Deutsch');
    expect(goalEndonym(zielFuerDirection('de_to_th')!)).toBe('ภาษาไทย');
    expect(goalEndonym(zielFuerDirection('de_to_en')!)).toBe('English');
    expect(goalEndonym(zielFuerDirection('de_to_es')!)).toBe('español');
  });
});

describe('Lernziele je Brücke (Stufe 1)', () => {
  it('Brücke th: Englisch, Spanisch, Deutsch — plus „Thai (von Deutsch)“', () => {
    expect(zieleFuerBruecke('th').map((ziel) => ziel.direction)).toEqual([
      'th_to_en',
      'th_to_es',
      'th_to_de',
      'de_to_th',
    ]);
    // Nur das Brücken-Lernziel trägt die Quellsprache.
    expect(zieleFuerBruecke('th').filter((ziel) => ziel.vonSprache !== undefined)).toEqual([
      { direction: 'de_to_th', language: 'th', vonSprache: 'de' },
    ]);
  });

  it('Brücke en: Thai und Spanisch — KEIN Brücken-Lernziel (Stufe 2)', () => {
    expect(zieleFuerBruecke('en').map((ziel) => ziel.direction)).toEqual([
      'en_to_th',
      'en_to_es',
    ]);
    expect(zieleFuerBruecke('en').every((ziel) => ziel.vonSprache === undefined)).toBe(true);
  });

  it('Brücke es: Thai und Englisch — KEIN Brücken-Lernziel (Stufe 2)', () => {
    expect(zieleFuerBruecke('es').map((ziel) => ziel.direction)).toEqual([
      'es_to_th',
      'es_to_en',
    ]);
  });

  it('gibt zu jedem Kreuzziel ein Ziel zurück, damit der Lern-Reiter sie betiteln kann', () => {
    for (const ziel of [...zieleFuerBruecke('th'), ...zieleFuerBruecke('en'), ...zieleFuerBruecke('es')]) {
      expect(zielFuerDirection(ziel.direction)).not.toBeNull();
    }
    expect(goalLanguage(zielFuerDirection('en_to_es')!)).toBe('es');
    expect(goalLanguage(zielFuerDirection('es_to_th')!)).toBe('th');
  });

  it('zählt bei de-geankerten Zielen den Pool, bei Kreuzzielen nur gekoppelte Paare', () => {
    const [thai, spanisch] = zieleFuerBruecke('en');
    // Ehrlichkeit: Kreuzstoff = concept-gekoppelte Paare, NICHT der ganze
    // Ziel-Pool. Erwartungswert wird hier unabhängig aus den Daten gerechnet
    // (dieselben drei Kopplungsfälle: Ziel-concept = Brücken-ID, gleiche
    // concept-ID, Brücken-concept = Ziel-ID).
    const enPool = vocabularyFor('en');
    const enIds = new Set(enPool.map((entry) => entry.id));
    const enConcepts = new Set(
      enPool.filter((entry) => entry.concept !== undefined).map((entry) => entry.concept!)
    );
    const gekoppeltIn = (pool: typeof VOCABULARY_ES): number =>
      pool.filter((entry) =>
        entry.concept !== undefined
          ? enIds.has(entry.concept) || enConcepts.has(entry.concept)
          : enConcepts.has(entry.id)
      ).length;

    // en_to_es: nur die es-Einträge mit en-Partner.
    const gekoppeltEs = gekoppeltIn(VOCABULARY_ES);
    expect(gekoppeltEs).toBeGreaterThan(0);
    expect(wortschatzFuerZiel(spanisch)).toBe(gekoppeltEs);
    expect(gekoppeltEs).toBeLessThanOrEqual(VOCABULARY_ES.length);
    // en_to_th: der Thai-Pool ist größer, aber nur die von en referenzierten
    // Thai-Einträge haben eine Brückenseite — die Zahl bleibt ehrlich klein.
    const gekoppeltTh = gekoppeltIn(VOCABULARY_TH);
    expect(gekoppeltTh).toBeGreaterThan(0);
    expect(gekoppeltTh).toBeLessThan(VOCABULARY_TH.length);
    expect(wortschatzFuerZiel(thai)).toBe(gekoppeltTh);
  });
});

describe('Kreuzrichtung-Typbasis (types.ts)', () => {
  it('pairLanguageOf bleibt im Bestand bei der Nicht-Deutsch-Seite', () => {
    expect(pairLanguageOf('de_to_th')).toBe('th');
    expect(pairLanguageOf('th_to_de')).toBe('th');
    expect(pairLanguageOf('de_to_es')).toBe('es');
  });

  it('pairLanguageOf liest bei Kreuzrichtungen die ZIEL-Seite', () => {
    expect(pairLanguageOf('en_to_es')).toBe('es');
    expect(pairLanguageOf('es_to_en')).toBe('en');
    expect(pairLanguageOf('th_to_en')).toBe('en');
    expect(pairLanguageOf('en_to_th')).toBe('th');
  });

  it('isPairDirection erkennt alle zwölf Paare, sonst nichts', () => {
    expect(isPairDirection('en_to_es')).toBe(true);
    expect(isPairDirection('th_to_de')).toBe(true);
    expect(isPairDirection('de_to_de')).toBe(false);
    expect(isPairDirection('en_to_fr')).toBe(false);
    expect(isPairDirection(42)).toBe(false);
  });

  it('isDeAnchored trennt Bestand von Kreuzrichtung — als Type Predicate', () => {
    const richtungen: PairDirection[] = ['de_to_th', 'th_to_de', 'en_to_es', 'es_to_en'];
    const deGeankert = richtungen.filter((r) => isDeAnchored(r));
    expect(deGeankert).toEqual(['de_to_th', 'th_to_de']);
  });
});

// Typprobe: Ziele und interne Bestands-Richtungen leben in `PairDirection`;
// die de-geankerten darunter sind zur Laufzeit `Direction` — das beweist
// `isDeAnchored` statt eines Casts (Profil/Backup-Vertrag bleibt intakt).
const richtungen: PairDirection[] = [
  ...LERNZIELE.map((ziel) => ziel.direction),
  'en_to_de',
  'es_to_de',
];
const alsBestand = richtungen.filter(isDeAnchored);
void alsBestand;
