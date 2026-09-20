import { translate, type UiLanguage } from '@/lib/i18n';
import { LanguageCode } from '@/lib/languages/types';

import { VOCABULARY_TH } from './vocabulary';
import { activeVocabulary, usesGeneratedVocabulary } from './active-vocabulary';
import type { VocabEntry } from './vocab-types';

/** Rule-based review of existing examples, not a claim of verbatim corpus attestation. */
export const SENTENCE_SOURCES = {
  svo: 'https://seasite.niu.edu/Thai/maanii1/lesson1/structureUni.htm',
  questions: 'https://seasite.niu.edu/thai/FLTH/1styearthai.htm',
  stative: 'https://seasite.niu.edu/thai/maanii1/lesson6/structure.htm',
  complement: 'https://seasite.niu.edu/Thai/spokenthai/unit2/word_study.htm',
  give: 'https://seasite.niu.edu/thai/maanii1/lesson15/dai/hai.htm',
} as const;
type Rule = keyof typeof SENTENCE_SOURCES;
type Review = { rule: Rule; focus: string; wrong: [string, string] };
// German distractors preserve the subject/object/topic wherever possible;
// a recognised isolated noun is insufficient to choose the sentence meaning.
const REVIEWS: Record<string, Review> = {
  mai_neg: { rule: 'questions', focus: 'ไม่ verneint กิน.', wrong: ['Ich esse Schweinefleisch.', 'Du isst kein Schweinefleisch.'] },
  phom: { rule: 'svo', focus: 'ผม ist der Sprecher; ชอบ bedeutet mögen.', wrong: ['Du magst Kaffee.', 'Ich mag keinen Kaffee.'] },
  chan: { rule: 'svo', focus: 'ฉัน geht; ตลาด ist das Ziel.', wrong: ['Du gehst zum Markt.', 'Ich gehe nicht zum Markt.'] },
  khun: { rule: 'questions', focus: 'อะไร fragt nach dem Gegenstand des Essens.', wrong: ['Wer isst?', 'Warum isst du?'] },
  rao: { rule: 'svo', focus: 'เรา ist hier mit wir übersetzt.', wrong: ['Du gehst zur Schule.', 'Wir gehen nicht zur Schule.'] },
  arai: { rule: 'questions', focus: 'อะไร fragt, was getan wird.', wrong: ['Wer macht das?', 'Warum machst du das?'] },
  khrai: { rule: 'questions', focus: 'ใคร steht an der Stelle der gesuchten Person.', wrong: ['Wer geht?', 'Warum kommst du?'] },
  thinai: { rule: 'questions', focus: 'ที่ไหน fragt beim Gehen nach dem Ziel.', wrong: ['Wer geht?', 'Warum gehst du?'] },
  thammai: { rule: 'questions', focus: 'ทำไม fragt nach dem Grund; ไม่ verneint.', wrong: ['Warum isst du?', 'Was isst du nicht?'] },
  kin: { rule: 'svo', focus: 'ผม + กิน + ข้าว: Sprecher, Handlung, Gegenstand.', wrong: ['Du isst Reis.', 'Ich esse keinen Reis.'] },
  maa_come: { rule: 'svo', focus: 'ครู ist die handelnde Person; มา bedeutet kommen.', wrong: ['Der Lehrer geht.', 'Der Lehrer kommt nicht.'] },
  tham: { rule: 'svo', focus: 'ผม macht อาหาร.', wrong: ['Du machst Essen.', 'Ich mache kein Essen.'] },
  phuut: { rule: 'questions', focus: 'อะไร fragt nach dem Gesagten.', wrong: ['Wer sagt das?', 'Warum sagst du das?'] },
  duu: { rule: 'svo', focus: 'ผม schaut; แมว wird angeschaut.', wrong: ['Die Katze schaut mich an.', 'Ich schaue die Katze nicht an.'] },
  fang: { rule: 'svo', focus: 'ผม hört zu; ครู ist die Person, der zugehört wird.', wrong: ['Der Lehrer hört mir zu.', 'Ich höre dem Lehrer nicht zu.'] },
  aan: { rule: 'svo', focus: 'ฉัน liest หนังสือ; Thai markiert hier keinen Artikel.', wrong: ['Du liest ein Buch.', 'Ich lese kein Buch.'] },
  khian: { rule: 'svo', focus: 'ผม schreibt หนังสือ; die Aufgabe verwendet die bestehende Lesart ein Buch.', wrong: ['Du schreibst ein Buch.', 'Ich schreibe kein Buch.'] },
  sue: { rule: 'svo', focus: 'ผม kauft ผลไม้.', wrong: ['Du kaufst Obst.', 'Ich kaufe kein Obst.'] },
  choop: { rule: 'svo', focus: 'ฉัน mag แมว; das Thai-Nomen markiert hier keinen Plural.', wrong: ['Katzen mögen mich.', 'Ich mag keine Katzen.'] },
  rak: { rule: 'svo', focus: 'ผม liebt คุณ; die Rollen dürfen nicht vertauscht werden.', wrong: ['Du liebst mich.', 'Ich liebe dich nicht.'] },
  ruu: { rule: 'questions', focus: 'ไม่ verneint รู้; der gewusste Inhalt bleibt unausgesprochen.', wrong: ['Ich weiß es.', 'Du weißt es nicht.'] },
  khaochai: { rule: 'questions', focus: 'ไม่ verneint เข้าใจ.', wrong: ['Ich verstehe.', 'Du verstehst nicht.'] },
  yaak: { rule: 'complement', focus: 'อยาก bezeichnet den Wunsch, กิน ข้าว die gewünschte Handlung.', wrong: ['Ich möchte keinen Reis essen.', 'Du möchtest Reis essen.'] },
  hai: { rule: 'give', focus: 'ครู gibt หนังสือ; ein Empfänger wird nicht genannt.', wrong: ['Der Lehrer bekommt ein Buch.', 'Der Lehrer gibt kein Buch.'] },
  khaao: { rule: 'stative', focus: 'อร่อย wird hier als Prädikat einer Aussage gelesen.', wrong: ['Der Reis ist nicht lecker.', 'Ist der Reis lecker?'] },
  aahaan: { rule: 'stative', focus: 'แพง wird hier als Prädikat einer Aussage gelesen.', wrong: ['Das Essen ist nicht teuer.', 'Ist das Essen teuer?'] },
  talaat: { rule: 'svo', focus: 'ผม geht zum ตลาด.', wrong: ['Du gehst zum Markt.', 'Ich gehe nicht zum Markt.'] },
  gai: { rule: 'stative', focus: 'อร่อย beschreibt hier das Huhn als Essen.', wrong: ['Das Huhn ist nicht lecker.', 'Ist das Huhn lecker?'] },
  khai: { rule: 'svo', focus: 'ผม isst ไข่.', wrong: ['Du isst ein Ei.', 'Ich esse kein Ei.'] },
  muu: { rule: 'stative', focus: 'อร่อย beschreibt hier Schweinefleisch als Essen.', wrong: ['Das Schweinefleisch ist nicht lecker.', 'Ist das Schweinefleisch lecker?'] },
  phak: { rule: 'svo', focus: 'ผม isst ผัก.', wrong: ['Du isst Gemüse.', 'Ich esse kein Gemüse.'] },
  phonlamai: { rule: 'stative', focus: 'แพง wird hier als Prädikat einer Aussage gelesen.', wrong: ['Das Obst ist nicht teuer.', 'Ist das Obst teuer?'] },
  dii: { rule: 'stative', focus: 'ดี wird hier als Prädikat einer Aussage gelesen.', wrong: ['Das Essen ist nicht gut.', 'Ist das Essen gut?'] },
  aroi: { rule: 'stative', focus: 'อร่อย beschreibt hier den Fisch als Essen.', wrong: ['Der Fisch ist nicht lecker.', 'Ist der Fisch lecker?'] },
};

export const SENTENCE_AUDIT = VOCABULARY_TH.map(word => {
  const review = REVIEWS[word.id];
  const tokens = (word.exampleTerm ?? '').split(/\s+/).filter(Boolean).map(term =>
    VOCABULARY_TH.find(candidate => candidate.term === term));
  const lexical = tokens.length > 0 && tokens.every(token => token?.sourceVerified && token.source);
  const reason = review && lexical ? 'Bestehende Satzlesart anhand belegter Wörter und Satzregel nachvollzogen; keine wörtliche Quellenfundstelle.' :
    !lexical ? 'Mindestens ein Wortbezug fehlt oder ist nicht quellengeprüft.' :
    word.id === 'bpai' ? 'Die Übersetzung nach Hause braucht eine eigene Gebrauchsprüfung; nicht automatisch aus gehen + Haus ableiten.' :
    /^(sawatdii|khoopkhun|khoothoot|khrap|kha|chai)$/.test(word.id) ? 'Gruß-/Antwortformel; keine vollständige Aussage oder Inhaltsfrage dieser Übung.' :
    'Im vorhandenen deutschen Beispiel eine Wortgruppe, Mengenangabe oder Satzfragment; nicht als vollständiger Satz ausgegeben.';
  return { vocabId: word.id, text: word.exampleTerm ?? '', german: word.exampleGerman ?? '',
    roman: word.exampleRoman ?? '', eligible: Boolean(review && lexical), reason,
    lexicalSources: [...new Set(tokens.flatMap(token => token?.source ? [token.source] : []))],
    ruleSource: review ? SENTENCE_SOURCES[review.rule] : null, reviewedAt: '2026-09-05',
    reviewMethod: 'rule-based composition review; not verbatim sentence attestation',
  };
});

export const SENTENCE_TASKS = SENTENCE_AUDIT.filter(entry => entry.eligible).map(entry => ({
  ...entry, id: `sentence-${entry.vocabId}`, focus: REVIEWS[entry.vocabId].focus,
  answers: [entry.german, ...REVIEWS[entry.vocabId].wrong],
}));
/**
 * Eine Satz-Aufgabe, wie die Satz-, Diktat- und Sprechübungen sie lesen.
 *
 * BIS zur Grundstock-Ära kamen diese Objekte ausschließlich aus dem Audit
 * oben (deshalb die optionalen Prüffelder). SEIT dem generierten Wortschatz
 * (16.09.2026) baut `buildSentenceTasks` dieselbe Form aus den Beispielsätzen
 * der generierten Vokabeln — jedes Dokument trägt exampleTerm/exampleRoman/
 * exampleGerman, mit dem Worteintrag erzeugt und kreuzgeprüft.
 */
export type SentenceTask = {
  id: string;
  /** Die Vokabel, aus deren Beispielsatz die Aufgabe entstand — FSRS-Schlüssel. */
  vocabId: string;
  /** Der Satz in der Zielsprache. */
  text: string;
  /** Deutsche Bedeutung des Satzes. */
  german: string;
  /** Lesehilfe (Thai: Umschrift; lateinische Sprachen: der Satz selbst). */
  roman: string;
  /** Hinweis unter der Aufgabe — beim generierten Bestand das Kernwort. */
  focus: string;
  /** Bedeutung + Ablenker für „Satz verstehen“ (erste Antwort ist richtig). */
  answers: string[];
  eligible?: boolean;
  reason?: string;
  lexicalSources?: string[];
  ruleSource?: string | null;
  reviewedAt?: string;
  reviewMethod?: string;
};

export const SENTENCE_LIMITS = translate('de', 'sentence.limits');
export const SENTENCE_AUDIO_NOTICE = translate('de', 'sentence.audioClip');

/**
 * Satzaufgaben je Zielsprache (AE-66; 18.09.2026 auf den generierten
 * Bestand umgestellt).
 *
 * BIS zur Grundstock-Ära war diese Registry statisch: Thai trug die
 * hand-auditierten Satzlesarten des festen Wortschatzes, Englisch/Spanisch
 * waren bewusst leer („erfundene Sätze gibt es nicht"), und der Hinweis
 * versprach, die Übung fülle sich, „sobald geprüfte Sätze vorliegen" —
 * nichts füllte sie je. Seit der Wortschatz generiert wird (16.09.2026),
 * trägt JEDE Vokabel einen vollständigen, mitgeprüften Beispielsatz; die
 * Registry unten baut daraus die Aufgaben für alle vier Sprachen.
 */
/**
 * Sprachen mit Satzstoff. `de` gehört dazu, seit Deutsch ein vollwertiges
 * Lernziel ist — der Deutsch-Kurs (th_to_de) produziert deutsche Sätze.
 */
export type SatzSprache = 'th' | 'en' | 'es' | 'de';

/**
 * Baut Satz-Aufgaben aus dem AKTIVEN Wortschatzbestand (18.09.2026).
 *
 * Jede generierte Vokabel trägt einen vollständigen Beispielsatz
 * (exampleTerm/exampleRoman/exampleGerman, „ganz oder gar nicht" im
 * Schema-Vertrag). Diese Funktion macht daraus Aufgaben: Bedeutung aus dem
 * Satz, Ablenker aus den Nachbarn im Bestand (deterministisch — die Sitzung
 * mischt später mit ihrer Aussaat), Fokus-Hinweis = das Kernwort mit seiner
 * Bedeutung (im Deutsch-Ziel die Thai-Bedeutung, denn Thai ist dort die
 * Ankerseite).
 */
export function buildSentenceTasks(words: VocabEntry[]): SentenceTask[] {
  const gesehen = new Set<string>();
  const basis: VocabEntry[] = [];
  for (const word of words) {
    const text = (word.exampleTerm ?? '').trim();
    // Doppelsätze (gleicher Text über zwei Wörtern) würden doppelte Aufgaben
    // mit derselben Lösung ergeben — der erste gewinnt.
    if (!text || gesehen.has(text)) continue;
    gesehen.add(text);
    basis.push(word);
  }
  return basis.map((word, index) => {
    const german = (word.exampleGerman ?? '').trim();
    const ablenker: string[] = [];
    for (let schritt = 1; ablenker.length < 2 && schritt < basis.length; schritt += 1) {
      const andere = basis[(index + schritt) % basis.length];
      const vorschlag = (andere.exampleGerman ?? '').trim();
      if (!vorschlag || vorschlag === german || ablenker.includes(vorschlag)) continue;
      ablenker.push(vorschlag);
    }
    // Deutsch-Ziel: Thai ist die Anker-/Bedeutungsseite des Paars.
    const bedeutung = String(word.language) === 'de'
      ? (word.translations?.th ?? word.german)
      : word.german;
    return {
      id: `sentence-${word.id}`,
      vocabId: word.id,
      text: (word.exampleTerm ?? '').trim(),
      german,
      roman: (word.exampleRoman ?? '').trim(),
      focus: `${word.term} · ${bedeutung}`,
      answers: [german, ...ablenker],
      reason: 'KI-erzeugter Beispielsatz des generierten Wortschatzbestands; mit dem Worteintrag erzeugt und kreuzgeprüft.',
      reviewMethod: 'KI-Erzeugung mit Kreuzprüfung (Studio-Pipeline)',
    };
  });
}

function generierteSatzTasks(language: SatzSprache): SentenceTask[] {
  return buildSentenceTasks(activeVocabulary().filter(word => String(word.language) === language));
}

/**
 * Satzaufgaben je Sprache (AE-66, 18.09. erweitert).
 *
 * LEGACY-Katalog (fester Grundstock): Thai liefert die hand-auditierten
 * Satzlesarten, die anderen Sprachen bleiben ehrlich leer.
 *
 * GENERIERTER Katalog: alle vier Sprachen liefern die Beispielsätze ihrer
 * Vokabeln — auch Deutsch. Der Bestand füllt sich damit automatisch, sobald
 * die Erzeugung lief; der Leerzustand bleibt der ehrliche Hinweis.
 */
export const SENTENCE_TASKS_BY_LANGUAGE: Record<SatzSprache, SentenceTask[]> = {
  get th() { return usesGeneratedVocabulary() ? generierteSatzTasks('th') : SENTENCE_TASKS; },
  get en() { return usesGeneratedVocabulary() ? generierteSatzTasks('en') : []; },
  get es() { return usesGeneratedVocabulary() ? generierteSatzTasks('es') : []; },
  get de() { return usesGeneratedVocabulary() ? generierteSatzTasks('de') : []; },
};

/** Der ehrliche Fußtext je Sprache — Thai zählt den Bestand, die anderen sagen, was fehlt. */
export const SENTENCE_FOOTNOTE_BY_LANGUAGE: Record<LanguageCode, string> = {
  th: translate('de', 'sentence.stockLegacy', { count: SENTENCE_TASKS.length }),
  es: translate('de', 'sentence.stockEmpty'),
  en: translate('de', 'sentence.stockEmpty'),
};

/** Inhaltshinweis ohne Behauptung über eine noch nicht abgespielte Stimme. */
export function sentenceFootnote(language: SatzSprache, uiLanguage: UiLanguage = 'de'): string {
  const count = SENTENCE_TASKS_BY_LANGUAGE[language].length;
  if (!count) return translate(uiLanguage, 'sentence.stockEmpty');
  return translate(uiLanguage, usesGeneratedVocabulary() ? 'sentence.stockGenerated' : 'sentence.stockLegacy', { count });
}
