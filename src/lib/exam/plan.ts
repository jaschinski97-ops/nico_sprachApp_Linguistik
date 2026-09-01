import { assertUniqueIds, limitPlan } from '../generation/plan';

import { ExamLevel } from './types';

/**
 * Bauplan für zusätzliche Prüfungsaufgaben.
 *
 * NUR LESEN UND HÖREN. Schreiben und Sprechen bleiben bei den mitgelieferten
 * Aufgaben, weil dort nichts automatisch bewertet werden kann (AE-20) — ein
 * Modell könnte zwar Aufgabenstellungen erfinden, aber die Musterlösung wäre
 * dann ungeprüfter Text, an dem sich jemand orientiert. Lesen und Hören sind
 * dagegen genau der Fall aus der Phasenvorgabe: „wirklich neue Inhalte
 * (Lesetexte, Hörskripte)", die eine eigene Quelle brauchen.
 *
 * Deterministisch wie alle Pläne seit Phase 4: dieselben Eingaben, dieselben
 * IDs — nur so ist ein abgebrochener Lauf fortsetzbar.
 */

export const GENERATED_SKILLS = ['lesen', 'hoeren'] as const;
export type GeneratedSkill = (typeof GENERATED_SKILLS)[number];

export const GENERATED_TASK_TYPES = ['multipleChoice', 'trueFalse'] as const;
export type GeneratedTaskType = (typeof GENERATED_TASK_TYPES)[number];

export const GENERATED_LEVELS: ExamLevel[] = ['A1', 'A2'];

export type ExamSpec = {
  id: string;
  level: ExamLevel;
  skill: GeneratedSkill;
  taskType: GeneratedTaskType;
  variant: number;
};

export type ExamPlanOptions = {
  levels?: readonly ExamLevel[];
  skills?: readonly GeneratedSkill[];
  taskTypes?: readonly GeneratedTaskType[];
  variantsPerCombo?: number;
  limit?: number;
};

/** Ein kleiner Probelauf: jede Kombination einmal — 8 Aufgaben. */
export const EXAM_TEST_RUN: ExamPlanOptions = { variantsPerCombo: 1 };

/** Der große Lauf: 2 Stufen × 2 Fertigkeiten × 2 Formate × 8 Varianten. */
export const EXAM_FULL_RUN: ExamPlanOptions = { variantsPerCombo: 8 };

export function examModuleId(
  level: ExamLevel,
  skill: GeneratedSkill,
  taskType: GeneratedTaskType,
  variant: number
): string {
  return `gen-${level}-${skill}-${taskType}-${String(variant).padStart(3, '0')}`;
}

export function planExamModules(options: ExamPlanOptions = {}): ExamSpec[] {
  const levels = options.levels ?? GENERATED_LEVELS;
  const skills = options.skills ?? GENERATED_SKILLS;
  const taskTypes = options.taskTypes ?? GENERATED_TASK_TYPES;
  const variants = Math.max(1, options.variantsPerCombo ?? 1);

  const specs: ExamSpec[] = [];
  // Erst alle Kombinationen einer Variante, dann die naechste - ein
  // abgebrochener Lauf hat dann schon beide Stufen und beide Fertigkeiten
  // abgedeckt statt nur A1-Lesen.
  for (let variant = 1; variant <= variants; variant++) {
    for (const level of levels) {
      for (const skill of skills) {
        for (const taskType of taskTypes) {
          specs.push({
            id: examModuleId(level, skill, taskType, variant),
            level,
            skill,
            taskType,
            variant,
          });
        }
      }
    }
  }
  return limitPlan(assertUniqueIds(specs), options.limit);
}
