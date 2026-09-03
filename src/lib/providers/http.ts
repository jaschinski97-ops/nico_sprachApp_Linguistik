/**
 * Gemeinsame Kleinteile für die selbst geschriebenen Anbieter-Clients.
 *
 * WARUM SELBST GESCHRIEBEN UND NICHT DREI SDKs: Für Claude bleibt der
 * offizielle SDK (AE-12) — er läuft, und der Web-Build ist dafür in
 * `metro.config.js` eigens hergerichtet. Für Stability gibt es gar keinen
 * offiziellen JS-SDK (AE-13). Für ChatGPT und Gemini gäbe es welche, und
 * genau das war die Versuchung: Jeder zusätzliche Node-SDK im Browser-Bundle
 * bringt sein eigenes Auflösungsverhalten mit, und AE-12 hält fest, was das
 * beim ersten SDK gekostet hat („Unable to resolve module
 * ./lib/credentials/types.js"). Beide Anbieter brauchen hier genau **einen**
 * POST mit JSON — dafür drei Megabyte Abhängigkeit einzuhandeln, wäre das
 * schlechtere Geschäft.
 */

/**
 * Beschreibt einen fehlgeschlagenen Aufruf so, dass die Ursache aus der
 * Fehlerliste des Laufs hervorgeht.
 *
 * DER CORS-HINWEIS IST KEIN SCHMUCK. `TypeError: Failed to fetch` ist die
 * einzige Auskunft, die der Browser bei einer CORS-Blockade herausgibt — der
 * eigentliche Grund steht nur in der Entwicklerkonsole, die im fertigen Build
 * niemand offen hat. Phase 10 hat Stunden damit verbracht, genau diesen einen
 * Satz zu entschlüsseln (AE-27); niemand sonst soll das noch einmal tun
 * müssen.
 */
export function describeNetworkFailure(error: unknown, endpointHost: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (!/failed to fetch|networkerror|load failed/i.test(message)) {
    return error instanceof Error ? error : new Error(message);
  }

  // Der gemessene Sonderfall bekommt seine eigene Erklaerung, weil er sonst
  // wie ein kaputter Schluessel aussieht - und weil er JEDEN echten
  // OpenAI-Schluessel betrifft (AE-27).
  const openAiHinweis = /openai\.com$/.test(endpointHost)
    ? ' Bei OpenAI ist das im Browser der Normalfall: gemessen wurde, dass ein POST ' +
      'mit einem Schlüssel, der mit „sk-" beginnt, eine Antwort ohne CORS-Header ' +
      'bekommt — und so beginnt jeder echte OpenAI-Schlüssel.'
    : '';

  return new Error(
    `Keine Antwort von ${endpointHost} (${message}). Im Browser ist das fast immer ` +
      'CORS: der Anbieter erlaubt den direkten Aufruf aus einer Webseite nicht ' +
      `(oder der Pfad stimmt nicht).${openAiHinweis} Am Gerät gibt es kein CORS — ` +
      'dort kann derselbe Aufruf funktionieren.'
  );
}

/**
 * Zieht aus einer Fehlerantwort heraus, was sich herausziehen lässt.
 *
 * Die vier Anbieter melden Fehler in vier Formen — Stability als
 * `{"errors":[…],"name":"…"}`, OpenAI und Google als `{"error":{…}}`, Anthropic
 * über seinen SDK. Die drei JSON-Formen stehen hier zusammen, statt dass jeder
 * Client seinen eigenen Leser mitbringt: Was in der Fehlerliste eines Laufs
 * landet, soll überall gleich aussehen.
 */
export function describeHttpError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;

    // Stability: eine Liste von Meldungen, dazu ein Kurzname.
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      return `HTTP ${status}: ${parsed.errors.join('; ')}`;
    }

    const error = parsed.error;
    if (typeof error === 'string') return `HTTP ${status}: ${error}`;
    if (error && typeof error === 'object') {
      const detail = error as Record<string, unknown>;
      const text = [detail.message, detail.type, detail.status]
        .filter((part): part is string => typeof part === 'string' && part !== '')
        .join(' — ');
      if (text) return `HTTP ${status}: ${text}`;
    }
    if (typeof parsed.message === 'string') return `HTTP ${status}: ${parsed.message}`;
    if (typeof parsed.name === 'string') return `HTTP ${status}: ${parsed.name}`;
  } catch {
    // Keine JSON-Antwort - dann eben der Rohtext.
  }
  return `HTTP ${status}: ${body.slice(0, 200) || 'ohne Inhalt'}`;
}

/**
 * Keine Cookies an fremde APIs.
 *
 * Alle vier Anbieter authentifizieren über einen Header; Cookies werden nie
 * gebraucht und hätten an einer fremden API auch nichts zu suchen. Zusätzlich
 * verträgt sich eine Anfrage **mit** Anmeldedaten nicht mit einem
 * `Access-Control-Allow-Origin: *`, wie OpenAI es schickt — der Browser
 * verwirft die Antwort dann, obwohl sie da ist.
 *
 * ZUR EHRLICHKEIT: Das war in Phase 10 zuerst der Verdacht für den
 * OpenAI-Fehlschlag und ist es **nicht** gewesen; die Ursache steht in AE-27
 * und liegt am Präfix des Schlüssels. Diese Zeile bleibt trotzdem, weil sie
 * für sich richtig ist — aber sie hat nichts repariert.
 */
const NO_CREDENTIALS: RequestCredentials = 'omit';

export type JsonPostOptions = {
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

/** Ein POST mit JSON hin und JSON zurück — mit sprechenden Fehlern. */
export async function postJson(options: JsonPostOptions): Promise<unknown> {
  const host = hostOf(options.url);

  let response: Response;
  try {
    response = await fetch(options.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify(options.body),
      credentials: NO_CREDENTIALS,
    });
  } catch (error) {
    throw describeNetworkFailure(error, host);
  }

  if (!response.ok) {
    throw new Error(describeHttpError(response.status, await response.text()));
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new Error(`Antwort von ${host} war kein gültiges JSON.`);
  }
}

export function hostOf(url: string): string {
  const match = url.match(/^https?:\/\/([^/]+)/i);
  return match ? match[1] : url;
}

/** Die Feldnamen einer Antwort — für Fehlermeldungen, die weiterhelfen. */
export function fieldNamesOf(value: unknown): string {
  if (typeof value !== 'object' || value === null) return typeof value;
  return Object.keys(value as Record<string, unknown>).join(', ') || 'keine';
}
