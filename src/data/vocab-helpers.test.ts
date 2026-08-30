import { isMultiSyllable, syllablesOf, uniformTone } from './vocab-helpers';
import { findVocab, VOCABULARY, VocabEntry } from './vocabulary';

function entry(id: string): VocabEntry {
  const found = findVocab(id);
  if (!found) throw new Error(`Testeintrag fehlt: ${id}`);
  return found;
}

describe('syllablesOf', () => {
  it('gibt bei สวัสดี drei Silben mit den Toenen tief-tief-mittel zurueck', () => {
    const syllables = syllablesOf(entry('sawatdii'));
    expect(syllables.map((s) => s.roman)).toEqual(['sà', 'wàt', 'dii']);
    expect(syllables.map((s) => s.tone)).toEqual(['low', 'low', 'mid']);
  });

  it('gibt bei einsilbigen Woertern genau eine Silbe zurueck', () => {
    expect(syllablesOf(entry('gai'))).toEqual([{ roman: 'gài', tone: 'low' }]);
  });

  it('faellt auf das Feld tone zurueck, wenn syllables fehlt', () => {
    // So koennte ein Datensatz aussehen, der vor AE-7 gespeichert wurde.
    const legacy = { ...entry('sawatdii'), syllables: undefined } as unknown as VocabEntry;
    expect(syllablesOf(legacy)).toEqual([{ roman: 'sà-wàt-dii', tone: 'low' }]);
  });

  it('faellt auch bei leerem syllables-Array zurueck', () => {
    const legacy = { ...entry('gai'), syllables: [] } as VocabEntry;
    expect(syllablesOf(legacy)).toEqual([{ roman: 'gài', tone: 'low' }]);
  });

  it('nutzt fuer den Normalfall syllables und NICHT das Feld tone', () => {
    // Der entscheidende Punkt aus AE-7: wuerde die Anzeige `tone` benutzen,
    // bekaeme สวัสดี durchgehend "tief" statt tief-tief-mittel.
    const sawatdii = entry('sawatdii');
    expect(sawatdii.tone).toBe('low');
    expect(syllablesOf(sawatdii).map((s) => s.tone)).not.toEqual(['low', 'low', 'low']);
  });
});

describe('uniformTone', () => {
  it('ist null, wenn die Silben verschiedene Toene haben', () => {
    expect(uniformTone(entry('sawatdii'))).toBeNull();
  });

  it('nennt den Ton, wenn alle Silben ihn teilen', () => {
    expect(uniformTone(entry('gai'))).toBe('low');
    // ตลาด ist zweisilbig, aber beide Silben sind tief.
    expect(uniformTone(entry('talaat'))).toBe('low');
  });

  it('liefert fuer jeden Eintrag entweder null oder den Ton aller Silben', () => {
    VOCABULARY.forEach((item) => {
      const tone = uniformTone(item);
      const tones = new Set(syllablesOf(item).map((s) => s.tone));
      if (tone === null) {
        expect(tones.size).toBeGreaterThan(1);
      } else {
        expect([...tones]).toEqual([tone]);
      }
    });
  });
});

describe('isMultiSyllable', () => {
  it('unterscheidet ein- und mehrsilbige Eintraege', () => {
    expect(isMultiSyllable(entry('gai'))).toBe(false);
    expect(isMultiSyllable(entry('sawatdii'))).toBe(true);
  });

  it('findet im Grundstock ueberhaupt mehrsilbige Woerter mit gemischten Toenen', () => {
    // Sonst waere die silbenweise Faerbung nie sichtbar und der Test oben
    // wuerde nichts beweisen.
    const mixed = VOCABULARY.filter((item) => isMultiSyllable(item) && uniformTone(item) === null);
    expect(mixed.length).toBeGreaterThanOrEqual(5);
  });
});
