import { type ConversationSituation } from './conversation/types';
import { seededRandom, shuffled } from './drills/random';
import { type FSRSCardState } from './fsrs/types';
import { type PairDirection } from './languages/types';
import { loadCardStatesForDirection } from './repository';
import { type DataStore } from './storage';
import { type VocabEntry } from '@/data/vocab-types';

/**
 * Längere Hör- und Lesetexte (Schritt 4, Lern-Reiter-Ausbau 13.09.).
 *
 * WOHER DER STOFF KOMMT: aus den vorhandenen Situationen — jede Szene IST
 * der kurze Dialog; als Ganzes gelesen (oder zeilenweise vorgelesen) wird
 * sie zum Text. Kein neuer Stoff wird geschrieben, keine Geschichte
 * erfunden — „möglichst nur mit bereits gelernten Wörtern" regelt hier die
 * FREISCHALTUNG: Eine Szene öffnet sich erst, wenn der Wortschatzstand der
 * Richtung groß genug ist (A1 ab 20 begonnenen Karten, A2 ab 50), und zeigt
 * ehrlich, wie viele ihrer Wörter schon begonnen sind.
 *
 * WÖRTER ANTIPPEN = ÜBERSATZ: Der Text wird mit einem Greedy-Longest-Match
 * über den geprüften Vokabel-Bestand zerlegt — Wörter, die im Bestand
 * liegen, sind tippbar und zeigen ihre Bedeutung; der Rest bleibt
 * unangetasteter Fließtext. Eine Segmentierung ist eine Anzeigehilfe, keine
 * Grammatikaussage über Thai.
 *
 * VERSTÄNDNISFRAGEN werden mechanisch aus der Szene abgeleitet (Bedeutung
 * → Zeile; Wer sagt die Zeile?) — nichts wird behauptet, was nicht in den
 * Daten steht.
 */

/** Freischalt-Schwellen: begonnene Karten je Level. */
const SCHWELLE: Record<string, number> = { A1: 20, A2: 50 };

export type TextToken = {
  text: string;
  /** Geprüfter Bestandseintrag hinter dem Wort — tippbar, wenn gesetzt. */
  entry?: { id: string; term: string; german: string };
};

export type VerstaendnisFrage = {
  id: string;
  art: 'bedeutung' | 'sprecher';
  frage: string;
  optionen: string[];
  correctIndex: number;
};

export type LeseStoff = {
  situation: ConversationSituation;
  offen: boolean;
  /** Wie viele Pool-Wörter der Szene schon begonnen sind. */
  bekannt: number;
  /** Wie viele Pool-Wörter die Szene überhaupt nutzt. */
  poolWoerter: number;
  /** Kartenstand, ab dem die Szene offen ist. */
  schwellwert: number;
};

/** Begonnene Karten = Zustand außer 'new'. */
function begonnen(cards: FSRSCardState[], vocabIds: Set<string>): number {
  let n = 0;
  for (const card of cards) {
    if (vocabIds.has(card.vocabId) && card.state !== 'new') n += 1;
  }
  return n;
}

/**
 * Zerlegt eine Textzeile in tippbare Bestandswörter und Rest.
 *
 * Latein: ganze Wörter (Groß-/Kleinschreibung egal). Thai: Greedy-Longest-
 * Match an jeder Position — der längste Bestandsterm gewinnt, alles andere
 * bleibt ein unveränderter Rest.
 */
export function tokenisiereFuerAntippen(
  text: string,
  pool: VocabEntry[],
  latin: boolean
): TextToken[] {
  const tokens: TextToken[] = [];
  if (latin) {
    for (const wort of text.split(/(\s+)/)) {
      if (/^\s+$/.test(wort) || wort.length === 0) {
        tokens.push({ text: wort });
        continue;
      }
      const bloß = wort.replace(/[\p{P}\p{S}]/gu, '').toLowerCase();
      const entry = pool.find((e) => e.term.toLowerCase() === bloß);
      tokens.push(entry ? { text: wort, entry: { id: entry.id, term: entry.term, german: entry.german } } : { text: wort });
    }
    return tokens;
  }

  // Thai: längste Übereinstimmung an jeder Position.
  const sortiert = [...pool].sort((a, b) => b.term.length - a.term.length);
  let i = 0;
  let rest = '';
  const flushRest = () => {
    if (rest) {
      tokens.push({ text: rest });
      rest = '';
    }
  };
  while (i < text.length) {
    let gefunden: VocabEntry | null = null;
    for (const entry of sortiert) {
      if (entry.term.length > 0 && text.startsWith(entry.term, i)) {
        gefunden = entry;
        break;
      }
    }
    if (gefunden) {
      flushRest();
      tokens.push({
        text: gefunden.term,
        entry: { id: gefunden.id, term: gefunden.term, german: gefunden.german },
      });
      i += gefunden.term.length;
    } else {
      rest += text[i];
      i += 1;
    }
  }
  flushRest();
  return tokens;
}

/** Die Pool-Wörter, die in der Szene vorkommen (für Statistik + Antippen). */
export function poolWoerterDerSzene(
  situation: ConversationSituation,
  pool: VocabEntry[],
  latin: boolean
): VocabEntry[] {
  const text = situation.scriptTurns.map((t) => t.thai).join(' ');
  if (latin) {
    const woerter = new Set(
      text
        .toLowerCase()
        .replace(/[\p{P}\p{S}]/gu, ' ')
        .split(/\s+/)
    );
    return pool.filter((e) => woerter.has(e.term.toLowerCase()));
  }
  return pool.filter((e) => e.term.length > 0 && text.includes(e.term));
}

/**
 * Verständnisfragen aus der Szene — rein mechanisch:
 *   • Bedeutung: „Welche Zeile heißt …?" (Optionen: Zeilen derselben Szene)
 *   • Sprecher: „Wer sagt …?" (Du oder Gegenüber)
 */
export function verstaendnisFragen(
  situation: ConversationSituation,
  seed: number,
  anzahl = 3
): VerstaendnisFrage[] {
  const zeilen = situation.scriptTurns.filter((t) => t.thai.trim().length > 0);
  if (zeilen.length < 3) return [];
  const random = seededRandom(seed);
  const reihen = shuffled(zeilen, random).slice(0, anzahl);

  return reihen.map((zeile, i) => {
    if (i % 2 === 0) {
      // Bedeutungs-Frage: richtige Zeile + zwei fremde Zeilen.
      const fremde = zeilen
        .filter((t) => t.thai !== zeile.thai)
        .map((t) => t.thai);
      const gesucht = shuffled(fremde, seededRandom(seed + i)).slice(0, 2);
      const optionen = shuffled([zeile.thai, ...gesucht], seededRandom(seed + i + 1));
      return {
        id: `${situation.id}-bedeutung-${i}`,
        art: 'bedeutung' as const,
        frage: zeile.german,
        optionen,
        correctIndex: optionen.indexOf(zeile.thai),
      };
    }
    const richtig = zeile.speaker === 'learner' ? 0 : 1;
    return {
      id: `${situation.id}-sprecher-${i}`,
      art: 'sprecher' as const,
      frage: zeile.thai,
      optionen: [],
      correctIndex: richtig,
    };
  });
}

/**
 * Die Lesestoffe einer Richtung — Szene, Offen-Status, Wortstatistik.
 * Sortiert: offene zuerst, dann nach Level und Titel (stabil, ehrlich).
 */
export function lesestoffeFuerRichtung(options: {
  direction: PairDirection;
  situationen: ConversationSituation[];
  pool: VocabEntry[];
  cards: FSRSCardState[];
  latin: boolean;
}): LeseStoff[] {
  const { direction, situationen, pool, cards, latin } = options;
  const passend = situationen.filter((s) => s.direction === direction);
  const stoffe = passend.map((situation) => {
    const woerter = poolWoerterDerSzene(situation, pool, latin);
    const vocabIds = new Set(woerter.map((w) => w.id));
    const bekannt = begonnen(cards, vocabIds);
    const schwellwert = SCHWELLE[situation.level] ?? SCHWELLE.A1;
    // Freigeschaltet, wenn die Szene kein Pool-Wort hat (nichts, worauf die
    // Schranke warten könnte) oder ihr eigener Wortschatz im Kartenstand
    // begonnen ist — Level-Schwelle und Szenen-Wortschatz, das kleinere
    // Kriterium gewinnt, damit kurze Szenen nie un erreichbar bleiben.
    return {
      situation,
      offen: woerter.length === 0 || bekannt >= Math.min(schwellwert, woerter.length),
      bekannt,
      poolWoerter: woerter.length,
      schwellwert,
    };
  });
  return stoffe.sort((a, b) =>
    a.offen === b.offen ? a.situation.title.localeCompare(b.situation.title) : a.offen ? -1 : 1
  );
}

/** Lädt Kartenstände für die Freischaltung (liest nur). */
export async function ladeKartenFuer(
  direction: PairDirection,
  store?: DataStore
): Promise<FSRSCardState[]> {
  return loadCardStatesForDirection(direction, store);
}
