import { BatchTask, GenerationSpec } from './types';

/**
 * Batch-Lauf über viele zu erzeugende Einträge.
 *
 * Bei hunderten Aufrufen hintereinander scheitert irgendwann einer —
 * Netzwerk, Rate-Limit, unerwartete Antwortform. Die Regeln hier folgen
 * daraus:
 *
 * 1. **Sofort speichern.** Jeder Erfolg wird einzeln geschrieben, nicht am
 *    Ende gesammelt. Ein Absturz nach 300 von 500 Aufrufen kostet dann nichts
 *    von den 300.
 * 2. **Fehler beenden den Lauf nicht.** Sie werden gezählt und mit Grund
 *    festgehalten; der Lauf geht weiter.
 * 3. **Fortsetzbar.** Was schon vorliegt, wird übersprungen. Ein zweiter Klick
 *    auf „Start" holt also nur das Fehlende nach.
 * 4. **Abbrechbar.** Der Nutzer kann anhalten; bereits Erzeugtes bleibt.
 *
 * WARUM HIER UND NICHT BEI DEN SPRACHSITUATIONEN (Phase 5):
 * Diese vier Regeln haben mit dem Inhalt nichts zu tun — sie gelten für
 * Dialoge wie für Bilder. Ursprünglich stand der Läufer in
 * `conversation/batch.ts` und war fest mit der Sammlung `situations` und dem
 * Situationstyp verdrahtet; das Protokoll führte ihn trotzdem als „generisch".
 * Für Phase 5 ist er jetzt tatsächlich generisch: was ein Eintrag ist, wann er
 * als vorhanden gilt und wie er abgelegt wird, steckt im `BatchTask`. Der
 * Fortschrittstyp `BatchProgress` bleibt unverändert, damit die
 * Fortschrittsanzeige für beide Läufe dieselbe ist.
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
  /**
   * Nur beim Hörclip-Lauf gesetzt: Ergebnis der automatischen Tonmessung je
   * Clip (`passed`/`failed`; alles Übrige — ungeprüft, nicht anwendbar,
   * ohne Decoder — zählt unter `other`). Die anderen Läufe lassen das Feld weg.
   */
  tone?: { passed: number; failed: number; other: number };
};

export type BatchOptions<S extends GenerationSpec> = {
  specs: S[];
  task: BatchTask<S>;
  onProgress?: (progress: BatchProgress) => void;
  /** Wird vor jedem Eintrag geprüft. */
  shouldCancel?: () => boolean;
  /** Pause zwischen Aufrufen in Millisekunden, um Rate-Limits zu schonen. */
  delayMs?: number;
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

export async function runBatch<S extends GenerationSpec>(
  options: BatchOptions<S>
): Promise<BatchProgress> {
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
      if (await options.task.exists(spec)) {
        // Regel 3: nichts anfragen, was schon da ist.
        progress.skipped += 1;
        progress.processed += 1;
        report();
        continue;
      }

      // Regel 1: `produce` legt sofort ab, nicht erst am Ende des Laufs.
      await options.task.produce(spec);
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

/** Welche Einträge aus dem Plan noch fehlen. */
export async function missingFrom<S extends GenerationSpec>(
  specs: S[],
  task: Pick<BatchTask<S>, 'exists'>
): Promise<S[]> {
  const missing: S[] = [];
  for (const spec of specs) {
    if (!(await task.exists(spec))) missing.push(spec);
  }
  return missing;
}
