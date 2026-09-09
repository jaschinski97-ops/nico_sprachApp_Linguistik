import { LanguageCode, TargetLanguage } from '@/lib/languages/types';

import { VOCABULARY_TH } from './vocabulary';

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
export type SentenceTask = typeof SENTENCE_TASKS[number];

export const SENTENCE_LIMITS = 'Diese Übungen helfen beim Vorbereiten und Wiederholen. Die App liefert kein unvorhersehbares Gegenüber, das nachfragt und dich zum Umformulieren zwingt. Übe zusätzlich mit Menschen; die App allein reicht für echte Gespräche nicht aus.';
export const SENTENCE_AUDIO_NOTICE = 'KI-Stimme, keine Muttersprachler-Aufnahme. Tonverlauf nicht geprüft. Das Hörbeispiel ist kein Bewertungsmaßstab.';

/**
 * Satzaufgaben je Zielsprache (AE-66).
 *
 * Thai: die geprüften vollständigen Satzlesarten aus dem Audit oben — bis
 * AE-66 nur unter „Deutsch → Thai" erreichbar, jetzt in beiden Richtungen
 * des Paars.
 *
 * Spanisch: der Grundstock führt 30 Beispiele, aber alle sind Nominalgruppen
 * wie „el agua" — dieselbe Prüfung, die für Thai Wortgruppen ausgeschlossen
 * hat, schließt sie hier aus. Sie zu Scheinsätzen aufzublähen wäre erfundener
 * Stoff.
 *
 * Englisch: keine Beispiele (Phase 16: erfundene Sätze gibt es nicht).
 *
 * Französisch: Runde-3-Stoff, ehrlich leer — der Runner zeigt denselben
 * ehrlichen Hinweis wie bei Spanisch und Englisch, bis geprüfte Sätze
 * vorliegen.
 *
 * Eine Sprache ohne geprüfte Sätze bleibt ehrlich leer; die Übungen zeigen
 * einen Hinweis statt Stoff. Sobald vollständige, geprüfte Sätze vorliegen,
 * füllt sich die Übung, ohne dass die Oberfläche geändert werden muss.
 */
export const SENTENCE_TASKS_BY_LANGUAGE: Record<TargetLanguage, SentenceTask[]> = {
  th: SENTENCE_TASKS,
  es: [],
  en: [],
};

/** Der ehrliche Fußtext je Sprache — Thai zählt den Bestand, die anderen sagen, was fehlt. */
export const SENTENCE_FOOTNOTE_BY_LANGUAGE: Record<LanguageCode, string> = {
  th: `${SENTENCE_TASKS.length} vollständige Satzlesarten aus 84 vorhandenen Beispielen. Wörter und Satzregeln nachvollzogen; keine pauschale Quellenbestätigung aller 84 Beispiele. Wortgruppen bleiben außerhalb dieser Übung.`,
  es: 'Für Spanisch liegen noch keine geprüften vollständigen Sätze vor — die 30 vorhandenen Beispiele sind Wortgruppen wie „el agua" und bleiben außerhalb dieser Übung. Sobald vollständige Sätze geprüft sind, erscheinen sie hier.',
  en: 'Für Englisch liegen noch keine geprüften Beispielsätze vor. Sobald welche geprüft sind, erscheinen sie hier.',
};
