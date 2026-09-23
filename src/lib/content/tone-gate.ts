import { activeVocabulary } from '@/data/active-vocabulary';
import type { AudioClip } from '../clips/types';
import { normalizeClipText } from '../clips/types';
import {
  analyzeToneContour,
  konturBewegung,
  medianReferenceHz,
  octaveCorrect,
  semitones,
  summarizeContour,
  trimEdges,
  voicedRuns,
  type F0Frame,
  type ToneContourSummary,
} from '../speaking/analysis';
import { TONE_KEYS, type Tone } from '@/constants/tones';
import { tonfolgeAusRoman } from './roman-tone';

export const TONE_GATE_VERSION = 'f0-syllables-2';
export const TONE_GATE_LIMITS =
  'Filter gegen grobe Tonhöhenfehler je Silbe, kein Qualitätsnachweis. Konsonanten, Vokallänge und Aspiration werden nicht geprüft. Wörter werden silbenweise gegen syllables[].tone geprüft, Beispielsätze gegen die Tonfolge ihrer Roman-Umschrift; Dialogzüge bleiben ungeprüft. Silbengrenzen kommen aus den stimmhaften Zügen: zu viele werden verschmolzen, zu wenige an deutlichen Energietälern getrennt — bleibt die Zahl unklar, wird nicht geraten. Fallend und steigend werden an der Bewegung nach Gipfel bzw. Tal gemessen (nicht an Anfang-minus-Ende); ein Widerspruch ist nur die GEGENLÄUFIGE Bewegung. Die Registerlage von mittel, tief und hoch bleibt ohne Sprecherreferenz ungeprüft, innerhalb eines Clips wird nur die Ordnung der Silben zueinander geprüft (AE-7/AE-8). System-TTS wird durch diesen Filter nicht geprüft.';

export type ToneCheck = {
  status: 'passed' | 'failed' | 'unchecked' | 'not-applicable';
  reason: string;
  version: string;
  /** Sollton der einzigen Silbe (Einsilber; Kompatibilität zu Berichten). */
  targetTone?: Tone;
  /** Solltonfolge aller Silben (Mehrsilber und Sätze). */
  targetTones?: Tone[];
  /** Woher die Solltöne stammen — Fehlertexte und Berichte lesen das ab. */
  quelle?: 'wort-silben' | 'satz-roman';
  sourceId?: string;
  source?: string;
  voicedMs?: number;
  summary?: ToneContourSummary;
  /** Urteil je Soll-Silbe, parallel zu targetTones (nur die FORM). */
  silben?: { tone: Tone; form: 'geprueft' | 'widerspruch' | 'knapp' | 'register' }[];
  /** Register-Ordnung zwischen Silben desselben Clips (seit 18.09. Nachmittag). */
  ordnung?: { erfuellt: number; widerspruch?: { von: number; bis: number } };
  /**
   * Lage jeder Silbe in Halbtoenen zur CLIP-eigenen Referenz — das Rohmaterial
   * der Register-Laufprobe (20.09.). Nur Mehrsilber liefern hier etwas:
   * ein Einsilber IST seine eigene Referenz und stuende zwangslaeufig auf 0.
   */
  lagen?: { tone: Tone; halbtoene: number }[];
  track?: { seconds: number; hz: number; correlation: number }[];
};

/**
 * Nur die Felder, die die Pruefung liest. Frisch generierte Clips liegen
 * als `AudioClipSpec` vor, noch ohne Format, Groesse und Ablageschluessel —
 * die Pruefung soll vor dem Ablegen laufen koennen, nicht erst danach.
 */
export type ToneCheckClip = Pick<AudioClip, 'language' | 'text' | 'kind' | 'sourceId'>;

/**
 * Der Wortschatz, aus dem das Tor die Solltoene liest. Strukturell erfuellt
 * von `VocabEntry` (Grundstock UND Erzeugungs-Prompt-Daten) und von den
 * Katalog-Dokumenten der Node-Pipeline — absichtlich kein Volltyp, damit
 * Browser-Store, Helper und Tests dieselbe Funktion fuettern koennen.
 *
 * SEIT 18.09. ohnehin Pflicht fuer den echten Lauf: der alte Default griff
 * nur auf den 84-Eintraege-Altbestand zu und verlangte `sourceVerified`,
 * das KI-Woerter bewusst nie tragen — alle 2000 Woerter des Thai-Laufs
 * waeren ungeprueft durchgerutscht.
 */
export type ToneWort = {
  id: string;
  term: string;
  syllables?: readonly { tone?: Tone }[];
  exampleTerm?: string;
  exampleRoman?: string;
  /**
   * Quellengeprüfter Grundstock ODER KI-geprüfte Erzeugung: Seit dem
   * Publish-Fix 16.09. tragen KI-Wörter bewusst nie `sourceVerified`, ihre
   * Prüfung steht in `verificationNote` („KI-Kreuzprüfung bestanden …" /
   * „KI-Erzeugung, einfach geprüft …"). Die zwei Altbestand-Wörter mit
   * „UNSICHER:"-Notiz (raan, noon) bleiben vom Tor ausgeschlossen — ihre
   * Notiz ist eine Warnung, kein Prüf-Nachweis.
   */
  sourceVerified?: boolean;
  verificationNote?: string;
  source?: string;
};

export type ToneKontext = { woerter: readonly ToneWort[] };

/** Stimmhafte Zuege, die klar zur SELBEN Silbe gehoeren, wieder zusammenfuehren. */
const MAX_MERGE_LUECKE_MS = 220;

/**
 * Register-Rang der fuenf Toene fuer die paarweise Ordnungspruefung.
 *
 * Ohne kalibrierte Sprecherreferenz ist die ABSOLUTE Lage von mittel/tief/hoch
 * nicht pruefbar — aber INNERHALB eines Clips sind die Silben untereinander
 * vergleichbar (derselbe Sprecher, dieselbe Aufnahme): hoch endet oben,
 * steigend endet oben, fallend startet oben, mittel liegt mittig, tief unten.
 * Die drei „oberen" Toene stehen deshalb auf EINEM Rang: zwischen ihnen ist
 * die Lagendifferenz zu klein und vor allem uebergangsanfaellig (eine hoch-
 * Silbe faellt zum tief startenden steigenden Ton der Naechsten ab —
 * ซีอิ๊วขาว, 18.09.), das waere kein Sprechfehler. Ordnung gibt es nur
 * zwischen den Lagenklassen oben/mittel/tief.
 */
const REGISTER_RANG: Record<Tone, number> = { high: 3, rising: 3, falling: 3, mid: 1, low: 0 };
const ORDNUNG_ERFUELLT_HALBTOENE = 1.5;
const ORDNUNG_WIDERSPRUCH_HALBTOENE = -2.5;
/**
 * Nur BENACHBARTE Silben werden in der Lage verglichen (20.09.).
 *
 * Gesprochene Aeusserungen sacken zum Ende hin ab (Deklination). Bei
 * zwei- und dreisilbigen Woertern faellt das nicht ins Gewicht — dort
 * aendert die Grenze nichts, alle Paare bleiben nah. Ein SATZ traegt aber
 * bis zu 15 Silben: zwischen Silbe 1 und Silbe 12 stammt der Lagenabstand
 * dann ueberwiegend aus dem Absacken der Stimme und nicht aus dem Ton — so
 * ein Vergleich wuerde korrekt gesprochene Saetze verwerfen. Schon zwei
 * Schritte reichen dafuer aus (nachgerechnet: eine hohe Silbe am Satzende
 * liegt gegen eine mittlere zwei Plaetze davor rechnerisch im Widerspruch,
 * obwohl nichts falsch gesprochen ist). Benachbarte Silben teilen dieselbe
 * Sprechlage und sind der belastbare Teil.
 */
const MAX_ORDNUNG_ABSTAND = 1;

function tonalgGeprueft(wort: ToneWort): boolean {
  return wort.sourceVerified === true || wort.verificationNote?.startsWith('KI-') === true;
}

/** Solltonfolge eines Clips aus dem Wortschatz — oder null, wenn es keinen Soll gibt. */
export function sollToneFuerClip(
  clip: ToneCheckClip,
  woerter: readonly ToneWort[]
): { toene: Tone[]; quelle: 'wort-silben' | 'satz-roman'; wortId: string } | null {
  if (clip.kind === 'vocab') {
    const wort = woerter.find((w) => w.id === clip.sourceId && w.term === clip.text);
    if (!wort?.syllables?.length || !tonalgGeprueft(wort)) return null;
    const toene: Tone[] = [];
    for (const silbe of wort.syllables) {
      if (!silbe.tone || !TONE_KEYS.includes(silbe.tone)) return null;
      toene.push(silbe.tone);
    }
    return { toene, quelle: 'wort-silben', wortId: wort.id };
  }
  if (clip.kind === 'example') {
    const wort = woerter.find((w) => w.id === clip.sourceId);
    if (!wort?.exampleRoman || !wort.exampleTerm || !tonalgGeprueft(wort)) return null;
    // Clip-Texte laufen normalisiert (Leerzeichen kollabiert) durch den Plan;
    // derselbe Vergleich auf beiden Seiten, sonst lehnt das Tor den Bezug ab.
    if (normalizeClipText(clip.text) !== normalizeClipText(wort.exampleTerm)) return null;
    const toene = tonfolgeAusRoman(wort.exampleRoman);
    return toene ? { toene, quelle: 'satz-roman', wortId: wort.id } : null;
  }
  return null;
}

/**
 * Stimmhafte Zuege benachbarter Silben verschmelzen, bis die Zahl zur
 * Soll-Silbenzahl passt — Glottalpausen und kurze Einrisse zerlegen eine
 * Silbe sonst in mehrere Zuege. Nachbarn mit der kleinsten Luecke zuerst;
 * grosse Luecken (echte Pausen zwischen Silben) bleiben getrennt.
 */
function fuegeZuegeZusammen(zuege: F0Frame[][], soll: number): F0Frame[][] {
  let segmente = zuege.map((zug) => [...zug]);
  while (segmente.length > soll) {
    let beste = -1;
    let besteLuecke = Number.POSITIVE_INFINITY;
    for (let i = 0; i + 1 < segmente.length; i++) {
      const ende = segmente[i][segmente[i].length - 1];
      const anfang = segmente[i + 1][0];
      const luecke = (anfang.t - ende.t) * 1000;
      if (luecke < besteLuecke) {
        besteLuecke = luecke;
        beste = i;
      }
    }
    if (beste < 0 || besteLuecke > MAX_MERGE_LUECKE_MS) break;
    segmente = [
      ...segmente.slice(0, beste),
      [...segmente[beste], ...segmente[beste + 1]],
      ...segmente.slice(beste + 2),
    ];
  }
  return segmente;
}

/**
 * Mindestlaenge einer Silbe in Fenstern — dieselbe Grenze, ab der
 * `voicedRuns` einen Zug ueberhaupt gelten laesst (4 Fenster = 40 ms).
 */
const MIN_SILBEN_FENSTER = 4;
/**
 * Wie tief das Energietal sein muss, damit es als Silbengrenze IN einem
 * stimmhaften Zug gilt: hoechstens 55 % der leiseren der beiden
 * Nachbarspitzen.
 *
 * WARUM UEBERHAUPT TRENNEN (20.09.): Zu wenige stimmhafte Zuege waren im
 * echten Bestand der HAEUPTGRUND, dass gar nicht geprueft wurde — bei
 * zweisilbigen Woertern 5 von 17, bei dreisilbigen 2 von 4, bei
 * fuenfsilbigen 2 von 2. Thai-Silben haengen im F0-Verlauf zusammen, wenn
 * die Grenze ein Sonorant oder ein nicht geloester Verschluss ist; die
 * Lautstaerke sackt an der Grenze aber messbar ein. Verschmelzen konnte das
 * Tor (zu viele Zuege), trennen bisher nicht — fuer SAETZE, die im Schnitt
 * sieben Silben tragen, entschied genau das ueber „geprueft" oder gar
 * nichts. Findet sich kein deutliches Tal, bleibt es beim ehrlichen
 * „ungeprueft"; geraten wird nicht.
 */
const TRENN_TAL_ANTEIL = 0.55;

/**
 * Zu wenige stimmhafte Zuege an den deutlichsten Energietaelern trennen.
 * Liefert die Segmente und die Zahl der so gesetzten Grenzen — der Aufrufer
 * wertet eine geratene Grenze vorsichtiger als eine gemessene Stille.
 */
function teileZuege(zuege: F0Frame[][], soll: number): { segmente: F0Frame[][]; geteilt: number } {
  let segmente = zuege.map((zug) => [...zug]);
  let geteilt = 0;
  while (segmente.length < soll) {
    let besterZug = -1;
    let besterIndex = -1;
    let bestesVerhaeltnis = TRENN_TAL_ANTEIL;
    segmente.forEach((segment, nr) => {
      if (segment.length < 2 * MIN_SILBEN_FENSTER) return;
      for (let i = MIN_SILBEN_FENSTER; i <= segment.length - MIN_SILBEN_FENSTER; i++) {
        const tal = segment[i];
        if (tal.rms > segment[i - 1].rms) continue;
        if (i + 1 < segment.length && tal.rms > segment[i + 1].rms) continue;
        let maxLinks = 0;
        for (let j = 0; j < i; j++) maxLinks = Math.max(maxLinks, segment[j].rms);
        let maxRechts = 0;
        for (let j = i; j < segment.length; j++) maxRechts = Math.max(maxRechts, segment[j].rms);
        const flanke = Math.min(maxLinks, maxRechts);
        const verhaeltnis = flanke > 0 ? tal.rms / flanke : 1;
        if (verhaeltnis < bestesVerhaeltnis) {
          bestesVerhaeltnis = verhaeltnis;
          besterZug = nr;
          besterIndex = i;
        }
      }
    });
    if (besterZug < 0) break;
    const segment = segmente[besterZug];
    segmente = [
      ...segmente.slice(0, besterZug),
      segment.slice(0, besterIndex),
      segment.slice(besterIndex),
      ...segmente.slice(besterZug + 1),
    ];
    geteilt += 1;
  }
  return { segmente, geteilt };
}

/**
 * Wie viel Bewegung eine Silbe zeigen muss, um als fallend/steigend zu
 * GELTEN — und ab wann die Gegenbewegung ein echter Widerspruch ist.
 *
 * Gemessen am echten Lauf (20.09., alle 31 Thai-Clips des Nutzers plus die
 * Diagnose-Stimmen): korrekt gesprochene fallende Silben bringen 4 bis 9
 * Halbtoene Abfall nach dem Gipfel, steigende 4,5 bis 6 Halbtoene Anstieg
 * nach dem Tal. Unter 1,5 Halbtoenen ist ueberhaupt keine Bewegung da.
 */
const FORM_KLAR_HALBTOENE = 3;
/**
 * Darunter ist ueberhaupt keine Bewegung da — eine ebene Silbe ist kein
 * fallender und kein steigender Ton, und das ist ohne Sprecherreferenz
 * belastbar messbar. Zwischen Spur und „klar" liegt das neutrale 'knapp'.
 */
const FORM_SPUR_HALBTOENE = 1.5;
/**
 * Wo der Wendepunkt liegen darf. Der fallende Ton setzt oft tief an, steigt
 * kurz und faellt dann (เจ้าสาว: Gipfel bei 40 %) — der Gipfel darf also
 * wandern, nur nicht ans Ende, sonst ist es eine steigende Silbe.
 */
const WENDEPUNKT_FRUEH = 0.6;

/**
 * Formurteil einer Silbe. 'register' heisst: ohne Sprecherreferenz keine
 * Aussage moeglich; 'knapp' heisst: Bewegung da, aber nicht klar genug.
 *
 * WARUM NUR DIE GEGENBEWEGUNG VERWIRFT (20.09., Nutzerwunsch „verbesser die
 * Thai-Audio-Ueberpruefung"): Die alten Schwellen massen `slope` =
 * Ende−Anfang und verwarfen alles darunter. Nachgemessen an den echten
 * Clips traf das korrekt gesprochene Silben — เจ้าสาว (jâao, fallend) faellt
 * nach seinem Gipfel um 4,1 Halbtoene, hat wegen des tiefen Ansatzes aber
 * nur `slope` −1,65 und wurde VERWORFEN; ebenso ลูกสาว bei zwei von drei
 * Stimmen und ด้าน bei alloy. Jeder Verwurf kostet beim naechsten Lauf
 * erneut Geld und laesst den Clip dauerhaft fehlen, wenn die Stimme
 * reproduzierbar so spricht. Ein Ton ist deshalb nur dann widerlegt, wenn
 * die Kontur klar das GEGENTEIL tut (fallend gefordert, Silbe steigt klar
 * und faellt nirgends) — genau das, was ohne Sprecherreferenz ueberhaupt
 * belastbar messbar ist. Alles dazwischen zaehlt neutral.
 */
function formurteil(
  ton: Tone,
  summary: ToneContourSummary,
  einzeln: boolean
): 'geprueft' | 'widerspruch' | 'knapp' | 'register' {
  const bewegung = konturBewegung(summary);
  if (ton === 'falling') {
    if (bewegung.fall >= FORM_KLAR_HALBTOENE && bewegung.gipfelBei <= WENDEPUNKT_FRUEH) return 'geprueft';
    // Kein nennenswerter Abfall IRGENDWO in der Silbe: der fallende Ton ist
    // nicht gesprochen worden — egal ob die Silbe steigt oder eben bleibt.
    if (bewegung.fall < FORM_SPUR_HALBTOENE) return 'widerspruch';
    return 'knapp';
  }
  if (ton === 'rising') {
    if (bewegung.stieg >= FORM_KLAR_HALBTOENE && bewegung.talBei <= WENDEPUNKT_FRUEH) return 'geprueft';
    if (bewegung.stieg < FORM_SPUR_HALBTOENE) return 'widerspruch';
    return 'knapp';
  }
  // mittel, tief, hoch: die LAGE unterscheidet sie, und die ist ohne
  // Sprecherreferenz nicht pruefbar (die Ordnungspruefung deckt sie ab).
  // Einzige Ausnahme bleibt der ISOLIERTE hohe Ton, der deutlich faellt —
  // im Mehrsilber ist derselbe Abfall meist der Uebergang zur naechsten
  // (oft tief startenden) Silbe und darf nicht verwerfen (ซีอิ๊วขาว, 18.09.).
  // Beim hohen Ton bleibt es bei der an den AE-31-Referenzaufnahmen
  // kalibrierten Anfang-Ende-Schwelle: `edge_Niwat_maa_high` faellt nach
  // seinem Gipfel um 3,2 Halbtoene und ist trotzdem korrekt gesprochen —
  // ein hoher Ton DARF am Ende absacken, er muss nur oben ANFANGEN. Nur der
  // durchgehende Fall (Anfang−Ende) widerspricht ihm.
  if (ton === 'high' && summary.slope < -FORM_KLAR_HALBTOENE && bewegung.stieg < FORM_SPUR_HALBTOENE) {
    return einzeln ? 'widerspruch' : 'knapp';
  }
  return 'register';
}

function medianVonZahlen(werte: number[]): number {
  const sortiert = [...werte].sort((a, b) => a - b);
  return sortiert[Math.floor(sortiert.length / 2)];
}

/**
 * Lagekennwert einer Silbe in Hz, passend zum Sollton: die drei oberen Toene
 * (hoch bleibt oben, steigend ENDET oben, fallend STARTET oben) zaehlen ihr
 * MAXIMUM — das bleibt vom Abfall zum Uebergang in die naechste Silbe
 * unberuehrt (Enddrittel wurde bei ซีอิ๊วขาว nach unten gezogen, 18.09.);
 * mittel und tief zaehlen den Median der ganzen Silbe.
 */
function lageFuer(ton: Tone, span: readonly F0Frame[]): number {
  if (ton === 'high' || ton === 'rising' || ton === 'falling') {
    return Math.max(...span.map((frame) => frame.f0));
  }
  return medianVonZahlen(span.map((frame) => frame.f0));
}

/** Paarweise Register-Ordnung der Silben untereinander, gegen EINE gemeinsame Clip-Referenz. */
function ordnungsUrteile(
  silbenToene: Tone[],
  spans: readonly (readonly F0Frame[])[],
  clipReferenzHz: number
): { erfuellt: number; widerspruch?: { von: number; bis: number }; lagen: { tone: Tone; halbtoene: number }[] } {
  const lagen = spans.map((span, i) => ({ nr: i, rang: REGISTER_RANG[silbenToene[i]], lage: semitones(lageFuer(silbenToene[i], span), clipReferenzHz) }));
  let erfuellt = 0;
  let widerspruch: { von: number; bis: number } | undefined;
  for (let i = 0; i < lagen.length && !widerspruch; i++) {
    for (let j = i + 1; j < lagen.length; j++) {
      if (j - i > MAX_ORDNUNG_ABSTAND) break;
      const richtung = Math.sign(lagen[i].rang - lagen[j].rang);
      if (richtung === 0) continue;
      // Die erwartete Richtung haengt am RANG-Unterschied, nicht an der
      // Reihenfolge: bei [tief, mittel] soll Silbe i UNTER Silbe j liegen —
      // genau das war am 18.09. Abend als Widerspruch verworfen worden und
      // hat im Nutzer-Lauf korrekt gesprochene Clips kostenpflichtig gekillt.
      const diff = richtung * (lagen[i].lage - lagen[j].lage);
      if (diff <= ORDNUNG_WIDERSPRUCH_HALBTOENE) {
        widerspruch = { von: i + 1, bis: j + 1 };
        break;
      }
      if (diff >= ORDNUNG_ERFUELLT_HALBTOENE) erfuellt += 1;
    }
  }
  return {
    erfuellt,
    ...(widerspruch ? { widerspruch } : {}),
    lagen: lagen.map((eintrag) => ({ tone: silbenToene[eintrag.nr], halbtoene: eintrag.lage })),
  };
}

/**
 * REGISTER-LAUFPROBE (20.09.): Was einzeln nicht geht, geht ueber den Lauf.
 *
 * Die ABSOLUTE Lage von mittel/tief/hoch ist in EINEM Clip nicht pruefbar —
 * nachgemessen am Bestand des Nutzers streut die Sprechlage von Clip zu Clip
 * um rund fuenf Halbtoene, also genauso weit, wie die Register selbst
 * auseinanderliegen. Rechnet man die Lage jeder Silbe aber gegen die
 * Referenz IHRES Clips, faellt dieser Versatz heraus, und ueber viele Clips
 * bleibt die Systematik der Stimme uebrig: an den 31 echten Clips lagen tiefe
 * Silben im Mittel −2,0, mittlere −0,0 und hohe +4,6 Halbtoene.
 *
 * Eine Stimme, die die Register gar nicht markiert, faellt hier auf — und
 * genau dieser Fall ist der teure: Einsilber mit mittel/tief/hoch sind 64 %
 * des Wortschatzes und einzeln unbeweisbar. Die Probe verwirft nie einen
 * einzelnen Clip; sie urteilt nur ueber die STIMME.
 */
export type RegisterProbe = { low: number[]; mid: number[]; high: number[] };
export const REGISTER_PROBE_MIN = 25;
/** Mindestabstand hoch−tief im Mittel; gemessen waren es 6,6 Halbtoene. */
export const REGISTER_PROBE_ABSTAND = 2;

export function leereRegisterProbe(): RegisterProbe {
  return { low: [], mid: [], high: [] };
}

export function sammleRegisterProbe(probe: RegisterProbe, check: ToneCheck): void {
  for (const lage of check.lagen ?? []) {
    if (lage.tone === 'low' || lage.tone === 'mid' || lage.tone === 'high') probe[lage.tone].push(lage.halbtoene);
  }
}

function mittel(werte: readonly number[]): number {
  return werte.reduce((summe, wert) => summe + wert, 0) / werte.length;
}

export function beurteileRegisterProbe(probe: RegisterProbe): {
  genug: boolean;
  getrennt: boolean;
  abstand: number;
  mittelwerte: { low: number; mid: number; high: number };
} {
  const genug = probe.low.length >= REGISTER_PROBE_MIN && probe.high.length >= REGISTER_PROBE_MIN;
  const mittelwerte = {
    low: probe.low.length ? mittel(probe.low) : 0,
    mid: probe.mid.length ? mittel(probe.mid) : 0,
    high: probe.high.length ? mittel(probe.high) : 0,
  };
  const abstand = mittelwerte.high - mittelwerte.low;
  return { genug, getrennt: abstand >= REGISTER_PROBE_ABSTAND, abstand, mittelwerte };
}

export function checkThaiTone(
  clip: ToneCheckClip,
  pcm: Float32Array,
  sampleRate: number,
  kontext?: ToneKontext,
  optionen?: { track?: boolean }
): ToneCheck {
  const base = { version: TONE_GATE_VERSION };
  if (clip.language !== 'th') return { ...base, status: 'not-applicable', reason: 'Kein Thai-Ton; nur technische Integritätsprüfung.' };
  const measurement = analyzeToneContour(pcm, sampleRate);
  const track = optionen?.track
    ? measurement.frames.map((frame) => ({ seconds: frame.t, hz: frame.f0, correlation: frame.correlation ?? 0 }))
    : undefined;
  const soll = sollToneFuerClip(clip, kontext?.woerter ?? activeVocabulary());
  if (!soll) {
    const grund =
      clip.kind === 'vocab'
        ? 'Kein Wortbezug mit geprüften Silbentönen im übergebenen Wortschatz.'
        : clip.kind === 'example'
          ? 'Beispielsatz ohne auswertbare Ton-Umschrift (exampleRoman).'
          : 'Dialogzug ohne hinterlegte Silbentöne.';
    return { ...base, ...(track ? { track } : {}), voicedMs: measurement.voicedMs, status: 'unchecked', reason: grund };
  }
  const bezug = { sourceId: soll.wortId, quelle: soll.quelle };

  // EINSILBER: unverändert die längste stimmhafte Strecke als die eine Silbe.
  if (soll.toene.length === 1) {
    const targetTone = soll.toene[0];
    const target = { ...base, ...bezug, targetTone, targetTones: soll.toene, ...(track ? { track } : {}) };
    const metrics = { voicedMs: measurement.voicedMs, ...(measurement.status === 'measured' ? { summary: measurement.summary } : {}) };
    if (measurement.status !== 'measured') return { ...target, ...metrics, status: 'unchecked', reason: 'Keine ausreichend zusammenhängende stimmhafte Strecke.' };
    // Dasselbe Formurteil wie im Mehrsilber, nur als ISOLIERTE Silbe
    // (`einzeln`): hier gibt es keine Nachbarsilbe, in die ein hoher Ton
    // hinunterziehen könnte, also verwirft der deutliche Fall weiterhin.
    const urteil = formurteil(targetTone, measurement.summary, true);
    const silben = [{ tone: targetTone, form: urteil }];
    if (urteil === 'geprueft') {
      return { ...target, ...metrics, silben, status: 'passed',
        reason: 'Relative Konturform mit verifiziertem Sollton vereinbar; nur Tonhöhe geprüft.' };
    }
    if (urteil === 'widerspruch') {
      return { ...target, ...metrics, silben, status: 'failed',
        reason: targetTone === 'high'
          ? 'Deutlicher Fall widerspricht dem hohen Ton.'
          : 'Relative Konturform widerspricht dem verifizierten Sollton.' };
    }
    return { ...target, ...metrics, silben, status: 'unchecked',
      reason: urteil === 'knapp'
        ? 'Konturbewegung zu knapp für ein Urteil — nicht verworfen.'
        : 'Registerlage mittel/tief/hoch ohne Sprecherreferenz nicht prüfbar.' };
  }

  // MEHRSILBER: jeder Soll-Silbe genau ein stimmhafter Zug, der Reihe nach.
  const metrics = { voicedMs: measurement.voicedMs, ...(track ? { track } : {}) };
  const zuege = voicedRuns(measurement.frames);
  if (!zuege.length) {
    return { ...base, ...bezug, ...metrics, targetTones: soll.toene, status: 'unchecked', reason: 'Keine ausreichend zusammenhängende stimmhafte Strecke.' };
  }
  const verschmolzen = fuegeZuegeZusammen(zuege, soll.toene.length);
  const { segmente, geteilt } = teileZuege(verschmolzen, soll.toene.length);
  if (segmente.length < soll.toene.length) {
    return { ...base, ...bezug, ...metrics, targetTones: soll.toene, status: 'unchecked',
      reason: `${soll.toene.length} Soll-Silben, aber nur ${segmente.length} trennbare Silben — verbundene Silben ohne sichere Grenze nicht prüfbar.` };
  }
  if (segmente.length > soll.toene.length) {
    return { ...base, ...bezug, ...metrics, targetTones: soll.toene, status: 'unchecked',
      reason: `${segmente.length} stimmhafte Züge für ${soll.toene.length} Soll-Silben — Zuordnung nicht eindeutig.` };
  }
  const spans = segmente.map((segment) => trimEdges(octaveCorrect(segment)));
  const silben = spans.map((span, i) => ({ tone: soll.toene[i], form: formurteil(soll.toene[i], summarizeContour(span, medianReferenceHz(span)), false) }));
  // Die Clip-Referenz aus den OKTAVKORRIGIERTEN Silben: ein einzelner
  // Oktavsprung der Autokorrelation verschöbe sonst den Median, an dem alle
  // Silbenlagen gemessen werden (die Silben selbst laufen längst korrigiert).
  const ordnung = ordnungsUrteile(soll.toene, spans, medianReferenceHz(spans.flat()));
  const ordnungFeld = {
    ordnung: { erfuellt: ordnung.erfuellt, ...(ordnung.widerspruch ? { widerspruch: ordnung.widerspruch } : {}) },
    lagen: ordnung.lagen,
  };
  const widersprueche = silben.flatMap((silbe, i) => (silbe.form === 'widerspruch' ? [i + 1] : []));
  // WIE VIELE WIDERSPRÜCHE VERWERFEN (20.09.): Eine Silbengrenze, die erst
  // aus einem Energietal geraten wurde, und eine lange Silbenkette können
  // beide EINE Silbe falsch zuschneiden — dann misst das Tor die Kontur der
  // Nachbarsilbe und verwürfe einen korrekt gesprochenen Clip, der beim
  // nächsten Lauf erneut bezahlt wird. Bei geratener Grenze oder ab fünf
  // Silben (praktisch jeder Satz) zählt deshalb erst der ZWEITE Widerspruch;
  // eine Stimme, die die Töne wirklich nicht trifft, trifft mehrere.
  const noetigeWidersprueche = geteilt > 0 || soll.toene.length >= 5 ? 2 : 1;
  const formWiderspruch = widersprueche.length >= noetigeWidersprueche ? widersprueche[0] - 1 : -1;
  // Dieselbe Vorsicht für die Lage: eine aus dem Lautstärkeverlauf GERATENE
  // Grenze verschiebt den Zuschnitt beider Nachbarsilben und damit direkt
  // deren gemessene Lage. อธิบาย (à-thí-baai) wurde am 20.09. genau so
  // verworfen, nachdem die Trennung die dritte Silbe überhaupt erst sichtbar
  // gemacht hatte. Geratene Grenzen dürfen Abdeckung bringen, aber nie Geld
  // kosten — sie zählen dann nur noch positiv oder gar nicht.
  const ordnungVerwirft = ordnung.widerspruch && geteilt === 0;
  if (formWiderspruch >= 0 || ordnungVerwirft) {
    let grund: string;
    if (formWiderspruch >= 0) {
      grund = widersprueche.length > 1
        ? `Silben ${widersprueche.join(', ')} von ${silben.length} (Solltöne ${widersprueche.map((nr) => silben[nr - 1].tone).join(', ')}) widersprechen der gemessenen Kontur.`
        : `Silbe ${formWiderspruch + 1} von ${silben.length} (Sollton ${silben[formWiderspruch].tone}) widerspricht der gemessenen Kontur.`;
    } else {
      const von = ordnung.widerspruch!;
      const hochTiefer = REGISTER_RANG[soll.toene[von.von - 1]] > REGISTER_RANG[soll.toene[von.bis - 1]];
      grund = `Register-Ordnung widersprochen: Silbe ${von.von} (Sollton ${soll.toene[von.von - 1]}) sollte ${hochTiefer ? 'über' : 'unter'} Silbe ${von.bis} (Sollton ${soll.toene[von.bis - 1]}) liegen, liegt aber deutlich ${hochTiefer ? 'darunter' : 'darüber'}.`;
    }
    return { ...base, ...bezug, ...metrics, targetTones: soll.toene, silben, ...ordnungFeld, status: 'failed', reason: grund };
  }
  // Ein Widerspruch UNTER der Verwurfsschwelle verwirft nicht, darf den Clip
  // aber auch nicht als geprüft ausweisen — er bleibt ehrlich ungeprüft.
  if (ordnung.widerspruch) {
    return { ...base, ...bezug, ...metrics, targetTones: soll.toene, silben, ...ordnungFeld, status: 'unchecked',
      reason: `Register-Ordnung von Silbe ${ordnung.widerspruch.von} zu Silbe ${ordnung.widerspruch.bis} passt nicht — bei geratener Silbengrenze nicht beweiskräftig, deshalb nicht verworfen.` };
  }
  if (widersprueche.length > 0) {
    return { ...base, ...bezug, ...metrics, targetTones: soll.toene, silben, ...ordnungFeld, status: 'unchecked',
      reason: `Silbe ${widersprueche[0]} von ${silben.length} (Sollton ${silben[widersprueche[0] - 1].tone}) passt nicht zur gemessenen Kontur — als einzelner Widerspruch${geteilt > 0 ? ' bei geratener Silbengrenze' : ''} nicht beweiskräftig, deshalb nicht verworfen.` };
  }
  const formGeprueft = silben.filter((silbe) => silbe.form === 'geprueft').length;
  if (formGeprueft + ordnung.erfuellt > 0) {
    return { ...base, ...bezug, ...metrics, targetTones: soll.toene, silben, ...ordnungFeld, status: 'passed',
      reason: `Silbenform ${formGeprueft} von ${silben.length} plus ${ordnung.erfuellt} Register-Ordnung(en) mit dem Soll vereinbar; absolute Registerlage bleibt ungeprüft${geteilt > 0 ? `, ${geteilt} Silbengrenze(n) aus dem Lautstärkeverlauf` : ''}.` };
  }
  return { ...base, ...bezug, ...metrics, targetTones: soll.toene, silben, ...ordnungFeld, status: 'unchecked',
    reason: `Registerlage mittel/tief/hoch ohne Sprecherreferenz nicht prüfbar (${silben.length} Silben).` };
}
