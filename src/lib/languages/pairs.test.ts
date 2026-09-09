import { isValidExamModule } from '../exam/types';
import { cardKey } from '../fsrs/types';

import { bridgeText } from './bridge';
import {
  isPairId,
  pairId,
  PairId,
  pairsFor,
  parsePairId,
  PAIRS,
  SUPPORTED_TARGETS,
} from './types';

/**
 * Die Paarmatrix (Roadmap v2, „Richtungslogik“).
 *
 * DREI AUSSAGEN TRAGEN DIESE DATEI:
 *
 * 1. **Der Kanon ist vollständig, aber ohne Selbstpaare.** 5 × 4 = 20 Paare,
 *    jede Richtung genau einmal.
 * 2. **Die sechs klassischen Richtungen bleiben wörtlich gültig.** Sie sind
 *    Paar-IDs, `pairsFor('de')` liefert sie unverändert, und gespeicherte
 *    Kartenschlüssel im Format `vocabId:de_to_th` sind davon unberührt.
 * 3. **Brückentexte fallen ehrlich zurück.** `bridgeText` sagt über
 *    `usedFallback`, wenn die gewünschte Sprache fehlt.
 */

describe('Die Paarmatrix', () => {
  it('führt genau 20 Paare — 5 Zielsprachen, keine Selbstpaare', () => {
    expect(SUPPORTED_TARGETS).toEqual(['de', 'en', 'es', 'fr', 'th']);
    expect(PAIRS).toHaveLength(5 * 4);
    for (const pair of PAIRS) {
      expect(pair.source).not.toBe(pair.target);
    }
  });

  it('trägt jede Paar-ID genau einmal', () => {
    const ids = PAIRS.map(pairId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]{2}_to_[a-z]{2}$/);
    }
  });

  it('schließt Selbstpaare aus — im Typ und zur Laufzeit', () => {
    expect(parsePairId('de_to_de')).toBeNull();
    expect(isPairId('de_to_de')).toBe(false);
    expect(isPairId('xx_to_yy')).toBe(false);
    expect(isPairId('de')).toBe(false);
  });

  it('rundet Paar und ID ineinander', () => {
    for (const pair of PAIRS) {
      expect(parsePairId(pairId(pair))).toEqual(pair);
      expect(isPairId(pairId(pair))).toBe(true);
    }
  });

  it('liefert pairsFor alle Paare einer Brückensprache und nur solche', () => {
    for (const bridge of SUPPORTED_TARGETS) {
      const pairs = pairsFor(bridge);
      expect(pairs).toHaveLength(4);
      for (const pair of pairs) {
        expect(pair.source).toBe(bridge);
        expect(pair.target).not.toBe(bridge);
      }
    }
    // Deutsch als Brücke: die vier klassischen Richtungen.
    expect(pairsFor('de').map(pairId)).toEqual([
      'de_to_en',
      'de_to_es',
      'de_to_fr',
      'de_to_th',
    ]);
  });
});

describe('Die sechs klassischen Richtungen bleiben unverändert (Kompatibilität)', () => {
  // COMPILE-ZEUGNIS: Diese Zuweisung kompiliert nur, wenn alle sechs alten
  // Richtungswerte gültige PairIds sind — der Grund, warum kein
  // gespeicherter Kartenschlüssel (`vocabId:de_to_th`) angefasst werden
  // musste.
  const legacy: PairId[] = [
    'de_to_th',
    'th_to_de',
    'de_to_en',
    'en_to_de',
    'de_to_es',
    'es_to_de',
  ];
  expect(legacy).toHaveLength(6);

  it.each([
    'de_to_th',
    'th_to_de',
    'de_to_en',
    'en_to_de',
    'de_to_es',
    'es_to_de',
  ] as const)('%s ist eine gültige Paar-ID mit stabilem Format', (id) => {
    expect(isPairId(id)).toBe(true);
    const pair = parsePairId(id)!;
    expect(pairId(pair)).toBe(id);
    expect(PAIRS.map(pairId)).toContain(id);
  });

  it('passt auf bestehende Kartenschlüssel, ohne sie anzufassen', () => {
    // Dass 'de_to_th' hier ohne Cast durchgeht, ist die eigentliche Aussage:
    // der Bestandstyp Direction und die Paar-IDs teilen dieselben Literale.
    expect(cardKey('sawatdii', 'de_to_th')).toBe('sawatdii:de_to_th');
    expect(cardKey('es_medico', 'es_to_de')).toBe('es_medico:es_to_de');
  });
});

describe('Der Brückentext fällt ehrlich zurück', () => {
  const eintrag = {
    german: 'das Haus',
    term: 'la maison',
    translations: { en: 'house', es: 'casa', th: 'บ้าน' },
  };

  it('liefert den Brückentext, wenn die Sprache gedeckt ist', () => {
    expect(bridgeText(eintrag, 'en')).toEqual({ text: 'house', usedFallback: false });
    expect(bridgeText(eintrag, 'es')).toEqual({ text: 'casa', usedFallback: false });
    expect(bridgeText(eintrag, 'th')).toEqual({ text: 'บ้าน', usedFallback: false });
  });

  it('fällt auf den deutschen Quelltext zurück — und sagt es', () => {
    expect(bridgeText(eintrag, 'fr')).toEqual({ text: 'das Haus', usedFallback: true });
  });

  it('fällt bei Deutsch sinnvollerweise auf Deutsch — als gekennzeichneter Fallback', () => {
    // Deutsch IST der Quelltext; das Feld translations.de soll niemand pflegen.
    expect(bridgeText(eintrag, 'de')).toEqual({ text: 'das Haus', usedFallback: true });
  });

  it('trägt die Kette weiter, wenn nicht einmal Deutsch da ist', () => {
    const ohneDeutsch = { german: '', term: 'la maison', translations: { en: 'house' } };
    expect(bridgeText(ohneDeutsch, 'fr')).toEqual({ text: 'house', usedFallback: true });
    const nackter = { german: '', term: 'maison' };
    expect(bridgeText(nackter, 'en')).toEqual({ text: 'maison', usedFallback: true });
    expect(bridgeText({ german: '' }, 'en')).toEqual({ text: '', usedFallback: true });
  });

  it('liest französische Grundstoff-Einträge ohne Sonderweg', () => {
    // Die französischen Einträge sind strukturgleich — nur halt noch nicht
    // ausgeliefert. Der Brückentext weiß davon nichts und muss es auch nicht.
    const eintrag = {
      german: 'das Haus',
      term: 'maison',
      translations: { en: 'house', es: 'casa', th: 'บ้าน' },
    };
    expect(bridgeText(eintrag, 'de').text).toBe('das Haus');
    expect(bridgeText(eintrag, 'fr')).toEqual({ text: 'das Haus', usedFallback: true });
  });
});

describe('Das Prüfungstypsystem lässt fr-A1 formell zu', () => {
  const frA1Modul = {
    id: 'test-fr-a1-lesen',
    certificate: 'delf-a1',
    level: 'A1',
    skill: 'lesen',
    taskType: 'multipleChoice',
    direction: 'de_to_fr',
    title: 'Französisch A1 — Lesen',
    instruction: 'Lisez le message.',
    stimulus: { kind: 'text', body: 'Bonjour, le cours commence à neuf heures.' },
    minutes: 5,
    source: 'builtin',
    items: [
      {
        id: 'test-fr-a1-lesen-1',
        prompt: 'Wann beginnt der Kurs?',
        options: ['um 8 Uhr', 'um 9 Uhr', 'um 10 Uhr'],
        correctIndex: 1,
        explanation: '„à neuf heures“ — um neun Uhr.',
      },
    ],
  };

  it('prüft ein französisches A1-Modul als gültig', () => {
    expect(isValidExamModule(frA1Modul)).toBe(true);
  });

  it('lässt die klassische Richtung th_to_de unverändert gültig', () => {
    expect(
      isValidExamModule({ ...frA1Modul, id: 'test-th-a1', direction: 'th_to_de' })
    ).toBe(true);
  });

  it('lehnt ein Modul ohne Aufgaben weiter ab', () => {
    expect(isValidExamModule({ ...frA1Modul, items: [] })).toBe(false);
  });
});
