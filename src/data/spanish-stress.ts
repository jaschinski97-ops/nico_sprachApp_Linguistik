/**
 * Die spanischen Silben- und Betonungsregeln als erhobene Daten (Phase 16).
 *
 * DIESELBE BAUART WIE `thai-script.ts` AUS PHASE 13: Was hier steht, ist
 * nicht ausgedacht, sondern am 2026-09-04 über die MediaWiki-API im Rohtext
 * aus dem englischen Wikipedia geholt und abschnittsgenau zitiert. Die Regeln
 * stehen als Daten, damit die Übung sie **zeigen** kann — eine Herleitung,
 * deren Begründung man nicht nachlesen kann, ist ein Orakel.
 */

export const SPANISH_STRESS_SOURCE = {
  title: 'Spanish orthography',
  section: 'Stress and accentuation',
  url: 'https://en.wikipedia.org/wiki/Spanish_orthography#Stress_and_accentuation',
  retrieved: '2026-09-04',
  quote:
    'Stress in Spanish is marked unequivocally through a series of orthographic rules. ' +
    'The default stress is on the penultimate (next-to-last) syllable on words that end in ' +
    'a vowel, ⟨n⟩ or ⟨s⟩ (not preceded by another consonant) and on the final syllable when ' +
    'the word ends in any consonant other than ⟨n⟩ or ⟨s⟩ or in a consonant group. Words ' +
    'that do not follow the default stress have an acute accent over the stressed vowel.',
} as const;

export const SPANISH_SYLLABLE_SOURCE = {
  title: 'Spanish orthography',
  section: 'Syllabification',
  url: 'https://en.wikipedia.org/wiki/Spanish_orthography#Syllabification',
  retrieved: '2026-09-04',
  quote:
    'If a vowel is followed by two consonants, the syllables divide between the consonants: ' +
    'can-tar, ver-ter, án-da-le. However, ch, ll, rr and combinations of b, c, d, f, g, k, p, t ' +
    'plus r or l do not divide: pe-rro, lu-char, ca-lle, pro-gra-ma, ha-blar. … ' +
    'The silent h is not taken into account when syllabifying words.',
} as const;

export const SPANISH_DIPHTHONG_SOURCE = {
  title: 'Spanish orthography',
  section: 'Stress and accentuation',
  url: 'https://en.wikipedia.org/wiki/Spanish_orthography#Stress_and_accentuation',
  retrieved: '2026-09-04',
  quote:
    'A diphthong is any sequence of an unstressed high vowel (⟨i⟩ or ⟨u⟩) with another vowel … ' +
    'An accent over the high vowel (⟨i⟩ or ⟨u⟩) of a vowel sequence prevents it from being a ' +
    'diphthong (i.e., it signals a hiatus): for example, tía, dúo, oír and baúl all have two ' +
    'syllables each. In the intervocalic position, the letter ⟨h⟩ does not necessarily mark a ' +
    'hiatus and therefore does not prevent the formation of a diphthong.',
} as const;

/** Starke Vokale — zwei davon nebeneinander ergeben einen Hiatus. */
export const STRONG_VOWELS = 'aeoáéó';
/** Hohe (schwache) Vokale — unbetont bilden sie mit jedem Vokal einen Diphthong. */
export const WEAK_VOWELS = 'iuü';
/**
 * Hohe Vokale MIT Akut. Sie sind der Sonderfall, der die Regel trägt: Der
 * Akut steht hier nicht für die Betonung im Sinne der Grundregel, sondern
 * bricht den Diphthong auf (día = dí-a, zwei Silben).
 */
export const WEAK_ACCENTED = 'íú';

export const ACUTE_TO_PLAIN: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
};

/** Zweizeichen-Konsonanten, die als EIN Zeichen zählen und nie geteilt werden. */
export const DIGRAPHS = ['ch', 'll', 'rr'] as const;

/**
 * Anlautverbindungen, die zusammen in die nächste Silbe gehen.
 *
 * Aus der Quelle: „combinations of b, c, d, f, g, k, p, t plus r or l do not
 * divide". Ohne diese Schranke käme `ha-blar` als `hab-lar` heraus und
 * `li-bro` als `lib-ro` — beides falsch, und beides hätte die Silbenzahl
 * nicht verändert, also die Betonung auch nicht. Der Fehler wäre in der
 * **Anzeige** aufgefallen, nicht im Ergebnis; deshalb steht die Liste hier
 * und nicht als Randbemerkung.
 */
export const INSEPARABLE_ONSETS: readonly string[] = (() => {
  const out: string[] = [];
  for (const first of 'bcdfgkpt') for (const second of 'rl') out.push(first + second);
  return out;
})();

/**
 * Wörter, deren Akut NICHT die Betonung verschiebt, sondern zwei gleich
 * geschriebene Wörter unterscheidet.
 *
 * Quelle: „In eight cases, the written accent is used to distinguish stressed
 * monosyllabic words from clitics" — dazu die Fragewörter. Für die Herleitung
 * ist das der ehrliche Sonderfall: Die Antwort stimmt, die Begründung „wegen
 * des Akuts" wäre aber falsch. `dónde` wird auch ohne Zeichen auf `don`
 * betont. Solche Wörter kommen deshalb in der Übung mit einem Vorbehalt
 * vor — dieselbe Behandlung wie eine unsichere Herleitung in Phase 13.
 */
export const DIFFERENTIAL_ACCENTS: readonly string[] = [
  'dé',
  'él',
  'más',
  'mí',
  'sé',
  'sí',
  'té',
  'tú',
  'qué',
  'quién',
  'dónde',
  'cómo',
  'cuándo',
  'cuál',
  'cuánto',
];
