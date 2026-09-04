// PHASE 16: `VOCABULARY` umfasst jetzt alle drei Sprachen. Was diese Datei
// zusichert, gilt dem Thai-Grundstock aus Phase 2 - deshalb hier
// ausdruecklich der. Unterhalb dieser Zeile hat sich nichts geaendert.
import { VOCABULARY_TH as VOCABULARY } from '@/data/vocabulary';

import {
  clearApiKey,
  getKeyStorageMode,
  loadApiKey,
  resetKeyStorageForTests,
  saveApiKey,
} from '../api-key';
import { createSituationClient, GENERATOR_MODEL } from '../conversation/generator';
import { situationId } from '../conversation/types';
import { createExamModuleClient, EXAM_GENERATOR_MODEL } from '../exam/generator';
import {
  buildImagePrompt,
  createImageClient,
  IMAGE_ASPECT_RATIO,
  IMAGE_ENDPOINT,
  IMAGE_FORMAT,
  IMAGE_MODEL,
  NEGATIVE_PROMPT,
} from '../images/generator';
import { planImages } from '../images/plan';
import { ImageSpec } from '../images/types';
import { MemoryDataStore } from '../storage';

import { describeHttpError, describeNetworkFailure, fieldNamesOf } from './http';
import {
  createImageProvider,
  formatFromMimeType,
  parseGeminiImage,
  parseOpenAiImage,
  parseStabilityImage,
  stabilityEndpoint,
  withPromptFallbacks,
} from './image';
import {
  defaultChoiceFor,
  GENERATOR_GROUP_INFO,
  GENERATOR_GROUPS,
  loadGeneratorSettings,
  normalizeChoice,
  providersForGroup,
  setGeneratorChoice,
  setGeneratorProvider,
} from './settings';
import {
  createTextClient,
  geminiEndpoint,
  parseGeminiText,
  parseOpenAiText,
} from './text';
import {
  ImageClient,
  ImageRequest,
  PROVIDER_INFO,
  PROVIDERS,
  providersFor,
  TextClient,
  TextRequest,
} from './types';

/**
 * Phase 10 — die Anbieter-Abstraktion.
 *
 * Der wichtigste Teil dieser Datei ist nicht das Neue, sondern der Nachweis,
 * dass das **Alte unverändert läuft**: dieselbe Voreinstellung, derselbe
 * Endpunkt, dieselben Prompts, dasselbe isConcrete-Tor. Ein Umbau, der die
 * Anbieterwahl bringt und dabei still den Standard verschiebt, wäre kein
 * Fortschritt, sondern eine Falle für alle, die nichts umstellen.
 */

/**
 * Die sichere Ablage im Arbeitsspeicher nachgebildet.
 *
 * Der Mock von `jest-expo` meldet `isAvailableAsync() === true`, liefert aber
 * bei jedem Lesen `undefined` — damit liesse sich weder die Trennung je
 * Anbieter noch der Ablagename pruefen. Hier steht deshalb eine echte kleine
 * Umsetzung, gegen die beides messbar ist.
 */
const mockSecureStoreInhalt = new Map<string, string>();
let mockSecureStoreVorhanden = true;

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: async () => mockSecureStoreVorhanden,
  getItemAsync: async (name: string) => mockSecureStoreInhalt.get(name) ?? null,
  setItemAsync: async (name: string, value: string) => {
    mockSecureStoreInhalt.set(name, value);
  },
  deleteItemAsync: async (name: string) => {
    mockSecureStoreInhalt.delete(name);
  },
}));

const FAKE_BASE64 = 'UklGRhYAAABXRUJQVlA4TAoAAAAvAAAAAAfQ//73v/+BiOh/AAA'.repeat(4);

function fakeTextClient(reply: string) {
  const seen: TextRequest[] = [];
  const client: TextClient = {
    provider: 'gemini',
    model: 'test-modell',
    async complete(request) {
      seen.push(request);
      return { text: reply, model: 'test-modell-v2' };
    },
  };
  return { client, seen };
}

function fakeImageClient() {
  const seen: ImageRequest[] = [];
  const client: ImageClient = {
    provider: 'gemini',
    model: 'test-bildmodell',
    async create(request) {
      seen.push(request);
      return { base64: FAKE_BASE64, format: 'png', model: 'test-bildmodell-v2' };
    },
  };
  return { client, seen };
}

// ---------------------------------------------------------------------------

describe('Fähigkeiten der Anbieter', () => {
  it('führt genau die drei geforderten Anbieter plus den Bestandsanbieter', () => {
    expect([...PROVIDERS]).toEqual(['claude', 'chatgpt', 'gemini', 'stability']);
  });

  it('lässt Claude keine Bilder erzeugen', () => {
    // Anthropic bietet keine Bild-API an - das war schon der Grund, warum
    // Phase 5 ueberhaupt einen zweiten Anbieter suchen musste (AE-13).
    expect(PROVIDER_INFO.claude.can.image).toBe(false);
    expect(providersFor('image').map((info) => info.id)).not.toContain('claude');
  });

  it('lässt Stability keinen Text erzeugen', () => {
    expect(PROVIDER_INFO.stability.can.text).toBe(false);
    expect(providersFor('text').map((info) => info.id)).not.toContain('stability');
  });

  it('bietet in jeder Gruppe nur Anbieter an, die die Aufgabe können', () => {
    for (const group of GENERATOR_GROUPS) {
      const angeboten = providersForGroup(group);
      expect(angeboten.length).toBeGreaterThan(0);
      for (const info of angeboten) {
        expect(info.modelPlaceholder[GENERATOR_GROUP_INFO[group].needs]).not.toBe('');
      }
    }
  });

  it('kennzeichnet genau den Anbieter, bei dem der Browser gemessen scheitert', () => {
    // AE-27: Nur bei OpenAI wurde eine Einschraenkung gemessen, die JEDEN
    // echten Schluessel betrifft. Die anderen drei antworteten aus dem
    // Browser - eine Warnung bei ihnen waere eine Behauptung ohne Messung.
    expect(PROVIDER_INFO.chatgpt.webWarning).toMatch(/sk-/);
    expect(PROVIDER_INFO.chatgpt.webWarning).toMatch(/Gerät/);
    expect(PROVIDER_INFO.claude.webWarning).toBeNull();
    expect(PROVIDER_INFO.gemini.webWarning).toBeNull();
    expect(PROVIDER_INFO.stability.webWarning).toBeNull();
  });

  it('verweigert eine Kombination, die es nicht gibt, mit Begründung', () => {
    // Die Oberflaeche bietet das gar nicht erst an. Die Sperre liegt trotzdem
    // hier, weil eine gespeicherte Einstellung aus einer aelteren Version
    // eine Kombination tragen kann, die es nicht mehr gibt (AE-25-Muster).
    expect(() => createImageProvider('claude', 'k', 'm')).toThrow(/keine Bilder/);
    expect(() => createTextClient('stability', 'k', 'm')).toThrow(/keinen Text/);
  });
});

// ---------------------------------------------------------------------------

describe('Voreinstellungen — der Bestand darf sich nicht still verschieben', () => {
  it('startet mit Claude für Sprachsituationen und Prüfungsinhalte', () => {
    expect(defaultChoiceFor('situations')).toEqual({
      provider: 'claude',
      model: GENERATOR_MODEL,
    });
    expect(defaultChoiceFor('exam')).toEqual({ provider: 'claude', model: EXAM_GENERATOR_MODEL });
  });

  it('startet mit Stability für Bilder', () => {
    expect(defaultChoiceFor('images')).toEqual({ provider: 'stability', model: IMAGE_MODEL });
  });

  it('trifft mit der Voreinstellung genau den in Phase 5 gemessenen Endpunkt', () => {
    // AE-13 hat diese Adresse gegen die laufende API belegt (401 statt 404).
    // Waere sie beim Umbau verrutscht, faende es sonst erst der Nutzer heraus.
    expect(stabilityEndpoint(IMAGE_MODEL)).toBe(
      'https://api.stability.ai/v2beta/stable-image/generate/core'
    );
    expect(IMAGE_ENDPOINT).toBe('https://api.stability.ai/v2beta/stable-image/generate/core');
  });
});

describe('Einstellungen je Generator-Gruppe', () => {
  it('legt Anbieter und Modell dauerhaft ab und liest sie zurück', async () => {
    const store = new MemoryDataStore();
    await store.init();

    await setGeneratorChoice('situations', { provider: 'gemini', model: 'gemini-9.9-pro' }, store);
    const gelesen = await loadGeneratorSettings(store);

    expect(gelesen.situations).toEqual({ provider: 'gemini', model: 'gemini-9.9-pro' });
    // Die anderen Gruppen bleiben unberuehrt - genau darum sind es drei.
    expect(gelesen.exam.provider).toBe('claude');
    expect(gelesen.images.provider).toBe('stability');
  });

  it('zieht beim Anbieterwechsel den Modellnamen mit', async () => {
    const store = new MemoryDataStore();
    await store.init();

    await setGeneratorChoice('exam', { model: 'claude-eigenbau-1' }, store);
    const nachher = await setGeneratorProvider('exam', 'chatgpt', store);

    // `claude-eigenbau-1` an OpenAI zu schicken gaebe nur einen Fehlschlag,
    // den niemand mit dem Wechsel in Verbindung braechte.
    expect(nachher.exam).toEqual({ provider: 'chatgpt', model: PROVIDER_INFO.chatgpt.modelPlaceholder.text });
  });

  it('nimmt jeden Modellnamen an, ohne ihn zu prüfen', () => {
    // Pflicht 5: kein Katalog. Ein Katalog waere schon beim naechsten
    // Modellwechsel falsch - und dann auf die schlimmste Art, naemlich indem
    // er ein gueltiges Modell ablehnt.
    for (const name of ['gpt-7-turbo-2029', 'völlig-ausgedacht', 'a', '../etwas']) {
      expect(normalizeChoice({ provider: 'chatgpt', model: name }, 'situations').model).toBe(name);
    }
  });

  it('liest Unbrauchbares nachsichtig statt abzustürzen', () => {
    // Dasselbe Prinzip wie an der Lesegrenze (AE-25): Eine kaputte Einstellung
    // ist kein Grund, eine App unbenutzbar zu machen.
    expect(normalizeChoice(null, 'situations')).toEqual(defaultChoiceFor('situations'));
    expect(normalizeChoice('kaputt', 'images')).toEqual(defaultChoiceFor('images'));
    expect(normalizeChoice({ provider: 'gibtesnicht' }, 'exam')).toEqual(defaultChoiceFor('exam'));
  });

  it('verwirft einen Anbieter, der die Aufgabe der Gruppe nicht kann', () => {
    // Ein gespeichertes „Bilder von Claude" wuerde sonst bei jedem Lauf
    // scheitern, ohne dass in der Auswahl zu sehen waere, warum.
    expect(normalizeChoice({ provider: 'claude', model: 'x' }, 'images').provider).toBe('stability');
    expect(normalizeChoice({ provider: 'stability', model: 'x' }, 'exam').provider).toBe('claude');
  });

  it('behandelt ein leeres Modellfeld als „nimm den Vorschlag"', () => {
    expect(normalizeChoice({ provider: 'gemini', model: '   ' }, 'situations').model).toBe(
      PROVIDER_INFO.gemini.modelPlaceholder.text
    );
  });
});

// ---------------------------------------------------------------------------

describe('Schlüssel je Anbieter (AE-10, jetzt vierfach)', () => {
  beforeEach(() => {
    mockSecureStoreInhalt.clear();
    mockSecureStoreVorhanden = true;
    resetKeyStorageForTests();
  });

  it('hält vier Schlüssel getrennt', async () => {
    await saveApiKey('schluessel-fuer-claude-0000', 'claude');
    await saveApiKey('schluessel-fuer-gemini-0000', 'gemini');

    expect(await loadApiKey('claude')).toBe('schluessel-fuer-claude-0000');
    expect(await loadApiKey('gemini')).toBe('schluessel-fuer-gemini-0000');
    expect(await loadApiKey('chatgpt')).toBeNull();
    expect(await loadApiKey('stability')).toBeNull();
  });

  it('löscht beim Wechsel keinen fremden Schlüssel', async () => {
    for (const provider of PROVIDERS) await saveApiKey(`geheim-${provider}-000000`, provider);
    await clearApiKey('chatgpt');

    expect(await loadApiKey('chatgpt')).toBeNull();
    expect(await loadApiKey('claude')).toBe('geheim-claude-000000');
    expect(await loadApiKey('gemini')).toBe('geheim-gemini-000000');
    expect(await loadApiKey('stability')).toBe('geheim-stability-000000');
  });

  it('legt den Claude-Schlüssel weiter unter dem alten Namen ab', async () => {
    // Der Ablagename heisst seit Phase 4 `anthropic-api-key` und liegt auf den
    // Geraeten der Nutzer im Keychain. Ihn zur Sauberkeit umzubenennen, wuerde
    // einen dort gespeicherten Schluessel unauffindbar machen: die App fragte
    // kommentarlos erneut danach, und der alte Eintrag bliebe fuer immer
    // liegen. Genau davor schuetzt dieser Test.
    await saveApiKey('schluessel-fuer-claude-0000', 'claude');
    expect(mockSecureStoreInhalt.get('anthropic-api-key')).toBe('schluessel-fuer-claude-0000');

    await saveApiKey('schluessel-fuer-gemini-0000', 'gemini');
    expect([...mockSecureStoreInhalt.keys()].sort()).toEqual([
      'anthropic-api-key',
      'gemini-api-key',
    ]);
  });

  it('stellt die Weiche zur Laufzeit über isAvailableAsync, nicht über Platform.OS', async () => {
    expect(await getKeyStorageMode()).toBe('secure-store');

    // Wie im Browser: `expo-secure-store` hat dort gar keine Umsetzung (AE-10).
    mockSecureStoreVorhanden = false;
    resetKeyStorageForTests();
    expect(await getKeyStorageMode()).toBe('session-only');

    // Und dann bleibt der Schluessel nur in der Sitzung - nichts wird abgelegt.
    await saveApiKey('nur-fuer-diese-sitzung-000', 'chatgpt');
    expect(await loadApiKey('chatgpt')).toBe('nur-fuer-diese-sitzung-000');
    expect(mockSecureStoreInhalt.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe('Textanbieter: Antworten lesen', () => {
  it('liest eine ChatGPT-Antwort', () => {
    const response = parseOpenAiText(
      { model: 'gpt-5-2026', choices: [{ message: { content: '{"a":1}' }, finish_reason: 'stop' }] },
      'gpt-5'
    );
    expect(response).toEqual({ text: '{"a":1}', model: 'gpt-5-2026' });
  });

  it('liest eine Gemini-Antwort und setzt Teile zusammen', () => {
    const response = parseGeminiText(
      {
        modelVersion: 'gemini-2.5-flash-001',
        candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '1}' }] } }],
      },
      'gemini-2.5-flash'
    );
    expect(response).toEqual({ text: '{"a":1}', model: 'gemini-2.5-flash-001' });
  });

  it('nennt bei einer unerwarteten Antwortform die gelieferten Felder', () => {
    // Die Antwortform liess sich ohne bezahlten Schluessel NICHT messen -
    // beide Anbieter pruefen den Schluessel zuerst (AE-26/AE-27). Heisst ein
    // Feld eines Tages anders, muss das sofort in der Fehlerliste stehen
    // statt als Raetsel zu enden. Dieselbe Vorsicht wie in AE-13.
    expect(() => parseOpenAiText({ output: 'neu', id: 'x' }, 'm')).toThrow(/output, id/);
    expect(() => parseGeminiText({ response: {}, usage: {} }, 'm')).toThrow(/response, usage/);
  });

  it('macht aus einer leeren Antwort einen benannten Fehlschlag', () => {
    expect(() =>
      parseOpenAiText({ choices: [{ message: { content: '' }, finish_reason: 'length' }] }, 'm')
    ).toThrow(/finish_reason: length/);
    expect(() =>
      parseGeminiText({ candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }] }, 'm')
    ).toThrow(/finishReason: MAX_TOKENS/);
  });

  it('nennt bei Gemini das promptFeedback, wenn der Prompt gesperrt wurde', () => {
    expect(() => parseGeminiText({ promptFeedback: { blockReason: 'SAFETY' } }, 'm')).toThrow(
      /SAFETY/
    );
  });

  it('kodiert einen Modellnamen aus dem Freitextfeld in den Pfad', () => {
    expect(geminiEndpoint('gemini-2.5-flash', 'generateContent')).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    );
    // Ein Tippfehler mit Schraegstrich darf keine fremde Adresse bauen.
    expect(geminiEndpoint('../../etwas', 'generateContent')).toContain('..%2F..%2Fetwas');
  });
});

describe('Bildanbieter: Antworten lesen', () => {
  it('liest ein Gemini-Bild samt Format aus dem mimeType', () => {
    const image = parseGeminiImage(
      {
        modelVersion: 'gemini-2.5-flash-image-001',
        candidates: [
          {
            content: {
              parts: [
                { text: 'Hier ist dein Bild:' },
                { inlineData: { mimeType: 'image/png', data: FAKE_BASE64 } },
              ],
            },
          },
        ],
      },
      'gemini-2.5-flash-image'
    );
    expect(image).toEqual({
      base64: FAKE_BASE64,
      format: 'png',
      model: 'gemini-2.5-flash-image-001',
    });
  });

  it('nimmt bei Gemini auch die Schreibweise inline_data an', () => {
    const image = parseGeminiImage(
      { candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/webp', data: FAKE_BASE64 } }] } }] },
      'm'
    );
    expect(image.format).toBe('webp');
  });

  it('nennt bei fehlendem Bild den finishReason und die gelieferten Teile', () => {
    expect(() =>
      parseGeminiImage(
        { candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: 'nein' }] } }] },
        'm'
      )
    ).toThrow(/SAFETY.*text/s);
  });

  it('liest ein ChatGPT-Bild', () => {
    expect(parseOpenAiImage({ data: [{ b64_json: FAKE_BASE64 }] }, 'png', 'gpt-image-1')).toEqual({
      base64: FAKE_BASE64,
      format: 'png',
      model: 'gpt-image-1',
    });
  });

  it('erklärt, warum eine Bild-URL statt Base64 nicht reicht', () => {
    // Die App legt Bilder offline ab (AE-14). Eine URL waere beim naechsten
    // Start tot - das muss in der Meldung stehen, nicht nur „kein b64_json".
    expect(() => parseOpenAiImage({ data: [{ url: 'https://…' }] }, 'png', 'm')).toThrow(
      /offline/
    );
  });

  it('lehnt Bilddaten ab, die kein brauchbares Base64 sind', () => {
    expect(() => parseStabilityImage({ image: 'kurz!' }, 'webp', 'm')).toThrow(/Base64/);
    expect(() =>
      parseGeminiImage(
        { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'kurz!' } }] } }] },
        'm'
      )
    ).toThrow(/Base64/);
  });

  it('lässt einen unbekannten Bildtyp auffliegen statt ihn zu raten', () => {
    expect(formatFromMimeType('image/webp')).toBe('webp');
    expect(formatFromMimeType('image/jpeg')).toBe('jpeg');
    expect(() => formatFromMimeType('image/heic')).toThrow(/Unbekannter Bildtyp/);
    expect(() => formatFromMimeType(undefined)).toThrow(/Unbekannter Bildtyp/);
  });

  it('hängt bei Anbietern ohne eigene Felder Stil und Verbote an den Prompt', () => {
    // Gemini und ChatGPT kennen kein negative_prompt. Es stillschweigend
    // fallen zu lassen, hiesse: „kein Text im Bild" gilt bei zwei von drei
    // Anbietern nicht mehr - und genau das ist laut AE-15 der wichtigste Punkt.
    const text = withPromptFallbacks({
      prompt: 'a chicken.',
      negativePrompt: NEGATIVE_PROMPT,
      preferredFormat: 'webp',
      aspectRatio: IMAGE_ASPECT_RATIO,
      stylePreset: 'digital-art',
    });
    expect(text).toContain('a chicken.');
    expect(text).toContain('letters');
    expect(text).toContain('1:1');
    expect(text).toContain('digital-art');
  });

  it('füllt den Modellnamen bei Stability in den Pfad, ohne ihn zu prüfen', () => {
    expect(stabilityEndpoint('ultra')).toMatch(/generate\/ultra$/);
    expect(stabilityEndpoint('stable-image-sd3')).toMatch(/generate\/sd3$/);
    expect(stabilityEndpoint('  ')).toMatch(/generate\/core$/);
  });
});

// ---------------------------------------------------------------------------

describe('Fehlermeldungen', () => {
  it('nennt CORS beim Namen, statt „Failed to fetch" stehen zu lassen', () => {
    // Der Browser gibt nur diesen einen Satz heraus; der Grund steht in der
    // Entwicklerkonsole, die im fertigen Build niemand offen hat. Phase 10 hat
    // gemessen, dass sich die CORS-Haltung eines Anbieters aendert (AE-27) -
    // dreht es sich zurueck, soll es in der Fehlerliste stehen.
    const beschrieben = describeNetworkFailure(new TypeError('Failed to fetch'), 'api.openai.com');
    expect(beschrieben.message).toContain('api.openai.com');
    expect(beschrieben.message).toContain('CORS');
    expect(beschrieben.message).toMatch(/Gerät/);
  });

  it('erklärt bei OpenAI zusätzlich die gemessene Schlüsselpräfix-Regel', () => {
    // Sonst sieht der Fehlschlag wie ein kaputter Schluessel aus, und der
    // Nutzer tippt ihn zum dritten Mal ab. Der Grund ist gemessen (AE-27) und
    // gehoert deshalb in die Fehlerliste, nicht nur ins Protokoll.
    const openai = describeNetworkFailure(new TypeError('Failed to fetch'), 'api.openai.com');
    expect(openai.message).toMatch(/sk-/);

    // Bei den anderen Anbietern waere derselbe Satz eine Behauptung.
    const google = describeNetworkFailure(
      new TypeError('Failed to fetch'),
      'generativelanguage.googleapis.com'
    );
    expect(google.message).not.toMatch(/sk-/);
    expect(google.message).toContain('CORS');
  });

  it('reicht einen fachlichen Fehler unverändert durch', () => {
    const echt = new Error('Antwort war kein gültiges JSON.');
    expect(describeNetworkFailure(echt, 'api.openai.com')).toBe(echt);
  });

  it('liest alle drei JSON-Fehlerformen der Anbieter', () => {
    expect(describeHttpError(401, '{"errors":["authorization: invalid"],"name":"unauthorized"}')).toBe(
      'HTTP 401: authorization: invalid'
    );
    expect(
      describeHttpError(401, '{"error":{"message":"Incorrect API key","type":"invalid_request_error"}}')
    ).toBe('HTTP 401: Incorrect API key — invalid_request_error');
    expect(
      describeHttpError(400, '{"error":{"message":"API key not valid.","status":"INVALID_ARGUMENT"}}')
    ).toBe('HTTP 400: API key not valid. — INVALID_ARGUMENT');
    expect(describeHttpError(502, '<html>Bad Gateway</html>')).toContain('HTTP 502:');
  });

  it('nennt die Feldnamen einer Antwort', () => {
    expect(fieldNamesOf({ a: 1, b: 2 })).toBe('a, b');
    expect(fieldNamesOf({})).toBe('keine');
    expect(fieldNamesOf('text')).toBe('string');
  });
});

// ---------------------------------------------------------------------------

describe('Die Generatoren hinter der Abstraktion', () => {
  const spec = {
    id: situationId('market', 'A1', 'de_to_th', 1),
    level: 'A1' as const,
    topic: 'market' as const,
    direction: 'de_to_th' as const,
    variant: 1,
  };

  const GUELTIGE_SITUATION = JSON.stringify({
    title: 'Am Marktstand',
    setting: 'Auf einem Markt in Bangkok.',
    scriptTurns: [
      { speaker: 'partner', thai: 'สวัสดีครับ', roman: 'sà-wàt-dii kráp', german: 'Guten Tag.' },
      { speaker: 'learner', thai: 'สวัสดีครับ', roman: 'sà-wàt-dii kráp', german: 'Guten Tag.' },
    ],
    corrections: [{ issue: 'Ton', explanation: 'Die erste Silbe ist tief.' }],
  });

  it('schickt denselben Prompt an jeden Anbieter', async () => {
    const { client, seen } = fakeTextClient(GUELTIGE_SITUATION);
    await createSituationClient(client).generate(spec);

    expect(seen).toHaveLength(1);
    // Die Prompts aus Phase 4 sind anbieterfrei geblieben - das ist der Sinn
    // der Naht. Nichts davon darf je Anbieter abweichen.
    expect(seen[0].system).toContain('JSON-Objekt');
    expect(seen[0].user).toContain('Markt');
    expect(seen[0].user).toContain('Thai');
    expect(seen[0].maxTokens).toBeGreaterThan(1000);
  });

  it('schreibt das Modell in das erzeugte Dokument, das wirklich geantwortet hat', async () => {
    const { client } = fakeTextClient(GUELTIGE_SITUATION);
    const situation = await createSituationClient(client).generate(spec);
    expect(situation.modelUsed).toBe('test-modell-v2');
  });

  it('lässt einen Anbieterfehler als Fehlschlag durch, nicht als halbe Situation', async () => {
    const { client } = fakeTextClient('kein json');
    await expect(createSituationClient(client).generate(spec)).rejects.toThrow(/JSON/);
  });

  it('nutzt beim Prüfungsgenerator dieselbe Naht', async () => {
    const { client, seen } = fakeTextClient(
      JSON.stringify({
        title: 'Anzeige',
        instruction: 'Lesen Sie.',
        stimulusBody: 'Das Haus ist groß.',
        items: [
          { prompt: 'Frage 1', options: ['A', 'B', 'C'], correctIndex: 0, explanation: 'Weil.' },
          { prompt: 'Frage 2', options: ['A', 'B', 'C'], correctIndex: 1, explanation: 'Weil.' },
        ],
      })
    );
    const module = await createExamModuleClient(client).generate({
      id: 'gen-A1-lesen-multipleChoice-001',
      level: 'A1',
      skill: 'lesen',
      taskType: 'multipleChoice',
      variant: 1,
    });

    expect(module.modelUsed).toBe('test-modell-v2');
    // Die recherchierte Pruefungsstruktur steht weiterhin im Prompt (AE-18).
    expect(seen[0].user).toContain('Goethe-Zertifikat');
  });

  it('reicht Prompt, Negativ-Prompt und Seitenverhältnis an den Bildanbieter durch', async () => {
    const { client, seen } = fakeImageClient();
    const spec = planImages({ limit: 1 })[0];

    const image = await createImageClient(client).generate(spec);

    expect(seen[0].prompt).toBe(buildImagePrompt(spec));
    expect(seen[0].negativePrompt).toBe(NEGATIVE_PROMPT);
    expect(seen[0].aspectRatio).toBe(IMAGE_ASPECT_RATIO);
    expect(seen[0].preferredFormat).toBe(IMAGE_FORMAT);
    // Das Format kommt aus der ANTWORT, nicht aus dem Wunsch: Gemini bestimmt
    // es selbst, und die Ablage benennt die Datei danach (AE-14).
    expect(image.format).toBe('png');
    expect(image.model).toBe('test-bildmodell-v2');
  });

  it('hält das isConcrete-Tor auch vor einem neuen Anbieter geschlossen', async () => {
    // AE-15: Die dritte Sperre sitzt unmittelbar vor dem Aufruf, der Geld
    // kostet. Ein neuer Anbieter ist ein neuer Aufrufer - genau der Fall, fuer
    // den die Sperre dreifach ist.
    const { client, seen } = fakeImageClient();
    // Ein echter, aber abstrakter Eintrag aus dem Grundstock - kein
    // ausgedachter, sonst schluege nur die Unbekannt-Pruefung an.
    const abstrakt = VOCABULARY.find((entry) => !entry.isConcrete)!;
    const gefaelscht = {
      id: abstrakt.id,
      vocabId: abstrakt.id,
      thai: abstrakt.term,
      romanization: abstrakt.romanization,
      german: abstrakt.german,
      partOfSpeech: abstrakt.partOfSpeech,
      motif: 'irgendwas',
      isConcrete: true,
    } as unknown as ImageSpec;

    await expect(createImageClient(client).generate(gefaelscht)).rejects.toThrow(/nicht konkret/);
    expect(seen).toHaveLength(0);
  });
});
