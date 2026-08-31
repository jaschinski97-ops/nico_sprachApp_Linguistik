import { assertConcreteSpec } from './plan';
import { GeneratedImage, ImageFormat, ImageSpec } from './types';

/**
 * Erzeugt ein einzelnes Vokabelbild über die Bild-API von Stability AI.
 *
 * ANBIETERWAHL (AE-13) — gemessen, nicht angenommen. Die Anthropic-API aus
 * Phase 4 erzeugt keine Bilder, es musste also ein zweiter Anbieter her.
 * Zuerst war OpenAI Images gesetzt (offizieller SDK, wie in AE-12). Aus dem
 * laufenden Web-Build heraus gemessen ergab sich:
 *
 * | Anfrage                                   | Ergebnis                    |
 * | ----------------------------------------- | --------------------------- |
 * | `GET  api.openai.com/v1/models`           | HTTP 401, lesbar            |
 * | `POST api.openai.com/v1/images/generations` | `TypeError: Failed to fetch` |
 * | `POST api.openai.com/v1/chat/completions` | `TypeError: Failed to fetch` |
 * | `POST api.stability.ai/…/generate/core`   | HTTP 401, lesbar            |
 *
 * Zur Kontrolle in derselben Sitzung: `api.anthropic.com` antwortete mit dem
 * Header aus AE-12 mit 401 und ohne ihn mit „Failed to fetch" — das Netz war
 * also offen und die Messung aussagekräftig. `api.openai.com` lässt Browsern
 * demnach **GET** durch, **POST** aber nicht; und der `dangerouslyAllowBrowser`-
 * Schalter des OpenAI-SDK hilft dagegen nicht, weil er (im Paket nachgesehen)
 * nur eine Selbstsperre des SDK aufhebt und keinen Header setzt, wie es
 * `anthropic-dangerous-direct-browser-access` tut. Damit war OpenAI für den
 * Web-Build unbrauchbar — und der Web-Build ist derzeit die einzige Umgebung,
 * in der geprüft werden kann (Gerätecheck B-2 steht aus).
 *
 * KEIN SDK, SONDERN `fetch` — anders als in AE-12 und mit Grund: für Stability
 * gibt es **keinen** offiziellen JavaScript-SDK (nachgesehen: `stability-sdk`
 * ist Python, auf npm gibt es nur ein Paket eines Einzelentwicklers von 2024).
 * Eine multipart-Anfrage von zwanzig Zeilen selbst zu schreiben ist die
 * kleinere Abhängigkeit als ein fremdgepflegter Node-SDK im Browser-Bundle.
 *
 * DIE PARAMETER SIND GEGEN DIE LAUFENDE API BELEGT, nicht aus dem Gedächtnis:
 * Stability prüft Pflichtfelder und Aufzählungswerte **vor** der
 * Authentifizierung, deshalb ließ sich die Anfrageform ohne gültigen Schlüssel
 * vollständig festklopfen. Die API antwortete selbst:
 *   - `output_format: "tiff"` → „invalid enum value. Expected 'png' | 'jpeg' | 'webp'"
 *   - `aspect_ratio: "3:7"`   → „Expected '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | …"
 *   - ohne `prompt`           → „prompt: required"
 *   - `seed: "abc"`           → „expected number, received string"
 *   - die vollständige, gültige Anfrage → 401 „authorization: invalid or missing
 *     header value", also bis zum Schlüssel durchgelaufen.
 *   - ein falscher Pfad → 404. Das 401 belegt damit auch, dass es den
 *     Endpunkt gibt.
 */

export const IMAGE_ENDPOINT = 'https://api.stability.ai/v2beta/stable-image/generate/core';

/** Nur zur Anzeige und fürs Protokoll — das Modell steckt im Pfad. */
export const IMAGE_MODEL = 'stable-image-core';

/**
 * WebP statt PNG: Das Bild landet auf dem Gerät in einer Datei und im Web in
 * einer IndexedDB — kleinere Dateien sind hier kein Detail (AE-14).
 */
export const IMAGE_FORMAT: ImageFormat = 'webp';
/** Quadratisch, weil die Karteikarte einen quadratischen Rahmen zeigt. */
export const IMAGE_ASPECT_RATIO = '1:1';
/** Einheitlicher Stil über alle Karten hinweg. */
export const IMAGE_STYLE_PRESET = 'digital-art';

/**
 * Was auf keinen Fall im Bild sein soll.
 *
 * Schrift steht an erster Stelle: ein Modell, das Buchstaben malt, malt
 * falsche — bei Thai-Schrift erst recht. Eine erfundene Schreibung neben
 * sorgfältig geprüften Vokabeln wäre schädlicher als gar kein Bild. Danach
 * kommt alles, was die Eindeutigkeit zerstört: mehrere Motive, Collagen,
 * Rahmen.
 */
export const NEGATIVE_PROMPT =
  'text, letters, words, numbers, captions, watermark, signature, logo, ' +
  'frame, border, collage, multiple objects, split image, blurry';

export type ImageGenerationClient = {
  generate(spec: ImageSpec): Promise<GeneratedImage>;
};

/**
 * Der Bildauftrag in Worten — englisch, weil Bildmodelle englisch trainiert
 * sind. Das Motiv selbst kommt aus `motifs.ts` und ist je Vokabel von Hand
 * festgelegt; hier kommt nur der gemeinsame Rahmen dazu, damit alle Karten
 * denselben Stil haben.
 */
export function buildImagePrompt(spec: ImageSpec): string {
  return (
    `${spec.motif}. ` +
    'Simple flashcard illustration, one single subject, centered, ' +
    'plain uncluttered background, clear outlines, friendly flat style, ' +
    'no text and no letters anywhere in the image.'
  );
}

function looksLikeBase64(value: string): boolean {
  return value.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(value);
}

/** Liest die Fehlerform von Stability (`{"errors":[…],"name":"…"}`) aus. */
export function describeApiError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { errors?: unknown; name?: unknown };
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      return `HTTP ${status}: ${parsed.errors.join('; ')}`;
    }
    if (typeof parsed.name === 'string') {
      return `HTTP ${status}: ${parsed.name}`;
    }
  } catch {
    // Keine JSON-Antwort - dann eben der Rohtext.
  }
  return `HTTP ${status}: ${body.slice(0, 200) || 'ohne Inhalt'}`;
}

/**
 * Prüft die Antwort, bevor sie abgelegt wird.
 *
 * Dieselbe Haltung wie beim Dialog-Parser aus Phase 4: lieber ein Fehlschlag
 * im Protokoll als eine kaputte Datei im Offline-Bestand, die erst beim Lernen
 * auffällt. Die Antwortform ließ sich ohne gültigen Schlüssel **nicht** messen
 * — anders als die Anfrageform. Deshalb nennt die Fehlermeldung die tatsächlich
 * gelieferten Felder: heißt das Feld eines Tages anders, steht das sofort in
 * der Fehlerliste des Laufs, statt als Rätsel zu enden.
 */
export function parseImageResponse(
  payload: unknown,
  prompt: string,
  format: ImageFormat = IMAGE_FORMAT,
  model: string = IMAGE_MODEL
): GeneratedImage {
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
    throw new Error(
      `Antwort enthielt kein Feld "image" (gelieferte Felder: ${Object.keys(data).join(', ') || 'keine'}).`
    );
  }
  const base64 = image.trim();
  if (!looksLikeBase64(base64)) {
    throw new Error('Bilddaten sind kein brauchbares Base64.');
  }

  return { base64, format, model, prompt };
}

export function createStabilityImageClient(apiKey: string): ImageGenerationClient {
  return {
    async generate(spec) {
      // Dritte Sperre des isConcrete-Tors: unmittelbar vor dem Aufruf, der
      // Geld kostet.
      assertConcreteSpec(spec);

      const prompt = buildImagePrompt(spec);

      const form = new FormData();
      form.append('prompt', prompt);
      form.append('negative_prompt', NEGATIVE_PROMPT);
      form.append('aspect_ratio', IMAGE_ASPECT_RATIO);
      form.append('output_format', IMAGE_FORMAT);
      form.append('style_preset', IMAGE_STYLE_PRESET);

      const response = await fetch(IMAGE_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          // Ohne diesen Header liefert die API die rohen Bildbytes; mit ihm
          // ein JSON-Objekt mit Base64 - genau das, was fuer die Offline-Ablage
          // gebraucht wird.
          Accept: 'application/json',
        },
        body: form,
      });

      if (!response.ok) {
        throw new Error(describeApiError(response.status, await response.text()));
      }

      return parseImageResponse(await response.json(), prompt, IMAGE_FORMAT, IMAGE_MODEL);
    },
  };
}
