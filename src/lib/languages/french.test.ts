import { VOCABULARY_FR } from '@/data/vocabulary';

import { drillsForDirection } from '../drills/types';

import { directionLabel, hasContent, LANGUAGES, LANGUAGE_LABELS, pairLabel } from './registry';
import { featureIsImplemented, featureRuntime } from './feature';
import { parsePairId, pairId, pairsFor, LANGUAGE_CODES } from './types';

/**
 * Französisch als neue Zielsprache (Roadmap v2, Runde 1).
 *
 * DREI AUSSAGEN:
 *
 * 1. **Die Registry führt die Sprache ehrlich.** 150 geprüfte A1-Einträge
 *    (`entryCount` aus der Datei, nie als Literal), deutsche Module für jedes
 *    Paar — und `delivered: false`, weil der Grundstoff noch nicht im
 *    App-Bestand ist.
 * 2. **Die Übungen sind registriert und verdrahtet**, auch wenn sie erst mit
 *    der Auslieferung Stoff im Gerät finden.
 * 3. **Der Bestand bleibt unangetastet**: `LANGUAGE_CODES` umfasst weiter
 *    genau th/en/es, `hasContent('fr')` ist false, und die klassische
 *    Auswahl ändert sich nicht.
 */

describe('Französisch in der Registry', () => {
  it('zählt seinen Grundstoff aus der Datei statt ihn zu behaupten', () => {
    expect(LANGUAGES.fr.entryCount).toBe(VOCABULARY_FR.length);
    expect(VOCABULARY_FR).toHaveLength(150);
  });

  it('trägt die deutschen Module jedem Paar zu (Pflicht 6)', () => {
    expect(LANGUAGES.fr.hasGermanModules).toBe(true);
  });

  it('ist geprüft, aber noch nicht ausgeliefert — und wird so gekennzeichnet', () => {
    // Der Kern der Ehrlichkeit dieser Runde: Stoff ja, Bestand nein.
    expect(LANGUAGES.fr.delivered).toBe(false);
    expect(LANGUAGES.fr.entryCount).toBeGreaterThan(0);
    expect(hasContent('fr')).toBe(false);
  });

  it('lässt die drei ausgelieferten Sprachen unverändert lernbar', () => {
    for (const code of LANGUAGE_CODES) {
      expect(hasContent(code)).toBe(true);
      expect(LANGUAGES[code].delivered).toBe(true);
    }
  });

  it('belegt das Merkmal mit einer Quelle (Pflicht 4)', () => {
    const feature = LANGUAGES.fr.feature;
    expect(feature.implemented).toBe(true);
    expect(feature.kind).toBe('derivable');
    expect(feature.source).toBeTruthy();
    expect(feature.source!.retrieved).toBe('2026-09-09');
    expect(feature.source!.url).toContain('wikipedia.org');
    expect(feature.source!.quote.length).toBeGreaterThan(60);
    expect(feature.source!.quote).toContain('final full syllable');
  });

  it('führt die Sprache mit Beschriftung, Eigenname und Sprach-Locale', () => {
    expect(LANGUAGES.fr.label).toBe('Französisch');
    expect(LANGUAGES.fr.endonym).toBe('français');
    expect(LANGUAGES.fr.speechLocale).toBe('fr-FR');
  });
});

describe('Die französischen Übungen', () => {
  it('gehören allein zu Französisch und sind Lese-Übungen', () => {
    // Keine Hör-Übung: Die Audio-Naht (SpeechLanguage in lib/audio) kennt
    // bislang kein Französisch. Lieber drei ehrliche Lese-Übungen als eine
    // vierte ohne Ton.
    expect(featureRuntime('fr').drills).toEqual(['stressFr', 'muteE', 'accentFr']);
    for (const drill of featureRuntime('fr').drills) {
      expect(drillsForDirection(`de_to_fr`)).toContain(drill);
    }
    expect(featureIsImplemented('fr')).toBe(true);
  });

  it('ordnet „X → Deutsch“ weiter nur die deutschen Module zu', () => {
    expect(drillsForDirection('fr_to_de')).toEqual(['article', 'verbForms']);
    // Und der Bestand bleibt, wie er war:
    expect(drillsForDirection('th_to_de')).toEqual(['article', 'verbForms']);
    expect(drillsForDirection('de_to_th')).toEqual(['tone', 'toneRule']);
  });
});

describe('Paar-Beschriftungen über den Kanon', () => {
  it('beschriftet die neuen Richtungen aus dem Verzeichnis', () => {
    expect(directionLabel('de_to_fr')).toBe('Deutsch → Französisch');
    expect(directionLabel('fr_to_de')).toBe('Französisch → Deutsch');
    expect(directionLabel('th_to_de')).toBe('Thai → Deutsch');
  });

  it('beschriftet auch Paare ohne deutsche Seite', () => {
    const enFr = parsePairId('en_to_fr')!;
    expect(pairLabel(enFr)).toBe('Englisch → Französisch');
    expect(LANGUAGE_LABELS).toEqual({
      de: 'Deutsch',
      en: 'Englisch',
      es: 'Spanisch',
      fr: 'Französisch',
      th: 'Thai',
    });
    // Und die Brücken-Sicht der Matrix benennt dieselben Paare:
    expect(pairsFor('en').map(pairId)).toContain('en_to_fr');
  });
});
