import { VOCABULARY } from '@/data/vocabulary';

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
 * DIE ZWEI NEUEN SPRACHEN HABEN KEINEN INHALT, und das steht auch so da
 * (Pflicht 5). Ihr Merkmal ist **entschieden und belegt**, aber nicht gebaut
 * (Pflicht 4) — der Inhalt kommt je Sprache in einer eigenen Phase mit eigener
 * Recherche, wie bei Thai in Phase 2.
 */

export const LANGUAGES: Record<LanguageCode, LanguageDefinition> = {
  th: {
    code: 'th',
    label: 'Thai',
    endonym: 'ภาษาไทย',
    speechLocale: 'th-TH',
    challenge: 'Fünf Töne, die Bedeutung tragen — und eine eigene Schrift.',
    entryCount: VOCABULARY.length,
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
    entryCount: 0,
    hasGermanModules: true,
    feature: {
      label: 'Betonung',
      description:
        'Welche Silbe betont wird, steht in der Schreibung: Wörter auf Vokal, -n oder -s werden auf der vorletzten Silbe betont, alle anderen auf der letzten; jede Abweichung trägt einen Akut. Damit ist die Betonung wie der Thai-Ton eine ableitbare Regel und kein Gedächtnisstoff — eine Herleitungsübung nach dem Muster von Phase 13 wäre der passende Baustein.',
      kind: 'derivable',
      implemented: false,
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
    entryCount: 0,
    hasGermanModules: true,
    feature: {
      label: 'Aussprache',
      description:
        'Anders als bei Thai und Spanisch lässt sich die Aussprache NICHT aus der Schreibung ableiten: ⟨ough⟩ allein hat mindestens zehn Lesarten. Das Merkmal muss deshalb je Wort als Lautschrift hinterlegt werden, und die passende Übung ist der Vergleich ähnlicher Schreibungen (though/tough/through), keine Herleitung.',
      kind: 'per-word',
      implemented: false,
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

/** Reihenfolge in der Auswahl: erst was Inhalte hat, dann alphabetisch. */
export const LANGUAGE_ORDER: LanguageCode[] = [...LANGUAGE_CODES].sort((a, b) => {
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

/** Die Standardsprache: die erste mit Inhalten. */
export function defaultLanguage(): LanguageCode {
  return languagesWithContent()[0]?.code ?? 'th';
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

export function directionPrompt(direction: Direction): string {
  const language = languageOf(languageOfDirection(direction));
  // Kein zusammengebautes Adjektiv: aus „Thai" wuerde sonst „thaies".
  return direction.startsWith(`${HUB_LANGUAGE}_to_`)
    ? `Deutsch lesen, das Wort auf ${language.label} abrufen`
    : `${language.label} lesen, deutsche Bedeutung abrufen`;
}

export { directionsFor, languageOfDirection };
