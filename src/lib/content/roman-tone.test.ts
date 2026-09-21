import { tonAusRomanToken, tonfolgeAusRoman } from './roman-tone';

/**
 * Die Umschrift-Tonmarkierungen, gegen alle 2000 Katalogwörter kalibriert
 * (18.09., 3853/3907 Silben exakt; Rest Erzeuger-Inkonsistenzen). Die
 * Beispiele hier sind echte Katalog-Romanizations.
 */
describe('Tonfolge aus Paiboon-artiger Umschrift', () => {
  it('liest die fünf Töne über die Diakritika (echte Katalogwörter)', () => {
    expect(tonfolgeAusRoman('lung')).toEqual(['mid']);
    expect(tonfolgeAusRoman('sii-íu-kǎao')).toEqual(['mid', 'high', 'rising']); // ซีอิ๊วขาว
    expect(tonfolgeAusRoman('jàk-grà-yaan')).toEqual(['low', 'low', 'mid']);
    expect(tonfolgeAusRoman('sɔ̂ɔm')).toEqual(['falling']);
    expect(tonfolgeAusRoman('hâi')).toEqual(['falling']);
    expect(tonfolgeAusRoman('thá-hăan')).toEqual(['high', 'rising']);
    // Brevis statt Caron (Erzeuger-Variante, z. B. „hăan") ist ebenfalls steigend.
    expect(tonAusRomanToken('hăan')).toBe('rising');
    expect(tonAusRomanToken('khæ̂ŋ')).toBe('falling'); // æ ist Vokalbuchstabe
  });

  it('behandelt vorfertigte und kombinierende Zeichen gleich (NFD)', () => {
    expect(tonAusRomanToken('\u00E1')).toBe(tonAusRomanToken('a\u0301')); // á
    expect(tonAusRomanToken('a\u0301')).toBe('high');
    expect(tonAusRomanToken('a\u0300')).toBe('low');
    expect(tonAusRomanToken('a\u0302')).toBe('falling');
    expect(tonAusRomanToken('a\u030C')).toBe('rising');
    expect(tonAusRomanToken('khaao')).toBe('mid');
    // mʉʉ & Co.: ʉ ist Vokalbuchstabe der Umschrift, keine Ausnahme.
    expect(tonAusRomanToken('mʉʉ')).toBe('mid');
    expect(tonAusRomanToken('khʉ̂ʉn')).toBe('falling');
  });

  it('verweigert alles, was nicht eindeutig ist — kein geratener Ton', () => {
    expect(tonAusRomanToken('áà')).toBeNull(); // zwei verschiedene Markierungen
    expect(tonAusRomanToken('ng')).toBeNull(); // kein Vokalbuchstabe
    expect(tonAusRomanToken('')).toBeNull();
    expect(tonfolgeAusRoman('')).toBeNull();
    expect(tonfolgeAusRoman('   ')).toBeNull();
    expect(tonfolgeAusRoman('maa ńgo')).toBeNull(); // Markierung ohne Vokalbasis
  });
});
