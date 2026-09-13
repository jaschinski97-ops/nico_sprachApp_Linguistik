import { VOCABULARY_EN, VOCABULARY_ES, VOCABULARY_TH } from '@/data/vocabulary';
import { languageDisplayName, type UiLanguage } from '@/lib/i18n';

import {
  Direction,
  directionsFor,
  HUB_LANGUAGE,
  Lang,
  LANGUAGE_CODES,
  LanguageCode,
  LanguageDefinition,
  languageOfDirection,
  languageOfTargetDirection,
  Pair,
  TARGET_LANGUAGES,
  TargetDirection,
  TargetLanguage,
} from './types';

/**
 * Welche Sprachen es gibt, was sie besonders macht und ob sie Inhalte haben.
 *
 * EINE STELLE, DIE ALLES WEISS. Wer eine weitere Sprache ergänzen will, trägt
 * sie hier ein und liefert ihren Grundstock — die Oberfläche, die Auswahl und
 * die Zählung ziehen von hier.
 *
 * SEIT DEM PAARMATRIX-MODELL (Roadmap v2) TRENNT DIE REGISTRY ZWEI FRAGEN:
 * „Was hat geprüften Stoff?“ (`entryCount`) und „Was ist auf jedem Gerät?“
 * (`delivered`). Französisch hat einen 150 Einträge umfassenden A1-Grundstoff, aber keinen
 * App-Bestand — die Auswahl zeigt es ehrlich als „noch nicht lernbar“, und
 * `hasContent` hält es aus dem Sprachwechsel heraus, bis sein Paket
 * ausgeliefert ist.
 */

export const LANGUAGES: Record<(typeof TARGET_LANGUAGES)[number], LanguageDefinition> = {
  th: {
    code: 'th',
    label: 'Thai',
    endonym: 'ภาษาไทย',
    speechLocale: 'th-TH',
    challenge: 'Fünf Töne, die Bedeutung tragen — und eine eigene Schrift.',
    entryCount: VOCABULARY_TH.length,
    hasGermanModules: true,
    delivered: true,
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
    delivered: true,
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
    delivered: true,
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

export function languageOf(code: TargetLanguage): LanguageDefinition {
  return LANGUAGES[code];
}

/**
 * Ist diese Sprache überhaupt lernbar, oder steht sie nur in der Liste?
 *
 * SEIT DEM PAARMATRIX-MODELL EINE ZWEI TEILIGE FRAGE: `entryCount > 0`
 * heißt „geprüfter Stoff liegt vor“, `delivered` heißt „er ist auf jedem
 * Gerät“. Erst beides zusammen macht eine Sprache wählbar — ein Grundstoff
 * ohne Auslieferung wäre eine leere Versprechung.
 */
export function hasContent(code: TargetLanguage): boolean {
  return LANGUAGES[code].entryCount > 0 && LANGUAGES[code].delivered;
}

export function languagesWithContent(): LanguageDefinition[] {
  return LANGUAGE_ORDER.map(languageOf).filter((language) => language.entryCount > 0);
}

/** Die Standardsprache — die Vorgabe, solange sie Inhalte hat. */
export function defaultLanguage(): LanguageCode {
  if (hasContent(DEFAULT_LANGUAGE)) return DEFAULT_LANGUAGE;
  // Die Liste kommt aus LANGUAGE_ORDER und damit aus LANGUAGE_CODES — der
  // erste Code ist deshalb immer einer aus dem Bestand, nie das (noch nicht
  // ausgelieferte) Französisch.
  return (languagesWithContent()[0]?.code ?? DEFAULT_LANGUAGE) as LanguageCode;
}

/**
 * Beschriftung einer Richtung, aus dem Verzeichnis gebaut statt als Tabelle
 * gepflegt — sonst müsste jede neue Sprache an zwei Stellen nachgetragen
 * werden, und eine davon würde vergessen.
 *
 * SEIT DEM PAARMATRIX-START FÜR ALLE deutsch-geankerten Richtungen offen
 * (`TargetDirection`): Auch „Deutsch → Französisch” wird hier aus dem
 * Verzeichnis beschriftet, statt eine zweite Tabelle zu pflegen.
 *
 * SEIT DEM i18N-GERÜST MEHRSPRACHIG: Die Namen kommen aus
 * `LANGUAGE_DISPLAY_NAMES`, also in der Sprache der OBERFLÄCHE — ein
 * Thailänder sieht „ไทย → ภาษาเยอรมัน”. Ohne Angabe gilt Deutsch (die
 * Referenzsprache): Der providerlose Fall — Tests und Aufrufer ohne
 * UI-Kontext — bleibt damit exakt so, wie er war. Wer die aktive
 * UI-Sprache kennt (`useLocale().uiLanguage`), reicht sie durch.
 */
export function directionLabel(direction: TargetDirection, ui: UiLanguage = 'de'): string {
  const ziel = languageDisplayName(languageOfTargetDirection(direction), ui);
  const deutsch = languageDisplayName('de', ui);
  return direction.startsWith(`${HUB_LANGUAGE}_to_`)
    ? `${deutsch} → ${ziel}`
    : `${ziel} → ${deutsch}`;
}

// `directionPrompt` gab es bis Phase 18: ein Satz wie „Deutsch lesen, das Wort
// auf Thai abrufen". Er stand auf jeder Richtungskarte und sagte nichts, was
// die Beschriftung „Deutsch → Thai" nicht schon sagt. An seine Stelle ist im
// Lernen-Reiter die Liste der Fertigkeiten getreten - die Angabe, nach der man
// wirklich auswaehlt.

export { directionsFor, languageOfDirection };

/**
 * Beschriftung aller fünf Kanon-Sprachen — Deutsch inklusive.
 *
 * DER GRUND FÜR DIE KLEINE TABELLE: Deutsch ist keine Ziel-Sprache mit
 * Grundstoff (`LANGUAGE_CODES`), taucht aber auf jeder Seite eines Paars auf.
 * Ein `Record<Lang, string>` hält die Beschriftung an **einer** Stelle, und
 * `pairLabel` liest sie, statt Deutsch zu hartkodieren.
 */
export const LANGUAGE_LABELS: Record<Lang, string> = {
  de: 'Deutsch',
  en: LANGUAGES.en.label,
  es: LANGUAGES.es.label,
  th: LANGUAGES.th.label,
};

/** Beschriftung eines Paars — „Englisch → Französisch“ statt `en_to_fr`. */
export function pairLabel(pair: Pair): string {
  return `${LANGUAGE_LABELS[pair.source]} → ${LANGUAGE_LABELS[pair.target]}`;
}

/** Alle 20 Paare des Kanons — aus `types.ts` hier nur weitergereicht. */
export { PAIRS as ALL_PAIRS } from './types';
