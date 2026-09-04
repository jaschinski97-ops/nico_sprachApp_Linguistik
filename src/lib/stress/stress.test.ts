import { DIFFERENTIAL_ACCENTS, SPANISH_STRESS_SOURCE } from '@/data/spanish-stress';
import { VOCABULARY_ES } from '@/data/vocabulary';

import { analyzeStress, joinSyllables, syllabify } from './syllables';

/**
 * Die spanische Betonungsregel (Phase 16).
 *
 * DIE WICHTIGSTE DATEI DIESER PHASE, und zwar wegen eines einzigen Blocks:
 * „Die Regel gegen die Quelle". Alles andere prüft, ob der Code tut, was
 * gemeint war; jener Block prüft, ob das Gemeinte **stimmt**.
 *
 * Der Aufbau folgt Phase 13: erst Einzelfälle, an denen sich die Regeln
 * zeigen lassen, dann der Durchlauf über den ganzen Grundstock gegen eine
 * Angabe, die nicht aus der Regel stammt.
 */

describe('Silbentrennung', () => {
  it('trennt zwischen zwei Konsonanten, aber nicht in einer Anlautverbindung', () => {
    expect(syllabify('cantar')).toEqual({ ok: true, syllables: ['can', 'tar'] });
    // „bl" ist unteilbar - ha-blar, nicht hab-lar. Ohne diese Schranke waere
    // die Silbenzahl zwar gleich, die Anzeige aber falsch.
    expect(syllabify('hablar')).toEqual({ ok: true, syllables: ['ha', 'blar'] });
    expect(syllabify('libro')).toEqual({ ok: true, syllables: ['li', 'bro'] });
    expect(syllabify('comprar')).toEqual({ ok: true, syllables: ['com', 'prar'] });
  });

  it('behandelt ch, ll und rr als ein Zeichen', () => {
    expect(syllabify('ocho')).toEqual({ ok: true, syllables: ['o', 'cho'] });
    expect(syllabify('pollo')).toEqual({ ok: true, syllables: ['po', 'llo'] });
    expect(syllabify('perro')).toEqual({ ok: true, syllables: ['pe', 'rro'] });
  });

  it('zählt einen Diphthong als eine Silbe', () => {
    expect(syllabify('gracias')).toEqual({ ok: true, syllables: ['gra', 'cias'] });
    expect(syllabify('tiempo')).toEqual({ ok: true, syllables: ['tiem', 'po'] });
    expect(syllabify('seis')).toEqual({ ok: true, syllables: ['seis'] });
  });

  it('lässt einen Akut auf i oder u den Diphthong aufbrechen', () => {
    // Genau dafuer steht das Zeichen in „día" - ohne es waere das Wort
    // einsilbig. Die Quelle nennt tía, dúo, oír und baúl.
    expect(syllabify('día')).toEqual({ ok: true, syllables: ['dí', 'a'] });
    expect(syllabify('frío')).toEqual({ ok: true, syllables: ['frí', 'o'] });
    // Ohne den Akut ist es EIN Diphthong und damit eine Silbe - das ist der
    // Grund, warum das Zeichen ueberhaupt dasteht.
    expect(syllabify('dia')).toEqual({ ok: true, syllables: ['dia'] });
  });

  it('trennt zwei starke Vokale', () => {
    expect(syllabify('leer')).toEqual({ ok: true, syllables: ['le', 'er'] });
  });

  it('übergeht das stumme h, ohne es wegzuwerfen', () => {
    // „hue" bleibt eine Silbe, und das h steht weiter da - sonst zeigte die
    // Uebung „ue-vo".
    expect(syllabify('huevo')).toEqual({ ok: true, syllables: ['hue', 'vo'] });
    expect(syllabify('hola')).toEqual({ ok: true, syllables: ['ho', 'la'] });
  });

  it('behandelt das u in que, qui, gue, gui als stumm', () => {
    expect(syllabify('pequeño')).toEqual({ ok: true, syllables: ['pe', 'que', 'ño'] });
    expect(syllabify('quién')).toEqual({ ok: true, syllables: ['quién'] });
    // Vor „a" ist das u kein stummes: a-gua, nicht a-ga.
    expect(syllabify('agua')).toEqual({ ok: true, syllables: ['a', 'gua'] });
  });

  it('weist zurück, was die Quelle nicht eindeutig entscheidet', () => {
    // „at-le-ta" oder „a-tle-ta" - die Quelle laesst beides zu. Eine Uebung,
    // die eine Fassung als richtig ausgibt, behauptete mehr als der Beleg.
    const result = syllabify('atleta');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('tl');
  });

  it('weist zurück, was gar kein spanisches Wort ist', () => {
    expect(syllabify('สวัสดี').ok).toBe(false);
    expect(syllabify('dos palabras').ok).toBe(false);
    expect(syllabify('').ok).toBe(false);
  });
});

describe('Betonung herleiten', () => {
  it('setzt sie auf die vorletzte Silbe bei Vokal, n oder s am Ende', () => {
    const casa = analyzeStress('casa');
    expect(casa.ok && casa.stressedIndex).toBe(0);
    expect(casa.ok && casa.rule).toBe('penultimate');

    const nosotros = analyzeStress('nosotros');
    expect(nosotros.ok && nosotros.stressedIndex).toBe(1);
  });

  it('setzt sie auf die letzte Silbe bei jedem anderen Schlusslaut', () => {
    const comer = analyzeStress('comer');
    expect(comer.ok && comer.stressedIndex).toBe(1);
    expect(comer.ok && comer.rule).toBe('final');

    const arroz = analyzeStress('arroz');
    expect(arroz.ok && arroz.stressedIndex).toBe(1);
  });

  it('lässt einen Akut die Grundregel aufheben', () => {
    const cafe = analyzeStress('café');
    expect(cafe.ok && cafe.stressedIndex).toBe(1);
    expect(cafe.ok && cafe.rule).toBe('acute');
    // „café" endet auf einen Vokal - ohne Zeichen laege die Betonung auf „ca".
    const cafeOhne = analyzeStress('cafe');
    expect(cafeOhne.ok && cafeOhne.stressedIndex).toBe(0);
  });

  it('erklärt jeden Schritt, nicht nur das Ergebnis', () => {
    const medico = analyzeStress('médico');
    expect(medico.ok).toBe(true);
    if (!medico.ok) return;
    expect(medico.steps.map((step) => step.label)).toEqual(['Silben', 'Akut']);
    expect(medico.steps[0].value).toBe('mé·di·co');
    expect(medico.steps[1].detail).toContain('betonten Silbe');
  });

  it('benennt den Vorbehalt, wo der Akut gar nicht die Betonung meint', () => {
    // „dónde" wird auch ohne Zeichen auf „don" betont; der Akut unterscheidet
    // das Fragewort vom Bindewort. Die Antwort stimmt, die Begruendung waere
    // eine andere - das steht dann ausdruecklich da.
    const donde = analyzeStress('dónde');
    expect(donde.ok && donde.stressedIndex).toBe(0);
    expect(donde.ok && donde.uncertain).toContain('Unterscheidung');
    expect(DIFFERENTIAL_ACCENTS).toContain('dónde');

    const casa = analyzeStress('casa');
    expect(casa.ok && casa.uncertain).toBeNull();
  });

  it('nennt bei einem einsilbigen Wort den einsilbigen Grund', () => {
    const dos = analyzeStress('dos');
    expect(dos.ok && dos.rule).toBe('monosyllable');
  });
});

describe('Die Regel gegen die Quelle (Pflicht 2)', () => {
  /**
   * Silbenzahl und betonte Silbe aus der engen Umschrift der Quelle.
   *
   * Wiktionary setzt **vor** der betonten Silbe keinen Punkt, sondern nur den
   * Betonungsstrich — der vertritt die Grenze mit. `[koˈmi.ð̞a]` sind deshalb
   * drei Silben, betont die zweite.
   */
  function fromSource(narrow: string): { count: number; stressed: number } {
    const parts = narrow
      .replace(/[[\]]/g, '')
      .replace(/ˈ/g, '.ˈ')
      .split('.')
      .filter(Boolean);
    return { count: parts.length, stressed: parts.findIndex((part) => part.includes('ˈ')) };
  }

  it('leitet für JEDEN Eintrag dieselbe Silbenzahl und Betonung her wie Wiktionary', () => {
    const abweichungen: string[] = [];
    for (const entry of VOCABULARY_ES) {
      const quelle = fromSource(entry.ipaSyllables!);
      const analysis = analyzeStress(entry.term);
      if (!analysis.ok) {
        abweichungen.push(`${entry.term}: ${analysis.reason}`);
        continue;
      }
      if (analysis.syllables.length !== quelle.count) {
        abweichungen.push(
          `${entry.term}: hergeleitet ${analysis.syllables.length} Silben, ` +
            `Quelle ${quelle.count} (${entry.ipaSyllables})`
        );
      } else if (analysis.stressedIndex !== quelle.stressed) {
        abweichungen.push(
          `${entry.term}: hergeleitet Silbe ${analysis.stressedIndex + 1}, ` +
            `Quelle ${quelle.stressed + 1} (${entry.ipaSyllables})`
        );
      }
    }
    // Wie in Phase 13 die 69 von 69: Die Liste muss leer sein, sonst waere die
    // Regel an dieser Stelle falsch und die Uebung wuerde sie trotzdem lehren.
    expect(abweichungen).toEqual([]);
    expect(VOCABULARY_ES.length).toBeGreaterThanOrEqual(70);
  });

  it('stimmt mit den abgelegten Silben überein — Daten und Regel driften nicht', () => {
    for (const entry of VOCABULARY_ES) {
      const analysis = analyzeStress(entry.term);
      expect(analysis.ok).toBe(true);
      if (!analysis.ok) continue;
      expect(analysis.syllables).toEqual(entry.syllables.map((syllable) => syllable.roman));
      expect(joinSyllables(analysis.syllables)).toBe(entry.romanization);
      expect(analysis.stressedIndex).toBe(
        entry.syllables.findIndex((syllable) => syllable.stressed)
      );
    }
  });

  it('nennt seine Quelle wörtlich', () => {
    expect(SPANISH_STRESS_SOURCE.retrieved).toBe('2026-09-04');
    expect(SPANISH_STRESS_SOURCE.quote).toContain('unequivocally');
    expect(SPANISH_STRESS_SOURCE.url).toContain('wikipedia.org');
  });
});
