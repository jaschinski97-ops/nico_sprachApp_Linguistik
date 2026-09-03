import { TONE_KEYS, TONES } from '@/constants/tones';
import { VocabEntry } from '@/data/vocabulary';

import { analyzeSyllable } from '../reading/syllable';

import { Random, shuffled } from './random';
import { DRILL_META, DrillOption, DrillQuestion } from './types';

/**
 * Aus geprüften Vokabeldaten werden Aufgaben — es wird nichts erfunden.
 *
 * Das gilt ausdrücklich auch für die **falschen** Antworten. Jede Ablenkung
 * ist entweder eine echte Form aus derselben Datei (das Perfekt eines anderen
 * Verbs), eine der drei deutschen Artikelformen oder einer der fünf Töne, oder
 * eine mechanische Ableitung, die garantiert falsch ist (vertauschtes
 * Hilfsverb). Eine ausgedachte Form als Ablenker wäre dasselbe Problem wie ein
 * ausgedachter Ton: Lernende sehen sie, und Falsches prägt sich mit ein.
 */

/* ---------- Ton hören (de_to_th) ---------- */

/**
 * Nur **einsilbige** Wörter.
 *
 * Grund ist derselbe wie bei AE-7 und AE-8: Thai vergibt den Ton je Silbe.
 * Die Frage „welchen Ton hat สวัสดี?" hat gar keine richtige Antwort — das
 * Wort ist tief-tief-mittel. Und nach einer einzelnen Silbe zu fragen geht
 * auch nicht, weil sich die Silbengrenze in der Thai-Schrift nicht
 * verlässlich bestimmen lässt. 69 der 84 Einträge sind einsilbig, und alle
 * fünf Töne kommen darin vor; die Übung hat also genug Material, ohne dass
 * geraten werden müsste.
 */
export function canBuildToneQuestion(entry: VocabEntry): boolean {
  return entry.syllables?.length === 1;
}

export function buildToneQuestion(entry: VocabEntry): DrillQuestion {
  if (!canBuildToneQuestion(entry)) {
    throw new Error(
      `"${entry.id}" (${entry.thai}) ist mehrsilbig — jede Silbe hat einen eigenen Ton, ` +
        'eine einzelne Antwort gäbe es nicht.'
    );
  }
  const tone = entry.syllables[0].tone;

  // Feste Reihenfolge, nicht gemischt: die fünf Töne sind ein festes
  // Inventar, und wer sie übt, baut sich eine Ordnung im Kopf auf (mittel,
  // tief, fallend, hoch, steigend). Wechselnde Positionen wären zusätzliche
  // Arbeit, die mit dem Hören nichts zu tun hat.
  const options: DrillOption[] = TONE_KEYS.map((key) => ({
    label: TONES[key].label,
    tone: key,
  }));

  return {
    id: `tone:${entry.id}`,
    drill: 'tone',
    direction: 'de_to_th',
    vocabId: entry.id,
    // Bewusst nichts sichtbar: Die Thai-Schrift trägt das Tonzeichen und wäre
    // die halbe Lösung, die deutsche Bedeutung erlaubt es, die Antwort aus dem
    // Gedächtnis abzurufen statt sie zu hören. Genau das soll die Übung nicht.
    visible: null,
    visibleHint: null,
    speak: { text: entry.thai, language: 'th' },
    options,
    correctIndex: TONE_KEYS.indexOf(tone),
    solution: `${entry.thai} · ${entry.romanization} — ${entry.german}`,
    explanation: `${TONES[tone].adjective} Ton.`,
  };
}

/* ---------- Ton herleiten (de_to_th) ---------- */

/**
 * Nur Eintraege, deren Ton sich aus der Schrift **herleiten** laesst — und
 * deren Herleitung mit dem quellengeprueften Ton uebereinstimmt.
 *
 * Die zweite Bedingung ist die wichtigere. Waeren beide je verschieden,
 * zeigte die Uebung eine Begruendung, die der als richtig markierten Antwort
 * widerspricht; die lernende Person lernte die falsche Regel mit. Lieber eine
 * Vokabel weniger im Topf. Ein Test faehrt den ganzen Grundstock durch und
 * belegt, dass es diesen Fall derzeit nicht gibt.
 *
 * Einsilbig ist ohnehin Voraussetzung (AE-8, Pflicht 3): Silbengrenzen sind
 * in der Thai-Schrift nicht markiert, und `analyzeSyllable` weist alles
 * zurueck, was sich nicht als genau eine Silbe lesen laesst.
 */
export function canBuildToneRuleQuestion(entry: VocabEntry): boolean {
  if (entry.syllables?.length !== 1) return false;
  const analysis = analyzeSyllable(entry.thai);
  return analysis.ok && analysis.tone === entry.syllables[0].tone;
}

export function buildToneRuleQuestion(entry: VocabEntry): DrillQuestion {
  const analysis = analyzeSyllable(entry.thai);
  if (!analysis.ok) {
    throw new Error(`"${entry.id}" (${entry.thai}): ${analysis.reason}`);
  }
  const tone = entry.syllables[0].tone;
  if (analysis.tone !== tone) {
    throw new Error(
      `"${entry.id}" (${entry.thai}): Herleitung ergibt ${TONES[analysis.tone].label}, ` +
        `belegt ist ${TONES[tone].label}. Solange das nicht geklaert ist, wird daraus keine Aufgabe.`
    );
  }

  // Dieselbe feste Reihenfolge wie bei der Hoer-Uebung: Wer beide uebt, soll
  // nicht zwei verschiedene Ordnungen im Kopf behalten muessen.
  const options: DrillOption[] = TONE_KEYS.map((key) => ({
    label: TONES[key].label,
    tone: key,
  }));

  return {
    id: `toneRule:${entry.id}`,
    drill: 'toneRule',
    direction: 'de_to_th',
    vocabId: entry.id,
    // Hier ist die Schrift die Aufgabe, nicht die halbe Loesung: Genau aus
    // ihr soll der Ton abgeleitet werden. Die Umschrift steht bewusst NICHT
    // dabei - sie traegt die Tonzeichen und waere die Antwort.
    visible: entry.thai,
    visibleHint: null,
    speak: null,
    options,
    correctIndex: TONE_KEYS.indexOf(tone),
    solution: `${entry.thai} · ${entry.romanization} — ${entry.german}`,
    explanation: `${TONES[tone].adjective} Ton.`,
    derivation: analysis.steps,
    uncertain: analysis.uncertain,
  };
}

/* ---------- Artikel (th_to_de) ---------- */

const ARTICLES = ['der', 'die', 'das'] as const;

/**
 * Das Substantiv ohne seinen Artikel.
 *
 * Das Stichwort trägt das Genus mit (`"das Haus"`), damit es beim Lernen
 * immer mitgelesen wird — für diese Aufgabe muss es weg. Bei Einträgen mit
 * mehreren Bedeutungen (`"der Laden, der Verkaufsstand"`) wird nur die erste
 * gefragt; die zweite steht danach in der Auflösung.
 */
export function bareNoun(entry: VocabEntry): string {
  const first = entry.german.split(',')[0].trim();
  for (const article of ARTICLES) {
    if (first.toLowerCase().startsWith(`${article} `)) {
      return first.slice(article.length + 1).trim();
    }
  }
  return first;
}

export function canBuildArticleQuestion(entry: VocabEntry): boolean {
  return Boolean(entry.germanNoun) && bareNoun(entry).length > 0;
}

export function buildArticleQuestion(entry: VocabEntry): DrillQuestion {
  const noun = entry.germanNoun;
  if (!noun) {
    throw new Error(`"${entry.id}" ist kein Substantiv — kein Artikel zu üben.`);
  }
  const word = bareNoun(entry);

  // Feste Reihenfolge der/die/das: dieselbe Überlegung wie bei den Tönen.
  const options: DrillOption[] = ARTICLES.map((article) => ({ label: article }));

  const parts = [`${noun.article} ${word}`, `Plural: ${noun.plural}`];
  if (entry.note) parts.push(entry.note);

  return {
    id: `article:${entry.id}`,
    drill: 'article',
    direction: 'th_to_de',
    vocabId: entry.id,
    visible: `___ ${word}`,
    // Das thailändische Wort als Kontext: die lernende Person spricht Thai,
    // und ohne Kontext wäre bei mehrdeutigen Woertern unklar, was gemeint ist.
    visibleHint: `${entry.thai} · ${entry.romanization}`,
    speak: null,
    options,
    correctIndex: ARTICLES.indexOf(noun.article),
    solution: `${noun.article} ${word}`,
    explanation: parts.join(' · '),
  };
}

/* ---------- Stammformen (th_to_de) ---------- */

const AUXILIARIES = ['hat', 'ist'] as const;

/** Vertauscht `hat` und `ist` — ergibt garantiert eine falsche Form. */
export function swapAuxiliary(perfekt: string): string | null {
  for (const aux of AUXILIARIES) {
    if (perfekt.startsWith(`${aux} `)) {
      const other = aux === 'hat' ? 'ist' : 'hat';
      return `${other} ${perfekt.slice(aux.length + 1)}`;
    }
  }
  return null;
}

export function canBuildVerbFormQuestion(entry: VocabEntry): boolean {
  return Boolean(entry.germanVerb?.perfekt);
}

/**
 * Vier Antworten: die richtige, dieselbe Form mit vertauschtem Hilfsverb und
 * zwei echte Perfektformen anderer Verben.
 *
 * Das vertauschte Hilfsverb ist mit Absicht immer dabei — „haben" gegen
 * „sein" ist genau die Stelle, an der Thai-Muttersprachler danebengreifen,
 * weil Thai überhaupt kein Hilfsverb kennt. Wer nur zwischen fremden
 * Partizipien wählen müsste, könnte die Aufgabe lösen, ohne je über das
 * Hilfsverb nachzudenken.
 */
export function buildVerbFormQuestion(
  entry: VocabEntry,
  pool: VocabEntry[],
  random: Random
): DrillQuestion {
  const verb = entry.germanVerb;
  if (!verb) {
    throw new Error(`"${entry.id}" ist kein Verb — keine Stammformen zu üben.`);
  }

  const correct = verb.perfekt;
  const distractors: string[] = [];

  const swapped = swapAuxiliary(correct);
  if (swapped) distractors.push(swapped);

  const foreign = shuffled(
    pool
      .filter((other) => other.id !== entry.id && other.germanVerb)
      .map((other) => other.germanVerb!.perfekt)
      // Zwei Verben koennten dieselbe Form tragen - dann waere der "falsche"
      // Ablenker in Wahrheit richtig.
      .filter((form) => form !== correct && !distractors.includes(form)),
    random
  );

  for (const form of foreign) {
    if (distractors.length >= 3) break;
    if (!distractors.includes(form)) distractors.push(form);
  }

  const options = shuffled([correct, ...distractors], random).map((label) => ({ label }));

  const stems = `${entry.german.split(',')[0].trim()} — ${verb.thirdPerson} — ${verb.praeteritum} — ${verb.perfekt}`;
  const parts = [stems, verb.irregular ? 'unregelmäßig' : 'regelmäßig'];
  if (entry.note) parts.push(entry.note);

  return {
    id: `verbForms:${entry.id}`,
    drill: 'verbForms',
    direction: 'th_to_de',
    vocabId: entry.id,
    visible: entry.german.split(',')[0].trim(),
    visibleHint: `${entry.thai} · ${entry.romanization}`,
    speak: null,
    options,
    correctIndex: options.findIndex((option) => option.label === correct),
    solution: correct,
    explanation: parts.join(' · '),
  };
}

/* ---------- gemeinsamer Zugang ---------- */

export const DRILL_PROMPTS = {
  tone: DRILL_META.tone.prompt,
  article: DRILL_META.article.prompt,
  verbForms: DRILL_META.verbForms.prompt,
};
