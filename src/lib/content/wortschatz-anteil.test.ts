import { ConversationSituation } from '../conversation/types';
import { bekannterAnteil, durchschnittsAnteil } from './wortschatz-anteil';
import type { VocabEntry } from '@/data/vocab-types';

const pool = [
  { german: 'Ich gehe zum Markt', term: '', romanization: '', id: 'a', language: 'th' },
  { german: 'Kaffee', term: '', romanization: '', id: 'b', language: 'th' },
] as unknown as VocabEntry[];

const szene = (germans: string[]): ConversationSituation =>
  ({
    id: 's',
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

describe('bekannterAnteil — Wörter des Dialogs gegen den Pool', () => {
  it('zählt Wörter als bekannt, die im Grundstock liegen', () => {
    const { quote } = bekannterAnteil(
      szene(['Ich gehe zum Markt und trinke Kaffee', 'Kaffee ist gut']),
      pool
    );
    // Wörter: ich gehe zum markt und trinke kaffee kaffee ist gut = 10
    // bekannt: Pool „Ich gehe zum Markt" liefert ich/gehe/zum/markt + kaffee×2 = 6
    expect(quote).toBeCloseTo(6 / 10, 5);
  });

  it('liefert bei leerem Dialog eine vollständige Quote', () => {
    expect(durchschnittsAnteil([], pool)).toBe(1);
  });

  it('mittelt über mehrere Szenen', () => {
    const quote = durchschnittsAnteil(
      [szene(['Ich gehe zum Markt']), szene(['völlig fremdes Zeug hier'])],
      pool
    );
    // Szene 1: 4/4 bekannt (Pool-Eintrag „Ich gehe zum Markt" deckt alle).
    // Szene 2: 0/3. Der Mittelwert gewichtet Szenen gleich.
    expect(quote).toBeCloseTo((4 / 4 + 0 / 3) / 2, 5);
  });
});
