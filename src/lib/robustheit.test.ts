import { BUILTIN_EXAM_MODULES } from '@/data/exam-modules';

import { isValidSituation } from './conversation/types';
import { isValidExamModule } from './exam/types';
import { loadExamModules, loadSituations, seedExamModules } from './repository';
import { DataStore, MemoryDataStore } from './storage';

/**
 * Was passiert mit **beschädigten Daten aus dem Speicher** (Phase 9).
 *
 * Die Batch-Läufe prüfen beim Schreiben streng — dort ist die Robustheit seit
 * Phase 4 getestet. Ungetestet war die andere Richtung: ein Dokument, das
 * bereits im Speicher liegt und nicht mehr zum Schema passt. Das ist kein
 * ausgedachter Fall: er entsteht bei jedem Schema-Wechsel zwischen zwei
 * Versionen der App, und beim Prüfen der Offline-Wiedergabe wurden in diesem
 * Projekt schon von Hand Dokumente eingespielt.
 *
 * Vor Phase 9 stürzten Prüfungs- und Gespräch-Screen dabei mit
 * „Cannot read properties of undefined (reading 'map')" ab — also mit einer
 * weissen Seite statt einer Meldung.
 */

async function freshStore(): Promise<DataStore> {
  const store = new MemoryDataStore();
  await store.init();
  return store;
}

/** Eine gültige Situation als Ausgangspunkt zum Kaputtmachen. */
function gueltigeSituation() {
  return {
    id: 'greeting-A1-de_to_th-001',
    level: 'A1',
    topic: 'greeting',
    direction: 'de_to_th',
    title: 'Am Marktstand',
    setting: 'Auf einem Markt in Bangkok.',
    scriptTurns: [
      { speaker: 'partner', thai: 'สวัสดี', roman: 'sà-wàt-dii', german: 'Hallo.' },
      { speaker: 'learner', thai: 'เท่าไร', roman: 'tâo-rai', german: 'Wie viel?' },
    ],
    corrections: [{ issue: 'Ton', explanation: 'Fallender Ton auf tâo.' }],
    generatedAt: 0,
    modelUsed: 'test',
  };
}

describe('isValidSituation', () => {
  it('nimmt eine vollstaendige Situation an', () => {
    expect(isValidSituation(gueltigeSituation())).toBe(true);
  });

  it.each([
    ['ohne scriptTurns', (s: Record<string, unknown>) => delete s.scriptTurns],
    ['mit leeren scriptTurns', (s: Record<string, unknown>) => (s.scriptTurns = [])],
    ['mit unbekanntem Sprecher', (s: Record<string, unknown>) => {
      (s.scriptTurns as Record<string, unknown>[])[0].speaker = 'moderator';
    }],
    ['ohne Umschrift in einem Zug', (s: Record<string, unknown>) => {
      delete (s.scriptTurns as Record<string, unknown>[])[1].roman;
    }],
    ['ohne Richtung', (s: Record<string, unknown>) => delete s.direction],
    ['ohne Titel', (s: Record<string, unknown>) => delete s.title],
  ])('lehnt eine Situation %s ab', (_name, kaputtmachen) => {
    const s = gueltigeSituation() as unknown as Record<string, unknown>;
    kaputtmachen(s);
    expect(isValidSituation(s)).toBe(false);
  });

  it('lehnt ab, was gar kein Objekt ist', () => {
    expect(isValidSituation(null)).toBe(false);
    expect(isValidSituation('kaputt')).toBe(false);
    expect(isValidSituation(42)).toBe(false);
  });
});

describe('isValidExamModule', () => {
  it('nimmt jede mitgelieferte Aufgabe an', () => {
    for (const module of BUILTIN_EXAM_MODULES) {
      expect(isValidExamModule(module)).toBe(true);
    }
  });

  it('lehnt ein leeres Dokument ab', () => {
    // Genau der Fall, der den Pruefungs-Screen zum Absturz brachte.
    expect(isValidExamModule({})).toBe(false);
  });

  it('lehnt eine bewertbare Aufgabe ohne items ab', () => {
    const module = { ...BUILTIN_EXAM_MODULES[0] } as Record<string, unknown>;
    delete module.items;
    expect(isValidExamModule(module)).toBe(false);
  });

  it('lehnt einen correctIndex ausserhalb der Optionen ab', () => {
    // Eine solche Aufgabe waere nie loesbar - schlimmer als gar keine.
    const module = JSON.parse(JSON.stringify(BUILTIN_EXAM_MODULES[0]));
    module.items[0].correctIndex = 99;
    expect(isValidExamModule(module)).toBe(false);
  });

  it('lehnt eine freie Aufgabe ohne Musterloesung ab', () => {
    const frei = BUILTIN_EXAM_MODULES.find((m) => m.taskType === 'production')!;
    const module = JSON.parse(JSON.stringify(frei));
    delete module.production.modelAnswer;
    expect(isValidExamModule(module)).toBe(false);
  });

  it('lehnt eine unbekannte Stufe oder Fertigkeit ab', () => {
    const a = JSON.parse(JSON.stringify(BUILTIN_EXAM_MODULES[0]));
    a.level = 'C3';
    expect(isValidExamModule(a)).toBe(false);

    const b = JSON.parse(JSON.stringify(BUILTIN_EXAM_MODULES[0]));
    b.skill = 'singen';
    expect(isValidExamModule(b)).toBe(false);
  });
});

describe('Lesen aus dem Speicher haelt Beschaedigtes heraus', () => {
  it('laesst eine kaputte Situation aus und zeigt die uebrigen', async () => {
    const store = await freshStore();
    await store.put('situations', 'gut', gueltigeSituation());
    await store.put('situations', 'kaputt', { id: 'kaputt' });
    await store.put('situations', 'leer', {});

    const situationen = await loadSituations(store);

    expect(situationen).toHaveLength(1);
    expect(situationen[0].id).toBe('greeting-A1-de_to_th-001');
    // Und die Zuege sind wirklich benutzbar - das war der Absturzpunkt.
    expect(situationen[0].scriptTurns.map((turn) => turn.speaker)).toEqual([
      'partner',
      'learner',
    ]);
  });

  it('laesst eine kaputte Pruefungsaufgabe aus und behaelt die mitgelieferten', async () => {
    const store = await freshStore();
    await seedExamModules(store);
    await store.put('exam', 'kaputt', {});
    await store.put('exam', 'halb', { id: 'halb', level: 'A1', skill: 'lesen' });

    const module = await loadExamModules(store);

    expect(module).toHaveLength(BUILTIN_EXAM_MODULES.length);
    expect(module.map((m) => m.id)).not.toContain('kaputt');
    expect(module.map((m) => m.id)).toContain('a1-lesen-anzeige');
  });

  it('loescht das Beschaedigte nicht, sondern laesst es nur aus', async () => {
    // Stilles Loeschen von Nutzerdaten waere die schlechtere Voreinstellung -
    // vielleicht kann eine spaetere Version mehr damit anfangen.
    const store = await freshStore();
    await store.put('situations', 'kaputt', { id: 'kaputt' });

    await loadSituations(store);

    expect(await store.get('situations', 'kaputt')).not.toBeNull();
  });

  it('kommt mit einer Sammlung aus lauter Unbrauchbarem klar', async () => {
    const store = await freshStore();
    await store.put('situations', 'a', {});
    await store.put('situations', 'b', { id: 'b' });

    await expect(loadSituations(store)).resolves.toEqual([]);
  });
});
