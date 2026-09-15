/**
 * KI-Antworten mit Wörterlisten lesen — inklusive RETTUNG abgeschnittener
 * Antworten (15.09.2026, nach dem ersten Kettenlauf: alle drei Sprachen
 * starben mit „Unterminated string in JSON", weil die Antwort am Token-Limit
 * mitten im String endete).
 *
 * Die Regel: Eine BEZAHLTE Antwort soll nicht wegen des letzten halben
 * Eintrags in den Müll laufen. Schlägt das direkte Parsen fehl, wird am
 * letzten vollständigen Objekt abgeschnitten, das Array zu Ende geschrieben
 * und geparst — der Aufrufer erfährt über `abgeschnitten`, dass Einträge
 * gefehlt haben (und das Paket beim nächsten Mal kleiner sein sollte).
 */

/** Wie viele Rückwärts-Versuche die Rettung maximal unternimmt. */
const RETTUNGS_VERSUCHE = 60;

export function listeAusAntwort(roh: string): { woerter: unknown[]; abgeschnitten: boolean } {
  const text = roh.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    const geparst = JSON.parse(text) as { woerter?: unknown };
    if (!Array.isArray(geparst.woerter)) throw Error('Antwort enthält keine "woerter"-Liste.');
    return { woerter: geparst.woerter, abgeschnitten: false };
  } catch (fehler) {
    // Eine VOLLSTÄNDIGE Antwort ohne woerter-Liste ist ein echter Vertragsbruch
    // und wird nicht „gerettet" — nur abgeschnittene Antworten schonen wir.
    if (fehler instanceof Error && fehler.message.includes('keine "woerter"')) throw fehler;
  }

  const listenStart = text.indexOf('[');
  const objektStart = listenStart === -1 ? -1 : text.lastIndexOf('{', listenStart);
  if (objektStart === -1) throw Error('Antwort enthält keine "woerter"-Liste.');
  let versuche = 0;
  for (
    let ende = text.lastIndexOf('}');
    ende > objektStart && versuche < RETTUNGS_VERSUCHE;
    ende = text.lastIndexOf('}', ende - 1)
  ) {
    versuche += 1;
    const versuch = text.slice(objektStart, ende + 1).trimEnd().replace(/,\s*$/, '') + ']}';
    try {
      const geparst = JSON.parse(versuch) as { woerter?: unknown };
      if (Array.isArray(geparst.woerter) && geparst.woerter.length > 0) {
        return { woerter: geparst.woerter, abgeschnitten: true };
      }
    } catch {
      // Das '}' gehörte wohl in ein verschachteltes Objekt — das vorherige versuchen.
    }
  }
  throw Error(
    'Antwort war abgeschnitten und ließ sich nicht retten — Lauf wiederholen (ggf. Paketgröße senken).'
  );
}
