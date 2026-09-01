import { ExamModule } from '@/lib/exam/types';

/**
 * Mitgelieferte Prüfungsaufgaben (Phase 7).
 *
 * HERKUNFT UND GRENZEN — bitte genau lesen, bevor jemand diese Aufgaben für
 * Originalmaterial hält:
 *
 * - Die **Struktur** (welche Fertigkeiten, welche Textsorten, welche Dauern)
 *   stammt von den Seiten des Goethe-Instituts, abgerufen am 2026-08-31; die
 *   Belege stehen an den Zertifikaten in `lib/exam/types.ts`.
 * - Die **Aufgabenformate** (Auswahl A/B/C, Richtig/Falsch, Zuordnung,
 *   Lückentext) stammen aus dem Einstufungstest des Goethe-Instituts, Aufgabe
 *   für Aufgabe durchgeklickt.
 * - Die **Inhalte** hier sind dagegen selbst geschrieben. Es sind **keine**
 *   Originalaufgaben und keine Modellsätze des Goethe-Instituts. Wer echte
 *   Modellsätze will, findet sie beim Goethe-Institut selbst; die App
 *   verlinkt darauf.
 *
 * WORTSCHATZ: Die Texte sind aus dem deutschen Teil des geprüften
 * Vokabel-Grundstocks zusammengesetzt, ergänzt um elementare Funktionswörter
 * (Artikel, Präpositionen, Zahlen, Uhrzeiten, Eigennamen) und um die wenigen
 * Wörter, ohne die eine Anzeige oder Durchsage nicht als solche erkennbar
 * wäre. Das ist dieselbe Ehrlichkeit wie bei den Beispielsätzen aus Phase 2:
 * die einzelnen Wörter sind gedeckt, die Sätze als Ganzes sind nicht einzeln
 * gegen eine Quelle geprüft.
 */

export const BUILTIN_EXAM_MODULES: ExamModule[] = [
  /* ---------- A1 · Lesen · Auswahl ---------- */
  {
    id: 'a1-lesen-anzeige',
    certificate: 'gzsd1',
    level: 'A1',
    skill: 'lesen',
    direction: 'th_to_de',
    taskType: 'multipleChoice',
    title: 'Kleinanzeige: Markt',
    instruction: 'Lesen Sie die Anzeige. Klicken Sie an.',
    minutes: 6,
    source: 'builtin',
    stimulus: {
      kind: 'text',
      title: 'MARKT AM BAHNHOF',
      body:
        'Jeden Samstag von 7 bis 13 Uhr.\n' +
        'Obst und Gemüse direkt vom Bauern.\n' +
        'Fisch nur am Vormittag.\n' +
        'Kaffee und Tee gibt es im kleinen Laden neben der Schule.',
    },
    items: [
      {
        id: 'a1-lesen-anzeige-1',
        prompt: 'Wann ist der Markt?',
        options: ['Jeden Tag.', 'Nur am Samstag.', 'Nur am Sonntag.'],
        correctIndex: 1,
        explanation: 'In der Anzeige steht „Jeden Samstag von 7 bis 13 Uhr".',
      },
      {
        id: 'a1-lesen-anzeige-2',
        prompt: 'Wo bekommen Sie Kaffee?',
        options: ['Auf dem Markt.', 'Am Bahnhof.', 'Im Laden neben der Schule.'],
        correctIndex: 2,
        explanation: 'Kaffee und Tee gibt es „im kleinen Laden neben der Schule".',
      },
      {
        id: 'a1-lesen-anzeige-3',
        prompt: 'Sie möchten Fisch kaufen. Wann kommen Sie?',
        options: ['Um 9 Uhr.', 'Um 12 Uhr.', 'Um 14 Uhr.'],
        correctIndex: 0,
        explanation:
          'Fisch gibt es nur am Vormittag, und der Markt ist von 7 bis 13 Uhr offen — 9 Uhr passt.',
      },
    ],
  },

  /* ---------- A1 · Hören · Richtig/Falsch ---------- */
  {
    id: 'a1-hoeren-nachricht',
    certificate: 'gzsd1',
    level: 'A1',
    skill: 'hoeren',
    direction: 'th_to_de',
    taskType: 'trueFalse',
    title: 'Nachricht auf dem Telefon',
    instruction: 'Sie hören eine Nachricht auf dem Telefon. Richtig oder falsch?',
    minutes: 5,
    source: 'builtin',
    stimulus: {
      kind: 'audio',
      body:
        'Hallo, hier ist Anna. Ich komme heute später. ' +
        'Mein Auto ist kaputt. Ich gehe zu Fuß zur Schule. ' +
        'Bitte kauf du das Obst für heute Abend. Danke!',
    },
    items: [
      {
        id: 'a1-hoeren-nachricht-1',
        prompt: 'Anna kommt später.',
        options: ['Richtig', 'Falsch'],
        correctIndex: 0,
        explanation: 'Sie sagt: „Ich komme heute später."',
      },
      {
        id: 'a1-hoeren-nachricht-2',
        prompt: 'Anna kommt mit dem Auto.',
        options: ['Richtig', 'Falsch'],
        correctIndex: 1,
        explanation: 'Ihr Auto ist kaputt, sie geht zu Fuß.',
      },
      {
        id: 'a1-hoeren-nachricht-3',
        prompt: 'Sie sollen Obst kaufen.',
        options: ['Richtig', 'Falsch'],
        correctIndex: 0,
        explanation: 'Sie bittet: „Bitte kauf du das Obst für heute Abend."',
      },
    ],
  },

  /* ---------- A1 · Lesen · Zuordnung ---------- */
  {
    id: 'a1-lesen-zuordnung',
    certificate: 'gzsd1',
    level: 'A1',
    skill: 'lesen',
    direction: 'th_to_de',
    taskType: 'matching',
    title: 'Wohin gehen Sie?',
    instruction: 'Lesen Sie die Situationen. Wohin gehen Sie? Klicken Sie an.',
    minutes: 6,
    source: 'builtin',
    stimulus: {
      kind: 'listing',
      title: 'IM ORT',
      body: 'Diese vier Orte gibt es in der Nähe.',
      entries: [
        'A — Markt: Obst, Gemüse, Fisch. Samstag 7–13 Uhr.',
        'B — Schule: Deutschkurse für Erwachsene. Montag bis Freitag.',
        'C — Laden: Kaffee, Tee, Brot. Täglich 8–20 Uhr.',
        'D — Arzt: Termine nach Vereinbarung.',
      ],
    },
    items: [
      {
        id: 'a1-lesen-zuordnung-1',
        prompt: 'Sie möchten am Sonntag Tee kaufen.',
        options: ['A — Markt', 'B — Schule', 'C — Laden', 'D — Arzt'],
        correctIndex: 2,
        explanation: 'Der Laden hat täglich offen, der Markt nur samstags.',
      },
      {
        id: 'a1-lesen-zuordnung-2',
        prompt: 'Sie möchten Deutsch lernen.',
        options: ['A — Markt', 'B — Schule', 'C — Laden', 'D — Arzt'],
        correctIndex: 1,
        explanation: 'Die Schule bietet Deutschkurse für Erwachsene an.',
      },
      {
        id: 'a1-lesen-zuordnung-3',
        prompt: 'Sie sind krank.',
        options: ['A — Markt', 'B — Schule', 'C — Laden', 'D — Arzt'],
        correctIndex: 3,
        explanation: 'Zum Arzt, Termine nach Vereinbarung.',
      },
    ],
  },

  /* ---------- A1 · Schreiben · Formular ---------- */
  {
    id: 'a1-schreiben-formular',
    certificate: 'gzsd1',
    level: 'A1',
    skill: 'schreiben',
    direction: 'th_to_de',
    taskType: 'gapFill',
    title: 'Formular für den Deutschkurs',
    instruction:
      'Lesen Sie den Text. Füllen Sie das Formular aus: Was gehört in die Lücke?',
    minutes: 8,
    source: 'builtin',
    stimulus: {
      kind: 'text',
      title: 'DAS SCHREIBT SOMCHAI',
      body:
        'Ich heiße Somchai Wongsa. Ich komme aus Thailand und wohne seit einem Jahr ' +
        'in München, in der Bahnhofstraße 12. Ich bin 24 Jahre alt und arbeite als ' +
        'Lehrer. Ich möchte einen Deutschkurs am Abend machen.',
    },
    items: [
      {
        id: 'a1-schreiben-formular-1',
        prompt: 'Familienname: ______',
        options: ['Somchai', 'Wongsa', 'München'],
        correctIndex: 1,
        explanation:
          'Im Deutschen steht der Familienname hinten: „Somchai Wongsa" — Vorname Somchai, Familienname Wongsa.',
      },
      {
        id: 'a1-schreiben-formular-2',
        prompt: 'Straße und Hausnummer: ______',
        options: ['Bahnhofstraße 12', 'München 24', 'Thailand 12'],
        correctIndex: 0,
        explanation: 'Er wohnt „in der Bahnhofstraße 12".',
      },
      {
        id: 'a1-schreiben-formular-3',
        prompt: 'Beruf: ______',
        options: ['Arzt', 'Lehrer', 'Schüler'],
        correctIndex: 1,
        explanation: 'Er „arbeitet als Lehrer".',
      },
      {
        id: 'a1-schreiben-formular-4',
        prompt: 'Kurszeit: ______',
        options: ['am Morgen', 'am Nachmittag', 'am Abend'],
        correctIndex: 2,
        explanation: 'Er möchte einen Deutschkurs „am Abend" machen.',
      },
    ],
  },

  /* ---------- A1 · Schreiben · freier Text ---------- */
  {
    id: 'a1-schreiben-text',
    certificate: 'gzsd1',
    level: 'A1',
    skill: 'schreiben',
    direction: 'th_to_de',
    taskType: 'production',
    title: 'Kurze Nachricht an den Lehrer',
    instruction:
      'Schreiben Sie eine kurze Nachricht (etwa 30 Wörter). Schreiben Sie zu allen drei Punkten.',
    minutes: 12,
    source: 'builtin',
    stimulus: null,
    production: {
      task:
        'Sie können heute nicht zum Deutschkurs kommen. Schreiben Sie Ihrem Lehrer, Herrn Meier, eine Nachricht.',
      bullets: [
        'Warum können Sie nicht kommen?',
        'Wann kommen Sie wieder?',
        'Was möchten Sie von Herrn Meier?',
      ],
      modelAnswer:
        'Sehr geehrter Herr Meier,\n\n' +
        'ich kann heute leider nicht zum Kurs kommen. Ich bin krank und gehe zum Arzt. ' +
        'Am Montag bin ich wieder da. Können Sie mir bitte die Hausaufgaben schicken?\n\n' +
        'Vielen Dank und viele Grüße\nSomchai',
      checklist: [
        'Steht am Anfang eine Anrede und am Ende ein Gruß?',
        'Sind alle drei Punkte beantwortet?',
        'Steht das Verb im Hauptsatz an zweiter Stelle?',
        'Haben alle Substantive den richtigen Artikel?',
      ],
      speakModelAnswer: false,
    },
  },

  /* ---------- A1 · Sprechen · freie Produktion ---------- */
  {
    id: 'a1-sprechen-vorstellen',
    certificate: 'gzsd1',
    level: 'A1',
    skill: 'sprechen',
    direction: 'th_to_de',
    taskType: 'production',
    title: 'Sich vorstellen',
    instruction:
      'Stellen Sie sich vor. Sprechen Sie laut — zu jedem Stichwort einen Satz.',
    minutes: 5,
    source: 'builtin',
    stimulus: null,
    production: {
      task:
        'In der Prüfung stellen Sie sich in der Gruppe vor. Sie bekommen Stichwörter und sagen zu jedem einen Satz.',
      bullets: ['Name?', 'Alter?', 'Land?', 'Wohnort?', 'Beruf?', 'Sprachen?'],
      modelAnswer:
        'Ich heiße Somchai Wongsa. Ich bin vierundzwanzig Jahre alt. ' +
        'Ich komme aus Thailand. Ich wohne in München. ' +
        'Ich bin Lehrer. Ich spreche Thai, Englisch und ein bisschen Deutsch.',
      checklist: [
        'Haben Sie zu jedem Stichwort etwas gesagt?',
        'Haben Sie ganze Sätze gesprochen, nicht nur einzelne Wörter?',
        'Steht das Verb an zweiter Stelle („Ich komme aus …")?',
        'Haben Sie laut und langsam genug gesprochen?',
      ],
      speakModelAnswer: true,
    },
  },

  /* ---------- A2 · Lesen · Auswahl ---------- */
  {
    id: 'a2-lesen-email',
    certificate: 'gzsd2',
    level: 'A2',
    skill: 'lesen',
    direction: 'th_to_de',
    taskType: 'multipleChoice',
    title: 'E-Mail von einem Freund',
    instruction: 'Lesen Sie die E-Mail. Klicken Sie an.',
    minutes: 8,
    source: 'builtin',
    stimulus: {
      kind: 'text',
      title: 'VON: NIRAN — BETREFF: SAMSTAG',
      body:
        'Hallo,\n\n' +
        'am Samstag habe ich Zeit. Wollen wir zusammen auf den Markt gehen? ' +
        'Ich möchte Fisch und Gemüse kaufen, das ist dort billiger als im Laden. ' +
        'Danach können wir einen Kaffee trinken.\n\n' +
        'Ich hole dich um halb acht ab. Mein Auto ist leider in der Werkstatt, ' +
        'wir fahren also mit dem Bus. Schreib mir bitte bis Freitag.\n\n' +
        'Viele Grüße\nNiran',
    },
    items: [
      {
        id: 'a2-lesen-email-1',
        prompt: 'Was möchte Niran am Samstag machen?',
        options: [
          'Auf den Markt gehen.',
          'Ein Auto kaufen.',
          'Zu Hause bleiben.',
        ],
        correctIndex: 0,
        explanation: 'Er fragt: „Wollen wir zusammen auf den Markt gehen?"',
      },
      {
        id: 'a2-lesen-email-2',
        prompt: 'Warum kauft Niran auf dem Markt?',
        options: [
          'Der Markt ist näher.',
          'Es ist dort billiger als im Laden.',
          'Der Laden hat am Samstag zu.',
        ],
        correctIndex: 1,
        explanation: '„… das ist dort billiger als im Laden."',
      },
      {
        id: 'a2-lesen-email-3',
        prompt: 'Wie kommen die beiden zum Markt?',
        options: ['Mit dem Auto.', 'Mit dem Bus.', 'Zu Fuß.'],
        correctIndex: 1,
        explanation: 'Sein Auto ist in der Werkstatt: „wir fahren also mit dem Bus".',
      },
      {
        id: 'a2-lesen-email-4',
        prompt: 'Bis wann soll die Antwort kommen?',
        options: ['Bis Donnerstag.', 'Bis Freitag.', 'Bis Samstag.'],
        correctIndex: 1,
        explanation: '„Schreib mir bitte bis Freitag."',
      },
    ],
  },

  /* ---------- A2 · Hören · Auswahl ---------- */
  {
    id: 'a2-hoeren-durchsage',
    certificate: 'gzsd2',
    level: 'A2',
    skill: 'hoeren',
    direction: 'th_to_de',
    taskType: 'multipleChoice',
    title: 'Durchsage im Kaufhaus',
    instruction: 'Sie hören eine öffentliche Durchsage. Klicken Sie an.',
    minutes: 6,
    source: 'builtin',
    stimulus: {
      kind: 'audio',
      body:
        'Liebe Kundinnen und Kunden, wir schließen heute schon um achtzehn Uhr. ' +
        'Im ersten Stock finden Sie heute Obst und Gemüse zum halben Preis. ' +
        'Bitte kommen Sie mit Ihrem Einkauf bis Viertel vor sechs zur Kasse. Vielen Dank.',
    },
    items: [
      {
        id: 'a2-hoeren-durchsage-1',
        prompt: 'Wann schließt das Kaufhaus heute?',
        options: ['Um 17 Uhr.', 'Um 18 Uhr.', 'Um 20 Uhr.'],
        correctIndex: 1,
        explanation: '„… wir schließen heute schon um achtzehn Uhr."',
      },
      {
        id: 'a2-hoeren-durchsage-2',
        prompt: 'Was ist heute billiger?',
        options: ['Obst und Gemüse.', 'Kaffee und Tee.', 'Fisch und Fleisch.'],
        correctIndex: 0,
        explanation: 'Im ersten Stock gibt es Obst und Gemüse zum halben Preis.',
      },
      {
        id: 'a2-hoeren-durchsage-3',
        prompt: 'Wann sollen Sie an der Kasse sein?',
        options: ['Bis 17:45 Uhr.', 'Bis 18:15 Uhr.', 'Bis 18:45 Uhr.'],
        correctIndex: 0,
        explanation: '„Viertel vor sechs" ist 17:45 Uhr.',
      },
    ],
  },
];
