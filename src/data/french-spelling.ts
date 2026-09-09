/**
 * Die französischen Betonungs-, Akzent- und e-Regeln als erhobene Daten.
 *
 * DIESELBE BAUART WIE `spanish-stress.ts` AUS PHASE 16: Was hier steht, ist
 * nicht ausgedacht, sondern am 2026-09-09 von den angegebenen
 * Wikipedia-Seiten geholt und wörtlich zitiert. Die Regeln stehen als Daten,
 * damit die Übungen sie **zeigen** können — eine Herleitung, deren
 * Begründung man nicht nachlesen kann, ist ein Orakel.
 *
 * EHRLICHE GRENZE GEGENÜBER SPANISCH: Die spanische Betonung ist aus der
 * Schreibung **ableitbar**; die französische steht an der letzten vollen
 * Silbe und ist damit regelhaft, aber nicht aus der Schreibung hergeleitet —
 * man muss wissen, welche Silben überhaupt gesprochen werden (das stumme
 * End-e). Genau deshalb trägt die französische Silbenauszeichnung das Flag
 * `mute` statt einer Herleitung.
 */

export const FRENCH_STRESS_SOURCE = {
  title: 'French phonology — Nature of stress in French',
  url: 'https://en.wikipedia.org/wiki/French_phonology',
  retrieved: '2026-09-09',
  stressQuote:
    'French having lexical stress falling on the final full syllable (syllable with a ' +
    'vowel other than schwa) of a word',
  notDistinctiveQuote:
    'word stress is not distinctive in French, so two words cannot be distinguished based ' +
    'on stress placement alone',
} as const;

export const FRENCH_SCHWA_SOURCE = {
  title: 'French phonology — Schwa',
  url: 'https://en.wikipedia.org/wiki/French_phonology',
  retrieved: '2026-09-09',
  quote:
    'also called e caduc ("dropped e") and e muet ("mute e"), is a mid-central vowel with ' +
    'some rounding … the fact that under certain conditions it has no phonetic realization',
} as const;

export const FRENCH_ACCENT_SOURCES = {
  acute: {
    title: 'French orthography — Diacritics',
    url: 'https://en.wikipedia.org/wiki/French_orthography',
    retrieved: '2026-09-09',
    quote: 'An acute accent over <e> represents /e/.',
  },
  grave: {
    title: 'French orthography — Diacritics',
    url: 'https://en.wikipedia.org/wiki/French_orthography',
    retrieved: '2026-09-09',
    quote:
      'A grave accent over <e> indicates /ɛ/ in positions where a plain <e> would be ' +
      'pronounced /ə/ (schwa).',
  },
  circumflex: {
    title: 'French orthography — Diacritics',
    url: 'https://en.wikipedia.org/wiki/French_orthography',
    retrieved: '2026-09-09',
    quote: 'A circumflex over <a, e, o> indicates /ɑ, ɛ, o/, respectively',
  },
  cedilla: {
    title: 'French orthography — Diacritics',
    url: 'https://en.wikipedia.org/wiki/French_orthography',
    retrieved: '2026-09-09',
    quote: 'A cedilla under <c> indicates that it is pronounced /s/ rather than /k/.',
  },
} as const;

/** Der Klang, den ein Akzentzeichen dem Buchstaben gibt. */
export type AccentSound = 'e_geschlossen' | 'e_offen' | 's_laut';

/** Eine Akzentregel als antwortbare Einheit — die Auswahl der Hör-Aufgabe. */
export type AccentRule = {
  /** Das Schriftstück, nach dem gefragt wird. */
  grapheme: string;
  /** Der Klangklassen-Schlüssel (Antwort-Index in `ACCENT_OPTIONS`). */
  sound: AccentSound;
  /** Die Lautschrift, so die Quelle sie angibt. */
  ipa: string;
  /** Welche Quelle den Satz trägt (Schlüssel in `FRENCH_ACCENT_SOURCES`). */
  source: keyof typeof FRENCH_ACCENT_SOURCES;
  /** Ein Satz auf Deutsch — die Erklärung nach der Antwort. */
  explanation: string;
};

/** Die vier Akzentzeichen, die diese Start-Übung kennt. */
export const ACCENT_RULES: AccentRule[] = [
  {
    grapheme: 'é',
    sound: 'e_geschlossen',
    ipa: '/e/',
    source: 'acute',
    explanation:
      'Der Accent aigu steht nur auf e und macht ihn geschlossen: é klingt wie in „Café“.',
  },
  {
    grapheme: 'è',
    sound: 'e_offen',
    ipa: '/ɛ/',
    source: 'grave',
    explanation: 'Der Accent grave macht e offen: père klingt offener als café.',
  },
  {
    grapheme: 'ê',
    sound: 'e_offen',
    ipa: '/ɛ/',
    source: 'circumflex',
    explanation: 'Der Circumflex bezeichnet auf e den offenen Laut /ɛ/ (être, fête).',
  },
  {
    grapheme: 'ç',
    sound: 's_laut',
    ipa: '/s/',
    source: 'cedilla',
    explanation: 'Die Cédille macht aus c ein s: français klingt wie „fransä“.',
  },
];

/** Die feste Antwort-Auswahl der Akzent-Übung — das „Inventar“ wie bei den Thai-Tönen. */
export const ACCENT_OPTIONS: { sound: AccentSound; label: string }[] = [
  { sound: 'e_geschlossen', label: 'geschlossen, wie in „Café“ (/e/)' },
  { sound: 'e_offen', label: 'offen, wie in „père“ (/ɛ/)' },
  { sound: 's_laut', label: 'wie ein s (/s/)' },
];

/**
 * Die Akzentzeichen-Schreibstücke eines Worts, in Reihenfolge.
 *
 * NUR DIE VIER GELERNTE ZEICHEN: é, è, ê, ç. Andere Diakritika (ë, ï, ù, œ)
 * kommen im A1-Grundstoff vor, haben aber hier noch keine Regel — und was
 * keine Regel hat, wird nicht gefragt, statt eine zu erfinden.
 */
export function accentGraphemesOf(term: string): string[] {
  const known = ACCENT_RULES.map((rule) => rule.grapheme);
  return [...term].filter((letter) => known.includes(letter));
}

/** Die Regel zu einem Schriftstück — `null` für unbekannte Zeichen. */
export function accentRuleFor(grapheme: string): AccentRule | null {
  return ACCENT_RULES.find((rule) => rule.grapheme === grapheme) ?? null;
}
