import { UI_LANGUAGES } from '../i18n/types';
import { TextClient } from '../providers/types';

import { createSituationClient, parseSituation } from './generator';
import { SituationSpec } from './types';

const spec: SituationSpec = {
  id: 'greeting-A1-de_to_th-001',
  direction: 'de_to_th',
  level: 'A1',
  topic: 'greeting',
  variant: 1,
} as SituationSpec;

/** Vollständige, gültige Modell-Antwort (20 App-Sprachen, Thai-Zieltext). */
function gueltigesJson(): string {
  return JSON.stringify({
    title: 'Begrüßung',
    setting: 'Auf der Straße',
    scriptTurns: [
      { speaker: 'partner', targetText: 'สวัสดีครับ', thai: 'สวัสดีครับ', roman: 'sà-wàt-dee khráp', german: 'Guten Tag.' },
      { speaker: 'learner', targetText: 'สวัสดีค่ะ', thai: 'สวัสดีค่ะ', roman: 'sà-wàt-dee khâ', german: 'Guten Tag (Antwort).' },
    ],
    corrections: [
      { issue: 'Höflichkeitspartikel', explanation: 'khráp für Sprecher, khâ für Sprecherinnen.' },
    ],
    translations: Object.fromEntries(
      UI_LANGUAGES.map((code) => [
        code,
        {
          title: 'Begrüßung',
          setting: 'Auf der Straße',
          turns: ['Guten Tag.', 'Guten Tag (Antwort).'],
          corrections: [{ issue: 'Höflichkeitspartikel', explanation: '…' }],
        },
      ])
    ),
  });
}

function clientMit(antworten: string[]): { client: TextClient; complete: jest.Mock } {
  const complete = jest.fn(async () => ({ text: antworten.shift() ?? '', model: 'test' }));
  return { client: { provider: 'gemini', model: 'test', complete } as unknown as TextClient, complete };
}

describe('parseSituation — Antwortformen (17.09.: Nutzer-Lauf verlor 3 von 4 an „kein gültiges JSON“)', () => {
  it('verträgt Prosa vor und nach dem JSON-Objekt', () => {
    const raw = `Natürlich, hier ist die gewünschte Situation:\n${gueltigesJson()}\nIch hoffe, das passt — gern passe ich das Niveau an.`;
    const situation = parseSituation(raw, spec, 'test');
    expect(situation.id).toBe(spec.id);
    expect(situation.scriptTurns).toHaveLength(2);
  });

  it('verträgt weiterhin Code-Zäune', () => {
    const raw = '```json\n' + gueltigesJson() + '\n```';
    expect(parseSituation(raw, spec, 'test').title).toBe('Begrüßung');
  });

  it('verwirft echte Nicht-JSON-Antworten weiter', () => {
    expect(() => parseSituation('Ich kann dazu leider nichts liefern.', spec, 'test')).toThrow(
      /kein gültiges JSON/
    );
  });
});

describe('createSituationClient — ein Wiederholungsversuch je Situation', () => {
  it('holt die Situation beim zweiten Aufruf, wenn die erste Antwort Müll war', async () => {
    const { client, complete } = clientMit(['Hier ist Ihr Dialog als Tabelle: …', gueltigesJson()]);
    const situation = await createSituationClient(client).generate(spec);
    expect(situation.id).toBe(spec.id);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('gibt nach dem Wiederholungsversuch auf und nennt den letzten Fehler', async () => {
    const { client, complete } = clientMit(['kein json', 'auch kein json']);
    await expect(createSituationClient(client).generate(spec)).rejects.toThrow(/kein gültiges JSON/);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('bezahlt Fehler VOR einer Antwort (Netz, Schlüssel) nicht doppelt', async () => {
    const complete = jest
      .fn()
      .mockRejectedValueOnce(new Error('HTTP 500'))
      .mockResolvedValue({ text: gueltigesJson(), model: 'test' });
    const client = { provider: 'gemini', model: 'test', complete } as unknown as TextClient;
    await expect(createSituationClient(client).generate(spec)).rejects.toThrow('HTTP 500');
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
