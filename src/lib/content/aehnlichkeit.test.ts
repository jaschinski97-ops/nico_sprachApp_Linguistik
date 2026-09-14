import { ConversationSituation } from '../conversation/types';
import { AEHNLICHKEITSSCHWELLE, aehnlichkeit, findeDuplikat, jaccard, normalisiereDialogText, wortMenge } from './aehnlichkeit';

const szene = (germans: string[], id = 's'): ConversationSituation =>
  ({
    id,
    level: 'A1',
    topic: 'market',
    direction: 'de_to_th',
    title: 'S',
    setting: '',
    scriptTurns: germans.map((german, i) => ({
      speaker: i % 2 === 0 ? 'partner' : 'learner',
      thai: 'x',
      roman: '',
      german,
    })),
    corrections: [],
    generatedAt: 0,
    modelUsed: 't',
  }) as unknown as ConversationSituation;

describe('Normalisierung und Jaccard', () => {
  it('ignoriert Groß-/Kleinschreibung und Satzzeichen', () => {
    expect(normalisiereDialogText('Hallo, Welt!')).toBe('hallo welt');
    expect(jaccard(wortMenge('Hallo, Welt!'), wortMenge('hallo welt'))).toBe(1);
  });

  it('leere Mengen sind identisch', () => {
    expect(jaccard(wortMenge(''), wortMenge('  '))).toBe(1);
  });
});

describe('findeDuplikat — gleiche oder fast gleiche Situationen', () => {
  const bestand = [
    szene(['Hallo, wie geht es Ihnen?', 'Mir geht es gut, danke!'], 'original'),
    szene(['Ich möchte den Reis mit Huhn'], 'anders'),
  ];

  it('erkennt fast gleiche Situationen trotz anderem Wortlaut', () => {
    const doppelt = szene(['Hallo, wie geht es Ihnen?', 'Mir geht es gut, danke'], 'kopie');
    const fund = findeDuplikat(doppelt, bestand);
    expect(fund?.situation.id).toBe('original');
    expect(fund!.aehnlichkeit).toBeGreaterThanOrEqual(AEHNLICHKEITSSCHWELLE);
  });

  it('lässt echte neue Situationen durch', () => {
    const neu = szene(['Der Zug nach Chiang Mai fährt um neun Uhr']);
    expect(findeDuplikat(neu, bestand)).toBeNull();
  });

  it('misst Ähnlichkeit deterministisch', () => {
    const a = szene(['Ein Apfel und eine Birne'], 'a');
    const b = szene(['Ein Apfel und eine Birne'], 'b');
    expect(aehnlichkeit(a, b)).toBe(1);
  });
});
