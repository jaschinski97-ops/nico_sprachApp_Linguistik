import { VOCABULARY_EN, VOCABULARY_ES, VOCABULARY_TH } from '@/data/vocabulary';

import {
  Direction,
  directionsFor,
  HUB_LANGUAGE,
  LANGUAGE_CODES,
  LanguageCode,
  LanguageDefinition,
  languageOfDirection,
} from './types';

/**
 * Welche Sprachen es gibt, was sie besonders macht und ob sie Inhalte haben.
 *
 * EINE STELLE, DIE ALLES WEISS. Wer eine vierte Sprache ergänzen will, trägt
 * sie hier ein und liefert ihren Grundstock — die Oberfläche, die Auswahl und
 * die Zählung ziehen von hier.
 *
 * SEIT PHASE 16 HABEN ALLE DREI SPRACHEN INHALT. Die Zahlen stehen nicht als
 * Literal da, sondern kommen aus den Grundstöcken selbst — eine gepflegte Zahl
 * wäre irgendwann eine falsche. `entryCount: 0` bleibt der Weg, eine geplante
 * Sprache ehrlich als leer zu kennzeichnen (Pflicht 5 aus Phase 15); es gibt
 * derzeit nur keine solche mehr.
 */

export const LANGUAGES: Record<LanguageCode, LanguageDefinition> = {
  th: {
    code: 'th',
    label: 'Thai',
    endonym: 'ภาษาไทย',
    speechLocale: 'th-TH',
    challenge: 'Fünf Töne, die Bedeutung tragen — und eine eigene Schrift.',
    entryCount: VOCABULARY_TH.length,
    hasGermanModules: true,
    feature: {
      label: 'Töne',
      description:
        'Der Ton einer Silbe unterscheidet Bedeutungen und lässt sich aus der Schrift ableiten: aus Konsonantenklasse, Vokallänge, Schlusslaut und Tonzeichen.',
      // Deshalb gibt es die Herleitungsuebung aus Phase 13 - und deshalb ist
      // sie dort ueberhaupt moeglich gewesen.
      kind: 'derivable',
      implemented: true,
      source: {
        title: 'Thai script',
        url: 'https://en.wikipedia.org/wiki/Thai_script',
        retrieved: '2026-09-03',
        quote:
          'Tones are realised in the vowels, but indicated in the script by a combination of the class of the initial consonant (high, mid or low), vowel length (long or short), closing consonant (plosive or sonorant, called dead or live) and, if present, one of four tone marks.',
      },
    },
  },

  es: {
    code: 'es',
    label: 'Spanisch',
    endonym: 'español',
    speechLocale: 'es-ES',
    challenge: 'Die Betonung ist regelhaft — wer die Regel kennt, braucht sie nicht zu merken.',
    entryCount: VOCABULARY_ES.length,
    hasGermanModules: true,
    feature: {
      label: 'Betonung',
      description:
        'Welche Silbe betont wird, steht in der Schreibung: Wörter auf Vokal, -n oder -s werden auf der vorletzten Silbe betont, alle anderen auf der letzten; jede Abweichung trägt einen Akut. Die Betonung ist damit wie der Thai-Ton eine ableitbare Regel und kein Gedächtnisstoff — die Übung „Betonung herleiten" zeigt den Weg dorthin Schritt für Schritt.',
      kind: 'derivable',
      // Seit Phase 16 gebaut: lib/stress leitet die Betonung her, und die
      // Uebung 'stressRule' zeigt den Weg dorthin.
      implemented: true,
      source: {
        title: 'Spanish orthography',
        url: 'https://en.wikipedia.org/wiki/Spanish_orthography',
        retrieved: '2026-09-03',
        quote:
          'Stress in Spanish is marked unequivocally through a series of orthographic rules. The default stress is on the penultimate (next-to-last) syllable on words that end in a vowel, [n] or [s] (not preceded by another consonant) and on the final syllable when the word ends in any consonant other than [n] or [s] or in a consonant group. Words that do not follow the default stress have an acute accent over the stressed vowel.',
      },
    },
  },

  en: {
    code: 'en',
    label: 'Englisch',
    endonym: 'English',
    speechLocale: 'en-GB',
    challenge: 'Schreibung und Aussprache klaffen auseinander — Wort für Wort.',
    entryCount: VOCABULARY_EN.length,
    hasGermanModules: true,
    feature: {
      label: 'Aussprache',
      description:
        'Anders als bei Thai und Spanisch lässt sich die Aussprache NICHT aus der Schreibung ableiten: ⟨ough⟩ allein hat mindestens zehn Lesarten. Das Merkmal steht deshalb je Wort als Lautschrift, und geübt wird der Vergleich statt der Herleitung — enough, through, though und thought tragen dasselbe ⟨ough⟩ und klingen viermal verschieden.',
      kind: 'per-word',
      // Seit Phase 16 gebaut - aber ausdruecklich NICHT als Herleitung:
      // lib/spelling stellt Woerter mit gleichem Schriftstueck und
      // verschiedenem Laut gegenueber (AE-47).
      implemented: true,
      source: {
        title: 'English orthography',
        url: 'https://en.wikipedia.org/wiki/English_orthography',
        retrieved: '2026-09-03',
        quote:
          'in unfamiliar words and proper nouns, the pronunciation of some sequences, ⟨ough⟩ being the prime example, is unpredictable even for educated native speakers.',
      },
    },
  },
};

/**
 * Die Sprache, die ohne eigene Wahl gilt.
 *
 * AUSDRUECKLICH THAI, NICHT ABGELEITET (Phase 16). In Phase 15 ergab sich die
 * Vorgabe aus „die erste mit Inhalten"; das war eindeutig, solange es nur eine
 * gab. Mit dreien wuerde jede Ableitung — alphabetisch, nach Anzahl — kippen,
 * sobald sich ein Grundstock aendert, und dann faende jemand nach einem
 * Update **Englisch** vor, obwohl er seit Wochen Thai lernt. Der Wechsel der
 * gelernten Sprache ist eine Entscheidung der lernenden Person und darf nicht
 * aus einer Sortierreihenfolge fallen.
 *
 * Thai ist zudem das Paar mit dem vollstaendigsten Inhalt: Beispielsaetze,
 * Bildmotive, Hoerclips, Sprech- und Leseuebung gibt es bisher nur dort.
 */
export const DEFAULT_LANGUAGE: LanguageCode = 'th';

/** Reihenfolge in der Auswahl: die Vorgabe zuerst, dann alphabetisch. */
export const LANGUAGE_ORDER: LanguageCode[] = [...LANGUAGE_CODES].sort((a, b) => {
  if (a === DEFAULT_LANGUAGE) return -1;
  if (b === DEFAULT_LANGUAGE) return 1;
  const byContent = Number(LANGUAGES[b].entryCount > 0) - Number(LANGUAGES[a].entryCount > 0);
  return byContent !== 0 ? byContent : LANGUAGES[a].label.localeCompare(LANGUAGES[b].label);
});

export function languageOf(code: LanguageCode): LanguageDefinition {
  return LANGUAGES[code];
}

/** Ist diese Sprache überhaupt lernbar, oder steht sie nur in der Liste? */
export function hasContent(code: LanguageCode): boolean {
  return LANGUAGES[code].entryCount > 0;
}

export function languagesWithContent(): LanguageDefinition[] {
  return LANGUAGE_ORDER.map(languageOf).filter((language) => language.entryCount > 0);
}

/** Die Standardsprache — die Vorgabe, solange sie Inhalte hat. */
export function defaultLanguage(): LanguageCode {
  if (hasContent(DEFAULT_LANGUAGE)) return DEFAULT_LANGUAGE;
  return languagesWithContent()[0]?.code ?? DEFAULT_LANGUAGE;
}

/**
 * Beschriftung einer Richtung, aus dem Verzeichnis gebaut statt als Tabelle
 * gepflegt — sonst müsste jede neue Sprache an zwei Stellen nachgetragen
 * werden, und eine davon würde vergessen.
 */
export function directionLabel(direction: Direction): string {
  const language = languageOf(languageOfDirection(direction));
  return direction.startsWith(`${HUB_LANGUAGE}_to_`)
    ? `Deutsch → ${language.label}`
    : `${language.label} → Deutsch`;
}

// `directionPrompt` gab es bis Phase 18: ein Satz wie „Deutsch lesen, das Wort
// auf Thai abrufen". Er stand auf jeder Richtungskarte und sagte nichts, was
// die Beschriftung „Deutsch → Thai" nicht schon sagt. An seine Stelle ist im
// Lernen-Reiter die Liste der Fertigkeiten getreten - die Angabe, nach der man
// wirklich auswaehlt.

export { directionsFor, languageOfDirection };
