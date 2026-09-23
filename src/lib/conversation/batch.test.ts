import { loadSituations } from '../repository';
import { DataStore, MemoryDataStore } from '../storage';

import { BatchProgress, missingSpecs, runGenerationBatch } from './batch';
import { GenerationClient, parseSituation } from './generator';
import { FULL_RUN, planSituations, TEST_RUN } from './plan';
import { ConversationSituation, SituationSpec } from './types';

const T0 = Date.UTC(2026, 7, 30);

async function freshStore(): Promise<DataStore> {
  const store = new MemoryDataStore();
  await store.init();
  return store;
}

function fakeSituation(spec: SituationSpec): ConversationSituation {
  return {
    id: spec.id,
    level: spec.level,
    topic: spec.topic,
    direction: spec.direction,
    title: `Titel ${spec.id}`,
    setting: 'Eine Szene.',
    scriptTurns: [
      { speaker: 'partner', thai: 'สวัสดี', roman: 'sà-wàt-dii', german: 'Hallo.' },
      { speaker: 'learner', thai: 'สวัสดี ครับ', roman: 'sà-wàt-dii kráp', german: 'Hallo.' },
    ],
    corrections: [{ issue: 'Ton', explanation: 'Erste Silbe tief.' }],
    generatedAt: T0,
    modelUsed: 'test-model',
  };
}

/** Client, der bei bestimmten IDs scheitert. */
function clientThatFailsOn(failing: string[]): GenerationClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async generate(spec) {
      calls.push(spec.id);
      if (failing.includes(spec.id)) {
        throw new Error(`Netzwerkfehler bei ${spec.id}`);
      }
      return fakeSituation(spec);
    },
  };
}

/**
 * Zwei Gesprächssprachen (Thai `de_to_th` und Deutsch `th_to_de`) — seit dem
 * Sprach-Umbau plant `planSituations` je Sprache genau EINE Inhalts-Richtung;
 * die Tests stellen die zwei Richtungen ausdrücklich zusammen.
 */
const ZWEI: { directions: ('de_to_th' | 'th_to_de')[] } = { directions: ['de_to_th', 'th_to_de'] };

describe('planSituations', () => {
  it('plant ohne Angabe genau die Inhalts-Richtung der Sprache', () => {
    expect(new Set(planSituations(TEST_RUN).map((s) => s.direction))).toEqual(new Set(['de_to_th']));
    expect(new Set(planSituations({ ...TEST_RUN, targetLanguage: 'de' }).map((s) => s.direction))).toEqual(new Set(['th_to_de']));
  });

  it('deckt im Probelauf jede Kombination genau einmal ab', () => {
    const specs = planSituations({ ...TEST_RUN, ...ZWEI });
    // 4 Themen x 2 Niveaus x 2 Richtungen
    expect(specs).toHaveLength(16);
    expect(new Set(specs.map((s) => s.id)).size).toBe(16);
  });

  it('ist deterministisch - gleiche Eingabe, gleiche IDs', () => {
    expect(planSituations({ ...TEST_RUN, ...ZWEI }).map((s) => s.id)).toEqual(
      planSituations({ ...TEST_RUN, ...ZWEI }).map((s) => s.id)
    );
  });

  it('kommt beim vollen Lauf auf 512 Situationen', () => {
    expect(planSituations({ ...FULL_RUN, ...ZWEI })).toHaveLength(512);
  });

  it('deckt beide Richtungen gleich stark ab', () => {
    const specs = planSituations({ variantsPerCombo: 3, ...ZWEI });
    const th = specs.filter((s) => s.direction === 'th_to_de').length;
    const de = specs.filter((s) => s.direction === 'de_to_th').length;
    expect(th).toBe(de);
  });

  it('durchlaeuft erst alle Themen, bevor die zweite Variante beginnt', () => {
    // Damit ein abgebrochener Lauf breit abdeckt statt nur ein Thema.
    const specs = planSituations({ variantsPerCombo: 2, ...ZWEI });
    expect(specs.slice(0, 16).every((s) => s.variant === 1)).toBe(true);
    expect(specs.slice(16).every((s) => s.variant === 2)).toBe(true);
  });
});

describe('runGenerationBatch - Normalfall', () => {
  it('erzeugt und speichert alle Situationen', async () => {
    const store = await freshStore();
    const specs = planSituations({ ...TEST_RUN, ...ZWEI });
    const client = clientThatFailsOn([]);

    const result = await runGenerationBatch({ specs, client, store });

    expect(result.ok).toBe(16);
    expect(result.failed).toBe(0);
    expect(result.done).toBe(true);
    expect(await loadSituations(store)).toHaveLength(16);
  });

  it('meldet Fortschritt laufend, nicht erst am Ende', async () => {
    const store = await freshStore();
    const specs = planSituations({ ...TEST_RUN, ...ZWEI }).slice(0, 3);
    const seen: BatchProgress[] = [];

    await runGenerationBatch({
      specs,
      client: clientThatFailsOn([]),
      store,
      onProgress: (p) => seen.push(p),
    });

    expect(seen.length).toBeGreaterThan(3);
    expect(seen[seen.length - 1].done).toBe(true);
    // Fortschritt waechst monoton.
    const processed = seen.map((p) => p.processed);
    for (let i = 1; i < processed.length; i++) {
      expect(processed[i]).toBeGreaterThanOrEqual(processed[i - 1]);
    }
  });
});

describe('runGenerationBatch - Teilausfaelle', () => {
  it('bricht bei einem Fehler mitten im Lauf nicht ab', async () => {
    const store = await freshStore();
    const specs = planSituations({ ...TEST_RUN, ...ZWEI });
    const client = clientThatFailsOn([specs[3].id, specs[7].id]);

    const result = await runGenerationBatch({ specs, client, store });

    expect(result.ok).toBe(14);
    expect(result.failed).toBe(2);
    expect(result.processed).toBe(16);
    expect(result.done).toBe(true);
    // Der Lauf hat wirklich alle angefasst, nicht beim ersten Fehler gestoppt.
    expect(client.calls).toHaveLength(16);
  });

  it('behaelt die bereits erzeugten Situationen', async () => {
    const store = await freshStore();
    const specs = planSituations({ ...TEST_RUN, ...ZWEI });
    const client = clientThatFailsOn([specs[0].id, specs[1].id, specs[2].id]);

    await runGenerationBatch({ specs, client, store });

    // Auch wenn es gleich zu Beginn dreimal scheitert: der Rest ist da.
    expect(await loadSituations(store)).toHaveLength(13);
  });

  it('haelt zu jedem Fehlschlag ID und Grund fest', async () => {
    const store = await freshStore();
    const specs = planSituations({ ...TEST_RUN, ...ZWEI });
    const result = await runGenerationBatch({
      specs,
      client: clientThatFailsOn([specs[5].id]),
      store,
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].id).toBe(specs[5].id);
    expect(result.errors[0].message).toContain('Netzwerkfehler');
  });

  it('zaehlt Erfolge und Fehler getrennt', async () => {
    const store = await freshStore();
    const specs = planSituations({ ...TEST_RUN, ...ZWEI });
    const result = await runGenerationBatch({
      specs,
      client: clientThatFailsOn(specs.slice(0, 6).map((s) => s.id)),
      store,
    });

    expect(result.ok).toBe(10);
    expect(result.failed).toBe(6);
    expect(result.ok + result.failed + result.skipped).toBe(result.processed);
  });
});

describe('runGenerationBatch - Fortsetzen', () => {
  it('ueberspringt beim zweiten Lauf, was schon da ist', async () => {
    const store = await freshStore();
    const specs = planSituations({ ...TEST_RUN, ...ZWEI });

    // Erster Lauf: vier Ausfaelle.
    const failing = specs.slice(0, 4).map((s) => s.id);
    await runGenerationBatch({ specs, client: clientThatFailsOn(failing), store });
    expect(await loadSituations(store)).toHaveLength(12);

    // Zweiter Lauf, diesmal ohne Ausfaelle.
    const second = clientThatFailsOn([]);
    const result = await runGenerationBatch({ specs, client: second, store });

    expect(result.skipped).toBe(12);
    expect(result.ok).toBe(4);
    // Und nur die fehlenden vier wurden ueberhaupt angefragt.
    expect(second.calls.sort()).toEqual([...failing].sort());
    expect(await loadSituations(store)).toHaveLength(16);
  });

  it('macht beim dritten Lauf gar keinen Aufruf mehr', async () => {
    const store = await freshStore();
    const specs = planSituations({ ...TEST_RUN, ...ZWEI });
    await runGenerationBatch({ specs, client: clientThatFailsOn([]), store });

    const again = clientThatFailsOn([]);
    const result = await runGenerationBatch({ specs, client: again, store });

    expect(again.calls).toHaveLength(0);
    expect(result.skipped).toBe(16);
    expect(result.ok).toBe(0);
  });

  it('missingSpecs nennt genau das Fehlende', async () => {
    const store = await freshStore();
    const specs = planSituations({ ...TEST_RUN, ...ZWEI });
    await runGenerationBatch({
      specs,
      client: clientThatFailsOn([specs[2].id]),
      store,
    });

    const missing = await missingSpecs(specs, store);
    expect(missing.map((s) => s.id)).toEqual([specs[2].id]);
  });
});

describe('runGenerationBatch - Abbrechen', () => {
  it('haelt an und behaelt das bereits Erzeugte', async () => {
    const store = await freshStore();
    const specs = planSituations({ ...TEST_RUN, ...ZWEI });
    const client = clientThatFailsOn([]);

    let processed = 0;
    const result = await runGenerationBatch({
      specs,
      client,
      store,
      shouldCancel: () => processed >= 5,
      onProgress: (p) => {
        processed = p.processed;
      },
    });

    expect(result.cancelled).toBe(true);
    expect(result.ok).toBe(5);
    expect(await loadSituations(store)).toHaveLength(5);
    expect(client.calls.length).toBe(5);
  });
});

describe('parseSituation', () => {
  const spec = planSituations({ ...TEST_RUN, ...ZWEI })[0];

  const valid = JSON.stringify({
    title: 'Am Marktstand',
    setting: 'Auf einem Markt in Bangkok.',
    scriptTurns: [
      { speaker: 'partner', thai: 'สวัสดี', roman: 'sà-wàt-dii', german: 'Hallo.' },
      { speaker: 'learner', thai: 'เท่าไร', roman: 'tâo-rai', german: 'Wie viel?' },
    ],
    corrections: [{ issue: 'Ton', explanation: 'Fallender Ton auf tâo.' }],
  });

  it('liest eine gueltige Antwort ein', () => {
    const situation = parseSituation(valid, spec, 'claude-opus-5', T0);
    expect(situation.id).toBe(spec.id);
    expect(situation.direction).toBe(spec.direction);
    expect(situation.scriptTurns).toHaveLength(2);
    expect(situation.modelUsed).toBe('claude-opus-5');
    expect(situation.generatedAt).toBe(T0);
  });

  it('vertraegt eine Antwort im Markdown-Codeblock', () => {
    const fenced = '```json\n' + valid + '\n```';
    expect(parseSituation(fenced, spec, 'm', T0).title).toBe('Am Marktstand');
  });

  it('lehnt ungueltiges JSON ab', () => {
    expect(() => parseSituation('kein json', spec, 'm', T0)).toThrow(/JSON/);
  });

  it('lehnt einen Dialog ohne Zug der lernenden Person ab', () => {
    const onlyPartner = JSON.stringify({
      title: 'T',
      setting: 'S',
      scriptTurns: [
        { speaker: 'partner', thai: 'a', roman: 'b', german: 'c' },
        { speaker: 'partner', thai: 'a', roman: 'b', german: 'c' },
      ],
      corrections: [{ issue: 'i', explanation: 'e' }],
    });
    expect(() => parseSituation(onlyPartner, spec, 'm', T0)).toThrow(/lernende/);
  });

  it('lehnt einen unbekannten Sprecher ab', () => {
    const bad = JSON.stringify({
      title: 'T',
      setting: 'S',
      scriptTurns: [
        { speaker: 'moderator', thai: 'a', roman: 'b', german: 'c' },
        { speaker: 'learner', thai: 'a', roman: 'b', german: 'c' },
      ],
      corrections: [{ issue: 'i', explanation: 'e' }],
    });
    expect(() => parseSituation(bad, spec, 'm', T0)).toThrow(/speaker/);
  });

  it('lehnt fehlende Felder in einem Zug ab', () => {
    const bad = JSON.stringify({
      title: 'T',
      setting: 'S',
      scriptTurns: [
        { speaker: 'learner', thai: 'a', german: 'c' },
        { speaker: 'partner', thai: 'a', roman: 'b', german: 'c' },
      ],
      corrections: [{ issue: 'i', explanation: 'e' }],
    });
    expect(() => parseSituation(bad, spec, 'm', T0)).toThrow(/roman/);
  });

  it('lehnt eine Situation ohne Korrektur-Hinweise ab', () => {
    const bad = JSON.stringify({
      title: 'T',
      setting: 'S',
      scriptTurns: [
        { speaker: 'learner', thai: 'a', roman: 'b', german: 'c' },
        { speaker: 'partner', thai: 'a', roman: 'b', german: 'c' },
      ],
      corrections: [],
    });
    expect(() => parseSituation(bad, spec, 'm', T0)).toThrow(/Korrektur/);
  });

  it('haelt eine unbrauchbare Antwort aus dem Speicher heraus', async () => {
    // Ein Parse-Fehler muss sich wie jeder andere Fehlschlag verhalten:
    // gezaehlt, protokolliert, aber nichts Halbes gespeichert.
    const store = await freshStore();
    const specs = planSituations({ ...TEST_RUN, ...ZWEI }).slice(0, 2);
    const client: GenerationClient = {
      async generate(s) {
        return parseSituation('{}', s, 'm', T0);
      },
    };

    const result = await runGenerationBatch({ specs, client, store });
    expect(result.failed).toBe(2);
    expect(await loadSituations(store)).toHaveLength(0);
  });
});
