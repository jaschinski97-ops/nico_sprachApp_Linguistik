import { DataStore, getStore } from '../storage';

import { GenerationClient } from './generator';
import { ConversationSituation, SituationSpec } from './types';

/**
 * Batch-Lauf über viele Situationen.
 *
 * Bei hunderten Aufrufen hintereinander scheitert irgendwann einer —
 * Netzwerk, Rate-Limit, unerwartete Antwortform. Die Regeln hier folgen
 * daraus:
 *
 * 1. **Sofort speichern.** Jede erfolgreiche Situation wird einzeln
 *    geschrieben, nicht am Ende gesammelt. Ein Absturz nach 300 von 500
 *    Aufrufen kostet dann nichts von den 300.
 * 2. **Fehler beenden den Lauf nicht.** Sie werden gezählt und mit Grund
 *    festgehalten; der Lauf geht weiter.
 * 3. **Fortsetzbar.** Was schon im Speicher liegt, wird übersprungen. Ein
 *    zweiter Klick auf „Start" holt also nur das Fehlende nach.
 * 4. **Abbrechbar.** Der Nutzer kann anhalten; bereits Erzeugtes bleibt.
 */

export type BatchProgress = {
  total: number;
  /** Verarbeitet, egal mit welchem Ausgang. */
  processed: number;
  ok: number;
  failed: number;
  skipped: number;
  /** ID, die gerade bearbeitet wird. */
  current: string | null;
  errors: { id: string; message: string }[];
  done: boolean;
  cancelled: boolean;
};

export type RunOptions = {
  specs: SituationSpec[];
  client: GenerationClient;
  store?: DataStore;
  onProgress?: (progress: BatchProgress) => void;
  /** Wird vor jedem Eintrag geprüft. */
  shouldCancel?: () => boolean;
  /** Pause zwischen Aufrufen in Millisekunden, um Rate-Limits zu schonen. */
  delayMs?: number;
  now?: () => number;
};

function initialProgress(total: number): BatchProgress {
  return {
    total,
    processed: 0,
    ok: 0,
    failed: 0,
    skipped: 0,
    current: null,
    errors: [],
    done: false,
    cancelled: false,
  };
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function runGenerationBatch(options: RunOptions): Promise<BatchProgress> {
  const db = options.store ?? (await getStore());
  const progress = initialProgress(options.specs.length);
  const report = () => options.onProgress?.({ ...progress, errors: [...progress.errors] });

  report();

  for (const spec of options.specs) {
    if (options.shouldCancel?.()) {
      progress.cancelled = true;
      break;
    }

    progress.current = spec.id;
    report();

    try {
      const existing = await db.get<ConversationSituation>('situations', spec.id);
      if (existing) {
        progress.skipped += 1;
        progress.processed += 1;
        report();
        continue;
      }

      const situation = await options.client.generate(spec);
      // Sofort schreiben - siehe Regel 1.
      await db.put('situations', spec.id, situation);
      progress.ok += 1;
    } catch (error) {
      // Regel 2: zählen, festhalten, weitermachen.
      progress.failed += 1;
      progress.errors.push({ id: spec.id, message: messageOf(error) });
    }

    progress.processed += 1;
    report();

    if (options.delayMs && options.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  progress.current = null;
  progress.done = true;
  report();
  return progress;
}

/** Welche Situationen aus dem Plan noch fehlen. */
export async function missingSpecs(
  specs: SituationSpec[],
  store?: DataStore
): Promise<SituationSpec[]> {
  const db = store ?? (await getStore());
  const existing = await db.getAll<ConversationSituation>('situations');
  const known = new Set(existing.map((situation) => situation.id));
  return specs.filter((spec) => !known.has(spec.id));
}
