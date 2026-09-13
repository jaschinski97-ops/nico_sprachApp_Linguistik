import { POLITE_ITEMS, type PoliteItem } from '@/data/grammar-th';
import { SER_ESTAR_ITEMS, type SerEstarItem } from '@/data/grammar-es';

import { Random, shuffled } from './random';
import { directionForDrill, DrillOption, DrillQuestion } from './types';

/**
 * Aufgaben aus den kleinen Grammatik-Datensätzen (`data/grammar-th.ts`,
 * `data/grammar-es.ts`).
 *
 * WARUM EIN EIGENER BAUSTEIN NEBEN `questions.ts`: Die Ton-, Artikel- und
 * Betonungsübungen ziehen ihre Aufgaben aus dem Vokabel-Grundstock und sind
 * über den FSRS-Zustand der Karten gewichtet. Die Grammatik-Datensätze sind
 * regulative Kleinstübungen (Partikelwahl, ser/estar) ohne eigene Karten —
 * sie legen KEINE FSRS-Zustände an und haben keinen Wiederholungsstand.
 * Ihre Sitzung wird deshalb rein aus dem Datensatz gemischt, zufällig und
 * mit fester Rundenlänge; schwachgewichtige Auswahl wäre hier Scheinpräzi-
 * sion über Daten, die keinen Lernstand messen.
 *
 * Dasselbe Ehrlichkeitsprinzip wie überall: Die falschen Antworten sind die
 * ECHTE Alternative derselben Entscheidung (ครับ gegen ค่ะ, ser gegen
 * estar) — nicht erfundene Formen.
 */

/** Die Partikel-Wahl: feste Reihenfolge, männlich zuerst — dieselbe Überlegung wie bei den Tönen. */
const POLITE_OPTIONS: DrillOption[] = [
  { label: 'ครับ' },
  { label: 'ค่ะ' },
];

export function buildPoliteQuestion(item: PoliteItem): DrillQuestion {
  return {
    id: `polite:${item.id}`,
    drill: 'polite',
    direction: directionForDrill('polite', 'th'),
    vocabId: item.id,
    visible: `${item.text} ___`,
    visibleHint: item.speaker === 'male' ? 'Sprecher: ein Mann (ผม …)' : 'Sprecherin: eine Frau (ฉัน …)',
    // Bewusst kein Audio vor der Antwort: Der gesprochene Satz ENDET mit der
    // Partikel — er würde die Lösung vorlesen.
    speak: null,
    options: POLITE_OPTIONS,
    correctIndex: item.answer === 'ครับ' ? 0 : 1,
    solution: `${item.text} ${item.answer}`,
    explanation: `${item.german} · Die Partikel hängt am Geschlecht des Sprechers, nicht am Satz.`,
  };
}

/** Die dritte Form für die Lösung: ser → es, estar → está. */
const SER_ESTAR_FORMS: Record<SerEstarItem['answer'], string> = { ser: 'es', estar: 'está' };

export function buildSerEstarQuestion(item: SerEstarItem): DrillQuestion {
  const options: DrillOption[] = [{ label: 'ser' }, { label: 'estar' }];
  return {
    id: `serEstar:${item.id}`,
    drill: 'serEstar',
    direction: directionForDrill('serEstar', 'es'),
    vocabId: item.id,
    visible: item.text,
    visibleHint: item.german,
    speak: null,
    options,
    correctIndex: item.answer === 'ser' ? 0 : 1,
    solution: item.text.replace('___', SER_ESTAR_FORMS[item.answer]),
    explanation: item.reason,
  };
}

/** Datensatz zu einer Übung — `null` für alle übungsgebundenen Drills. */
export function buildGrammarSession(
  drill: 'polite' | 'serEstar',
  random: Random,
  size: number
): { questions: DrillQuestion[]; available: number } {
  if (drill === 'polite') {
    return {
      questions: shuffled([...POLITE_ITEMS], random).slice(0, size).map(buildPoliteQuestion),
      available: POLITE_ITEMS.length,
    };
  }
  return {
    questions: shuffled([...SER_ESTAR_ITEMS], random).slice(0, size).map(buildSerEstarQuestion),
    available: SER_ESTAR_ITEMS.length,
  };
}
