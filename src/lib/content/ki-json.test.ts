import { listeAusAntwort } from './ki-json';

describe('listeAusAntwort — KI-Antworten lesen und retten', () => {
  it('liest eine vollständige Antwort direkt, auch mit Code-Zaun', () => {
    const direkt = listeAusAntwort('{"woerter": [{"term": "a"}, {"term": "b"}]}');
    expect(direkt.abgeschnitten).toBe(false);
    expect(direkt.woerter).toHaveLength(2);

    const gezaunt = listeAusAntwort('```json\n{"woerter": [{"term": "a"}]}\n```');
    expect(gezaunt.abgeschnitten).toBe(false);
    expect(gezaunt.woerter).toHaveLength(1);
  });

  it('wirft bei einer vollständigen Antwort ohne woerter-Liste', () => {
    expect(() => listeAusAntwort('{"etwas": []}')).toThrow(/keine "woerter"-Liste/);
  });

  it('rettet vollständige Einträge aus einer am Token-Limit abgeschnittenen Antwort', () => {
    // Exakt der Fehler aus dem ersten Kettenlauf: „Unterminated string" —
    // das letzte Objekt bricht mitten im String ab.
    const abgeschnitten =
      '{"woerter": [{"term": "a", "german": "A"}, {"term": "b", "german": "B"}, {"term": "c", "ger';
    const gerettet = listeAusAntwort(abgeschnitten);
    expect(gerettet.abgeschnitten).toBe(true);
    expect(gerettet.woerter).toHaveLength(2);
  });

  it('rettet auch, wenn ein verschachteltes Objekt halb offen blieb', () => {
    const abgeschnitten =
      '{"woerter": [{"term": "a", "spanishNoun": {"gender": "m"}}, {"term": "b", "spanishNoun": {"gender": "f", "art';
    const gerettet = listeAusAntwort(abgeschnitten);
    expect(gerettet.abgeschnitten).toBe(true);
    expect(gerettet.woerter).toHaveLength(1);
  });

  it('rettet auch, wenn vor dem JSON noch Text steht', () => {
    const abgeschnitten =
      'Hier ist die Liste:\n{"woerter": [{"term": "a"}, {"term": "b';
    const gerettet = listeAusAntwort(abgeschnitten);
    expect(gerettet.abgeschnitten).toBe(true);
    expect(gerettet.woerter).toHaveLength(1);
  });

  it('wirft mit Handlungshinweis, wenn nichts zu retten ist', () => {
    expect(() => listeAusAntwort('{"woerter": [ {"ter')).toThrow(/nicht retten/);
    expect(() => listeAusAntwort('gar kein json')).toThrow();
  });
});
