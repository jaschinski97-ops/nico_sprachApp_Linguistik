import type { VocabEntry } from '@/data/vocab-types';

import { baueVocabPruefPrompt, gegenStueck, parseUrteil, parseUrteile, pruefeVocabKreuz, pruefeVocabKreuzBatch } from './kreuzpruefung';

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

  it('NUTZERWAHL schlägt die Kreuzregel — und Wahl = Erzeuger ist Selbstprüfung', () => {
    // Der Prüfer ist der HINTERLEGTE, nicht automatisch der andere.
    const a = gegenStueck('gemini', keyImmer(), 'gemini');
    expect(a.anbieter).toBe('gemini');
    expect(a.selbstpruefung).toBe(true);
    const b = gegenStueck('gemini', keyImmer(), 'chatgpt');
    expect(b.anbieter).toBe('chatgpt');
    expect(b.selbstpruefung).toBe(false);
    // Fehlt dem gewählten Prüfer der Schlüssel, greift die Kreuzregel weiter.
    const c = gegenStueck('gemini', (p) => p === 'gemini', 'chatgpt');
    expect(c.anbieter).toBe('gemini');
    expect(c.selbstpruefung).toBe(true);
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

describe('parseUrteile — Paket-Urteile', () => {
  it('liest die Batch-Form je index und ergänzt Fehlende als Mangel', () => {
    const roh = JSON.stringify({
      urteile: [
        { index: 1, urteil: 'bestehen', gruende: [] },
        { index: 0, urteil: 'mangel', gruende: ['Ton falsch'] },
      ],
    });
    const urteile = parseUrteile(roh, 3);
    expect(urteile[0].bestanden).toBe(false);
    expect(urteile[1].bestanden).toBe(true);
    // Index 2 fehlt in der Antwort — fail-closed, nicht erraten.
    expect(urteile[2].bestanden).toBe(false);
    expect(urteile[2].gruende[0]).toMatch(/Kein Urteil/);
  });

  it('versteht die Einzelform als Paket von eins', () => {
    const urteile = parseUrteil.length >= 0 ? parseUrteile('{"urteil":"bestehen","gruende":[]}', 1) : [];
    expect(urteile).toHaveLength(1);
    expect(urteile[0].bestanden).toBe(true);
  });
});

describe('pruefeVocabKreuzBatch — Paketprüfung', () => {
  const zweit = { ...vocab, term: 'zweiter Begriff' } as unknown as VocabEntry;
  const batchClient = (urteile: unknown) => () => ({
    provider: 'gemini' as const,
    model: 'test',
    complete: async () => ({ text: JSON.stringify({ urteile }), model: 'test' }),
  });

  it('rettet ein mittig abgebrochenes Paket und füllt Fehlende fail-closed auf', () => {
    // Exakt der Lauf-Fehler vom 15.09.: „Unterminated string" in der PRÜF-
    // Antwort — die vollständigen Urteile müssen trotzdem verwertet werden.
    const roh =
      '{"urteile": [{"index": 0, "urteil": "bestehen", "gruende": []}, {"index": 1, "urteil": "mangel", "gruende": ["Ton falsch"]}, {"index": 2, "ur';
    const urteile = parseUrteile(roh, 3);
    expect(urteile[0].bestanden).toBe(true);
    expect(urteile[1].bestanden).toBe(false);
    // Das halbe dritte Urteil ist weg → fail-closed, nicht geraten.
    expect(urteile[2].gruende[0]).toMatch(/Kein Urteil/);
  });

  it('prüft ein Paket mit gemischten Urteilen in EINEM Aufruf', async () => {
    let aufrufe = 0;
    const resultate = await pruefeVocabKreuzBatch(
      [vocab, zweit], undefined, 'gemini', keyImmer(),
      () => {
        aufrufe += 1;
        return batchClient([
          { index: 0, urteil: 'bestehen', gruende: [] },
          { index: 1, urteil: 'mangel', gruende: ['Übersetzung schief'] },
        ])() as never;
      }
    );
    expect(aufrufe).toBe(1);
    expect(resultate[0].geprueft).toBe(true);
    expect(resultate[1].geprueft).toBe(false);
    expect(resultate[1].gruende).toContain('Übersetzung schief');
  });

  it('Selbstprüfung: die zweite Runde läuft nur über die Bestandenen', async () => {
    let aufrufe = 0;
    const resultate = await pruefeVocabKreuzBatch(
      [vocab, zweit], undefined, 'gemini', (p) => p !== 'chatgpt',
      () => {
        aufrufe += 1;
        // Beide Runden bestehen beide Einträge — die zweite Runde geht über
        // das Paket der Bestandenen (hier: beide), also GENUG zwei Aufrufe.
        return batchClient([
          { index: 0, urteil: 'bestehen', gruende: [] },
          { index: 1, urteil: 'bestehen', gruende: [] },
        ])() as never;
      }
    );
    expect(aufrufe).toBe(2);
    expect(resultate.every((r) => r.kreuz === false && r.geprueft === false)).toBe(true);
    expect(resultate.every((r) => r.urteile.length === 2)).toBe(true);
  });

  it('wiederholt das Paket einmal, wenn die erste Prüf-Antwort kaputt ist', async () => {
    let aufrufe = 0;
    const resultate = await pruefeVocabKreuzBatch(
      [vocab], undefined, 'gemini', keyImmer(),
      () => ({
        provider: 'gemini' as const,
        model: 'test',
        complete: async () => {
          aufrufe += 1;
          if (aufrufe === 1) {
            return { text: '{"urteile": [{"index": 0, "urteil": "bes', model: 'test' };
          }
          return { text: JSON.stringify({ urteile: [{ index: 0, urteil: 'bestehen', gruende: [] }] }), model: 'test' };
        },
      }) as never
    );
    expect(aufrufe).toBe(2);
    expect(resultate[0].geprueft).toBe(true);
  });

  it('die alte Einzelfunktion leitet weiter und bleibt kompatibel', async () => {
    const resultat = await pruefeVocabKreuz(
      vocab, undefined, 'gemini', keyImmer(),
      () => batchClient([{ index: 0, urteil: 'mangel', gruende: ['Feld fehlt'] }])() as never
    );
    expect(resultat.geprueft).toBe(false);
    expect(resultat.gruende).toContain('Feld fehlt');
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
