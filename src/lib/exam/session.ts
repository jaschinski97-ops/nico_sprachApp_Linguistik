import { loadExamModules } from '../repository';
import { DataStore } from '../storage';

import {
  CERTIFICATES,
  ExamLevel,
  ExamModule,
  ExamSkill,
  EXAM_SKILLS,
  isGradable,
} from './types';

/**
 * Auswahl und Auswertung einzelner Prüfungsaufgaben.
 *
 * NICHT ÜBER FSRS, und aus demselben Grund wie bei den Übungen aus Phase 6
 * (AE-16), nur noch deutlicher: Eine Prüfungsaufgabe prüft
 * Textverständnis, nicht das Behalten einer einzelnen Vokabel. Es gibt hier
 * gar kein Item, dessen Vergessenskurve sich planen ließe.
 */

export type ExamOverview = {
  level: ExamLevel;
  skill: ExamSkill;
  modules: ExamModule[];
};

export async function loadExamOverview(
  level: ExamLevel,
  store?: DataStore
): Promise<ExamOverview[]> {
  const modules = (await loadExamModules(store)).filter((module) => module.level === level);
  return EXAM_SKILLS.map((skill) => ({
    level,
    skill,
    modules: modules.filter((module) => module.skill === skill),
  }));
}

export async function loadExamModule(
  id: string,
  store?: DataStore
): Promise<ExamModule | null> {
  return (await loadExamModules(store)).find((module) => module.id === id) ?? null;
}

/** Welche Stufen überhaupt Aufgaben haben. */
export async function availableLevels(store?: DataStore): Promise<ExamLevel[]> {
  const modules = await loadExamModules(store);
  return CERTIFICATES.map((certificate) => certificate.level).filter((level) =>
    modules.some((module) => module.level === level)
  );
}

export type ExamScore = {
  correct: number;
  total: number;
  /** Anteil in Prozent, gerundet. */
  percent: number;
};

/**
 * Wertet die Antworten aus.
 *
 * Bewusst **keine** Bestehensgrenze: Wie viele Punkte zum Bestehen nötig sind,
 * steht in den Durchführungsbestimmungen des Goethe-Instituts und wurde hier
 * nicht erhoben. Eine ausgedachte Grenze („60 % — bestanden!") wäre genau die
 * Art von plausibel klingender Erfindung, die dieses Modul vermeiden soll.
 * Angezeigt wird deshalb nur, wie viel richtig war.
 */
export function scoreExamModule(module: ExamModule, answers: (number | null)[]): ExamScore {
  if (!isGradable(module)) {
    return { correct: 0, total: 0, percent: 0 };
  }
  const total = module.items.length;
  const correct = module.items.filter((item, index) => answers[index] === item.correctIndex).length;
  return {
    correct,
    total,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
  };
}
