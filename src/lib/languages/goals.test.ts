import { Direction } from './types';

import { goalEndonym, goalLanguage, LERNZIELE, zielFuerDirection } from './goals';

/**
 * Das Lernziel (Nutzerentscheidung 2026-09-10): „Deutsch → Thai" und
 * „Thai → Deutsch" verschwinden als Formulierungen aus der Wahl, Deutsch
 * rückt als eigene Wahl in die Listen — intern bleibt alles richtungsbasiert.
 */
describe('Lernziele — Deutsch als eigene Wahl', () => {
  it('bildet die vier Ziele 1:1 auf Richtungen ab, in fester Reihenfolge', () => {
    expect(LERNZIELE.map((ziel) => ziel.direction)).toEqual([
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

// Typprobe: Die feste Union der Richtungen bleibt im Bestand verankert.
const alle: Direction[] = [...LERNZIELE.map((ziel) => ziel.direction), 'en_to_de', 'es_to_de'];
void alle;
