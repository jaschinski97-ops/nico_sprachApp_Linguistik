import {
  ACUTE_TO_PLAIN,
  DIFFERENTIAL_ACCENTS,
  DIGRAPHS,
  INSEPARABLE_ONSETS,
  STRONG_VOWELS,
  WEAK_ACCENTED,
  WEAK_VOWELS,
} from '@/data/spanish-stress';

import { DerivationStep } from '../reading/syllable';

/**
 * Die spanische Betonung aus der Schreibung herleiten (Phase 16).
 *
 * DASSELBE VORHABEN WIE PHASE 13, ANDERE SPRACHE: Die Quelle sagt, die
 * spanische Betonung sei „marked **unequivocally** through a series of
 * orthographic rules" (AE-44). Wenn das stimmt, ist sie kein Gedächtnisstoff,
 * und die richtige Übung ist eine Herleitung — Wort zeigen, bestimmen lassen,
 * den Weg erklären.
 *
 * DER HAKEN, DEN AE-44 SCHON BENANNT HAT: Die Regel setzt eine
 * **Silbenzählung** voraus, und die hat eigene Regeln — Diphthonge, Hiatus,
 * das stumme ⟨h⟩, unteilbare Anlautverbindungen. Wer die überspringt, zählt
 * falsch und leitet folglich falsch ab. Deshalb steht die Silbenzählung hier
 * zuerst und vollständig, mit ihrer eigenen Quelle.
 *
 * DIE GEGENPROBE IST NICHT ZIRKULÄR. Jeder spanische Eintrag trägt die
 * Lautschrift aus Wiktionary, und die enge Umschrift dort markiert die
 * Silbengrenzen selbst (`[ˈme.ð̞i.ko]`). Ein Test vergleicht die hier
 * abgeleitete Silbenzahl und betonte Silbe gegen diese unabhängige Angabe —
 * so, wie Phase 13 die hergeleiteten Töne gegen die quellengeprüften hielt.
 *
 * WAS DIESES MODUL NICHT KANN: mehrere Wörter, Eigennamen mit fremder
 * Betonung, Verbformen mit angehängten Pronomen (`mándamelo`), und das
 * Sonderpaar ⟨tl⟩, das die Quelle ausdrücklich auf zwei Arten trennen lässt.
 * Es meldet einen benannten Fehlschlag, statt zu raten.
 */

type Unit = { text: string; kind: 'vowel' | 'consonant' | 'silent' };

const VOWELS = STRONG_VOWELS + WEAK_VOWELS + WEAK_ACCENTED;

export type StressAnalysis = {
  ok: true;
  word: string;
  /** Die Silben in der Schreibung des Wortes, etwa `['mé', 'di', 'co']`. */
  syllables: string[];
  /** Welche Silbe die Betonung trägt, von 0 an. */
  stressedIndex: number;
  /** Wie die Regel heißt, die hier gegriffen hat. */
  rule: 'acute' | 'monosyllable' | 'penultimate' | 'final';
  steps: DerivationStep[];
  /**
   * Benannte Unsicherheit — die Antwort steht, aber die Begründung ist eine
   * andere als die Regel nahelegt. Betrifft die Wörter mit unterscheidendem
   * Akut (`dónde`, `sí`, `té`): Dort verschiebt der Akut die Betonung nicht,
   * er trennt zwei gleich geschriebene Wörter.
   */
  uncertain: string | null;
};

export type StressFailure = { ok: false; word: string; reason: string };
export type StressResult = StressAnalysis | StressFailure;

/**
 * Das Wort in Einheiten zerlegen.
 *
 * Drei Dinge passieren hier, die man später nicht mehr nachholen kann:
 * ⟨qu⟩ und ⟨gu⟩ vor ⟨e i⟩ werden zu **einem** Konsonanten, weil das ⟨u⟩ dort
 * stumm ist (`que` ist /ke/, nicht /kue/); die Digraphen ⟨ch ll rr⟩ werden zu
 * einem Zeichen, weil sie nie geteilt werden; und ⟨h⟩ wird als `silent`
 * markiert statt entfernt — es zählt bei der Trennung nicht mit, muss aber in
 * der angezeigten Silbe stehen bleiben (`hue-vo`, nicht `ue-vo`).
 */
export function units(word: string): Unit[] {
  const out: Unit[] = [];
  let i = 0;
  while (i < word.length) {
    const one = word[i];
    const two = word.slice(i, i + 2);
    const next = word[i + 2];
    if ((two === 'qu' || two === 'gu') && next !== undefined && 'eiéí'.includes(next)) {
      out.push({ text: two, kind: 'consonant' });
      i += 2;
    } else if ((DIGRAPHS as readonly string[]).includes(two)) {
      out.push({ text: two, kind: 'consonant' });
      i += 2;
    } else if (one === 'h') {
      out.push({ text: one, kind: 'silent' });
      i += 1;
    } else if (VOWELS.includes(one)) {
      out.push({ text: one, kind: 'vowel' });
      i += 1;
    } else {
      out.push({ text: one, kind: 'consonant' });
      i += 1;
    }
  }
  return out;
}

/**
 * Vokale zu Silbenkernen zusammenfassen.
 *
 * Die eine Regel, aus der alles folgt: Ein Diphthong entsteht, wenn einer der
 * beiden Vokale ein **unbetonter** hoher Vokal ist. Zwei starke Vokale bleiben
 * getrennt (`le-er`), und ein hoher Vokal MIT Akut bleibt es auch — genau das
 * ist der Zweck des Akuts in `día` und `frío`. Das stumme ⟨h⟩ steht dem nicht
 * im Weg, sagt die Quelle ausdrücklich.
 */
function nuclei(us: Unit[]): number[][] {
  const groups: number[][] = [];
  let open: number[] | null = null;
  us.forEach((unit, index) => {
    if (unit.kind === 'silent') return;
    if (unit.kind !== 'vowel') {
      open = null;
      return;
    }
    if (open === null) {
      open = [index];
      groups.push(open);
      return;
    }
    const previous = us[open[open.length - 1]].text;
    const diphthong =
      (WEAK_VOWELS.includes(previous) || WEAK_VOWELS.includes(unit.text)) &&
      !WEAK_ACCENTED.includes(previous) &&
      !WEAK_ACCENTED.includes(unit.text);
    if (diphthong) {
      open.push(index);
    } else {
      open = [index];
      groups.push(open);
    }
  });
  return groups;
}

/** Die Silben eines Wortes, oder ein benannter Fehlschlag. */
export function syllabify(word: string): { ok: true; syllables: string[] } | StressFailure {
  const lower = word.toLowerCase().trim();
  if (!lower) return { ok: false, word, reason: 'Leere Eingabe.' };
  if (/\s/.test(lower)) {
    return { ok: false, word, reason: 'Mehrere Wörter — die Regel gilt je Wort.' };
  }
  if (!/^[a-záéíóúüñ]+$/.test(lower)) {
    return { ok: false, word, reason: 'Enthält Zeichen, die nicht zum spanischen Alphabet gehören.' };
  }
  if (lower.includes('tl')) {
    // Die Quelle laesst ausdruecklich zwei Trennungen zu (at-le-ta / a-tle-ta).
    // Beide ergeben dieselbe Silbenzahl, aber eine Uebung, die eine davon als
    // richtig ausgibt, behauptet mehr als die Quelle hergibt.
    return { ok: false, word, reason: '⟨tl⟩ lässt die Quelle auf zwei Arten trennen.' };
  }

  const us = units(lower);
  const groups = nuclei(us);
  if (groups.length === 0) return { ok: false, word, reason: 'Kein Vokal — keine Silbe.' };

  const boundaries: number[] = [];
  for (let n = 1; n < groups.length; n++) {
    const after = groups[n - 1][groups[n - 1].length - 1] + 1;
    const before = groups[n][0];
    const between: number[] = [];
    for (let i = after; i < before; i++) if (us[i].kind === 'consonant') between.push(i);

    if (between.length === 0) {
      boundaries.push(after);
    } else if (between.length === 1) {
      // „Wenn ein Vokal auf einen Konsonanten folgt, beginnt der Konsonant
      // die neue Silbe" - pá-ja-ro.
      boundaries.push(between[0]);
    } else {
      const lastTwo = us[between[between.length - 2]].text + us[between[between.length - 1]].text;
      boundaries.push(
        INSEPARABLE_ONSETS.includes(lastTwo)
          ? between[between.length - 2]
          : between[between.length - 1]
      );
    }
  }

  const syllables: string[] = [];
  let start = 0;
  for (const boundary of boundaries) {
    syllables.push(us.slice(start, boundary).map((u) => u.text).join(''));
    start = boundary;
  }
  syllables.push(us.slice(start).map((u) => u.text).join(''));
  return { ok: true, syllables };
}

function hasAcute(syllable: string): boolean {
  return [...syllable].some((letter) => letter in ACUTE_TO_PLAIN);
}

/**
 * Die Betonung herleiten — mit den Schritten, die dorthin geführt haben.
 *
 * Die Schritte sind der Punkt der Übung, nicht die Antwort. Wer einmal
 * nachvollzogen hat, dass `comer` auf ⟨r⟩ endet und deshalb hinten betont
 * wird, kann es bei `beber` und `vivir` selbst.
 */
export function analyzeStress(word: string): StressResult {
  const split = syllabify(word);
  if (!split.ok) return split;

  const lower = word.toLowerCase().trim();
  const syllables = split.syllables;
  const steps: DerivationStep[] = [
    {
      label: 'Silben',
      value: syllables.join('·'),
      detail:
        syllables.length === 1
          ? 'Ein Silbenkern, also eine Silbe.'
          : `${syllables.length} Silbenkerne. Diphthonge zählen als einer, ` +
            'ein Akut auf „i" oder „u" trennt sie wieder.',
    },
  ];

  const acuteAt = syllables.findIndex(hasAcute);
  if (acuteAt >= 0) {
    const differential = DIFFERENTIAL_ACCENTS.includes(lower);
    steps.push({
      label: 'Akut',
      value: syllables[acuteAt],
      detail: differential
        ? 'Hier unterscheidet der Akut zwei gleich geschriebene Wörter — die ' +
          'Betonung läge auch ohne ihn auf dieser Silbe.'
        : 'Ein geschriebener Akut steht immer auf der betonten Silbe. Damit ist ' +
          'die Grundregel außer Kraft.',
    });
    return {
      ok: true,
      word,
      syllables,
      stressedIndex: acuteAt,
      rule: 'acute',
      steps,
      uncertain: differential
        ? 'Der Akut steht hier nicht für die Betonung, sondern zur Unterscheidung ' +
          '(etwa „sí" gegen „si"). Die Antwort stimmt, die Begründung ist eine andere.'
        : null,
    };
  }

  if (syllables.length === 1) {
    steps.push({
      label: 'Einsilbig',
      value: syllables[0],
      detail: 'Es gibt nur eine Silbe — sie trägt die Betonung.',
    });
    return { ok: true, word, syllables, stressedIndex: 0, rule: 'monosyllable', steps, uncertain: null };
  }

  const last = lower[lower.length - 1];
  const beforeLast = lower[lower.length - 2];
  const endsInVowel = 'aeiouáéíóú'.includes(last);
  const endsInNS = last === 'n' || last === 's';
  const nsAfterVowel = endsInNS && VOWELS.includes(beforeLast);

  if (endsInVowel || nsAfterVowel) {
    steps.push({
      label: 'Wortende',
      value: last,
      detail: endsInVowel
        ? 'Das Wort endet auf einen Vokal.'
        : `Das Wort endet auf „${last}" nach einem Vokal.`,
    });
    steps.push({
      label: 'Grundregel',
      value: syllables[syllables.length - 2],
      detail: 'Endet ein Wort auf Vokal, „n" oder „s", liegt die Betonung auf der vorletzten Silbe.',
    });
    return {
      ok: true,
      word,
      syllables,
      stressedIndex: syllables.length - 2,
      rule: 'penultimate',
      steps,
      uncertain: null,
    };
  }

  steps.push({
    label: 'Wortende',
    value: endsInNS ? `${beforeLast}${last}` : last,
    detail: endsInNS
      ? `„${last}" steht hier hinter einem Konsonanten — dann greift die Ausnahme nicht.`
      : `Das Wort endet auf „${last}", also weder auf Vokal noch auf „n" oder „s".`,
  });
  steps.push({
    label: 'Grundregel',
    value: syllables[syllables.length - 1],
    detail: 'Bei jedem anderen Schlusslaut liegt die Betonung auf der letzten Silbe.',
  });
  return {
    ok: true,
    word,
    syllables,
    stressedIndex: syllables.length - 1,
    rule: 'final',
    steps,
    uncertain: null,
  };
}

/**
 * Wie eine Silbenfolge angezeigt wird, wenn nur der Text zählt.
 *
 * Bewusst mit Bindestrich und nicht mit dem Trennpunkt aus Wiktionary: Der
 * Bindestrich steht auch im Thai-Grundstock zwischen den Umschriftsilben, und
 * zwei verschiedene Trennzeichen in derselben App wären eine Unterscheidung
 * ohne Unterschied.
 */
export function joinSyllables(syllables: string[]): string {
  return syllables.join('-');
}
