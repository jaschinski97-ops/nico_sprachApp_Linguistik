import Anthropic from '@anthropic-ai/sdk';

import { describeNetworkFailure, fieldNamesOf, postJson } from './http';
import { ProviderId, TextClient, TextRequest, TextResponse, unsupported } from './types';

/**
 * Die Textanbieter hinter einer Schnittstelle.
 *
 * Die Prompts stehen weiterhin bei den Generatoren (Phase 4 für Dialoge,
 * Phase 7 für Prüfungsaufgaben) und sind hier nicht zu sehen — das ist der
 * Sinn der Naht. Hier steht nur, wie man aus „System + Nutzertext" bei drei
 * verschiedenen Gegenstellen einen Antworttext bekommt.
 *
 * ALLE DREI WEGE SIND AUS DEM LAUFENDEN WEB-BUILD GEMESSEN (AE-26/AE-27):
 * Claude braucht seinen Sonderheader und antwortet damit; ChatGPT und Gemini
 * kommen ohne Sonderbehandlung durch. Was sich **nicht** messen ließ, ist bei
 * ChatGPT und Gemini die Anfrage- und Antwortform: beide prüfen den Schlüssel
 * **vor** dem Rest und antworten auf jede Anfrage mit demselben Auth-Fehler.
 * Deshalb nennt der Parser unten im Fehlerfall die tatsächlich gelieferten
 * Feldnamen — dieselbe Vorsichtsmaßnahme wie beim Bild-Parser aus AE-13.
 */

function textOrThrow(text: string, provider: ProviderId, detail: string): string {
  if (text.trim() === '') {
    throw new Error(`Leere Antwort von ${provider} (${detail}).`);
  }
  return text;
}

// ---------------------------------------------------------------------------
// Claude (Anthropic) — unverändert der Weg aus AE-12
// ---------------------------------------------------------------------------

/**
 * WORTGLEICH DER AUFRUF AUS PHASE 4, nur ohne den fest verdrahteten
 * Modellnamen. `dangerouslyAllowBrowser: true` setzt genau den Header
 * `anthropic-dangerous-direct-browser-access: true` (im SDK-Quelltext
 * nachgesehen, AE-12); ohne ihn blockt CORS den Web-Build, mit ihm nicht.
 * Beides in Phase 10 noch einmal als Kontrollmessung bestätigt.
 *
 * `effort: 'low'` bleibt: Ein kurzer A1/A2-Dialog in vorgegebenem JSON ist
 * eine einfache Aufgabe, und bei 512 Aufrufen schlägt der Aufwand auf Kosten
 * und Dauer durch (Phase 4).
 */
export function createClaudeTextClient(apiKey: string, model: string): TextClient {
  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  return {
    provider: 'claude',
    model,
    async complete(request: TextRequest): Promise<TextResponse> {
      let response: Anthropic.Message;
      try {
        response = await anthropic.messages.create({
          model,
          max_tokens: request.maxTokens,
          output_config: { effort: 'low' },
          system: request.system,
          messages: [{ role: 'user', content: request.user }],
        });
      } catch (error) {
        throw describeNetworkFailure(error, 'api.anthropic.com');
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return {
        text: textOrThrow(text, 'claude', `stop_reason: ${response.stop_reason}`),
        model: response.model ?? model,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// ChatGPT (OpenAI)
// ---------------------------------------------------------------------------

export const OPENAI_CHAT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/**
 * Liest die Antwortform von `chat/completions` aus.
 *
 * NICHT GEGEN DIE LAUFENDE API BELEGT — OpenAI beantwortet auch einen völlig
 * leeren Anfragekörper mit `invalid_api_key`, prüft die Form also erst nach
 * dem Schlüssel (gemessen in Phase 10). Anders als bei Stability ließ sich
 * hier ohne bezahlten Schlüssel nichts festklopfen. Deshalb steht in der
 * Fehlermeldung, was wirklich kam.
 */
export function parseOpenAiText(payload: unknown, fallbackModel: string): TextResponse {
  const data = payload as Record<string, unknown> | null;
  const choices = data?.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error(
      `Antwort enthielt kein Feld "choices" (gelieferte Felder: ${fieldNamesOf(payload)}).`
    );
  }
  const first = choices[0] as Record<string, unknown>;
  const message = first.message as Record<string, unknown> | undefined;
  const content = message?.content;
  const text = typeof content === 'string' ? content : '';

  return {
    text: textOrThrow(text, 'chatgpt', `finish_reason: ${String(first.finish_reason)}`),
    model: typeof data?.model === 'string' ? data.model : fallbackModel,
  };
}

export function createOpenAiTextClient(apiKey: string, model: string): TextClient {
  return {
    provider: 'chatgpt',
    model,
    async complete(request: TextRequest): Promise<TextResponse> {
      const payload = await postJson({
        url: OPENAI_CHAT_ENDPOINT,
        headers: { Authorization: `Bearer ${apiKey}` },
        body: {
          model,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
          // `max_completion_tokens` und nicht `max_tokens`: Letzteres lehnen
          // die neueren Modelle ab, Ersteres nehmen auch die aelteren an.
          // Nicht messbar ohne gueltigen Schluessel - wenn die API sich hier
          // beschwert, ist es genau diese Zeile.
          max_completion_tokens: request.maxTokens,
        },
      });
      return parseOpenAiText(payload, model);
    },
  };
}

// ---------------------------------------------------------------------------
// Gemini (Google)
// ---------------------------------------------------------------------------

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function geminiEndpoint(model: string, method: string): string {
  // Der Modellname kommt aus einem Freitextfeld (Pflicht 5) und landet im
  // Pfad. Kodiert wird er trotzdem, damit ein Tippfehler mit Schraegstrich
  // keine fremde Adresse baut.
  return `${GEMINI_BASE}/${encodeURIComponent(model.trim())}:${method}`;
}

/**
 * Liest die Antwortform von `generateContent` aus.
 *
 * Wie bei OpenAI ungetestet gegen die laufende API: Google beantwortet mit
 * ungültigem Schlüssel **alles** gleich — erfundenes Modell, fehlendes
 * Pflichtfeld, sogar ein GET auf die Modellliste — nämlich mit
 * „API key not valid" (gemessen in Phase 10, AE-26). Das ist genau der Punkt,
 * an dem AE-13 sich seinerzeit gegen Google entschieden hat.
 */
export function parseGeminiText(payload: unknown, fallbackModel: string): TextResponse {
  const data = payload as Record<string, unknown> | null;
  const candidates = data?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    // Bei gesperrtem Prompt liefert Google statt Kandidaten ein
    // promptFeedback - das gehoert in die Meldung, sonst raetselt man.
    const feedback = data?.promptFeedback;
    throw new Error(
      `Antwort enthielt keine "candidates" (gelieferte Felder: ${fieldNamesOf(payload)})` +
        (feedback ? `; promptFeedback: ${JSON.stringify(feedback).slice(0, 200)}` : '') +
        '.'
    );
  }
  const first = candidates[0] as Record<string, unknown>;
  const content = first.content as Record<string, unknown> | undefined;
  const parts = Array.isArray(content?.parts) ? (content!.parts as Record<string, unknown>[]) : [];
  const text = parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  return {
    text: textOrThrow(text, 'gemini', `finishReason: ${String(first.finishReason)}`),
    model: typeof data?.modelVersion === 'string' ? data.modelVersion : fallbackModel,
  };
}

export function createGeminiTextClient(apiKey: string, model: string): TextClient {
  return {
    provider: 'gemini',
    model,
    async complete(request: TextRequest): Promise<TextResponse> {
      const payload = await postJson({
        url: geminiEndpoint(model, 'generateContent'),
        // Schluessel im HEADER, nicht als `?key=` im Pfad. Beides kommt laut
        // Messung durch CORS; der Header ist der bessere Weg, weil eine URL
        // in Verlaufslisten, Protokollen und Fehlermeldungen landet.
        headers: { 'x-goog-api-key': apiKey },
        body: {
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: 'user', parts: [{ text: request.user }] }],
          generationConfig: { maxOutputTokens: request.maxTokens },
        },
      });
      return parseGeminiText(payload, model);
    },
  };
}

// ---------------------------------------------------------------------------

export function createTextClient(provider: ProviderId, apiKey: string, model: string): TextClient {
  switch (provider) {
    case 'claude':
      return createClaudeTextClient(apiKey, model);
    case 'chatgpt':
      return createOpenAiTextClient(apiKey, model);
    case 'gemini':
      return createGeminiTextClient(apiKey, model);
    default:
      throw unsupported(provider, 'text');
  }
}
