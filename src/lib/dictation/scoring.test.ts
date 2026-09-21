import { DICTATION_CONFIG, dictationConfigFor } from '@/data/dictation-config';

import { ratingForScore, scoreDictation, stripLatinDiacritics } from './scoring';

/**
 * Tests für die Diktat-Bewertung.
 *
 * Die Thai-Sätze sind die echten Satzlesarten aus `data/sentence-tasks.ts`
 * (über `data/vocabulary.ts` quellengeprüft); an ihnen zeigt sich, was die
 * zweistufige Bewertung verspricht: Basisschrift und Tonzeichen werden
 * getrennt berichtet, und ein fehlendes Tonzeichen ist kein gleichgültiger
 * Tippfehler, aber auch nicht automatisch das ganze Diktat verloren.
 *
 * Die lateinischen Fälle prüfen die Sprachregeln aus
 * `data/dictation-config.ts`: Deutsch ohne case-folding (mit ß ≡ ss, aber
 * ä ≠ ae), Englisch/Spanisch mit, Französisch mit weichen Akzenten.
 */

const th = DICTATION_CONFIG.th;
const de = DICTATION_CONFIG.de;
const en = DICTATION_CONFIG.en;
const es = DICTATION_CONFIG.es;

// ---------------------------------------------------------------- Thai ----

describe('Thai — die zweistufige Bewertung', () => {
  const SATZ = 'ผม ไม่ กิน หมู'; // 8 Basiszeichen, 3 Ton-/Vokalzeichen (่ ิ ู)

  it('zählt ein korrektes Diktat als genau richtig', () => {
    const score = scoreDictation(SATZ, SATZ, th);
    expect(score.passed).toBe(true);
    expect(score.exact).toBe(true);
    expect(score.baseScore).toBe(100);
    expect(score.diacriticScore).toBe(100);
    expect(score.toneWarning).toBe(false);
    expect(score.message).toBeNull();
    expect(ratingForScore(score)).toBe(3);
  });

  it('macht die Lehrhilfen-Leerzeichen unbeachtlich — Thai trennt Wörter nicht', () => {
    const score = scoreDictation('ผมไม่กินหมู', SATZ, th);
    expect(score.exact).toBe(true);
    expect(score.passed).toBe(true);
  });

  it('verzeiht EIN fehlendes Tonzeichen als bestanden mit Warnung — und sagt es ehrlich', () => {
    // 2 von 3 Ton-/Vokalzeichen sitzen (67 % ≥ weiche Schwelle 50 %).
    const score = scoreDictation('ผม ไม กิน หมู', SATZ, th);
    expect(score.baseScore).toBe(100);
    expect(score.diacriticScore).toBe(67);
    expect(score.passed).toBe(true);
    expect(score.exact).toBe(false);
    expect(score.toneWarning).toBe(true);
    expect(score.message?.key).toBe('dictation.msgToneWarning');
    expect(ratingForScore(score)).toBe(2);
  });

  it('lässt ein FALSCHES Tonzeichen nicht still durchgehen, wohl aber weich', () => {
    const score = scoreDictation('ผม ไม้ กิน หมู', SATZ, th);
    expect(score.baseScore).toBe(100);
    expect(score.diacriticScore).toBe(67);
    expect(score.passed).toBe(true);
    expect(score.toneWarning).toBe(true);
    expect(ratingForScore(score)).toBe(2);
  });

  it('lässt ganz fehlende Tonzeichen nicht bestehen, obwohl die Basisschrift stimmt', () => {
    const score = scoreDictation('ผม ไม กน หม', SATZ, th);
    expect(score.baseScore).toBe(100);
    expect(score.diacriticScore).toBe(0);
    expect(score.passed).toBe(false);
    expect(score.toneWarning).toBe(false);
    expect(score.message?.key).toBe('dictation.msgToneMarksOff');
    expect(ratingForScore(score)).toBeNull();
  });

  it('zählt ั (U+0E31) zu den Diakritika, nicht zur Basisschrift', () => {
    const score = scoreDictation('ฉน ไป ตลาด', 'ฉัน ไป ตลาด', th);
    expect(score.baseScore).toBe(100);
    expect(score.diacriticScore).toBe(0);
    expect(score.passed).toBe(false);
  });

  it('besteht einen Konsonantenfehler im langen Satz knapp — und wertet ihn als Schwer', () => {
    // 12 Basiszeichen, 1 Fehler → 92 % ≥ 90 %.
    const score = scoreDictation('เรา ไป โรงเรียา', 'เรา ไป โรงเรียน', th);
    expect(score.baseScore).toBe(92);
    expect(score.passed).toBe(true);
    expect(score.exact).toBe(false);
    expect(ratingForScore(score)).toBe(2);
  });

  it('scheitert am selben Fehler im kurzen Satz — dort wiegt ein Zeichen schwerer', () => {
    // 8 Basiszeichen, 1 Fehler → 88 % < 90 %.
    const score = scoreDictation('คุณ กม อะไร', 'คุณ กิน อะไร', th);
    expect(score.baseScore).toBe(88);
    expect(score.passed).toBe(false);
    expect(ratingForScore(score)).toBeNull();
  });

  it('zeigt zu viel Getipptes als extra und lässt es die Punktzahl sinken', () => {
    const score = scoreDictation('ผม ไม่ กิน หมู ครับ', SATZ, th);
    expect(score.diff.some((token) => token.status === 'extra' && token.text === 'ครับ')).toBe(true);
    expect(score.baseScore).toBeLessThan(90);
    expect(score.passed).toBe(false);
  });

  it('meldet eine leere Eingabe, statt sie zu bewerten', () => {
    const score = scoreDictation('   ', SATZ, th);
    expect(score.empty).toBe(true);
    expect(score.passed).toBe(false);
    expect(score.message?.key).toBe('dictation.msgEmpty');
    expect(ratingForScore(score)).toBeNull();
  });

  it('ordnet die Diff-Stücke ehrlich: Zieltext mit Tonzeichen, Abweichung als typo', () => {
    const score = scoreDictation('ผม ไม กิน หมู', SATZ, th);
    const typo = score.diff.filter((token) => token.status === 'typo').map((t) => t.text).join('');
    expect(typo).toContain('่');
  });
});

// ------------------------------------------------------------- Deutsch ----

describe('Deutsch — Rechtschreibung zählt, aber das Ohr entscheidet mit', () => {
  it('toleriert Interpunktion und Kleinbuchstaben am Satzanfang', () => {
    const score = scoreDictation('ich mag Kaffee', 'Ich mag Kaffee.', de);
    expect(score.exact).toBe(true);
    expect(score.passed).toBe(true);
    expect(ratingForScore(score)).toBe(3);
  });

  it('lässt ein kleingeschriebenes Substantiv im Satzinneren NICHT durchgehen', () => {
    const score = scoreDictation('das essen ist gut', 'Das Essen ist gut.', de);
    expect(score.passed).toBe(false);
    expect(score.diff.some((token) => token.status === 'typo' && token.text === 'Essen')).toBe(true);
    expect(ratingForScore(score)).toBeNull();
  });

  it('gleicht ß und ss als gleichwertige Schreibungen', () => {
    const score = scoreDictation('Die Strasse ist alt.', 'Die Straße ist alt.', de);
    expect(score.exact).toBe(true);
    expect(score.passed).toBe(true);
  });

  it('glättet ä NICHT zu ae — Rechtschreibung zählt', () => {
    const score = scoreDictation('Ich moechte keinen Reis essen.', 'Ich möchte keinen Reis essen.', de);
    expect(score.exact).toBe(false);
    expect(score.baseScore).toBe(80);
    expect(score.passed).toBe(false);
  });

  it('nimmt einen Tippfehler im Wort durchs Fenster — als bestanden mit Abstrich', () => {
    const score = scoreDictation('Das Esssen ist gut.', 'Das Essen ist gut.', de);
    expect(score.passed).toBe(true);
    expect(score.exact).toBe(false);
    expect(score.typo).toBe(true);
    expect(score.diff.some((token) => token.status === 'typo')).toBe(true);
    expect(ratingForScore(score)).toBe(2);
  });

  it('lässt ein fehlendes verneinendes Wort nicht bestehen — es kehrt die Bedeutung um', () => {
    const score = scoreDictation('ich esse schweinefleisch', 'Ich esse kein Schweinefleisch.', de);
    // 2 von 4 Wörtern getroffen: das restliche Wort wird im Alignment gegen
    // „kein" substituiert, „Schweinefleisch" fehlt dann vollständig.
    expect(score.baseScore).toBe(50);
    expect(score.passed).toBe(false);
    expect(score.diff.some((token) => token.status === 'missing' && token.text === 'kein')).toBe(true);
    expect(ratingForScore(score)).toBeNull();
  });
});

// ------------------------------------------- Englisch / Spanisch / Frz. ----

describe('Lateinische Sprachen — case-folding, Akzente, Schwellen', () => {
  it('Englisch: faltet Groß-/Kleinschreibung und toleriert Interpunktion', () => {
    expect(scoreDictation('I DO NOT UNDERSTAND', 'I do not understand.', en).exact).toBe(true);
  });

  it('Englisch: bei genau 90 % Basisschrift besteht das Diktat (Schwellen-Test)', () => {
    // 10 Wörter, 1 verwechseltes → 90 %.
    const score = scoreDictation(
      'I would like a glass of juice please thank you',
      'I would like a glass of water please thank you',
      en
    );
    expect(score.baseScore).toBe(90);
    expect(score.passed).toBe(true);
    expect(ratingForScore(score)).toBe(2);
  });

  it('Englisch: bei 8 Wörtern und 1 Fehler reicht es nicht (88 % < 90 %)', () => {
    const score = scoreDictation(
      'I would like a glass of juice please',
      'I would like a glass of water please',
      en
    );
    expect(score.baseScore).toBe(88);
    expect(score.passed).toBe(false);
  });

  it('Spanisch: der Akut ist geschützt — hablo ist nicht habló', () => {
    const score = scoreDictation('hablo con madre', 'habló con madre', es);
    expect(score.baseScore).toBe(67);
    expect(score.passed).toBe(false);
    // Strikte Sprachen zählen Akzente bereits in der Basisschrift.
    expect(score.diacriticScore).toBe(100);
  });

  it('Spanisch: faltet Groß-/Kleinschreibung und räumt ¡! weg', () => {
    const score = scoreDictation('¡HOLA!', 'hola', es);
    expect(score.exact).toBe(true);
  });

  it('der Apostroph gehört nicht zur Hörbarkeit — dont für don\u0027t ist genau richtig', () => {
    expect(scoreDictation('dont stop', 'don\u0027t stop', en).exact).toBe(true);
  });

  it('meldet eine leere Eingabe auch auf Latein ehrlich', () => {
    const score = scoreDictation('', 'I do not understand.', en);
    expect(score.empty).toBe(true);
    expect(score.passed).toBe(false);
    expect(score.message?.key).toBe('dictation.msgEmpty');
  });

  it('zählt ein zusätzliches Wort als Fehler', () => {
    const score = scoreDictation('I do really not understand.', 'I do not understand.', en);
    expect(score.diff.some((token) => token.status === 'extra')).toBe(true);
    expect(score.baseScore).toBe(80);
    expect(score.passed).toBe(false);
  });
});

// ------------------------------------------------- Bewertung und Regeln ----

describe('Die FSRS-Abbildung', () => {
  it('vergibt nie Leicht und nur bei Bestehen eine Bewertung', () => {
    const scores = [
      scoreDictation('ผม ไม่ กิน หมู', 'ผม ไม่ กิน หมู', th),
      scoreDictation('ผม ไม กิน หมู', 'ผม ไม่ กิน หมู', th),
      scoreDictation('ผม ไม กน หม', 'ผม ไม่ กิน หมู', th),
      scoreDictation('', 'ผม ไม่ กิน หมู', th),
      scoreDictation('ich mag kaffee', 'Ich mag Kaffee.', de),
      scoreDictation('hablo con madre', 'habló con madre', es),
    ];
    for (const score of scores) {
      const rating = ratingForScore(score);
      expect(rating).not.toBe(4);
      if (!score.passed) expect(rating).toBeNull();
      else expect(rating === 2 || rating === 3).toBe(true);
    }
  });

  it('wirft bei leerkommentiertem Ziel, statt Unsinn zu bewerten', () => {
    expect(() => scoreDictation('etwas', '   ', de)).toThrow();
  });

  it('zieht Diakritika für den weichen Vergleich ab', () => {
    expect(stripLatinDiacritics('habló')).toBe('hablo');
  });
});

describe('Die Regeln stehen je Sprache an EINEM Ort', () => {
  it('Thai vergleicht zweistufig, alle Lateiner wortweise; Schwellen wie in der Spec', () => {
    expect(th.script).toBe('thai');
    for (const language of ['de', 'en', 'es'] as const) {
      expect(dictationConfigFor(language).script).toBe('latin');
    }
    expect(th.passThreshold).toBe(90);
    expect(th.diacriticThreshold).toBe(50);
    expect(de.eszettEquivalence).toBe(true);
    expect(de.foldCase).toBe(false);
    expect(en.foldCase).toBe(true);
  });

  it('wirft für eine Sprache ohne Regeln, statt still falsch zu glätten', () => {
    expect(() => dictationConfigFor('xx' as never)).toThrow();
  });
});

describe('Pflicht: offline — der Scoring-Pfad bleibt reine Rechnung', () => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const dir = __dirname;
  const quellen = fs
    .readdirSync(dir)
    .filter((name: string) => name.endsWith('.ts') && !name.endsWith('.test.ts'));

  it('enthält weder fetch noch Anbieter noch Schlüssel', () => {
    for (const name of quellen) {
      const quelltext = fs.readFileSync(path.join(dir, name), 'utf8');
      const codeOhneKommentare = quelltext
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect({ name, treffer: /fetch\s*\(/.test(codeOhneKommentare) }).toEqual({ name, treffer: false });
      expect({ name, treffer: /providers\//.test(codeOhneKommentare) }).toEqual({ name, treffer: false });
      expect({ name, treffer: /api-key/.test(codeOhneKommentare) }).toEqual({ name, treffer: false });
    }
  });
});
