import type { BatchProgress } from '@/lib/generation/batch';
import { limitPlan } from '@/lib/generation/plan';

/**
 * Steuerung für „Alle Sprachen“ / „Alle Richtungen“ / „Alle Levels“.
 *
 * Der Nutzer soll mit EINEM Knopf denselben Generierungsumfang für alle
 * Zielsprachen (bzw. alle Richtungen, alle Stufen) fahren können — mit EINER
 * kombinierten Kosten- und Umfangsvorschau und EINER Bestätigung davor.
 * Die Generatoren und die Pipeline bleiben unverändert: Dieses Modul verbindet
 * nur mehrere normale Läufe hintereinander.
 *
 * WARUM DAS PLANEN HIER PASSIERT UND NICHT IN DER KARTE: Die Karte
 * (`GeneratorCard`) kennt keine Baupläne und keine Preise — die Vorschau
 * muss der Studio-Start (`onStart`) zusammenrechnen. Er bekommt die Schritte
 * der Kette als Liste und entscheidet je Schritt über Bauplan und Cap.
 */

/** Ein Schritt des Kettenlaufs — „Spanisch“, „Deutsch → Thai“, „A2“. */
export type ChainStep = { key: string; label: string };

/** Ein vorbereiteter Schritt: was er zu erzeugen hätte. */
export type ChainStepPlan<S> = { key: string; label: string; missing: S[] };

/**
 * Bereitet die Schritte eines Kettenlaufs vor: Bauplan je Schritt, dann die
 * noch fehlenden Einträge, dann der Cap „max. N neue“ — **je Schritt**, denn
 * der Cap soll jeden Lauf klein und bezahlbar halten, nicht die Kette
 * einseitig aushungern (bei 3 Sprachen wäre sonst unklar, welche bekommt
 * was). Die kombinierte Summe steht unter `all` und geht in die EINE
 * Bestätigung vor dem Lauf.
 *
 * DEDUP ÜBER DIE SCHRITTE, BEVOR GEFRAGT WIRD: Alle fehlenden Listen werden
 * vor dem ersten Aufruf bestimmt. Pläne, die in jedem Schritt identisch sind
 * (etwa der Auslieferungsumfang der Hörclips oder die Thai-Gesprächszüge),
 * wären sonst in Schritt 2 und 3 noch einmal vollständig „fehlend“ — und der
 * Lauf würde dieselben Clips ein zweites und drittes Mal **bezahlen**. Der
 * Dedup über die ID macht daraus: jeder Eintrag wird in der ganzen Kette
 * höchstens einmal angefragt.
 */
export async function planChain<S extends { id: string }>(
  steps: readonly ChainStep[],
  planFor: (key: string) => S[] | Promise<S[]>,
  missingOf: (specs: S[]) => Promise<S[]>,
  /** Max. neue Einheiten je Schritt; leer/0 heißt: alles Fehlende. */
  maxNew?: number
): Promise<{ steps: ChainStepPlan<S>[]; all: S[] }> {
  const vorbereitet: ChainStepPlan<S>[] = [];
  const vergeben = new Set<string>();
  for (const schritt of steps) {
    const specs = await planFor(schritt.key);
    const fehlend = limitPlan(await missingOf(specs), maxNew);
    const einzigartig = fehlend.filter((spec) => !vergeben.has(spec.id));
    for (const spec of einzigartig) vergeben.add(spec.id);
    vorbereitet.push({ key: schritt.key, label: schritt.label, missing: einzigartig });
  }
  return { steps: vorbereitet, all: vorbereitet.flatMap((schritt) => schritt.missing) };
}

/**
 * Fährt die vorbereiteten Schritte nacheinander.
 *
 * Der Abbruch gilt für die ganze Kette: `shouldCancel` wird vor jedem Schritt
 * geprüft und an jeden Einzellauf durchgereicht — ein Tipp auf „Anhalten“
 * endet also spätestens nach dem aktuellen Eintrag, nicht nach der Kette.
 * Leere Schritte werden gemeldet, aber nicht angefragt; ihr Bauplan war
 * leer oder alles Vorhandene blieb nach Dedup übrig.
 *
 * Der Fortschritt wird über die Kette summiert (`processed` läuft weiter,
 * `total` ist die bestätigte Gesamtmenge) — sonst spränge die Anzeige bei
 * jedem Sprachwechsel wieder auf null.
 */
export async function fahreKette<S>(
  steps: readonly ChainStepPlan<S>[],
  gesamt: number,
  steuerung: {
    onChainStep?: (step: { index: number; total: number; label: string }) => void;
    onProgress?: (progress: BatchProgress) => void;
    shouldCancel?: () => boolean;
  },
  /** Startet EINEN Schritt — derselbe Lauf wie ohne Kette. */
  starte: (missing: S[], onProgress?: (progress: BatchProgress) => void) => Promise<unknown>
): Promise<void> {
  let erledigt = 0;
  for (const [index, schritt] of steps.entries()) {
    if (steuerung.shouldCancel?.()) break;
    steuerung.onChainStep?.({ index: index + 1, total: steps.length, label: schritt.label });
    if (schritt.missing.length === 0) continue;
    await starte(schritt.missing, (progress) =>
      steuerung.onProgress?.({ ...progress, processed: progress.processed + erledigt, total: gesamt })
    );
    erledigt += schritt.missing.length;
  }
}
