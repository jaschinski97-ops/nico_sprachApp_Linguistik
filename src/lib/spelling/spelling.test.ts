import { VOCABULARY_EN } from '@/test-fixtures/legacy-vocabulary';

import { LANGUAGES } from '../languages/registry';

import { graphemeGroups, groupFor, highlight } from './graphemes';

/**
 * Das englische Merkmal (Phase 16).
 *
 * WAS HIER BELEGT WERDEN MUSS, ist nicht eine Regel — es ist die
 * **Abwesenheit** einer Regel. AE-44 stützt sich auf den Satz, die Aussprache
 * mancher Buchstabenfolgen sei „unpredictable even for educated native
 * speakers". Wenn das stimmt, muss sich im eigenen Grundstock zeigen lassen,
 * dass dasselbe Schriftstück verschieden klingt. Genau das prüft diese Datei —
 * und zwar an Wörtern, deren Lautschrift aus der Quelle stammt, nicht aus
 * einer Behauptung.
 */

describe('Schriftstück-Gruppen', () => {
  it('findet mindestens drei Gruppen mit je mehreren Lesarten', () => {
    const groups = graphemeGroups();
    expect(groups.length).toBeGreaterThanOrEqual(3);
    for (const group of groups) expect(group.sounds.length).toBeGreaterThanOrEqual(2);
  });

  it('belegt ⟨ough⟩ als das Paradebeispiel der Quelle', () => {
    const ough = graphemeGroups().find((group) => group.grapheme === 'ough');
    expect(ough).toBeTruthy();
    // Vier Woerter, vier verschiedene Lesarten - im eigenen Grundstock, nicht
    // aus dem Wikipedia-Artikel abgeschrieben.
    expect(ough!.sounds.length).toBeGreaterThanOrEqual(4);
    expect(ough!.members.map((member) => member.entry.term).sort()).toEqual([
      'enough',
      'though',
      'thought',
      'through',
    ]);
  });

  it('führt auch ⟨ea⟩ und ⟨oo⟩ mit mehreren Lesarten', () => {
    const graphemes = graphemeGroups().map((group) => group.grapheme);
    expect(graphemes).toContain('ea');
    expect(graphemes).toContain('oo');
  });

  it('lässt keine Gruppe mit nur einer Lesart übrig', () => {
    // Eine solche Gruppe belegte nichts: Die Frage „wie klingt das hier?"
    // haette genau eine moegliche Antwort.
    for (const group of graphemeGroups()) {
      expect(new Set(group.sounds).size).toBe(group.sounds.length);
      expect(group.sounds.length).toBeGreaterThan(1);
    }
  });
});

describe('Die Lautangaben stammen aus der Lautschrift', () => {
  it('steht jeder angegebene Laut wörtlich in der Lautschrift seines Wortes', () => {
    // Die mechanische Gegenprobe: Ich habe die Lautschrift aus der Quelle
    // zerlegt, um zu sagen, wie ⟨ough⟩ in „enough" klingt. Wenn das Stueck
    // dort nicht vorkommt, ist die Zerlegung falsch.
    const fehler: string[] = [];
    for (const entry of VOCABULARY_EN) {
      const spelling = entry.englishSpelling;
      if (!spelling) continue;
      const kern = spelling.sound.replace(/\//g, '');
      if (!entry.ipa || !entry.ipa.includes(kern)) {
        fehler.push(`${entry.term}: ${spelling.sound} steht nicht in ${entry.ipa}`);
      }
      if (!entry.term.toLowerCase().includes(spelling.grapheme)) {
        fehler.push(`${entry.term}: ⟨${spelling.grapheme}⟩ steht nicht im Wort`);
      }
    }
    expect(fehler).toEqual([]);
  });

  it('nennt zu jeder Lautschrift die Aussprachevariante der Quelle', () => {
    for (const entry of VOCABULARY_EN) {
      expect(entry.ipa).toBeTruthy();
      expect(entry.ipaAccent).toBeTruthy();
    }
  });

  it('bevorzugt die britische Standardlage, passend zur Sprachausgabe', () => {
    const rp = VOCABULARY_EN.filter((entry) => (entry.ipaAccent ?? '').includes('RP'));
    // Kein Zwang - wo die Quelle keine RP-Zeile fuehrt, steht die allgemeine.
    // Aber die Mehrheit soll RP sein, sonst passt die Lautschrift nicht zur
    // Stimme, die die App spricht.
    expect(rp.length).toBeGreaterThan(VOCABULARY_EN.length / 2);
    expect(LANGUAGES.en.speechLocale).toBe('en-GB');
  });
});

describe('Hervorhebung im Wort', () => {
  it('zerlegt das Wort um das Schriftstück herum', () => {
    expect(highlight('enough', 'ough')).toEqual({ before: 'en', hit: 'ough', after: '' });
    expect(highlight('bread', 'ea')).toEqual({ before: 'br', hit: 'ea', after: 'd' });
  });

  it('kommt in diesem Grundstock in jedem Wort genau einmal vor', () => {
    // Der stumpfe „erstes Vorkommen"-Ansatz traegt nur, solange das gilt.
    for (const entry of VOCABULARY_EN) {
      const spelling = entry.englishSpelling;
      if (!spelling) continue;
      const treffer = entry.term.toLowerCase().split(spelling.grapheme).length - 1;
      expect(treffer).toBe(1);
    }
  });

  it('gibt bei einem Wort ohne das Schriftstück nichts zurück', () => {
    expect(highlight('casa', 'ough')).toEqual({ before: 'casa', hit: '', after: '' });
  });
});

describe('Zuordnung Wort zu Gruppe', () => {
  it('findet zu jedem markierten Wort seine Gruppe', () => {
    for (const entry of VOCABULARY_EN) {
      if (!entry.englishSpelling) continue;
      expect(groupFor(entry)).toBeTruthy();
    }
  });

  it('gibt für ein Wort ohne Markierung null zurück', () => {
    const casa = VOCABULARY_EN.find((entry) => !entry.englishSpelling)!;
    expect(groupFor(casa)).toBeNull();
  });
});
