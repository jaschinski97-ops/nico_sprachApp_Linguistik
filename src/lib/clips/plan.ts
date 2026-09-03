import { VOCABULARY, VocabEntry } from '@/data/vocabulary';

import { ConversationSituation } from '../conversation/types';
import { assertUniqueIds, limitPlan } from '../generation/plan';
import { ProviderId } from '../providers/types';

import { AudioClipSpec, clipIdFor, normalizeClipText } from './types';

/**
 * Der Bauplan eines Clip-Laufs.
 *
 * Drei Quellen, eine Reihenfolge: erst die Vokabeln, dann ihre Beispielsätze,
 * dann die Züge der gespeicherten Sprachsituationen. Deterministisch wie alle
 * Pläne seit Phase 4 — dieselben Eingaben, dieselben IDs, damit ein
 * abgebrochener Lauf fortsetzbar ist.
 *
 * DEDUPLIZIERT ÜBER DIE ID: Gleicher Text in gleicher Sprache ist ein Clip.
 * Der erste Treffer gewinnt, und weil die Vokabeln vorn stehen, wird ein Wort,
 * das auch als ganzer Dialogzug vorkommt, als Vokabel geführt.
 */

/** Klein und bezahlbar: fünf Vokabeln mit ihren fünf Beispielsätzen. */
export const CLIP_TEST_RUN = 5;

export type ClipPlanOptions = {
  vocabulary?: VocabEntry[];
  includeWords?: boolean;
  includeExamples?: boolean;
  /** Gespeicherte Situationen, deren Thai-Züge vertont werden sollen. */
  situations?: ConversationSituation[];
  limit?: number;
};

export function planClips(options: ClipPlanOptions = {}): AudioClipSpec[] {
  const entries = options.vocabulary ?? VOCABULARY;
  const specs: AudioClipSpec[] = [];
  const seen = new Set<string>();

  const add = (spec: Omit<AudioClipSpec, 'id'>) => {
    const text = normalizeClipText(spec.text);
    if (!text) return;
    const id = clipIdFor(spec.language, text);
    if (seen.has(id)) return;
    seen.add(id);
    specs.push({ ...spec, id, text });
  };

  if (options.includeWords ?? true) {
    for (const entry of entries) {
      add({ language: 'th', text: entry.term, kind: 'vocab', sourceId: entry.id });
    }
  }
  if (options.includeExamples ?? true) {
    for (const entry of entries) {
      add({ language: 'th', text: entry.exampleTerm, kind: 'example', sourceId: entry.id });
    }
  }
  for (const situation of options.situations ?? []) {
    situation.scriptTurns.forEach((turn, index) => {
      add({ language: 'th', text: turn.thai, kind: 'turn', sourceId: `${situation.id}#${index + 1}` });
    });
  }

  return limitPlan(assertUniqueIds(specs), options.limit);
}

/** Der Probelauf: die ersten fünf Vokabeln samt Beispielsatz — zehn Clips. */
export function planClipTestRun(entries: VocabEntry[] = VOCABULARY): AudioClipSpec[] {
  return planClips({ vocabulary: entries.slice(0, CLIP_TEST_RUN) });
}

// ---------------------------------------------------------------------------
// Speicherbedarf (Pflicht 3) — gemessen, wo es ging; geschätzt, wo nicht.
// ---------------------------------------------------------------------------

/**
 * Cliplänge aus der Textlänge — **gemessen** an zwei neuronalen Thai-Stimmen
 * (Phase 11, `scripts/tone-contour.html`): je fünf Silben und fünf Sätze
 * (10–37 Thai-Zeichen), Dauer aus der dekodierten Wellenform.
 *
 *   Microsoft th-TH-Premwadee: 1 Silbe ≈ 1,4–1,6 s; 11 Zeichen 2,0 s;
 *     31 Zeichen 3,1 s; 37 Zeichen 3,4 s  → ≈ 1,5 s + Zeichen/19
 *   Google (translate, th):     1 Silbe ≈ 0,9–1,0 s; 11 Zeichen 1,75 s;
 *     31 Zeichen 3,8 s; 37 Zeichen 4,3 s → ≈ 0,65 s + Zeichen/10
 *
 * Die beiden Stimmen unterscheiden sich fast um den Faktor zwei im
 * Sprechtempo, und beide legen um jeden Clip Stille. Genommen wird die
 * **langsamere** Rate (10 Zeichen/s) mit 1 s Grundlast — lieber überschätzen
 * als beim Vollumfang die Ablage sprengen. Für Gemini und ChatGPT selbst liegt
 * keine Messung vor (B-6); deshalb steht in der Statuszeile der Einstellungen
 * zusätzlich die tatsächlich abgelegte Summe.
 */
export const THAI_CHARS_PER_SECOND = 10;
export const CLIP_OVERHEAD_SECONDS = 1.0;

/**
 * Byte je Sekunde je Anbieter.
 *
 * Gemini: 24 000 Abtastwerte × 2 Byte, mono — aus der Doku, nicht geschätzt.
 * Dazu 44 Byte WAV-Kopf, die hier nicht ins Gewicht fallen.
 * ChatGPT: mp3 — die Bitrate steht nicht in der Doku; 48 kbit/s ist die
 * Größenordnung gängiger Sprach-mp3s und als **Schätzung** gekennzeichnet.
 */
export const BYTES_PER_SECOND: Record<ProviderId, number | null> = {
  gemini: 24000 * 2,
  chatgpt: 6000,
  claude: null,
  stability: null,
};

export function estimateClipSeconds(specs: AudioClipSpec[]): number {
  return specs.reduce(
    (sum, spec) =>
      sum + CLIP_OVERHEAD_SECONDS + spec.text.replace(/\s/g, '').length / THAI_CHARS_PER_SECOND,
    0
  );
}

export function estimateClipBytes(specs: AudioClipSpec[], provider: ProviderId): number | null {
  const perSecond = BYTES_PER_SECOND[provider];
  if (perSecond === null) return null;
  return Math.round(estimateClipSeconds(specs) * perSecond);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
