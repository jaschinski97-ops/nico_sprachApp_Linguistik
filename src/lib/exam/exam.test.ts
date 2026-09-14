import {
  BUILTIN_EXAM_MODULES,
  EXAM_OFFER_BY_TARGET,
} from '@/data/exam-modules';

import {
  countExamModules,
  loadExamModules,
  seedExamModules,
} from '../repository';
import { DataStore, MemoryDataStore } from '../storage';

import { loadExamModule, loadExamOverview, scoreExamModule } from './session';
import {
  CERTIFICATES,
  certificateFor,
  EXAM_FORMAT_SKELETONS,
  EXAM_LEVELS,
  EXAM_SKILLS,
  EXAM_TASK_TYPES,
  ExamModule,
  isGradable,
  isValidExamModule,
} from './types';

const T0 = Date.UTC(2026, 8, 1, 12);

async function freshStore(): Promise<DataStore> {
  const store = new MemoryDataStore();
  await store.init();
  return store;
}

function moduleById(id: string): ExamModule {
  const module = BUILTIN_EXAM_MODULES.find((candidate) => candidate.id === id);
  if (!module) throw new Error(`Testdaten erwarten das Modul "${id}".`);
  return module;
}

describe('Recherchierte Zertifikatsstruktur', () => {
  it('fuehrt jedes Zertifikat mit Quelle und — wo recherchiert — Abrufdatum', () => {
    // Der Kern dieser Phase: die Struktur ist belegt, nicht erinnert. Ohne
    // Quelle ist ein Eintrag hier wertlos. Nur B2 hat kein Abrufdatum: dort
    // ist die Seite nicht abrufbar gewesen und das Zertifikat sagt das
    // ausdrücklich (basis 'am-format-orientiert').
    for (const certificate of CERTIFICATES) {
      expect(certificate.source).toMatch(/^https:\/\/www\.goethe\.de\//);
      if (certificate.basis === 'recherchiert') {
        expect(certificate.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        expect(certificate.retrieved).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('prueft in jedem Zertifikat alle vier Fertigkeiten', () => {
    for (const certificate of CERTIFICATES) {
      expect(certificate.parts.map((part) => part.skill).sort()).toEqual([...EXAM_SKILLS].sort());
    }
  });

  it('haelt die Dauern fest, wie sie auf den Seiten stehen', () => {
    // Diese Zahlen sind der Grund, warum recherchiert wurde: sie sind weder
    // ueber die Stufen gleich noch aus dem Niveau ableitbar.
    const a1 = certificateFor('A1');
    expect(a1.parts.find((p) => p.skill === 'lesen')!.minutes).toBe(25);
    expect(a1.parts.find((p) => p.skill === 'hoeren')!.minutes).toBe(20);
    expect(a1.parts.find((p) => p.skill === 'schreiben')!.minutes).toBe(20);
    expect(a1.parts.find((p) => p.skill === 'sprechen')!.minutes).toBe(15);

    const b1 = certificateFor('B1');
    expect(b1.parts.find((p) => p.skill === 'lesen')!.minutes).toBe(65);
    expect(b1.parts.find((p) => p.skill === 'schreiben')!.minutes).toBe(60);
  });

  it('unterscheidet Pruefungsteile von Modulen', () => {
    // A1/A2 sprechen von "Pruefungsteilen", B1 von "Modulen", die einzeln
    // ablegbar sind. Die Seiten benennen das selbst unterschiedlich.
    expect(certificateFor('A1').partsAreModules).toBe(false);
    expect(certificateFor('A2').partsAreModules).toBe(false);
    expect(certificateFor('B1').partsAreModules).toBe(true);
  });

  it('haelt fest, wo die Seite Gruppen- oder Paarpruefung nennt', () => {
    expect(certificateFor('A1').parts.find((p) => p.skill === 'sprechen')!.format).toBe('gruppe');
    expect(certificateFor('B1').parts.find((p) => p.skill === 'sprechen')!.format).toBe('paar');
  });

  it('markiert die als "etwa" angegebenen Dauern als ungenau', () => {
    const a2 = certificateFor('A2');
    expect(a2.parts.find((p) => p.skill === 'lesen')!.approximate).toBe(true);
    expect(certificateFor('A1').parts.find((p) => p.skill === 'lesen')!.approximate).toBe(false);
  });

  it('kennt fuer jede gefuehrte Stufe ein Zertifikat', () => {
    for (const level of EXAM_LEVELS) {
      expect(certificateFor(level).level).toBe(level);
    }
  });
});

describe('Mitgelieferte Aufgaben', () => {
  it('deckt jede Fertigkeit mit mindestens einer Aufgabe ab', () => {
    for (const skill of EXAM_SKILLS) {
      expect(BUILTIN_EXAM_MODULES.some((module) => module.skill === skill)).toBe(true);
    }
  });

  it('deckt jedes beobachtete Aufgabenformat ab', () => {
    // Die vier Klickformate stammen aus dem Einstufungstest, production ist
    // der ehrliche Umgang mit Schreiben und Sprechen.
    for (const taskType of ['multipleChoice', 'trueFalse', 'matching', 'gapFill', 'production']) {
      expect(BUILTIN_EXAM_MODULES.some((module) => module.taskType === taskType)).toBe(true);
    }
  });

  it('vergibt jede ID nur einmal', () => {
    const ids = BUILTIN_EXAM_MODULES.map((module) => module.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('haengt jede Aufgabe an ein vorhandenes Zertifikat der passenden Stufe', () => {
    for (const module of BUILTIN_EXAM_MODULES) {
      const certificate = CERTIFICATES.find((c) => c.id === module.certificate);
      expect(certificate).toBeDefined();
      expect(certificate!.level).toBe(module.level);
    }
  });

  it('hat in jeder bewertbaren Aufgabe genau eine erreichbare richtige Antwort', () => {
    // Ein correctIndex ausserhalb der Optionen wuerde jeden Versuch als falsch
    // werten - ein Fehler, der beim Ueben wie eigenes Unvermoegen aussieht.
    for (const module of BUILTIN_EXAM_MODULES) {
      if (!isGradable(module)) continue;
      expect(module.items.length).toBeGreaterThan(0);
      for (const item of module.items) {
        expect(item.options.length).toBeGreaterThanOrEqual(2);
        expect(new Set(item.options).size).toBe(item.options.length);
        expect(item.correctIndex).toBeGreaterThanOrEqual(0);
        expect(item.correctIndex).toBeLessThan(item.options.length);
        expect(item.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  it('gibt Richtig/Falsch-Aufgaben genau zwei Antworten', () => {
    for (const module of BUILTIN_EXAM_MODULES) {
      if (module.taskType !== 'trueFalse') continue;
      for (const item of module.items) {
        expect(item.options).toEqual(['Richtig', 'Falsch']);
      }
    }
  });

  it('gibt Hoeraufgaben ein Skript, das erst nach dem Auswerten sichtbar wird', () => {
    const hoeren = BUILTIN_EXAM_MODULES.filter((module) => module.skill === 'hoeren');
    expect(hoeren.length).toBeGreaterThan(0);
    for (const module of hoeren) {
      expect(module.stimulus?.kind).toBe('audio');
      expect(module.stimulus!.body.length).toBeGreaterThan(30);
    }
  });

  it('gibt jeder freien Aufgabe Leitpunkte, Musterloesung und Selbstkontrolle', () => {
    const frei = BUILTIN_EXAM_MODULES.filter((module) => module.taskType === 'production');
    expect(frei.length).toBeGreaterThanOrEqual(2);
    for (const module of frei) {
      if (isGradable(module)) throw new Error('production darf nicht bewertbar sein');
      expect(module.production.bullets.length).toBeGreaterThan(0);
      expect(module.production.modelAnswer.length).toBeGreaterThan(20);
      expect(module.production.checklist.length).toBeGreaterThan(0);
    }
  });

  it('haelt die Richtungen so klein wie den Inhaltsstand', () => {
    // Die Goethe-Simulation richtet sich an Deutschlernende (AE-19) — seit
    // Roadmap v2 kommt die Gegenrichtung de→th und die englische Brücke
    // en→de dazu. Erlaubt ist nur, wofür es wirklich Inhalte gibt; alles
    // andere muss in EXAM_OFFER_BY_TARGET ehrlich „folgt" sagen.
    const erlaubt: Record<string, string[]> = {
      th_to_de: ['A1', 'A2', 'B1'],
      en_to_de: ['A1'],
      de_to_th: ['A1'],
    };
    for (const module of BUILTIN_EXAM_MODULES) {
      expect(erlaubt[module.direction]).toBeDefined();
      expect(erlaubt[module.direction]).toContain(module.level);
    }
  });

  it('markiert sich selbst als mitgeliefert, nicht als erzeugt', () => {
    for (const module of BUILTIN_EXAM_MODULES) {
      expect(module.source).toBe('builtin');
    }
  });
});

describe('Erweiterung A1–B2 (Roadmap v2)', () => {
  it('traegt die fest zugesagten Seed-Zahlen je Paar und Stufe', () => {
    // Die Zahlen sind der Vertrag dieser Runde: klein, aber echt.
    const zaehle = (direction: string, level: string) =>
      BUILTIN_EXAM_MODULES.filter(
        (module) => module.direction === direction && module.level === level
      ).length;

    expect(zaehle('th_to_de', 'A1')).toBeGreaterThanOrEqual(1);
    expect(zaehle('th_to_de', 'A2')).toBeGreaterThanOrEqual(1);
    expect(zaehle('th_to_de', 'B1')).toBe(10);
    expect(zaehle('en_to_de', 'A1')).toBe(6);
    expect(zaehle('de_to_th', 'A1')).toBe(8);
  });

  it('deckt B1 mit allen vier Fertigkeiten ab', () => {
    const b1 = BUILTIN_EXAM_MODULES.filter((module) => module.level === 'B1');
    for (const skill of EXAM_SKILLS) {
      expect(b1.some((module) => module.skill === skill)).toBe(true);
    }
    expect(b1.some((module) => module.taskType === 'gapFill')).toBe(true);
  });

  it('nutzt nur die vorhandenen Aufgabentypen', () => {
    // Kein neuer Typ für B1/B2: Der Lückentext mit Wortbox ist ein gapFill,
    // die Wortbox steht im Stimulus.
    for (const module of BUILTIN_EXAM_MODULES) {
      expect(EXAM_TASK_TYPES).toContain(module.taskType);
    }
  });

  it('kennt B2 als Geruest, das ehrlich ohne Inhalte ist', () => {
    // Die B2-Seite des Goethe-Instituts war nicht abrufbar (403). Deshalb
    // gilt: Struktur am Format orientiert, kein Abrufdatum, keine Aufgaben.
    const b2 = certificateFor('B2');
    expect(b2.id).toBe('gzb2');
    expect(b2.basis).toBe('am-format-orientiert');
    expect(b2.retrieved).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(b2.parts.every((part) => part.approximate)).toBe(true);
    expect(BUILTIN_EXAM_MODULES.filter((module) => module.level === 'B2')).toHaveLength(0);
  });

  it('kennt fuer A1–B2 je ein Zertifikat mit vier Fertigkeiten', () => {
    expect(EXAM_LEVELS).toEqual(['A1', 'A2', 'B1', 'B2']);
    for (const level of EXAM_LEVELS) {
      const certificate = certificateFor(level);
      expect(certificate.parts.map((part) => part.skill).sort()).toEqual([...EXAM_SKILLS].sort());
    }
  });

  it('traegt das Simulations-Label an jeder Stufe', () => {
    // Keine offizielle Zertifizierung — das steht fest verdrahtet an den
    // Niveaumetadaten, nicht als optionaler Text.
    for (const certificate of CERTIFICATES) {
      expect(certificate.simulationLabel).toContain('Prüfungssimulation');
      expect(certificate.simulationLabel).toContain('keine offizielle Zertifizierung');
    }
  });

  it('stellt das Zeit-/Teile-Skelett fuer jede Stufe und Fertigkeit bereit', () => {
    // Minuten: fuer A1/A2/B1 die recherchierten Dauern, fuer B2 Orientierung.
    // Punkte: bewusst überall null (siehe types.ts — nicht erhoben).
    for (const level of EXAM_LEVELS) {
      const certificate = certificateFor(level);
      const skeleton = EXAM_FORMAT_SKELETONS[level];
      for (const skill of EXAM_SKILLS) {
        const part = certificate.parts.find((candidate) => candidate.skill === skill)!;
        expect(skeleton[skill].minutes).toBe(part.minutes);
        expect(skeleton[skill].teile).toBeGreaterThan(0);
        expect(skeleton[skill].punkte).toBeNull();
      }
    }
  });

  it('ankert de→th-Hoeraufgaben an echten Clips aus dem Bestand', () => {
    // Kein neuer Audio-Bedarf: Jede de→th-Höraufgabe nennt ihre Quelle im
    // Katalog (Satzaufgabe oder Gesprächs-Turn) — oder würde ehrlich sagen,
    // dass kein Clip existiert.
    const hoeren = BUILTIN_EXAM_MODULES.filter(
      (module) => module.direction === 'de_to_th' && module.skill === 'hoeren'
    );
    expect(hoeren.length).toBeGreaterThanOrEqual(2);
    for (const module of hoeren) {
      expect(module.clipAnchor).toBeDefined();
      expect(module.clipAnchor!.length).toBeGreaterThan(10);
      expect(module.stimulus?.kind).toBe('audio');
    }
  });

  it('verriegelt die Luecke „Modul ohne Antwort oder Erklaerung"', () => {
    // Dieselbe Invariante wie über dem Bestand, jetzt über alle Richtungen.
    for (const module of BUILTIN_EXAM_MODULES) {
      if (!isGradable(module)) continue;
      for (const item of module.items) {
        expect(item.options.length).toBeGreaterThanOrEqual(2);
        expect(item.correctIndex).toBeGreaterThanOrEqual(0);
        expect(item.correctIndex).toBeLessThan(item.options.length);
        expect(item.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  it('sagt fuer es (und en) als Ziel ehrlich „folgt"', () => {
    // Keine Fake-Inhalte: Die Registry behauptet nur, was existiert.
    for (const ziel of ['es', 'en'] as const) {
      expect(EXAM_OFFER_BY_TARGET[ziel].state).toBe('folgt');
      expect(EXAM_OFFER_BY_TARGET[ziel].directions).toHaveLength(0);
    }
    const moeglichFalsch = ['es_to_de', 'de_to_es'] as const;
    for (const module of BUILTIN_EXAM_MODULES) {
      expect(moeglichFalsch).not.toContain(module.direction as (typeof moeglichFalsch)[number]);
    }
    expect(EXAM_OFFER_BY_TARGET.de.directions).toEqual(['th_to_de', 'en_to_de']);
    expect(EXAM_OFFER_BY_TARGET.th.directions).toEqual(['de_to_th']);
  });

  it('filtert die Uebersicht optional nach Richtung, ohne das Bestandsverhalten zu aendern', async () => {
    const store = await freshStore();

    const alles = await loadExamOverview('A1', store);
    const alleA1 = alles.flatMap((group) => group.modules);
    expect(alleA1.some((module) => module.direction === 'th_to_de')).toBe(true);
    expect(alleA1.some((module) => module.direction === 'en_to_de')).toBe(true);
    expect(alleA1.some((module) => module.direction === 'de_to_th')).toBe(true);

    const nurDeutschNachThai = await loadExamOverview('A1', store, 'de_to_th');
    const module = nurDeutschNachThai.flatMap((group) => group.modules);
    expect(module.length).toBeGreaterThan(0);
    expect(module.every((candidate) => candidate.direction === 'de_to_th')).toBe(true);

    // Ohne Richtung: unverändert alle Richtungen der Stufe (exam.tsx-Lauf).
    expect(alleA1.length).toBe(
      alleA1.filter((candidate) => candidate.level === 'A1').length
    );
  });

  it('validiert auch die neuen Module ueber isValidExamModule', () => {
    for (const module of BUILTIN_EXAM_MODULES) {
      expect(isValidExamModule(module)).toBe(true);
    }
  });
});

describe('Auswertung', () => {
  it('zaehlt richtige Antworten', () => {
    const module = moduleById('a1-lesen-anzeige');
    if (!isGradable(module)) throw new Error('erwartet bewertbar');
    const alleRichtig = module.items.map((item) => item.correctIndex);
    expect(scoreExamModule(module, alleRichtig)).toEqual({
      correct: 3,
      total: 3,
      percent: 100,
    });
  });

  it('wertet Unbeantwortetes als falsch', () => {
    const module = moduleById('a1-lesen-anzeige');
    expect(scoreExamModule(module, [null, null, null]).correct).toBe(0);
  });

  it('gibt fuer freie Aufgaben keine Punkte aus', () => {
    // Freie Texte und gesprochene Antworten werden bewusst nicht bewertet
    // (AE-20) - eine Punktzahl waere hier eine Behauptung.
    const module = moduleById('a1-schreiben-text');
    expect(scoreExamModule(module, [])).toEqual({ correct: 0, total: 0, percent: 0 });
  });
});

describe('Speicherung und Uebersicht', () => {
  it('spielt die mitgelieferten Aufgaben beim ersten Zugriff ein', async () => {
    const store = await freshStore();
    expect(await countExamModules(store)).toBe(BUILTIN_EXAM_MODULES.length);
  });

  it('ist beim Einspielen idempotent', async () => {
    const store = await freshStore();
    await seedExamModules(store);
    await seedExamModules(store);
    expect(await countExamModules(store)).toBe(BUILTIN_EXAM_MODULES.length);
  });

  it('gruppiert die Uebersicht nach Fertigkeit', async () => {
    const store = await freshStore();
    const overview = await loadExamOverview('A1', store);
    expect(overview.map((group) => group.skill)).toEqual([...EXAM_SKILLS]);
    for (const group of overview) {
      expect(group.modules.every((module) => module.level === 'A1')).toBe(true);
      expect(group.modules.every((module) => module.skill === group.skill)).toBe(true);
    }
  });

  it('findet eine Aufgabe ueber ihre ID', async () => {
    const store = await freshStore();
    const module = await loadExamModule('a2-hoeren-durchsage', store);
    expect(module?.level).toBe('A2');
    expect(module?.skill).toBe('hoeren');
  });
});

/*
 * Phase 2, Schritt 3 (14.09.2026): Die Describes zu planExamModules,
 * buildExamPrompt, parseExamModule und runExamBatch sind mit dem
 * Prüfungsaufgaben-Generator entfernt worden — neue Aufgaben entstehen nur
 * noch manuell (JSON-Import, content/exam/manual/) bzw. durch die 1:1-
 * Übertragung einer gepflegten deutschen Prüfung.
 */