import { TargetDirection } from '../languages/types';

/**
 * Prüfungsmodul (Phase 7).
 *
 * ALLES HIER STEHT AUF RECHERCHIERTEN SEITEN, NICHT AUF ERINNERUNG.
 * Die Struktur der Goethe-Zertifikate wurde am 2026-08-31 von den Seiten des
 * Goethe-Instituts Thailand abgerufen; die Quellen stehen an jedem Zertifikat
 * und noch einmal ausführlich in PROGRESS.md. Zwei Dinge, die man aus dem
 * Gedächtnis mit einiger Wahrscheinlichkeit falsch aufgeschrieben hätte:
 *
 *  - A1 und A2 haben **Prüfungsteile**, B1 hat **Module**, die einzeln
 *    abgelegt werden können („Die vier Module können einzeln oder in
 *    Kombination abgelegt werden."). Die Seiten benennen das selbst
 *    unterschiedlich — Überschrift bei A1/A2: „Gar nicht so schwer: die
 *    Prüfungsteile", bei B1: „Ihr Auftritt, bitte! Die Module".
 *  - Die Dauern sind **nicht** über die Stufen hinweg gleich und teils
 *    ausdrücklich als „etwa" angegeben. A1 Lesen dauert 25 Minuten, A2 Lesen
 *    „etwa 30", B1 Lesen 65.
 */

/**
 * A1–B2 (Roadmap v2, Phase 4). B1 war recherchiert, aber leermäßig
 * hinterlegt; B2 kommt als Gerüst dazu — siehe `basis` am Zertifikat.
 */
export const EXAM_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
export type ExamLevel = (typeof EXAM_LEVELS)[number];

/** Die vier Fertigkeiten, die jedes der drei Zertifikate prüft. */
export const EXAM_SKILLS = ['lesen', 'hoeren', 'schreiben', 'sprechen'] as const;
export type ExamSkill = (typeof EXAM_SKILLS)[number];

export const SKILL_LABELS: Record<ExamSkill, string> = {
  lesen: 'Lesen',
  hoeren: 'Hören',
  schreiben: 'Schreiben',
  sprechen: 'Sprechen',
};

export type ExamPart = {
  skill: ExamSkill;
  /** Wörtlich von der Seite übernommen. */
  description: string;
  minutes: number;
  /** Die Seite schreibt „etwa X Minuten" statt einer festen Zahl. */
  approximate: boolean;
  /** Nur wo die Seite es sagt: Gruppen- oder Paarprüfung. */
  format?: 'gruppe' | 'paar';
};

/**
 * Woher die Strukturangaben eines Zertifikats stammen — die Ehrlichkeits-
 * marke dieses Gerüsts:
 *
 *  - `'recherchiert'`: von der verlinkten Goethe-Seite abgerufen; Zeiten und
 *    Beschreibungen sind wörtlich übernommen (Abrufdatum unten).
 *  - `'am-format-orientiert'`: die Goethe-Seite für diese Stufe war zum
 *    Zeitpunkt der Aufnahme NICHT abrufbar (Abrufversuch am 2026-09-09:
 *    HTTP 403). Zeiten und Beschreibungen sind deshalb als **Orientierung**
 *    nach dem bekannten Format aufgebaut — AM FORMAT ORIENTIERT, KEINE
 *    OFFIZIELLEN VORGABEN. Der Link zeigt auf das Format, nicht auf
 *    übernommene Angaben; vor einer echten Anmeldung zählt, was dort steht.
 */
export type CertificateBasis = 'recherchiert' | 'am-format-orientiert';

/**
 * Kennzeichnung, die diese Aufgaben überall dort tragen müssen, wo sie
 * sichtbar werden: Struktur 1:1 nach dem Goethe-Format, Inhalte selbst
 * geschrieben, keine offizielle Zertifizierung (Roadmap v2, „Goethe 1:1
 * übersetzt oder nicht?").
 */
export const EXAM_SIMULATION_LABEL =
  'Prüfungssimulation nach dem Format des Goethe-Zertifikats — keine offizielle Zertifizierung.';

export type ExamCertificate = {
  id: string;
  name: string;
  level: ExamLevel;
  /**
   * B1 spricht von „Modulen", die einzeln ablegbar sind; A1/A2 von
   * „Prüfungsteilen". Der Unterschied ist keine Wortklauberei — bei B1 „ent-
   * sprechen die Einzelzeugnisse über vier Module einem Gesamtzeugnis".
   */
  partsAreModules: boolean;
  parts: ExamPart[];
  /** Siehe `CertificateBasis` — die Ehrlichkeitsmarke dieses Eintrags. */
  basis: CertificateBasis;
  /** `EXAM_SIMULATION_LABEL` — an jeder Stufe fest verdrahtet, nicht optional. */
  simulationLabel: string;
  /** „Für … wird ein Alter ab N Jahren empfohlen." */
  recommendedAge: number;
  /** Unterrichtseinheiten à 45 Minuten bis zu dieser Stufe, von der Seite. */
  teachingUnits: [number, number];
  /**
   * Als Vorlagen-Literaltyp, damit die Adresse ohne Umweg an `ExternalLink`
   * gereicht werden kann - und damit hier nichts anderes als eine
   * https-Adresse stehen kann.
   */
  source: `https://${string}`;
  /**
   * Abrufdatum der Quelle im Format JJJJ-MM-TT. Bei `basis:
   * 'am-format-orientiert'` steht hier stattdessen ein ausdrücklicher
   * Hinweis — es gibt dann KEIN Abrufdatum, weil nichts übernommen wurde.
   * Der Prüfungs-Screen setzt den Wert direkt in seinen Satz ein; deshalb
   * bleibt es ein Text, der im Satz lesbar bleibt, statt eines leeren Felds.
   */
  retrieved: string;
};

/**
 * Die drei Zertifikate, die für diesen Vokabelbestand überhaupt in Frage
 * kommen. C1/C2, TestDaF und Goethe-Test PRO stehen zwar auf der Übersicht,
 * liegen aber weit jenseits von 84 A1/A2-Vokabeln.
 */
export const CERTIFICATES: ExamCertificate[] = [
  {
    id: 'gzsd1',
    name: 'Goethe-Zertifikat A1: Start Deutsch 1',
    level: 'A1',
    partsAreModules: false,
    basis: 'recherchiert',
    simulationLabel: EXAM_SIMULATION_LABEL,
    parts: [
      {
        skill: 'lesen',
        description:
          'Sie lesen Texte wie etwa Kurznotizen, Kleinanzeigen, Hinweisschilder oder Aushänge und bearbeiten Aufgaben dazu.',
        minutes: 25,
        approximate: false,
      },
      {
        skill: 'hoeren',
        description:
          'Sie hören kurze Alltagsgespräche, Telefonnachrichten oder öffentliche Lautsprecherdurchsagen und bearbeiten dazu Aufgaben.',
        minutes: 20,
        approximate: false,
      },
      {
        skill: 'schreiben',
        description:
          'Sie füllen einfache Formulare aus und schreiben einen kurzen persönlichen Text zu einer alltäglichen Situation.',
        minutes: 20,
        approximate: false,
      },
      {
        skill: 'sprechen',
        description:
          'Sie stellen sich in der Gruppe vor. Anschließend stellen und beantworten Sie Fragen aus dem Alltag und bitten jemanden aus der Gruppe um etwas.',
        minutes: 15,
        approximate: false,
        format: 'gruppe',
      },
    ],
    recommendedAge: 16,
    teachingUnits: [80, 200],
    source: 'https://www.goethe.de/ins/th/de/spr/prf/gzsd1/inf.html',
    retrieved: '2026-08-31',
  },
  {
    id: 'gzsd2',
    name: 'Goethe-Zertifikat A2',
    level: 'A2',
    partsAreModules: false,
    basis: 'recherchiert',
    simulationLabel: EXAM_SIMULATION_LABEL,
    parts: [
      {
        skill: 'lesen',
        description:
          'Sie lesen Texte wie kurze Zeitungsartikel, E-Mails, Anzeigen und öffentliche Hinweistafeln und bearbeiten Aufgaben dazu.',
        minutes: 30,
        approximate: true,
      },
      {
        skill: 'hoeren',
        description:
          'Sie hören Alltagsgespräche, Ansagen und Interviews aus dem Radio, Nachrichten am Telefon und öffentliche Durchsagen und bearbeiten dazu Aufgaben.',
        minutes: 30,
        approximate: true,
      },
      {
        skill: 'schreiben',
        description:
          'Sie schreiben Mitteilungen, die sich auf Ihr unmittelbares Lebensumfeld beziehen.',
        minutes: 30,
        approximate: true,
      },
      {
        skill: 'sprechen',
        description:
          'Sie stellen Fragen und beantworten Fragen zu Ihrer Person, Sie erzählen etwas über Ihr eigenes Leben und Sie vereinbaren oder planen etwas gemeinsam mit Ihrem oder Ihrer Gesprächspartner*in.',
        minutes: 15,
        approximate: false,
      },
    ],
    recommendedAge: 16,
    teachingUnits: [200, 350],
    source: 'https://www.goethe.de/ins/th/de/spr/prf/gzsd2/inf.html',
    retrieved: '2026-08-31',
  },
  {
    id: 'gzb1',
    name: 'Goethe-Zertifikat B1',
    level: 'B1',
    partsAreModules: true,
    basis: 'recherchiert',
    simulationLabel: EXAM_SIMULATION_LABEL,
    parts: [
      {
        skill: 'lesen',
        description:
          'Sie lesen Blog-Beiträge, E-Mails, Zeitungsartikel, Anzeigen und schriftliche Anweisungen. Sie können Hauptinformationen, wichtige Einzelheiten sowie Standpunkte und Meinungen erfassen.',
        minutes: 65,
        approximate: false,
      },
      {
        skill: 'hoeren',
        description:
          'Sie hören Durchsagen, kurze Vorträge, informelle Gespräche sowie Diskussionen aus dem Radio. Sie können Hauptaussagen und wichtige Einzelheiten erfassen.',
        minutes: 40,
        approximate: false,
      },
      {
        skill: 'schreiben',
        description:
          'Sie schreiben persönliche und formelle E-Mails oder Briefe und äußern schriftlich Ihre Meinung in einem Forumbeitrag.',
        minutes: 60,
        approximate: false,
      },
      {
        skill: 'sprechen',
        description:
          'Sie sprechen mit Ihrer oder Ihrem Partner*in über ein Thema des Alltags, zum Beispiel Reisen. Dabei reagieren Sie auf Fragen, äußern Ihre Meinung und unterbreiten Vorschläge. Sie tragen eine Präsentation zu einem Thema aus dem Alltag frei vor und beantworten Fragen dazu.',
        minutes: 15,
        approximate: true,
        format: 'paar',
      },
    ],
    recommendedAge: 16,
    teachingUnits: [350, 650],
    source: 'https://www.goethe.de/ins/th/de/spr/prf/gzb1/inf.html',
    retrieved: '2026-08-31',
  },
  {
    /**
     * GERÜST, NICHT ABSCHRIFT: Die Seite für B2 war beim Aufbau nicht
     * abrufbar (HTTP 403 am 2026-09-09), deshalb `basis:
     * 'am-format-orientiert'` und KEIN Abrufdatum. Alle Zeiten unten sind
     * als Orientierung nach dem Goethe-Skelett gesetzt — kompakter als B1 —
     * und ausdrücklich als „etwa" markiert. Beschreibungen sind eigene
     * Formulierungen über das Format, keine Zitate. Es gibt hier bewusst
     * **keine B2-Aufgaben**: erst recherchieren, dann Inhalte.
     */
    id: 'gzb2',
    name: 'Goethe-Zertifikat B2',
    level: 'B2',
    partsAreModules: false,
    basis: 'am-format-orientiert',
    simulationLabel: EXAM_SIMULATION_LABEL,
    parts: [
      {
        skill: 'lesen',
        description:
          'Orientierung am Format: Sie lesen längere Artikel, Kommentare und Gebrauchstexte und erfassen Hauptaussagen, Einzelheiten und Haltungen.',
        minutes: 50,
        approximate: true,
      },
      {
        skill: 'hoeren',
        description:
          'Orientierung am Format: Sie hören Interviews, Gespräche und Vorträge und erfassen Hauptaussagen, Einzelheiten und Redeabsichten.',
        minutes: 30,
        approximate: true,
      },
      {
        skill: 'schreiben',
        description:
          'Orientierung am Format: Sie schreiben einen Sachtext und äußern schriftlich und begründet Ihre Meinung zu einem Thema.',
        minutes: 50,
        approximate: true,
      },
      {
        skill: 'sprechen',
        description:
          'Orientierung am Format: Sie diskutieren mit einer zweiten Person über ein Thema des gesellschaftlichen Lebens und halten einen Vortrag mit Rückfragen.',
        minutes: 15,
        approximate: true,
        format: 'paar',
      },
    ],
    // Richtwert nach der üblichen Goethe-Stufentabelle — Orientierung, nicht
    // abgeschrieben (dazu wäre die Seite nötig, die hier 403 lieferte).
    recommendedAge: 16,
    teachingUnits: [600, 800],
    source: 'https://www.goethe.de/ins/th/de/spr/prf/gzb2/inf.html',
    retrieved: 'kein Abruf — Angaben am Format orientiert',
  },
];

/**
 * Zeit- und Teil-Skelett je Stufe und Fertigkeit.
 *
 * AM FORMAT ORIENTIERT, KEINE OFFIZIELLEN VORGABEN: Die Minuten kommen für
 * `basis: 'recherchiert'` aus dem Zertifikat (dort belegt), für B2 aus der
 * Orientierung. Die **Teilzahl** ist grob aus dem Format abgeleitet — sie
 * ist ein Bauplan für künftige Aufgaben, keine Angabe des Goethe-Instituts.
 * Das **Punktschema ist bewusst `null`**: eine ausgedachte Punktezahl wäre
 * genau die Art plausibel klingender Erfindung, die dieses Modul vermeidet
 * (denselben Grund wie `scoreExamModule` ohne Bestehensgrenze). Wer Punkte
 * braucht, findet sie vor der Prüfung beim Goethe-Institut.
 */
export type ExamSkillSkeleton = {
  /** Grobe Zahl der Prüfungsteile innerhalb der Fertigkeit (Orientierung). */
  teile: number;
  /** Minuten — beim Recherchierten die belegte Dauer, sonst Orientierung. */
  minutes: number;
  /** Bewusst `null` — siehe Kommentar oben. */
  punkte: null;
};

export type ExamLevelSkeleton = Record<ExamSkill, ExamSkillSkeleton>;

export const EXAM_FORMAT_SKELETONS: Record<ExamLevel, ExamLevelSkeleton> = {
  A1: {
    lesen: { teile: 3, minutes: 25, punkte: null },
    hoeren: { teile: 3, minutes: 20, punkte: null },
    schreiben: { teile: 2, minutes: 20, punkte: null },
    sprechen: { teile: 3, minutes: 15, punkte: null },
  },
  A2: {
    lesen: { teile: 3, minutes: 30, punkte: null },
    hoeren: { teile: 3, minutes: 30, punkte: null },
    schreiben: { teile: 2, minutes: 30, punkte: null },
    sprechen: { teile: 3, minutes: 15, punkte: null },
  },
  B1: {
    lesen: { teile: 3, minutes: 65, punkte: null },
    hoeren: { teile: 3, minutes: 40, punkte: null },
    schreiben: { teile: 2, minutes: 60, punkte: null },
    sprechen: { teile: 3, minutes: 15, punkte: null },
  },
  B2: {
    lesen: { teile: 3, minutes: 50, punkte: null },
    hoeren: { teile: 2, minutes: 30, punkte: null },
    schreiben: { teile: 2, minutes: 50, punkte: null },
    sprechen: { teile: 2, minutes: 15, punkte: null },
  },
};

export function certificateFor(level: ExamLevel): ExamCertificate {
  const certificate = CERTIFICATES.find((candidate) => candidate.level === level);
  if (!certificate) throw new Error(`Kein Zertifikat für Stufe ${level} hinterlegt.`);
  return certificate;
}

/**
 * Aufgabenformate — **beobachtet**, nicht ausgedacht.
 *
 * Alle vier kommen im Einstufungstest des Goethe-Instituts vor
 * (`goethe.de/lrn/pro/30-item/`, abgerufen am 2026-08-31, Aufgabe für Aufgabe
 * durchgeklickt):
 *   multipleChoice — „Wo können Sie mit dem Ticket reisen?" mit A/B/C
 *   trueFalse      — „Ulla war nicht in der Schule." RICHTIG / FALSCH
 *   matching       — „Sie gehen einkaufen: In welches Stockwerk gehen Sie?"
 *   gapFill        — „Rekonstruieren Sie den Text, indem Sie die fehlenden
 *                     Wörter ergänzen."
 * `production` ist kein beobachtetes Klickformat, sondern der ehrliche Umgang
 * mit Schreiben und Sprechen — siehe AE-20.
 */
export const EXAM_TASK_TYPES = [
  'multipleChoice',
  'trueFalse',
  'matching',
  'gapFill',
  'production',
] as const;
export type ExamTaskType = (typeof EXAM_TASK_TYPES)[number];

export const TASK_TYPE_LABELS: Record<ExamTaskType, string> = {
  multipleChoice: 'Auswahl (A/B/C)',
  trueFalse: 'Richtig oder Falsch',
  matching: 'Zuordnung',
  gapFill: 'Lücken füllen',
  production: 'Freie Produktion',
};

/** Was die lernende Person vor sich hat, bevor die Fragen kommen. */
export type ExamStimulus = {
  /**
   * `text` — Anzeige, Aushang, E-Mail; wird gezeigt.
   * `audio` — wird vorgelesen und ist erst nach dem Auflösen zu lesen.
   * `listing` — eine Liste, aus der zugeordnet wird (Wegweiser, Anzeigen).
   */
  kind: 'text' | 'audio' | 'listing';
  title?: string;
  /** Bei `audio` das Hörskript; sonst der sichtbare Text. */
  body: string;
  /** Bei `listing` die Einträge, aus denen zugeordnet wird. */
  entries?: string[];
};

export type ExamItem = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

/** Schreiben und Sprechen: Aufgabe, Musterlösung, Selbstkontrolle. */
export type ExamProduction = {
  task: string;
  /** Leitpunkte, wie sie das echte Format vorgibt. */
  bullets: string[];
  modelAnswer: string;
  /** Woran die lernende Person die eigene Lösung selbst prüfen kann. */
  checklist: string[];
  /** Bei Sprechen: die Musterantwort vorlesen lassen. */
  speakModelAnswer: boolean;
};

type ExamModuleBase = {
  id: string;
  certificate: string;
  level: ExamLevel;
  skill: ExamSkill;
  /**
   * Die Richtung, für die das Modul gedacht ist. Bisher immer `th_to_de` —
   * das Goethe-Institut zertifiziert Deutsch (AE-19). Das Feld steht
   * trotzdem im Schema, damit ein recherchiertes Thai-Zertifikat später ohne
   * Umbau danebenpasst.
   *
   * SEIT DEM PAARMATRIX-START VOM TYP `TargetDirection`: Damit sind
   * französische A1-Module (`de_to_fr` für Deutschsprecher, `fr_to_de` für
   * Französischsprecher im Deutschen) formal **erlaubt**. Inhalte dafür
   * kommen in einer späteren Runde (Roadmap v2, Phase 3/4); das Typsystem
   * stellt hier bereits die Tür offen. Bestehende Module (`th_to_de`) sind
   * von der Erweiterung unberührt.
   */
  direction: TargetDirection;
  title: string;
  /** Arbeitsanweisung im Ton der echten Prüfung. */
  instruction: string;
  stimulus: ExamStimulus | null;
  /**
   * Ehrlicher Anker ins bestehende Hörmaterial — NUR bei de→th-Modulen
   * gesetzt: die Clip-Quelle aus dem Katalog (z.B. `sentence-yaak` für die
   * Satzaufgabe, `greeting-A1-de_to_th-003#3` für einen Gesprächs-Turn) oder
   * der ausdrückliche Vermerk, dass kein Clip existiert. Grund für das Feld:
   * Der Abspielknopf des Prüfungs-Screens spricht Stimuli über die
   * **deutsche** Sprachausgabe (`exam-runner`, language:'de') — der echte
   * Thai-Clip liegt in „Sätze üben" bzw. den Gesprächen. Wo hier nichts
   * steht, gibt es kein Hörmaterial, und das Modul sagt das im Text.
   */
  clipAnchor?: string;
  /** Richtwert aus der Zertifikatsstruktur, auf diese eine Aufgabe skaliert. */
  minutes: number;
  source: 'builtin' | 'generated';
  generatedAt?: number;
  modelUsed?: string;
};

export type ExamModule =
  | (ExamModuleBase & {
      taskType: 'multipleChoice' | 'trueFalse' | 'matching' | 'gapFill';
      items: ExamItem[];
    })
  | (ExamModuleBase & { taskType: 'production'; production: ExamProduction });

export function isGradable(
  module: ExamModule
): module is Extract<ExamModule, { items: ExamItem[] }> {
  return module.taskType !== 'production';
}

/**
 * Prüft ein Dokument aus dem Speicher, bevor die Oberfläche es anfasst.
 *
 * WARUM DAS NÖTIG IST (Phase 9): Beim **Schreiben** prüft der Generator streng
 * (`parseExamModule`). Beim **Lesen** wurde bisher blind vertraut — und das ist
 * die falsche Annahme, sobald es eine zweite Version der App gibt. Ein
 * Dokument aus einem älteren Schema, ein von Hand eingespielter Testdatensatz
 * oder ein halb geschriebener Eintrag ließ den Prüfungs-Screen mit
 * „Cannot read properties of undefined (reading 'map')" abstürzen — nicht mit
 * einer Fehlermeldung, sondern mit einem weißen Bildschirm.
 *
 * Wer hier durchfällt, wird beim Laden ausgelassen. Eine fehlende Aufgabe ist
 * ärgerlich, ein abgestürzter Reiter macht die App unbenutzbar.
 */
export function isValidExamModule(value: unknown): value is ExamModule {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;

  if (typeof m.id !== 'string' || m.id === '') return false;
  if (!EXAM_LEVELS.includes(m.level as ExamLevel)) return false;
  if (!EXAM_SKILLS.includes(m.skill as ExamSkill)) return false;
  if (!EXAM_TASK_TYPES.includes(m.taskType as ExamTaskType)) return false;
  if (typeof m.title !== 'string' || typeof m.instruction !== 'string') return false;

  if (m.taskType === 'production') {
    const p = m.production as Record<string, unknown> | undefined;
    return (
      typeof p === 'object' &&
      p !== null &&
      typeof p.task === 'string' &&
      Array.isArray(p.bullets) &&
      typeof p.modelAnswer === 'string' &&
      Array.isArray(p.checklist)
    );
  }

  if (!Array.isArray(m.items) || m.items.length === 0) return false;
  return m.items.every((raw) => {
    const item = raw as Record<string, unknown>;
    return (
      typeof item?.prompt === 'string' &&
      Array.isArray(item.options) &&
      item.options.length >= 2 &&
      item.options.every((option: unknown) => typeof option === 'string') &&
      typeof item.correctIndex === 'number' &&
      Number.isInteger(item.correctIndex) &&
      item.correctIndex >= 0 &&
      item.correctIndex < item.options.length
    );
  });
}
