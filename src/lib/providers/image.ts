import { describeHttpError, describeNetworkFailure, fieldNamesOf, hostOf, postJson } from './http';
import { ImageClient, ImageRequest, ImageResponse, ProviderId, unsupported } from './types';

/**
 * Die Bildanbieter hinter einer Schnittstelle.
 *
 * DREI SEHR UNTERSCHIEDLICHE GEGENSTELLEN, und der Unterschied ist nicht nur
 * Formsache:
 *
 * - **Stability** nimmt eine `multipart`-Anfrage entgegen, kennt
 *   `negative_prompt`, `aspect_ratio`, `style_preset` und `output_format` und
 *   prüft all das **vor** der Authentifizierung. Deshalb — und nur deshalb —
 *   ließ sich seine Anfrageform in Phase 5 ohne bezahlten Schlüssel
 *   vollständig belegen (AE-13).
 * - **Gemini** erzeugt Bilder über denselben `generateContent`-Aufruf wie Text
 *   und kennt weder Negativ-Prompt noch Seitenverhältnis als Feld; beides muss
 *   in den Prompt. Das Format bestimmt das Modell und nennt es im `mimeType`.
 * - **ChatGPT** hat einen eigenen Bild-Endpunkt, kennt ebenfalls keinen
 *   Negativ-Prompt und beschreibt die Größe in Pixeln statt als Verhältnis.
 *
 * Was ein Anbieter nicht als Feld kennt, wird an den Prompt gehängt statt
 * stillschweigend fallen gelassen — sonst hieße „kein Text im Bild" bei zwei
 * von drei Anbietern gar nichts, und AE-15 hält fest, warum genau diese
 * Vorgabe wichtig ist.
 */

/** Aus `image/webp` wird `webp` — und alles Unbekannte fliegt auf. */
export function formatFromMimeType(mimeType: unknown): ImageResponse['format'] {
  const value = typeof mimeType === 'string' ? mimeType.toLowerCase() : '';
  if (value.includes('webp')) return 'webp';
  if (value.includes('png')) return 'png';
  if (value.includes('jpeg') || value.includes('jpg')) return 'jpeg';
  throw new Error(`Unbekannter Bildtyp "${String(mimeType)}" in der Antwort.`);
}

export function looksLikeBase64(value: string): boolean {
  return value.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(value);
}

/**
 * Was ein Anbieter ohne eigenes Feld nur im Prompt unterbringen kann.
 *
 * Bewusst als Satz und nicht als Stichwortliste: Bildmodelle lesen den Prompt
 * als Sprache, und „no text" mitten in einer Aufzählung wird eher als
 * gewünschtes Motiv gelesen denn als Verbot.
 */
export function withPromptFallbacks(request: ImageRequest): string {
  return (
    `${request.prompt} ` +
    `Square ${request.aspectRatio} composition, ${request.stylePreset} style. ` +
    `Avoid: ${request.negativePrompt}.`
  );
}

// ---------------------------------------------------------------------------
// Stability AI — unverändert der Weg aus AE-13
// ---------------------------------------------------------------------------

export const STABILITY_BASE = 'https://api.stability.ai/v2beta/stable-image/generate';

/**
 * Der Modellname ist bei Stability der **letzte Pfadabschnitt**, nicht ein
 * Feld im Körper (`core`, `sd3`, `ultra`). Das Freitextfeld aus Phase 10 füllt
 * ihn direkt. Gemessen wurde in Phase 5 nur `core`; ein falscher Wert
 * antwortet mit 404, und das steht dann in der Fehlerliste des Laufs.
 */
export function stabilityEndpoint(model: string): string {
  const variant = model.trim().replace(/^stable-image-/, '') || 'core';
  return `${STABILITY_BASE}/${encodeURIComponent(variant)}`;
}

/**
 * Prüft die Antwort, bevor sie abgelegt wird.
 *
 * Die Antwortform ließ sich ohne gültigen Schlüssel **nicht** messen — anders
 * als die Anfrageform. Deshalb nennt die Fehlermeldung die tatsächlich
 * gelieferten Felder: heißt das Feld eines Tages anders, steht das sofort in
 * der Fehlerliste des Laufs, statt als Rätsel zu enden.
 */
export function parseStabilityImage(
  payload: unknown,
  format: ImageResponse['format'],
  model: string
): ImageResponse {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Antwort war kein JSON-Objekt.');
  }
  const data = payload as Record<string, unknown>;

  // Stability liefert bei ausgefiltertem Inhalt ein absichtlich unscharfes
  // Bild statt eines Fehlers. Das gehoert nicht in den Bestand.
  if (data.finish_reason === 'CONTENT_FILTERED') {
    throw new Error('Antwort wurde vom Anbieter gefiltert (finish_reason: CONTENT_FILTERED).');
  }

  const image = data.image;
  if (typeof image !== 'string' || image.trim() === '') {
    throw new Error(`Antwort enthielt kein Feld "image" (gelieferte Felder: ${fieldNamesOf(data)}).`);
  }
  const base64 = image.trim();
  if (!looksLikeBase64(base64)) {
    throw new Error('Bilddaten sind kein brauchbares Base64.');
  }

  return { base64, format, model };
}

export function createStabilityImageProvider(apiKey: string, model: string): ImageClient {
  const url = stabilityEndpoint(model);

  return {
    provider: 'stability',
    model,
    async create(request: ImageRequest): Promise<ImageResponse> {
      const form = new FormData();
      form.append('prompt', request.prompt);
      form.append('negative_prompt', request.negativePrompt);
      form.append('aspect_ratio', request.aspectRatio);
      form.append('output_format', request.preferredFormat);
      form.append('style_preset', request.stylePreset);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            // Ohne diesen Header liefert die API die rohen Bildbytes; mit ihm
            // ein JSON-Objekt mit Base64 - genau das, was fuer die
            // Offline-Ablage gebraucht wird.
            Accept: 'application/json',
          },
          body: form,
          // Siehe `NO_CREDENTIALS` in http.ts: die Fetch-Umsetzung von React
          // Native schickt sonst Anmeldedaten mit, was bei einem Anbieter mit
          // `Access-Control-Allow-Origin: *` die Antwort verwirft.
          credentials: 'omit',
        });
      } catch (error) {
        throw describeNetworkFailure(error, hostOf(url));
      }

      if (!response.ok) {
        throw new Error(describeHttpError(response.status, await response.text()));
      }

      return parseStabilityImage(await response.json(), request.preferredFormat, model);
    },
  };
}

// ---------------------------------------------------------------------------
// Gemini (Google)
// ---------------------------------------------------------------------------

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Liest ein Bild aus einer `generateContent`-Antwort.
 *
 * Gemini gibt Bilder als `inlineData` innerhalb der ganz normalen
 * Textantwort zurück; zwischen den Teilen kann auch erklärender Text stehen,
 * der hier zu übergehen ist. Ungetestet gegen die laufende API, weil Google
 * mit ungültigem Schlüssel auf **jede** Anfrage gleich antwortet (AE-26) —
 * daher wieder die Feldnamen in der Fehlermeldung.
 */
export function parseGeminiImage(payload: unknown, model: string): ImageResponse {
  const data = payload as Record<string, unknown> | null;
  const candidates = data?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error(
      `Antwort enthielt keine "candidates" (gelieferte Felder: ${fieldNamesOf(payload)}).`
    );
  }
  const first = candidates[0] as Record<string, unknown>;
  const content = first.content as Record<string, unknown> | undefined;
  const parts = Array.isArray(content?.parts) ? (content!.parts as Record<string, unknown>[]) : [];

  for (const part of parts) {
    // Die REST-Antwort nennt es `inlineData`; manche Wege liefern
    // `inline_data`. Beides annehmen kostet nichts.
    const inline = (part.inlineData ?? part.inline_data) as Record<string, unknown> | undefined;
    const raw = inline?.data;
    if (typeof raw === 'string' && raw.trim() !== '') {
      const base64 = raw.trim();
      if (!looksLikeBase64(base64)) {
        throw new Error('Bilddaten sind kein brauchbares Base64.');
      }
      return {
        base64,
        format: formatFromMimeType(inline?.mimeType ?? inline?.mime_type),
        model: typeof data?.modelVersion === 'string' ? data.modelVersion : model,
      };
    }
  }

  throw new Error(
    `Antwort enthielt kein Bild (finishReason: ${String(first.finishReason)}; ` +
      `Teile: ${parts.map((part) => Object.keys(part).join('+')).join(', ') || 'keine'}).`
  );
}

export function createGeminiImageProvider(apiKey: string, model: string): ImageClient {
  return {
    provider: 'gemini',
    model,
    async create(request: ImageRequest): Promise<ImageResponse> {
      const payload = await postJson({
        url: `${GEMINI_BASE}/${encodeURIComponent(model.trim())}:generateContent`,
        headers: { 'x-goog-api-key': apiKey },
        body: {
          // Kein Feld fuer Negativ-Prompt, Seitenverhaeltnis oder Stil - alles
          // muss in den Prompt.
          contents: [{ role: 'user', parts: [{ text: withPromptFallbacks(request) }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        },
      });
      return parseGeminiImage(payload, model);
    },
  };
}

// ---------------------------------------------------------------------------
// ChatGPT (OpenAI)
// ---------------------------------------------------------------------------

export const OPENAI_IMAGE_ENDPOINT = 'https://api.openai.com/v1/images/generations';

export function parseOpenAiImage(
  payload: unknown,
  format: ImageResponse['format'],
  model: string
): ImageResponse {
  const data = payload as Record<string, unknown> | null;
  const list = data?.data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(
      `Antwort enthielt kein Feld "data" (gelieferte Felder: ${fieldNamesOf(payload)}).`
    );
  }
  const first = list[0] as Record<string, unknown>;
  const raw = first.b64_json;
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(
      `Antwort enthielt kein Feld "b64_json" (gelieferte Felder: ${fieldNamesOf(first)}). ` +
        'Liefert der Anbieter stattdessen eine URL, wäre das Bild nicht offline ablegbar.'
    );
  }
  const base64 = raw.trim();
  if (!looksLikeBase64(base64)) {
    throw new Error('Bilddaten sind kein brauchbares Base64.');
  }
  return { base64, format, model };
}

export function createOpenAiImageProvider(apiKey: string, model: string): ImageClient {
  return {
    provider: 'chatgpt',
    model,
    async create(request: ImageRequest): Promise<ImageResponse> {
      const payload = await postJson({
        url: OPENAI_IMAGE_ENDPOINT,
        headers: { Authorization: `Bearer ${apiKey}` },
        body: {
          model,
          prompt: withPromptFallbacks(request),
          n: 1,
          size: '1024x1024',
          output_format: request.preferredFormat,
        },
      });
      return parseOpenAiImage(payload, request.preferredFormat, model);
    },
  };
}

// ---------------------------------------------------------------------------

export function createImageProvider(
  provider: ProviderId,
  apiKey: string,
  model: string
): ImageClient {
  switch (provider) {
    case 'stability':
      return createStabilityImageProvider(apiKey, model);
    case 'gemini':
      return createGeminiImageProvider(apiKey, model);
    case 'chatgpt':
      return createOpenAiImageProvider(apiKey, model);
    default:
      throw unsupported(provider, 'image');
  }
}
