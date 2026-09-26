import { type Rating } from '../fsrs/types';
import { type LanguageCode } from '../languages/types';

/**
 * Toleranter Vergleich für „Sag es auf …“ (Schritt 3, Lern-Reiter-Ausbau).
 *
 * WAS TOLERANT HEISST — und was nicht:
 *   • Groß-/Kleinschreibung zählt NICHT (sie ist im Mündlichen nicht hörbar).
 *   • Satzzeichen zählen NICHT (ebenso hörbar nicht).
 *   • Akzente und Thai-Tonzeichen zählen als HINWEIS, nicht als Fehler: Wer
 *     „cafe“ statt „café“ schreibt, hat das Wort gewusst — die Schreibung
 *     wird als Erinnerung gezeigt, die Karte aber als „Schwer" fortgeschrieben.
 *   • Alles andere (falsche Wörter, fehlende Wörter, vertauschte Reihenfolge)
 *     ist falsch.
 *
 * Die Rückmeldung selbst ist sprachneutral (`bewertung`); der Runner setzt
 * die Worte der UI-Sprache darauf.
 */

export type ProduktionsBewertung = 'exact' | 'accent' | 'wrong';

export type ProduktionsErgebnis = {
  bewertung: ProduktionsBewertung;
  /** Die exakte Zielform — bei `accent` als Hinweis gezeigt. */
  ziel: string;
};

/** Satzeichen und Symbole haben keine Stimme — sie fallen aus dem Vergleich. */
const ZEICHEN_OHNE_STIMME = /[\p{P}\p{S}]/gu;

/** Thai-Tonzeichen (ไม้เอก ไม้โท ไม้ตรี ไม้จัตวา) — Inhalt, aber als Hinweis gewertet. */
const THAI_TONZEICHEN = /[\u0E48-\u0E4B]/g;

export function normalisiere(
  text: string,
  options: { ohneTonzeichen?: boolean; ohneAkzente?: boolean } = {}
): string {
  let basis = text.normalize('NFC').toLowerCase().replace(ZEICHEN_OHNE_STIMME, '');
  basis = basis.replace(/\s+/g, ' ').trim();
  if (options.ohneAkzente) {
    // Latein: kombinierende Akzentzeichen abtrennen (NFD) und verwerfen —
    // å bleibt a, ñ bleibt n. Grundbuchstaben bleiben unangetastet.
    basis = basis.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
  }
  if (options.ohneTonzeichen) {
    basis = basis.replace(THAI_TONZEICHEN, '');
  }
  return basis;
}

export function vergleicheProduktion(
  input: string,
  ziel: string,
  /** Auch 'de' — das Deutsch-Ziel (th_to_de) produziert deutsche Formen. */
  language: LanguageCode | 'de'
): ProduktionsErgebnis {
  const ergebnis = (bewertung: ProduktionsBewertung): ProduktionsErgebnis => ({
    bewertung,
    ziel: ziel.normalize('NFC'),
  });

  // Thai schreibt ohne Wortabstände; Leerzeichen in Sätzen sind optional,
  // und die Spracherkennung liefert keine. Wie beim Diktat zählen sie nicht.
  const ohneAbstand = (text: string) => (language === 'th' ? text.replace(/\s+/g, '') : text);
  const eingabe = ohneAbstand(normalisiere(input));
  const soll = ohneAbstand(normalisiere(ziel));
  if (eingabe.length === 0) return ergebnis('wrong');
  if (eingabe === soll) return ergebnis('exact');

  // Akzent-Stufe: dieselben Wörter, aber ohne Diakritika gleich?
  const ohneDiakritik = language !== 'th';
  const eingabeWeich = ohneDiakritik
    ? normalisiere(input, { ohneAkzente: true })
    : ohneAbstand(normalisiere(input, { ohneTonzeichen: true }));
  const sollWeich = ohneDiakritik
    ? normalisiere(ziel, { ohneAkzente: true })
    : ohneAbstand(normalisiere(ziel, { ohneTonzeichen: true }));
  if (eingabeWeich === sollWeich) return ergebnis('accent');

  return ergebnis('wrong');
}

/** Welche Karte-Bewertung der Ergebnisse entspricht — nur bei nicht-falsch. */
export function bewertungFuerErgebnis(bewertung: ProduktionsBewertung): Rating | null {
  // exact → Gut; accent → Schwer (gewusst, aber Schreibung wackelig); wrong
  // entscheidet die lernende Person selbst (siehe Runner).
  return bewertung === 'exact' ? 3 : bewertung === 'accent' ? 2 : null;
}
