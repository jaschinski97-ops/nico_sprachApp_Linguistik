import { Tone } from '@/constants/tones';
import { translate } from '../i18n';
import type { UiLanguage } from '../i18n/types';
import {
  CLUSTER_BY_SPELLING,
  CONSONANT_BY_SYMBOL,
  CONSONANT_CLASS_LABEL,
  ConsonantClass,
  FinalKind,
  HO_NAM_FOLLOWERS,
  IMPLICIT_VOWEL,
  isToneMark,
  O_NAM_WORDS,
  SyllableShape,
  ThaiConsonant,
  TONE_MARKS,
  TONE_RULES,
  ToneMark,
  VOWEL_PATTERNS,
  VowelLength,
  VowelPattern,
} from '@/data/thai-script';

/**
 * Den Ton einer **einsilbigen** Schreibung herleiten (Phase 13).
 *
 * WAS DAS SOLL: Der Ton ist im Thai kein Gedaechtnisstoff, sondern folgt aus
 * vier Angaben — Konsonantenklasse, Vokallaenge, Schlusslaut und Tonzeichen.
 * Wer die Regel kennt, bestimmt den Ton eines **unbekannten** Wortes selbst.
 * Dieses Modul macht die Herleitung nachvollziehbar: es liefert nicht nur den
 * Ton, sondern die Schritte dorthin, die die Uebung dann anzeigt.
 *
 * NUR EINSILBIGES (Pflicht 3, AE-8 gilt weiter): Silbengrenzen sind in der
 * Thai-Schrift nicht markiert und lassen sich nicht verlaesslich raten —
 * ผลไม้ ist der Beleg aus Phase 3. Diese Analyse nimmt deshalb **eine** Silbe
 * entgegen und meldet einen benannten Fehlschlag, wenn die Schreibung sich
 * nicht als genau eine Silbe lesen laesst. Sie raet nichts.
 *
 * NICHTS AUS DEM GEDAECHTNIS: Klassen, Schlusslaute, Vokallaengen und die
 * Tonregeltabelle kommen aus `data/thai-script.ts` und damit aus der dort
 * genannten Quelle. Dieses Modul enthaelt keine eigene Sprachkenntnis, nur
 * das Zusammensetzen.
 */

export type InitialAnalysis = {
  /** Die Buchstaben, die den Anlaut schreiben — bei ห นำ also zwei. */
  written: string;
  /** Der Konsonant, der die **Klasse** bestimmt. */
  classFrom: ThaiConsonant;
  /** Der Konsonant, der wirklich **klingt**. Bei ห นำ der zweite. */
  soundFrom: ThaiConsonant;
  consonantClass: ConsonantClass;
  /** Warum die Klasse eine andere ist, als der klingende Buchstabe hergibt. */
  leading: 'ho-nam' | 'o-nam' | null;
  /** Echte Konsonantenverbindung wie ปล in ปลา — die Klasse kommt vom ersten. */
  cluster: boolean;
};

export type FinalAnalysis = {
  written: string;
  consonant: ThaiConsonant;
  kind: FinalKind;
};

export type DerivationStep = {
  /** Kurzer Name des Schritts, etwa „Anfangskonsonant". */
  label: string;
  /** Was an dieser Stelle in der Schrift steht. */
  value: string;
  /** Warum das so gelesen wird. */
  detail: string;
};

export type SyllableAnalysis = {
  ok: true;
  word: string;
  /** Die Schreibung ohne Tonzeichen — daran wird das Vokalmuster erkannt. */
  skeleton: string;
  initial: InitialAnalysis;
  vowel: {
    pattern: VowelPattern | null;
    display: string;
    length: VowelLength;
    ipa: string;
    /** `true` beim impliziten Vokal (zwei Konsonanten ohne Vokalzeichen). */
    implicit: boolean;
  };
  final: FinalAnalysis | null;
  toneMark: ToneMark | null;
  shape: SyllableShape;
  tone: Tone;
  steps: DerivationStep[];
  /**
   * Benannte Unsicherheit — die Herleitung steht, aber die Quelle laesst an
   * dieser Stelle mehr als eine Lesart zu. Muster ร้าน/นอน aus Phase 2.
   */
  uncertain: string | null;
};

export type SyllableFailure = {
  ok: false;
  word: string;
  /** Warum die Schreibung nicht als eine Silbe zu lesen war. */
  reason: string;
};

export type SyllableResult = SyllableAnalysis | SyllableFailure;

const HO = 'ห';
/** Aufhebungszeichen (thanthakhat): der Buchstabe darunter wird nicht gesprochen. */
const THANTHAKHAT = '์';

function isConsonant(character: string): boolean {
  return character in CONSONANT_BY_SYMBOL;
}

function consonant(character: string): ThaiConsonant {
  return CONSONANT_BY_SYMBOL[character];
}

function isHoNam(first: string, second: string): boolean {
  return first === HO && (HO_NAM_FOLLOWERS as readonly string[]).includes(second);
}

/**
 * Wie viele Buchstaben schreiben den Anlaut — einer oder zwei?
 *
 * Beide Faelle werden geprueft, und es gewinnt der, bei dem der Rest der
 * Schreibung aufgeht. ปลา geht nur mit zwei (ป + ล + า), หมอ ebenso
 * (ห นำ + ม + อ), ห้า dagegen nur mit einem.
 */
function initialAt(text: string, length: number): InitialAnalysis | null {
  if (text.length < length) return null;
  const first = text[0];
  if (!isConsonant(first)) return null;
  if (length === 1) {
    const only = consonant(first);
    return {
      written: first,
      classFrom: only,
      soundFrom: only,
      consonantClass: only.consonantClass,
      leading: null,
      cluster: false,
    };
  }
  const second = text[1];
  if (!isConsonant(second)) return null;
  const lead = consonant(first);
  const follower = consonant(second);
  if (isHoNam(first, second)) {
    return {
      written: first + second,
      classFrom: lead,
      soundFrom: follower,
      consonantClass: 'high',
      leading: 'ho-nam',
      cluster: false,
    };
  }
  // Nur die belegten Verbindungen gelten als solche. Ohne diese Schranke
  // waere jedes Konsonantenpaar eine Verbindung, und ตลาด (zwei Silben)
  // liefe faelschlich als eine durch - so gefunden in der Gegenprobe (AE-38).
  if (!(first + second in CLUSTER_BY_SPELLING)) return null;
  return {
    written: first + second,
    classFrom: lead,
    soundFrom: lead,
    consonantClass: lead.consonantClass,
    leading: null,
    cluster: true,
  };
}

type Match = {
  initial: InitialAnalysis;
  pattern: VowelPattern | null;
  final: FinalAnalysis | null;
  implicit: boolean;
};

function finalFrom(character: string): FinalAnalysis | null {
  if (!isConsonant(character)) return null;
  const entry = consonant(character);
  if (!entry.finalKind) return null;
  return { written: character, consonant: entry, kind: entry.finalKind };
}

/** Versucht ein Vokalmuster auf die Schreibung ohne Tonzeichen. */
function matchPattern(skeleton: string, pattern: VowelPattern): Match | null {
  if (!skeleton.startsWith(pattern.prefix)) return null;
  const afterPrefix = skeleton.slice(pattern.prefix.length);

  for (const initialLength of [1, 2]) {
    const initial = initialAt(afterPrefix, initialLength);
    if (!initial) continue;
    const afterInitial = afterPrefix.slice(initialLength);
    if (!afterInitial.startsWith(pattern.infix)) continue;
    const rest = afterInitial.slice(pattern.infix.length);

    if (pattern.final === 'none') {
      if (rest === pattern.suffix) return { initial, pattern, final: null, implicit: false };
      continue;
    }
    if (rest.length === 1) {
      const final = finalFrom(rest);
      if (final) return { initial, pattern, final, implicit: false };
      continue;
    }
    if (pattern.final === 'optional' && rest === '') {
      return { initial, pattern, final: null, implicit: false };
    }
  }
  return null;
}

/**
 * Der implizite Vokal: zwei Konsonanten ohne Vokalzeichen (คน, รถ, หก, ผม).
 *
 * Zuletzt geprueft, weil er auf fast jede Konsonantenfolge passt und sonst
 * echte Vokalmuster verdraengen wuerde.
 */
function matchImplicit(skeleton: string): Match | null {
  for (const initialLength of [1, 2]) {
    const initial = initialAt(skeleton, initialLength);
    if (!initial) continue;
    const rest = skeleton.slice(initialLength);
    if (rest.length !== 1) continue;
    const final = finalFrom(rest);
    if (final) return { initial, pattern: null, final, implicit: true };
  }
  return null;
}

/**
 * Lebend oder tot — und wenn tot, kurz oder lang.
 *
 * Wortlaut der Quelle: lebend ist „long vowel or vowel plus sonorant", tot
 * und kurz „short vowel at end or plus plosive", tot und lang „long vowel
 * plus plosive".
 */
export function syllableShape(
  length: VowelLength,
  final: FinalAnalysis | null,
  endsInSonorant: boolean
): SyllableShape {
  if (final?.kind === 'plosive') return length === 'long' ? 'dead-long' : 'dead-short';
  // Kein Verschlusslaut am Ende: lebend, sobald der Vokal lang ist oder das
  // Muster selbst auf einen Halbvokal endet (เ◌า, ไ◌, ◌ำ …).
  if (final || length === 'long' || endsInSonorant) return 'live';
  return 'dead-short';
}

export function toneFrom(
  consonantClass: ConsonantClass,
  shape: SyllableShape,
  mark: ToneMark | null
): Tone | null {
  if (!mark) return TONE_RULES.unmarked[shape][consonantClass];
  return TONE_RULES.marked[mark][consonantClass];
}

/**
 * Die Herleitungsschritte in der UI-SPRACHE (21.09.2026): Bisher standen
 * hier deutsche Sätze, die auf jeder Oberfläche erschienen. Die Bausteine
 * (Klassen-, Silbenart-, Tonnamen) kommen als übersetzte Parameter in
 * Schablonen — dieselbe Technik wie bei der spanischen Betonungsherkunft.
 * Default 'de' hält alle Bestandsaufrufer unverändert.
 */
/**
 * Die Herleitungsschablonen tragen EIN-Klammern-Parameter ({name}) — die
 * Wörterbücher behalten diese Form bewusst, weil die Übersetzungspipeline
 * sie 1:1 durchreicht. Diese kleine Füllung ersetzt sie lokal; das
 * {{doppel}}-Format des UI-Interpolators wäre hier doppelt gemoppelt.
 */
function fuelle(schablone: string, params: Record<string, string>): string {
  return schablone.replace(/\{(\w+)\}/g, (ganz, name: string) =>
    name in params ? params[name] : ganz
  );
}

function buildSteps(analysis: Omit<SyllableAnalysis, 'steps'>, ui: UiLanguage): DerivationStep[] {
  const { initial, vowel, final, toneMark, shape, tone } = analysis;
  const steps: DerivationStep[] = [];
  const klasse = (c: ConsonantClass) => translate(ui, `consonantClass.${c}`);
  const satz = (key: Parameters<typeof translate>[1], params: Record<string, string>) =>
    fuelle(translate(ui, key), params);

  let anfangsDetail: string;
  if (initial.leading === 'ho-nam') {
    anfangsDetail = satz('derivation.leadingHo', {
      raised: initial.soundFrom.symbol,
      from: klasse(initial.soundFrom.consonantClass),
      to: klasse('high'),
    });
  } else if (initial.leading === 'o-nam') {
    anfangsDetail = satz('derivation.leadingO', { raised: initial.soundFrom.symbol, to: klasse('mid') });
  } else if (initial.cluster) {
    anfangsDetail = satz('derivation.cluster', {
      written: initial.written,
      symbol: initial.classFrom.symbol,
      name: initial.classFrom.name,
    });
  } else {
    anfangsDetail = satz('derivation.initialPlain', {
      name: initial.classFrom.name,
      ipa: initial.classFrom.initialIpa,
    });
  }

  steps.push({
    label: translate(ui, 'derivation.stepInitial'),
    value: initial.written,
    detail: anfangsDetail,
  });

  steps.push({
    label: translate(ui, 'derivation.stepClass'),
    value: klasse(initial.consonantClass),
    detail: translate(ui, 'derivation.classDetail'),
  });

  let vokalDetail: string;
  if (vowel.implicit) {
    vokalDetail = satz(
      vowel.length === 'long' ? 'derivation.vowelLongImplicit' : 'derivation.vowelShortImplicit',
      { ipa: vowel.ipa }
    );
  } else {
    vokalDetail = satz(
      vowel.length === 'long' ? 'derivation.vowelLong' : 'derivation.vowelShort',
      { ipa: vowel.ipa }
    );
  }

  steps.push({
    label: translate(ui, 'derivation.stepVowel'),
    value: vowel.display,
    detail: vokalDetail,
  });

  steps.push({
    label: translate(ui, 'derivation.stepFinal'),
    value: final ? final.written : '—',
    detail: final
      ? satz(final.kind === 'plosive' ? 'derivation.finalPlosive' : 'derivation.finalSonorant', {
          name: final.consonant.name,
          ipa: final.consonant.finalIpa ?? '',
        })
      : translate(ui, 'derivation.finalNone'),
  });

  steps.push({
    label: translate(ui, 'derivation.stepShape'),
    value: translate(ui, `derivation.shape.${shape}`),
    detail: translate(ui, `derivation.explain.${shape}`),
  });

  steps.push({
    label: translate(ui, 'derivation.stepMark'),
    value: toneMark ? `${toneMark} (${TONE_MARKS[toneMark].nameRtgs})` : translate(ui, 'derivation.markNone'),
    detail: translate(ui, toneMark ? 'derivation.markPresent' : 'derivation.markAbsent'),
  });

  steps.push({
    label: translate(ui, 'derivation.stepResult'),
    value: translate(ui, `tone.${tone}`),
    detail: satz('derivation.resultFormula', {
      a: klasse(initial.consonantClass),
      b: toneMark ? TONE_MARKS[toneMark].nameRtgs : translate(ui, `derivation.shape.${shape}`),
      tone: translate(ui, `tone.${tone}`),
    }),
  });

  return steps;
}

/**
 * Zerlegt eine einsilbige Schreibung und leitet den Ton her.
 *
 * Gibt bei Erfolg die vollstaendige Herleitung zurueck, sonst einen benannten
 * Grund. Es wird nie geraten: Was sich nicht eindeutig lesen laesst, faellt
 * durch.
 */
export function analyzeSyllable(word: string, ui: UiLanguage = 'de'): SyllableResult {
  const trimmed = word.trim();
  if (!trimmed) return { ok: false, word, reason: 'Leere Eingabe.' };

  if (trimmed.includes(THANTHAKHAT)) {
    return {
      ok: false,
      word,
      reason:
        'Enthaelt das Aufhebungszeichen ์ (thanthakhat). Welcher Buchstabe dann stumm ist, gehoert zur Herkunft des Wortes und steht nicht in den Schriftregeln.',
    };
  }

  const marks = [...trimmed].filter(isToneMark);
  if (marks.length > 1) {
    return { ok: false, word, reason: 'Mehr als ein Tonzeichen — das ist keine einzelne Silbe.' };
  }
  const toneMark = (marks[0] ?? null) as ToneMark | null;
  let skeleton = [...trimmed].filter((character) => !isToneMark(character)).join('');

  // อ นำ: laut Quelle genau vier Woerter. Deshalb ein Abgleich mit der Liste
  // und keine Regel - eine Regel wuerde mehr behaupten als die Quelle hergibt.
  const oNam = (O_NAM_WORDS as readonly string[]).includes(trimmed);
  if (oNam) skeleton = skeleton.slice(1);

  const unknown = [...skeleton].find(
    (character) => !isConsonant(character) && !VOWEL_SIGNS.has(character)
  );
  if (unknown) {
    return {
      ok: false,
      word,
      reason: `Das Zeichen „${unknown}" gehoert nicht zu den Konsonanten oder Vokalzeichen dieser Datengrundlage.`,
    };
  }

  let match: Match | null = null;
  for (const pattern of VOWEL_PATTERNS) {
    match = matchPattern(skeleton, pattern);
    if (match) break;
  }
  if (!match) match = matchImplicit(skeleton);

  if (!match) {
    return {
      ok: false,
      word,
      reason:
        'Kein Vokalmuster passt auf diese Schreibung. Das spricht fuer mehr als eine Silbe — und Silbengrenzen sind in der Thai-Schrift nicht markiert (AE-8).',
    };
  }

  let initial = match.initial;
  if (oNam) {
    initial = {
      ...initial,
      written: 'อ' + initial.written,
      consonantClass: 'mid',
      leading: 'o-nam',
      classFrom: consonant('อ'),
    };
  }

  const pattern = match.pattern;
  const length: VowelLength = pattern ? pattern.length : IMPLICIT_VOWEL.length;
  const endsInSonorant = Boolean(pattern?.endsInSonorant);
  const shape = syllableShape(length, match.final, endsInSonorant);
  const tone = toneFrom(initial.consonantClass, shape, toneMark);

  if (!tone) {
    return {
      ok: false,
      word,
      reason: `Die Kombination ${CONSONANT_CLASS_LABEL[initial.consonantClass]} mit ${
        toneMark ? TONE_MARKS[toneMark].nameRtgs : 'ohne Zeichen'
      } kommt in der Tonregel nicht vor — laut Quelle stehen mai tri und mai chattawa nur bei Mittelklasse.`,
    };
  }

  // Die beiden Datennotizen (implizites Vokalzeichen, ล-Ausnahme) sind im
  // Datensatz deutsch — übersetzt hier über Schlüssel (21.09.2026).
  const uncertainParts: string[] = [];
  if (match.implicit) uncertainParts.push(translate(ui, 'derivation.uncertainImplicit'));
  if (match.final?.consonant.uncertainNote) uncertainParts.push(translate(ui, 'derivation.uncertainFinalLing'));

  const base: Omit<SyllableAnalysis, 'steps'> = {
    ok: true,
    word: trimmed,
    skeleton,
    initial,
    vowel: {
      pattern,
      display: pattern ? pattern.display : IMPLICIT_VOWEL.display,
      length,
      ipa: pattern ? pattern.ipa : IMPLICIT_VOWEL.ipa,
      implicit: match.implicit,
    },
    final: match.final,
    toneMark,
    shape,
    tone,
    uncertain: uncertainParts.length > 0 ? uncertainParts.join(' ') : null,
  };

  return { ...base, steps: buildSteps(base, ui) };
}

/** Alle Vokalzeichen, die in den Mustern vorkommen — fuer die Eingabepruefung. */
const VOWEL_SIGNS = new Set<string>(
  VOWEL_PATTERNS.flatMap((pattern) => [
    ...pattern.prefix,
    ...pattern.infix,
    ...pattern.suffix,
  ]).filter((character) => !isConsonant(character))
);
