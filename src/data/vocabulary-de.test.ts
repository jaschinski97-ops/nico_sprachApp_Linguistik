import { VOCABULARY, findVocab, vocabularyFor } from './vocabulary';
import { VOCABULARY_AR } from './vocabulary-ar';
import { VOCABULARY_DE } from './vocabulary-de';

/**
 * Der abgeleitete deutsche Ziel-Pool (Nutzerentscheidung 10.09., „Füge noch
 * Deutsch zum Generieren hinzu"): Eine Zeile je BEGRIFF, abgeleitet aus den
 * `german`-Feldern des geprüften Bestands. Der Test rechnet die Erwartung
 * unabhängig aus denselben Quellen — er sichert die Regeln der Ableitung,
 * nicht ihre Wiederholung.
 */
describe('VOCABULARY_DE (abgeleiteter de-Pool)', () => {
  it('deckt genau die Begriffe ab, die en/es- und ar-Pool koppeln', () => {
    const erwartet = new Set<string>();
    for (const entry of [...vocabularyFor('en'), ...vocabularyFor('es'), ...VOCABULARY_AR]) {
      if (entry.concept) erwartet.add(entry.concept);
    }
    expect(VOCABULARY_DE).toHaveLength(erwartet.size);
    expect(new Set(VOCABULARY_DE.map((entry) => entry.id))).toEqual(erwartet);
    // Dedup je Begriff: die Pool-ID ist die Begriffs-ID.
    expect(new Set(VOCABULARY_DE.map((entry) => entry.id)).size).toBe(VOCABULARY_DE.length);
    // Und der Umfang ist der volle Ankerbestand (84 Begriffe).
    expect(VOCABULARY_DE.length).toBe(84);
  });

  it('trägt je Begriff den deutschen Text des geprüften Ankers', () => {
    for (const entry of VOCABULARY_DE) {
      const concept: string = entry.concept!;
      const anker = findVocab(concept);
      expect(anker).toBeDefined();
      expect(entry.term).toBe(anker!.german);
      expect(entry.term.trim()).not.toBe('');
    }
  });

  it('hält die Zielform rein: keine Anker-Umschrift, kein Anker-Beispiel', () => {
    // Die Beispiele/Umschriften gehören zur ANKER-Sprache (Thai) und würden
    // auf einer deutschen Karte falsch angezeigt.
    for (const entry of VOCABULARY_DE) {
      expect(entry.romanization).toBe('');
      expect(entry.syllables).toEqual([]);
      expect(entry.exampleTerm).toBeUndefined();
      expect(entry.tone).toBeUndefined();
      // Die deutsche Grammatik bleibt: Genus/Stammformen gehören zum Wort.
      const concept: string = entry.concept!;
      if (findVocab(concept)?.germanNoun) {
        expect(entry.germanNoun).toBeDefined();
      }
    }
  });

  it('fließt NICHT in den Bestand — Deutsch ist Ziel, nicht Ziel-Grundstock', () => {
    // `VOCABULARY`/`vocabularyFor` bleiben die Bestandsschranke: Der de-Pool
    // lebt nur im ar_to_de-Pfad und als Studio-Quelle, wird also nie
    // eingespeichert und verfälscht keinen Sprachfilter.
    expect(VOCABULARY).toHaveLength(
      vocabularyFor('th').length + vocabularyFor('en').length + vocabularyFor('es').length
    );
    for (const entry of VOCABULARY) {
      expect(entry.language).not.toBe('de');
    }
  });
});
