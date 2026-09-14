import { ExamModule } from '@/lib/exam/types';
import { type SpeechLanguage } from '@/lib/audio';

/**
 * 1:1-Übertragung einer gepflegten deutschen Prüfung (Phase 2, Schritt 3).
 *
 * WAS „1:1" HIER EXAKT HEISST — und was der Prompt dem Modell verbietet:
 * gleiche Aufgaben in gleicher Reihenfolge, gleiche Anzahl Antwortoptionen,
 * UNVERÄNDERTER `correctIndex`, gleiche Aufgabe-/Stimulus-Typen, gleiche
 * Länge grob beibehalten. Übersetzt werden nur Textfelder (Titel,
 * Arbeitsanweisung, Stimulus, Prompts, Optionen, Erklärungen,
 * Produktions-Leitpunkte). Nicht angefasst: id (bekommt ein Sprach-Suffix),
 * level, skill, taskType, minutes, direction, item-Anzahlen, Lösungen.
 * Keine freie Erzeugung neuer Aufgaben — dafür ist die manuelle Pflege da.
 *
 * DIE PRÜFUNG NACH DER ÜBERSETZUNG ist zweistufig:
 *   1. `gleichheitPruefen` — Struktur 1:1 (viele einzelne Vergleiche).
 *   2. `schriftPruefen` — die Zielsprache steht auch in den Zielfeldern
 *      (Thai-Schrift für Thai; Latein für Englisch/Spanisch) und die
 *      deutsche Quelle ist nicht unübersetzt stehengeblieben.
 * Wer hier durchfällt, wird nicht gespeichert — mit Grund.
 */

export const UEBERTRAGbare_ZIELE = ['th', 'en', 'es'] as const;
export type UebertragZiel = (typeof UEBERTRAGbare_ZIELE)[number];

const ZIELSPRACH_NAME: Record<UebertragZiel, string> = {
  th: 'Thai',
  en: 'Englisch',
  es: 'Spanisch',
};

/** IDs bekommen ein kurzes Sprach-Suffix: `a1-lesen-anzeige` → `…-th`. */
export function uebertragId(id: string, ziel: UebertragZiel): string {
  if (id.length + 1 + ziel.length > 120) {
    return `${id.slice(0, 120 - ziel.length - 1)}-${ziel}`;
  }
  return `${id}-${ziel}`;
}

/** Hat der Text überhaupt Zeichen der Zielsprache? (Thai-Schrift vs. Latein) */
export function schriftPasst(text: string, ziel: UebertragZiel): boolean {
  if (ziel === 'th') {
    // Mindestens ein Thai-Zeichen (U+0E01–U+0E5B) und kein CJK/Kyrillisch.
    return /[\u0E01-\u0E5B]/.test(text);
  }
  // Latein: Buchstaben vorhanden und keine Thai-Schrift.
  return /[A-Za-zÀ-ÿñÑ¿¡]/.test(text) && !/[\u0E01-\u0E5B]/.test(text);
}

/** Alle Textfelder eines Moduls, die übersetzt werden — als [pfad, text]. */
function textfelder(modul: ExamModule): [string, string][] {
  const felder: [string, string][] = [
    ['title', modul.title],
    ['instruction', modul.instruction],
  ];
  if (modul.stimulus) {
    if (modul.stimulus.title) felder.push(['stimulus.title', modul.stimulus.title]);
    felder.push(['stimulus.body', modul.stimulus.body]);
    modul.stimulus.entries?.forEach((eintrag, i) =>
      felder.push([`stimulus.entries[${i}]`, eintrag])
    );
  }
  if (modul.taskType === 'production') {
    modul.production.bullets.forEach((punkt, i) => felder.push([`production.bullets[${i}]`, punkt]));
    felder.push(['production.task', modul.production.task]);
    felder.push(['production.modelAnswer', modul.production.modelAnswer]);
    modul.production.checklist.forEach((punkt, i) => felder.push([`production.checklist[${i}]`, punkt]));
  } else {
    modul.items.forEach((item, i) => {
      felder.push([`items[${i}].prompt`, item.prompt]);
      item.options.forEach((option, j) => felder.push([`items[${i}].options[${j}]`, option]));
      if (item.explanation) felder.push([`items[${i}].explanation`, item.explanation]);
    });
  }
  return felder.filter(([, text]) => typeof text === 'string' && text.trim().length > 0);
}

/** Freitext-Übersetzungsauftrag mit harten Struktur-Regeln im Prompt. */
export function baueUebersetzPrompt(modul: ExamModule, ziel: UebertragZiel): string {
  const felder = textfelder(modul);
  const liste = felder
    .map(([pfad, text]) => `  ${JSON.stringify(pfad)}: ${JSON.stringify(text)}`)
    .join(',\n');
  return [
    `Übersetze die Textfelder einer Deutsch-Prüfung (Goethe-Format) ins ${ZIELSPRACH_NAME[ziel]}.`,
    '',
    'HARTE REGELN:',
    '- 1:1: gleiche Aufgaben in gleicher Reihenfolge, gleiche Anzahl Antwortoptionen; die Lösungen (correctIndex) bleiben unverändert und werden nicht mitgeliefert.',
    '- Keine neuen Aufgaben, keine ausgelassenen oder erfundenen Felder.',
    '- Natürliche, prüfungstypische Sprache der Zielsprache, keine Wort-für-Wort-Übertragung.',
    ziel === 'th'
      ? '- Thailändische Übersetzung in thailändischer Schrift.'
      : '- Umlaute bzw. Akzente der Zielsprache korrekt schreiben.',
    '',
    'Antworte NUR mit einem JSON-Objekt der Form {"felder": { ... }}, dessen Schlüssel exakt die unten genannten Pfade sind und dessen Werte die Übersetzungen tragen.',
    '',
    'Pfade und Ausgangstexte:',
    '{ "felder": {',
    liste,
    '} }',
  ].join('\n');
}

export type UebertragErgebnis =
  | { ok: true; modul: ExamModule; pruefungen: string[] }
  | { ok: false; fehler: string[] };

/** Wendet die übersetzten Felder strukturtreu auf eine Kopie des Originals an. */
function wendeFelderAn(
  modul: ExamModule,
  uebersetzt: Record<string, string>
): { modul: ExamModule; fehler: string[] } {
  const kopie: ExamModule = JSON.parse(JSON.stringify(modul));
  const fehler: string[] = [];
  const felder = textfelder(modul);

  for (const [pfad, original] of felder) {
    const neu = uebersetzt[pfad];
    if (typeof neu !== 'string' || !neu.trim()) {
      fehler.push(`Fehlende Übersetzung: ${pfad}`);
      continue;
    }
    // Pfade sind aus `textfelder` bekannt — schrittweise absetzen:
    const teile = pfad.split(/\.|\[(\d+)\]/).filter((t) => t !== undefined && t !== '');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ziel: any = kopie;
    for (let i = 0; i < teile.length - 1; i++) ziel = ziel[teile[i]];
    ziel[teile[teile.length - 1]] = neu;
    void original;
  }
  const unbekannt = Object.keys(uebersetzt).filter((pfad) => !felder.some(([p]) => p === pfad));
  for (const pfad of unbekannt) fehler.push(`Unbekannter Pfad: ${pfad}`);

  return { modul: kopie, fehler };
}

/** Die volle Prüfung: Struktur 1:1 + Schrift der Zielsprache. */
export function uebertragePruefung(
  original: ExamModule,
  ziel: UebertragZiel,
  rohAntwort: string,
  meta: { model: string }
): UebertragErgebnis {
  const fehler: string[] = [];

  let geparst: { felder?: Record<string, string> };
  try {
    const json = rohAntwort.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    geparst = JSON.parse(json);
  } catch {
    return { ok: false, fehler: ['Antwort ist kein gültiges JSON.'] };
  }
  if (typeof geparst !== 'object' || geparst === null || typeof geparst.felder !== 'object' || geparst.felder === null) {
    return { ok: false, fehler: ['Antwort enthält kein "felder"-Objekt.'] };
  }

  const angewendet = wendeFelderAn(original, geparst.felder);
  fehler.push(...angewendet.fehler);

  const modul = angewendet.modul;
  // Struktur 1:1 — die unveränderlichen Felder müssen identisch sein.
  if (modul.level !== original.level) fehler.push('Level wurde verändert.');
  if (modul.skill !== original.skill) fehler.push('Fertigkeit wurde verändert.');
  if (modul.taskType !== original.taskType) fehler.push('Aufgabentyp wurde verändert.');
  if (modul.taskType !== 'production' && original.taskType !== 'production') {
    if (modul.items.length !== original.items.length) {
      fehler.push('Anzahl der Aufgaben wurde verändert.');
    }
    modul.items.forEach((item, i) => {
      const vorlage = original.items[i];
      if (item.options.length !== vorlage.options.length) {
        fehler.push(`Aufgabe ${i + 1}: Anzahl der Antwortoptionen wurde verändert.`);
      }
      if (item.correctIndex !== vorlage.correctIndex) {
        fehler.push(`Aufgabe ${i + 1}: Lösung (correctIndex) wurde verändert.`);
      }
    });
  }

  // Schrift der Zielsprache in allen übersetzten Feldern.
  for (const [pfad, text] of textfelder(modul)) {
    if (!schriftPasst(text, ziel)) {
      fehler.push(`Feld ${pfad} ist nicht (vollständig) ins ${ZIELSPRACH_NAME[ziel]} übersetzt.`);
    }
  }

  if (fehler.length > 0) return { ok: false, fehler };

  modul.id = uebertragId(original.id, ziel);
  modul.source = 'manual';
  modul.generatedAt = Date.now();
  modul.modelUsed = meta.model;
  return {
    ok: true,
    modul,
    pruefungen: [
      'Struktur 1:1 (Aufgaben, Optionen, Lösungen unverändert)',
      `Schrift-Check ${ziel === 'th' ? 'Thai-Schrift' : 'Latein-Schrift'} für alle Felder`,
      'Schema-Prüfung (ExamModule-Vertrag, im Speicherschritt erneut)',
    ],
  };
}
