import type { VocabEntry } from '@/data/vocab-types';

import { baueVocabPruefPrompt, gegenStueck, parseUrteil, pruefeVocabKreuz } from './kreuzpruefung';

const vocab = {
  id: 'ki-th-abc12345',
  language: 'th',
  concept: 'ki-th-abc12345',
  term: 'ตลาดน้ำ',
  romanization: 'ta-laat-nam',
  german: 'Schwimmender Markt',
  partOfSpeech: 'noun',
  register: 'neutral',
  isConcrete: true,
  sourceVerified: false,
  verificationNote: 'KI-Erzeugung',
  syllables: [
    { roman: 'ta-la-at', tone: 'low' },
    { roman: 'nam', tone: 'high' },
  ],
  exampleTerm: 'ผมไปตลาดน้ำ',
  exampleRoman: 'phǒm bpai ta-laat-nam',
  exampleGerman: 'Ich gehe zum Schwimmenden Markt.',
} as unknown as VocabEntry;

const client = (urteil: string) => ({
  provider: 'gemini' as const,
  model: 'test',
  complete: async () => ({ text: urteil, model: 'test' }),
});

const keyImmer = () => () => true;

describe('gegenStück — der jeweils andere Anbieter prüft', () => {
  it('wählt Gemini ↔ ChatGPT kreuzweise', () => {
    const a = gegenStueck('gemini', keyImmer());
    expect(a.anbieter).toBe('chatgpt');
    expect(a.selbstpruefung).toBe(false);
    const b = gegenStueck('chatgpt', keyImmer());
    expect(b.anbieter).toBe('gemini');
  });

  it('fällt in die Selbstprüfung, wenn der Schlüssel des anderen fehlt', () => {
    const { anbieter, selbstpruefung } = gegenStueck('gemini', (p) => p !== 'chatgpt');
    expect(anbieter).toBe('gemini');
    expect(selbstpruefung).toBe(true);
  });
});

describe('parseUrteil', ()=> {
  it('liest bestehen/mangel samt Gründen, auch mit Code-Zaun', () => {
    expect(parseUrteil('```json\n{"urteil":"bestehen","gruende":[]}\n```')).toEqual({
      bestanden: true, gruende: [],
    });
    const mangel = parseUrteil('{"urteil":"mangel","gruende":["Ton falsch"]}');
    expect(mangel.bestanden).toBe(false);
    expect(mangel.gruende).toEqual(['Ton falsch']);
  });

  it('wirft bei kaputter Antwort', () => {
    expect(() => parseUrteil('kein json')).toThrow();
  });
});

describe('baueVocabPruefPrompt — Stufe optional', () => {
  it('nennt mit Stufe die übliche Stufen-Passung', () => {
    const prompt = baueVocabPruefPrompt(vocab, 'A1');
    expect(prompt).toContain('5. Stufe A1');
  });

  it('prüft ohne Stufe die Passung (Häufigkeit) statt einer Niveaustufe', () => {
    // Nutzerwunsch 15.09.: die Wortschatz-Ziele laufen ohne CEFR-Stufen —
    // der Prüfer darf dann keine Stufe behaupten, die es nicht gibt.
    const prompt = baueVocabPruefPrompt(vocab, undefined);
    expect(prompt).toContain('hochfrequenter Alltagsbegriff');
    expect(prompt).not.toContain('Stufe undefined');
  });
});

describe('prüfeVocabKreuz — die Fallback-Regel', () => {
  it('echte Kreuzprüfung bestanden → geprüft', async () => {
    const resultat = await pruefeVocabKreuz(
      vocab, 'A1', 'gemini', keyImmer(),
      (anbieter) => client('{"urteil":"bestehen","gruende":[]}') as never
    );
    expect(resultat.geprueft).toBe(true);
    expect(resultat.kreuz).toBe(true);
  });

  it('Kreuzprüfung mangel → nicht geprüft mit Gründen', async () => {
    const resultat = await pruefeVocabKreuz(
      vocab, 'A1', 'gemini', keyImmer(),
      () => client('{"urteil":"mangel","gruende":["Übersetzung schief"]}') as never
    );
    expect(resultat.geprueft).toBe(false);
    expect(resultat.gruende).toContain('Übersetzung schief');
  });

  it('Selbstprüfung braucht zwei bestandene Durchläufe und bleibt „einfach geprüft"', async () => {
    let aufrufe = 0;
    const resultat = await pruefeVocabKreuz(
      vocab, 'A1', 'gemini', (p) => p !== 'chatgpt',
      (anbieter) => {
        aufrufe += 1;
        return client('{"urteil":"bestehen","gruende":[]}') as never;
      }
    );
    expect(aufrufe).toBe(2);
    expect(resultat.kreuz).toBe(false);
    expect(resultat.geprueft).toBe(false); // „einfach geprüft" ≠ kreuzgeprüft
    expect(resultat.urteile.length).toBe(2);
  });

  it('Selbstprüfung: erster Durchlauf mangel genügt zur Ablehnung', async () => {
    const resultat = await pruefeVocabKreuz(
      vocab, 'A1', 'gemini', (p) => p !== 'chatgpt',
      () => client('{"urteil":"mangel","gruende":["Feld fehlt"]}') as never
    );
    expect(resultat.geprueft).toBe(false);
    expect(resultat.urteile.length).toBe(1);
  });
});
