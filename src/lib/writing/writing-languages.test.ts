import { VOCABULARY_EN, VOCABULARY_ES } from '@/data/vocabulary';

import { NEW_CARDS_PER_SESSION } from '../fsrs/fsrs';
import { buildReviewQueue, ensureCardStates } from '../review-session';
import { seedVocabulary } from '../repository';
import { MemoryDataStore } from '../storage';

import { compareWriting, typoTolerance } from './compare';
import { buildWritingPrompt, canBuildWritingPrompt, writingCandidates } from './prompt';

/**
 * Die bestehenden Übungstypen für die neuen Paare (Phase 16, Pflicht 4).
 *
 * Karteikasten und freies Schreiben waren auf `th_to_de` und `de_to_th`
 * verdrahtet — nicht im Verhalten, sondern in den Literalen. Diese Datei prüft,
 * dass beide für Englisch und Spanisch dasselbe tun, und dass dabei **keine
 * fremde Sprache** in die Sitzung gerät.
 */

const T0 = Date.UTC(2026, 8, 4);

async function frischerSpeicher() {
  const store = new MemoryDataStore();
  await store.init();
  await seedVocabulary(store);
  return store;
}

describe('Der Karteikasten kennt beide neuen Paare', () => {
  it('legt je Sprache genau die Karten dieser Sprache an', async () => {
    const store = await frischerSpeicher();
    for (const [direction, liste] of [
      ['de_to_es', VOCABULARY_ES],
      ['en_to_de', VOCABULARY_EN],
    ] as const) {
      const { entries } = await ensureCardStates(direction, store, T0);
      expect(entries).toHaveLength(liste.length);
      expect(entries.every((entry) => entry.id.startsWith(direction.slice(0, 2) === 'de' ? direction.slice(6) : direction.slice(0, 2)))).toBe(true);
    }
  });

  it('füllt die Warteschlange beider Richtungen einer neuen Sprache', async () => {
    const store = await frischerSpeicher();
    const hin = await buildReviewQueue('de_to_es', store, T0);
    const zurueck = await buildReviewQueue('es_to_de', store, T0);
    // Neue Karten sind auf NEW_CARDS_PER_SESSION je Zusammenstellung gedeckelt
    // (siehe dueCards) - entscheidend ist hier die Sprach-Reinheit, nicht die
    // volle Grundstock-Laenge.
    expect(hin.length).toBe(NEW_CARDS_PER_SESSION);
    expect(zurueck.length).toBe(NEW_CARDS_PER_SESSION);
    for (const item of hin) expect(item.entry.language).toBe('es');
  });

  it('hält die Sprachen in getrennten Karten auseinander', async () => {
    const store = await frischerSpeicher();
    await ensureCardStates('de_to_th', store, T0);
    await ensureCardStates('de_to_es', store, T0);
    const cards = await store.getAll<{ vocabId: string; direction: string }>('cards');
    const thai = cards.filter((card) => card.direction === 'de_to_th');
    const spanisch = cards.filter((card) => card.direction === 'de_to_es');
    expect(thai).toHaveLength(84);
    expect(spanisch).toHaveLength(VOCABULARY_ES.length);
    // Kein Kartenschluessel taucht in beiden Mengen auf.
    const thaiIds = new Set(thai.map((card) => card.vocabId));
    for (const card of spanisch) expect(thaiIds.has(card.vocabId)).toBe(false);
  });
});

describe('Freies Schreiben in beide Richtungen der neuen Paare', () => {
  it('fragt in „Deutsch → X" nach der Zielsprache', () => {
    const casa = VOCABULARY_ES.find((entry) => entry.id === 'es_casa')!;
    const prompt = buildWritingPrompt(casa, 'de_to_es');
    expect(prompt.language).toBe('es');
    expect(prompt.targets).toEqual(['casa']);
    expect(prompt.shown).toBe('das Haus');
  });

  it('fragt in „X → Deutsch" nach dem Deutschen, mit Artikel', () => {
    const house = VOCABULARY_EN.find((entry) => entry.id === 'en_house')!;
    const prompt = buildWritingPrompt(house, 'en_to_de');
    expect(prompt.language).toBe('de');
    expect(prompt.shown).toBe('house');
    expect(prompt.targets).toContain('das Haus');
    expect(prompt.extras.join(' ')).toContain('Häuser');
  });

  it('nimmt in eine Sitzung nur Vokabeln der eigenen Sprache', () => {
    // de_to_es: die Zielseite (es) bleibt fest gefiltert.
    const hin = writingCandidates('de_to_es');
    expect(hin.length).toBe(VOCABULARY_ES.length);
    expect(hin.every((entry) => entry.language === 'es')).toBe(true);
    // es_to_de SEIT DEM 21.09.2026 OHNE SPRACHFILTER: Der Pool der Richtung
    // entscheidet die Seite (Alt-Bestand: es-Einträge mit `german`,
    // generierter de-Pool: `language: 'de'`) — die Kandidaten prüfen nur
    // die Baubarkeit (Zielform + lesbares Ankerwort). Vorher filterte der
    // Anker ('es') den generierten de-Pool leer und das Schreiben blieb
    // beim Deutsch-Ziel für immer leer.
    const zurueck = writingCandidates('es_to_de');
    expect(VOCABULARY_ES.every((entry) => zurueck.includes(entry))).toBe(true);
    expect(zurueck.every((entry) => canBuildWritingPrompt(entry, 'es_to_de'))).toBe(true);
  });

  it('kann für jeden Eintrag beider neuer Sprachen eine Aufgabe bauen', () => {
    for (const [liste, hin, zurueck] of [
      [VOCABULARY_ES, 'de_to_es', 'es_to_de'],
      [VOCABULARY_EN, 'de_to_en', 'en_to_de'],
    ] as const) {
      for (const entry of liste) {
        expect(canBuildWritingPrompt(entry, hin)).toBe(true);
        expect(canBuildWritingPrompt(entry, zurueck)).toBe(true);
      }
    }
  });
});

describe('Was beim Vergleich geschützt bleibt', () => {
  it('lässt ein fehlendes Akzentzeichen im Spanischen nicht als Vertipper durchgehen', () => {
    // Derselbe Gedanke wie beim Thai-Tonzeichen: Der Akut traegt Bedeutung.
    // „hablo" und „habló" sind verschiedene Zeitformen.
    const verdict = compareWriting('medico', { language: 'es', targets: ['médico'] });
    expect(verdict.correct).toBe(false);
    expect(verdict.mistake).toBe('accent');
    expect(verdict.message).toContain('habló');
  });

  it('nennt auch die fehlende Tilde beim Namen', () => {
    const verdict = compareWriting('ano', { language: 'es', targets: ['año'] });
    expect(verdict.correct).toBe(false);
    expect(verdict.mistake).toBe('accent');
  });

  it('erkennt die richtige spanische Form als richtig', () => {
    expect(compareWriting('médico', { language: 'es', targets: ['médico'] }).exact).toBe(true);
    expect(compareWriting(' café ', { language: 'es', targets: ['café'] }).exact).toBe(true);
  });

  it('toleriert im Englischen einen Vertipper wie im Deutschen', () => {
    expect(typoTolerance('understand', 'en')).toBe(1);
    // Bei kurzen Woertern nicht - „cat" gegen „car" ist ein anderes Wort.
    expect(typoTolerance('cat', 'en')).toBe(0);
    const verdict = compareWriting('understnad', { language: 'en', targets: ['understand'] });
    expect(verdict.correct).toBe(true);
    expect(verdict.typo).toBe(true);
  });

  it('behält für Thai die Nulltoleranz', () => {
    expect(typoTolerance('สวัสดี', 'th')).toBe(0);
  });
});
