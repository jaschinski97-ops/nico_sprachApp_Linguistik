import { BatchProgress, missingFrom, runBatch } from '../generation/batch';
import { BatchTask } from '../generation/types';
import { DataStore, getStore } from '../storage';
import { isContentRejected } from '../content/rejections';

import { ExamGenerationClient } from './generator';
import { ExamSpec } from './plan';
import { ExamModule } from './types';

/**
 * Der Lauf für zusätzliche Prüfungsaufgaben.
 *
 * Dritter Nutzer desselben Läufers (Sprachsituationen, Bilder, jetzt
 * Prüfungsaufgaben). Die Regeln — sofort speichern, Fehler überleben,
 * fortsetzbar, abbrechbar — stehen weiterhin nur an einer Stelle. Hier bleibt
 * allein die Sammlung `exam`.
 */

export type ExamRunOptions = {
  specs: ExamSpec[];
  client: ExamGenerationClient;
  store?: DataStore;
  onProgress?: (progress: BatchProgress) => void;
  shouldCancel?: () => boolean;
  delayMs?: number;
};

function examExists(db: DataStore) {
  return {
    async exists(spec: ExamSpec) {
      if (await isContentRejected('exam', spec.id, db)) return true;
      return (await db.get<ExamModule>('exam', spec.id)) !== null;
    },
  };
}

function examTask(client: ExamGenerationClient, db: DataStore): BatchTask<ExamSpec> {
  return {
    ...examExists(db),
    async produce(spec) {
      const module = await client.generate(spec);
      await db.put('exam', spec.id, module);
    },
  };
}

export async function runExamBatch(options: ExamRunOptions): Promise<BatchProgress> {
  const db = options.store ?? (await getStore());
  return runBatch({
    specs: options.specs,
    task: examTask(options.client, db),
    onProgress: options.onProgress,
    shouldCancel: options.shouldCancel,
    delayMs: options.delayMs,
  });
}

export async function missingExamSpecs(
  specs: ExamSpec[],
  store?: DataStore
): Promise<ExamSpec[]> {
  const db = store ?? (await getStore());
  return missingFrom(specs, examExists(db));
}
