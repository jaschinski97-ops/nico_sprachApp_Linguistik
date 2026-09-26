/**
 * Spanisch-Grammatik: ser gegen estar.
 *
 * WAS HIER STEHT UND WARUM: Beide Verben heißen im Deutschen „sein“ — die
 * Wahl ist aber keine Stilfrage, sondern Bedeutung: **ser** für Wesen,
 * Herkunft, Beruf, Zugehörigkeit, Uhrzeit und den Ort von EREIGNISSEN;
 * **estar** für Zustand, Befindlichkeit und den Ort von DINGEN und ORTEN.
 * Die Übung zeigt einen Satz mit Lücke und der deutschen Bedeutung; die
 * Antwort ist ser oder estar, und die Erklärung nennt die Regel, die
 * entscheidet.
 *
 * WOHER DIE SÄTZE STAMMEN: Standardlehrwerk-Beispiele der Regel (Adjektive
 * wie cansado/aburrido, Ortsangaben, Herkunft), handgeprüft gegen die
 * fundierte Darstellung von studyspanish.com („Ser and Estar“, Teil 1–2) —
 * kein Stoff aus dem Vokabel-Generator, keine KI-Erzeugung. Wo ein Wort im
 * Vokabel-Grundstock liegt (`vocabulary-es.ts`), entspricht die Form ihm.
 */

export type SerEstarItem = {
  id: string;
  /** Der Satz mit Lücke — die Lücke ist genau `___`. */
  text: string;
  /** Deutsche Bedeutung des ganzen Satzes. */
  german: string;
  /** Die richtige Form. */
  answer: 'ser' | 'estar';
  /** Welche Regel entscheidet — steht nach der Antwort da. */
  reason: string;
  /** Konjugierte Form für die Lösung, wenn das Subjekt nicht 3. Person Singular ist. */
  form?: string;
};

const ITEM = (
  id: string,
  text: string,
  german: string,
  answer: SerEstarItem['answer'],
  reason: string
): SerEstarItem => ({ id, text, german, answer, reason });

export const SER_ESTAR_ITEMS: readonly SerEstarItem[] = [
  ITEM('se-maria', 'María ___ profesora.', 'Maria ist Lehrerin.', 'ser',
    'Beruf — ser, auch wenn er nur vorübergehend ausgeübt wird.'),
  ITEM('se-madrid', 'Madrid ___ en España.', 'Madrid liegt in Spanien.', 'estar',
    'Lage einer Stadt/eines Dings — estar. Nur der Ort von EREIGNISSEN steht mit ser.'),
  ITEM('se-juan', 'Juan ___ alto.', 'Juan ist groß.', 'ser',
    'Eigenschaft, die den Menschen beschreibt — ser.'),
  ITEM('se-hoy', 'Hoy ___ lunes.', 'Heute ist Montag.', 'ser',
    'Uhrzeit, Datum, Wochentag — immer ser.'),
  ITEM('se-ana', 'Ana ___ de Tailandia.', 'Ana ist aus Thailand.', 'ser',
    'Herkunft — ser.'),
  ITEM('se-cafe', 'El café ___ rico.', 'Der Kaffee (hier in diesem Laden) ist lecker.', 'estar',
    'Aktuelle Bewertung eines konkreten Beispiels — estar; die allgemeine Eigenschaft stünde mit ser.'),
  { ...ITEM('se-ninos', 'Los niños ___ cansados.', 'Die Kinder sind müde.', 'estar',
    'Zustand/Befindlichkeit — estar, auch wenn er lange anhält.'), form: 'están' },
  ITEM('se-libro', 'El libro ___ en la mesa.', 'Das Buch liegt auf dem Tisch.', 'estar',
    'Ort von Dingen und Personen — estar.'),
  ITEM('se-sopa', 'La sopa ___ fría.', 'Die Suppe ist kalt.', 'estar',
    'Zustand, der auch anders sein könnte — estar.'),
  ITEM('se-fiesta', 'La fiesta ___ en la casa.', 'Die Feier ist im Haus.', 'ser',
    'Ort von EREIGNISSEN — ser, die Ausnahme unter den Ortsangaben.'),
  ITEM('se-arbol', 'El árbol ___ muerto.', 'Der Baum ist tot.', 'estar',
    'Endzustand nach einem Wandel (estar muerto) — estar.'),
  { ...ITEM('se-aburrido', 'Yo ___ aburrido.', 'Mir ist gerade langweilig.', 'estar',
    'Befinden — estar. (Ser aburrido hieße: ein langweiliger Mensch zu sein.)'), form: 'estoy' },
];

/** Nachweis der Fachlichkeit — gleiche Struktur wie die Satzquellen. */
export const SER_ESTAR_SOURCE = {
  title: 'studyspanish.com — Ser and Estar',
  url: 'https://studyspanish.com/grammar/lessons/serestar',
  retrieved: '2026-09-13',
  quote:
    'Ser is used to classify and identify — origin, profession, intrinsic traits, time, and the location of events. Estar is used for states, conditions, and the location of things and places.',
} as const;
