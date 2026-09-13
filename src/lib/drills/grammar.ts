import { ZAEHLER_ITEMS, ZAEHLER_OPTIONEN, type ZaehlerItem } from '@/data/grammar-th-counters';
import { POLITE_ITEMS, type PoliteItem } from '@/data/grammar-th';
import { SER_ESTAR_ITEMS, type SerEstarItem } from '@/data/grammar-es';
import { CONSONANT_CLASS_LABEL, THAI_CONSONANTS, type ThaiConsonant } from '@/data/thai-script';

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

/* ---------- Zählwörter (de_to_th, Schritt 5) ---------- */

export function buildZaehlerQuestion(item: ZaehlerItem): DrillQuestion {
  const options: DrillOption[] = ZAEHLER_OPTIONEN.map((label) => ({ label }));
  return {
    id: `zaehler:${item.id}`,
    drill: 'zaehlerwort',
    direction: directionForDrill('zaehlerwort', 'th'),
    vocabId: item.id,
    visible: `${item.nomen} (${item.german})`,
    visibleHint: `Zahl + ___ : หนึ่ง ${item.nomen}`,
    speak: null,
    options,
    correctIndex: ZAEHLER_OPTIONEN.indexOf(item.answer),
    solution: `${item.nomen} หนึ่ง ${item.answer} — ein ${item.german}`,
    explanation: 'Das Zählwort steht zwischen Zahl und Nomen und hängt an der Wortklasse.',
  };
}

/* ---------- Konsonantenklassen (de_to_th, Schritt 5) ---------- */

const KLASSEN_OPTIONEN: DrillOption[] = (
  ['mid', 'high', 'low'] as const
).map((klasse) => ({ label: CONSONANT_CLASS_LABEL[klasse] }));

export function buildKonsonantenklasseQuestion(konsonant: ThaiConsonant): DrillQuestion {
  return {
    id: `konsonantenklasse:${konsonant.symbol}`,
    drill: 'konsonantenklasse',
    direction: directionForDrill('konsonantenklasse', 'th'),
    vocabId: konsonant.symbol,
    visible: konsonant.name,
    visibleHint: `${konsonant.meaning} · ${konsonant.nameRtgs}`,
    speak: null,
    options: KLASSEN_OPTIONEN,
    correctIndex: KLASSEN_OPTIONEN.findIndex(
      (option) => option.label === CONSONANT_CLASS_LABEL[konsonant.consonantClass]
    ),
    solution: `${konsonant.name} — ${CONSONANT_CLASS_LABEL[konsonant.consonantClass]}`,
    explanation:
      'Die Klasse ist der erste Eingang der Ton-Herleitung — wer sie kennt, kann jeden Ton aus der Schrift ableiten.',
  };
}

/** Die drei Datensatz-Übungen der Stufe 5 mischen wie polite/serEstar. */
export function buildGrammarSession(
  drill: 'polite' | 'serEstar' | 'zaehlerwort' | 'konsonantenklasse',
  random: Random,
  size: number
): { questions: DrillQuestion[]; available: number } {
  if (drill === 'polite') {
    return {
      questions: shuffled([...POLITE_ITEMS], random).slice(0, size).map(buildPoliteQuestion),
      available: POLITE_ITEMS.length,
    };
  }
  if (drill === 'serEstar') {
    return {
      questions: shuffled([...SER_ESTAR_ITEMS], random).slice(0, size).map(buildSerEstarQuestion),
      available: SER_ESTAR_ITEMS.length,
    };
  }
  if (drill === 'zaehlerwort') {
    return {
      questions: shuffled([...ZAEHLER_ITEMS], random).slice(0, size).map(buildZaehlerQuestion),
      available: ZAEHLER_ITEMS.length,
    };
  }
  // Konsonantenklasse: regelgetreu aus der quellengeprüften Schrifttabelle —
  // veraltete/obsolete Buchstaben (ฃ/ฅ) bewusst ausgeschlossen.
  const konsonanten = THAI_CONSONANTS.filter(
    (k) => !k.meaning.includes('obsolete')
  );
  return {
    questions: shuffled(konsonanten, random)
      .slice(0, size)
      .map(buildKonsonantenklasseQuestion),
    available: konsonanten.length,
  };
}
