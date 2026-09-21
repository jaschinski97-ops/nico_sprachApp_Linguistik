import tabelle from './english-irregular-verbs.json';

/**
 * Die kuratierte Tabelle unregelmäßiger englischer Verben (18.09.2026).
 * Sie trägt englishVerb an den generierten EN-Wortschatz (scripts/content/
 * fill-english-verb.cjs) — die Übungen „Unregelmäßige Verben" und „Dritte
 * Form" prüfen genau diese Formen. Der Test sichert die Form des Verzeichnisses,
 * nicht die Sprachkenntnisse: Jede Zeile braucht zwei echte Formen.
 */

const eintraege = Object.entries(tabelle).filter(([key]) => !key.startsWith('_'));

test('die Tabelle ist ein substanzieller Kernbestand unregelmäßiger Verben', () => {
  expect(eintraege.length).toBeGreaterThanOrEqual(110);
  // Die häufigsten unregelmäßigen Verben müssen vertreten sein — fehlt eines,
  // hat jemand versehentlich gelöscht, und der Füll-Lauf findet nichts mehr.
  for (const pflicht of ['be', 'go', 'have', 'do', 'make', 'take', 'come', 'see', 'know', 'write', 'give', 'eat', 'speak', 'understand']) {
    expect(Object.keys(tabelle)).toContain(pflicht);
  }
});

test('jedes Verb trägt zwei nicht-leere Formen (past, participle)', () => {
  for (const [infinitiv, formen] of eintraege) {
    expect(Array.isArray(formen)).toBe(true);
    expect(formen).toHaveLength(2);
    for (const form of formen) {
      expect(typeof form).toBe('string');
      expect(form.trim().length).toBeGreaterThan(0);
    }
    // Die Formen sind Kleinschreibung wie der Bestand (Match über toLowerCase).
    expect(infinitiv).toBe(infinitiv.toLowerCase());
  }
});

test('bekannte Kernformen stehen korrekt — Stichproben gegen die Schul-Standardformen', () => {
  expect(tabelle.go).toEqual(['went', 'gone']);
  expect(tabelle.write).toEqual(['wrote', 'written']);
  expect(tabelle.understand).toEqual(['understood', 'understood']);
  expect(tabelle.bring).toEqual(['brought', 'brought']);
  expect(tabelle.swim).toEqual(['swam', 'swum']);
  // Einheitlich gewählte Standardform bei doppelten Formen (get → got/got,
  // learn → learnt/learnt): die Übung hat EINE richtige Antwort.
  expect(tabelle.get).toEqual(['got', 'got']);
});
