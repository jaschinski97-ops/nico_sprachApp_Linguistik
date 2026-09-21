import { VOCABULARY_AR } from '@/data/vocabulary-ar';
import { VOCABULARY_DE } from '@/data/vocabulary-de';
import { VOCABULARY_ES, VOCABULARY_TH, vocabularyFor } from '@/data/vocabulary';

import { directionForBridge, goalEndonym, goalLanguage, LERNZIELE, zielFuerDirection, zieleFuerBruecke, wortschatzFuerZiel } from './goals';
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
  it('bildet die drei Ziele auf Richtungen ab, in fester Reihenfolge', () => {
    expect(LERNZIELE.map((ziel) => ziel.direction)).toEqual([
      'de_to_th',
      'de_to_en',
      'de_to_es',
    ]);
    expect(zieleFuerBruecke('de').map((ziel) => ziel.direction)).toEqual([
      'de_to_th',
      'de_to_en',
      'de_to_es',
    ]);
  });

  it('leitet alte deutsche Profilziele um und erhält Deutsch für Thai', () => {
    expect(directionForBridge('de', 'th_to_de')).toBe('de_to_th');
    expect(directionForBridge('th', 'th_to_de')).toBe('th_to_de');
  });

  it('hält gemerkte Ziele anderer Brücken auf der Zielsprache fest (Nutzerbefund 21.09.)', () => {
    // Gemerkt aus der deutschen Oberfläche: „Spanisch“ (de_to_es). Auf der
    // englischen Brücke soll der Blick bei Spanisch bleiben, nicht zum ersten
    // Ziel (Thai) springen, während das Radio Spanisch anzeigt.
    expect(directionForBridge('en', 'de_to_es')).toBe('en_to_es');
    expect(directionForBridge('en', 'de_to_th')).toBe('en_to_th');
    expect(directionForBridge('es', 'de_to_th')).toBe('es_to_th');
    // „Englisch lernen“ gibt es auf der englischen Brücke nicht — das
    // Selbstpaar wird bewusst übersprungen, es gilt das erste Ziel.
    expect(directionForBridge('en', 'de_to_en')).toBe('en_to_th');
    // Fremd-Brücke: dieselbe Regel über die generierten Pools.
    expect(directionForBridge('ar', 'de_to_es')).toBe('ar_to_es');
  });

  it('gibt zu jeder Ziel-Richtung genau dieses Ziel zurück', () => {
    for (const ziel of LERNZIELE) {
      expect(zielFuerDirection(ziel.direction)).toBe(ziel);
    }
  });

  it('löst jetzt auch en_to_de/es_to_de zu Zielen auf (Nutzerentscheidung 10.09.)', () => {
    // „Füge noch Deutsch zum Generieren hinzu": Deutsch ist überall dort
    // Ziel, wo eine Brücke dorthin führt — der Stoff kommt aus dem
    // german-Feld des Bestands bzw. dem abgeleiteten de-Pool.
    expect(zielFuerDirection('en_to_de')!.direction).toBe('en_to_de');
    expect(zielFuerDirection('es_to_de')!.direction).toBe('es_to_de');
    expect(goalLanguage(zielFuerDirection('en_to_de')!)).toBe('de');
    expect(goalEndonym(zielFuerDirection('en_to_de')!)).toBe('Deutsch');
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

  it('Brücke en: Thai, Spanisch — und Deutsch als neues Ziel (10.09.)', () => {
    expect(zieleFuerBruecke('en').map((ziel) => ziel.direction)).toEqual([
      'en_to_th',
      'en_to_es',
      'en_to_de',
    ]);
    // Kein Brücken-Lernziel (Stufe 2); das Deutsch-Ziel ist ein normales
    // Ziel, keine „von“-Form.
    expect(zieleFuerBruecke('en').every((ziel) => ziel.vonSprache === undefined)).toBe(true);
  });

  it('Brücke es: Thai, Englisch — und Deutsch als neues Ziel (10.09.)', () => {
    expect(zieleFuerBruecke('es').map((ziel) => ziel.direction)).toEqual([
      'es_to_th',
      'es_to_en',
      'es_to_de',
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

describe('Lernziele der ar-Brücke (Pilot Heimatsprachen, 10.09.)', () => {
  it('zeigt die vier Ziele Deutsch, Englisch, Spanisch, Thai — de zuerst, dann en/es/th', () => {
    expect(zieleFuerBruecke('ar').map((ziel) => ziel.direction)).toEqual([
      'ar_to_de',
      'ar_to_en',
      'ar_to_es',
      'ar_to_th',
    ]);
    // Kein Brücken-Lernziel: `X_to_ar` gibt es nicht (Arabisch ist keine
    // Zielsprache), also trägt kein ar-Ziel eine vonSprache.
    expect(zieleFuerBruecke('ar').every((ziel) => ziel.vonSprache === undefined)).toBe(true);
  });

  it('löst jedes ar-Ziel über zielFuerDirection auf', () => {
    for (const ziel of zieleFuerBruecke('ar')) {
      expect(zielFuerDirection(ziel.direction)).not.toBeNull();
      expect(goalLanguage(zielFuerDirection(ziel.direction)!)).not.toBe('ar');
    }
    // ar_to_de lehrt Deutsch (goalLanguage liest die Zielseite).
    expect(goalLanguage(zielFuerDirection('ar_to_de')!)).toBe('de');
    expect(goalLanguage(zielFuerDirection('ar_to_en')!)).toBe('en');
  });

  it('zählt ehrlich: gekoppelte Paare für en/es/th und jetzt auch für Deutsch (10.09.)', () => {
    const arPool = VOCABULARY_AR;
    const arConcepts = new Set(arPool.map((entry) => entry.concept));
    const gekoppeltIn = (pool: typeof VOCABULARY_ES): number =>
      pool.filter((entry) =>
        entry.concept !== undefined
          ? arConcepts.has(entry.concept)
          : arConcepts.has(entry.id)
      ).length;

    const [deutsch, englisch, spanisch, thai] = zieleFuerBruecke('ar');
    // ar_to_de: seit „Füge noch Deutsch zum Generieren hinzu" koppelt die
    // Richtung gegen den abgeleiteten de-Pool — der generierte ar-Pool deckt
    // alle 84 Begriffe ab, also genau so viele deutsche Partner.
    const deConcepts = new Set(VOCABULARY_DE.map((entry) => entry.concept));
    const erwartetDe = arPool.filter((entry) => deConcepts.has(entry.concept)).length;
    expect(erwartetDe).toBeGreaterThan(0);
    expect(wortschatzFuerZiel(deutsch)).toBe(erwartetDe);
    // ar_to_en/ar_to_es: alle en/es-Einträge MIT Thai-Anker haben ihre
    // arabische Brückenseite (der generierte Pool deckt ALLE 84 Anker ab).
    expect(gekoppeltIn(VOCABULARY_ES)).toBeGreaterThan(0);
    expect(wortschatzFuerZiel(spanisch)).toBe(gekoppeltIn(VOCABULARY_ES));
    expect(wortschatzFuerZiel(englisch)).toBe(gekoppeltIn(vocabularyFor('en')));
    // ar_to_th: der ganze Thai-Pool ist referenziert (Fall 3 der Kopplung).
    expect(gekoppeltIn(VOCABULARY_TH)).toBe(VOCABULARY_TH.length);
    expect(wortschatzFuerZiel(thai)).toBe(VOCABULARY_TH.length);
  });

  it('zählt für die neuen Deutsch-Ziele den Bestand, nicht mehr null (10.09.)', () => {
    // en_to_de/es_to_de laufen über den unveränderten Bestandsweg — die Zahl
    // ist die Pool-Größe der Brückenseite (so wie th_to_de den Thai-Pool
    // zählt).
    const [, , deutschVonEnglisch] = zieleFuerBruecke('en');
    const [, , deutschVonSpanisch] = zieleFuerBruecke('es');
    expect(wortschatzFuerZiel(deutschVonEnglisch)).toBe(vocabularyFor('en').length);
    expect(wortschatzFuerZiel(deutschVonSpanisch)).toBe(vocabularyFor('es').length);
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

  it('ar-Brücke: pairLanguageOf liest die ZIEL-Seite — ar_to_de zielt auf den de-Pool', () => {
    expect(pairLanguageOf('ar_to_th')).toBe('th');
    expect(pairLanguageOf('ar_to_de')).toBe('de');
  });

  it('isPairDirection erkennt alle zwölf Paare, sonst nichts', () => {
    expect(isPairDirection('en_to_es')).toBe(true);
    expect(isPairDirection('th_to_de')).toBe(true);
    expect(isPairDirection('de_to_de')).toBe(false);
    expect(isPairDirection('en_to_fr')).toBe(false);
    expect(isPairDirection(42)).toBe(false);
  });

  it('isPairDirection erkennt die ar-Richtungen, aber keine ar-Ziele', () => {
    for (const direction of ['ar_to_de', 'ar_to_en', 'ar_to_es', 'ar_to_th']) {
      expect(isPairDirection(direction)).toBe(true);
    }
    expect(isPairDirection('de_to_ar')).toBe(false); // Arabisch ist keine Zielsprache
    expect(isPairDirection('ar_to_ar')).toBe(false);
  });

  it('isDeAnchored trennt Bestand von Kreuzrichtung — als Type Predicate', () => {
    const richtungen: PairDirection[] = ['de_to_th', 'th_to_de', 'en_to_es', 'es_to_en'];
    const deGeankert = richtungen.filter((r) => isDeAnchored(r));
    expect(deGeankert).toEqual(['de_to_th', 'th_to_de']);
    // ar_to_de endet zwar auf `_to_de`, ist aber KEIN Bestand — sonst könnte
    // die ar-Brücke in Direction-Verträge (Profil, Backup) rutschen.
    expect(isDeAnchored('ar_to_de')).toBe(false);
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
