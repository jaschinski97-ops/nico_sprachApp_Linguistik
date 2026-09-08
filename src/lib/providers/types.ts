import { SpeechLanguage } from '../audio';

/**
 * Gemeinsamer Vertrag der KI-Anbieter (Phase 10).
 *
 * BIS HIERHER WAR JEDER GENERATOR AUF EINEN ANBIETER FESTGENAGELT: die
 * Sprachsituationen und die Prüfungsaufgaben riefen den Anthropic-SDK direkt
 * auf (AE-12), die Bilder ein eigenes `fetch` gegen Stability (AE-13). Beide
 * Aufrufe standen im jeweiligen Generator neben dem Prompt und dem Parser.
 * Ein dritter Anbieter hätte also entweder ein drittes Mal dieselbe
 * Aufrufschleife bekommen oder jede Prompt-Datei mit einer Anbieterweiche
 * durchzogen.
 *
 * DIE NAHT LIEGT DESHALB DORT, WO SIE ANBIETERUNABHÄNGIG IST:
 *
 * - `TextClient` — „System- und Nutzertext rein, Text raus". Mehr brauchen
 *   weder der Dialog- noch der Prüfungsgenerator; beide verlangen JSON im
 *   Prompt und prüfen die Antwort selbst (Phase 4/7). Prompts und Parser
 *   bleiben damit unangetastet und anbieterfrei.
 * - `ImageClient` — „Prompt rein, Bilddaten raus". Das Format kommt aus der
 *   **Antwort** zurück und wird nicht vorausgesetzt: Stability nimmt
 *   `output_format` entgegen, Gemini bestimmt es selbst und nennt es im
 *   `mimeType`. Wer es vorschreiben wollte, müsste bei Gemini lügen.
 *
 * WAS BEWUSST *NICHT* IN DIESEN VERTRAG WANDERT: Temperatur, Werkzeuge,
 * Streaming, Bildgrößen jenseits des Seitenverhältnisses. Nichts davon wird
 * hier gebraucht, und ein Vertrag, der jede Fähigkeit jedes Anbieters abbildet,
 * ist keine Abstraktion mehr, sondern eine Vereinigungsmenge.
 */

/**
 * Die auswählbaren Anbieter.
 *
 * Drei davon sind in Phase 10 dazugekommen (`claude`, `chatgpt`, `gemini`) —
 * `stability` ist der **Bestandsanbieter** aus AE-13 und bleibt für Bilder
 * wählbar. Der Grund steht in AE-28: Claude erzeugt überhaupt keine Bilder,
 * und ein Bildgenerator, dessen einzige verbliebene Anbieter beide erst noch
 * mit einem bezahlten Schlüssel zu belegen wären, wäre ein Rückschritt
 * gegenüber dem, was heute nachweislich läuft.
 */
export const PROVIDERS = ['claude', 'chatgpt', 'gemini', 'stability'] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && (PROVIDERS as readonly string[]).includes(value);
}

/** Was ein Anbieter kann — gemessen, nicht vermutet. Siehe AE-26/AE-27/AE-31. */
export type ProviderCapability = 'text' | 'image' | 'audio';

export type ProviderInfo = {
  id: ProviderId;
  /** Name im Auswahlfeld. Der Produktname, nicht der Firmenname. */
  label: string;
  /** Firma dahinter — steht in der Erklärzeile, damit der Schlüssel passt. */
  vendor: string;
  can: Record<ProviderCapability, boolean>;
  /** Wie ein Schlüssel dieses Anbieters ungefähr aussieht. */
  keyPlaceholder: string;
  /** Wo man ihn bekommt. Reiner Hinweistext, kein Link. */
  keySource: string;
  /**
   * Beispielhafter Modellname je Fähigkeit — **Platzhalter, kein Katalog**.
   * Modelle wechseln zu oft, um sie einzufrieren; das Eingabefeld nimmt
   * jeden Text an (Pflicht 5). Leer heißt: kann der Anbieter nicht.
   */
  modelPlaceholder: Record<ProviderCapability, string>;
  /**
   * Beispielhafte Stimme für die Sprachausgabe — wie das Modell ein
   * Platzhalter und kein Katalog. Leer, wenn der Anbieter nicht spricht.
   */
  voicePlaceholder: string;
  /**
   * Warum dieser Anbieter im **Web-Build** nicht oder kaum funktioniert.
   * `null` heißt: nichts dergleichen gemessen. Steht nur im Web in der
   * Oberfläche — nativ gibt es kein CORS, dort gilt der Hinweis nicht.
   */
  webWarning: string | null;
};

export const PROVIDER_INFO: Record<ProviderId, ProviderInfo> = {
  claude: {
    id: 'claude',
    label: 'Claude',
    vendor: 'Anthropic',
    // Anthropic bietet keine Bild-Erzeugung an - das war schon der Grund,
    // warum Phase 5 ueberhaupt einen zweiten Anbieter suchen musste.
    // ... und keine Sprachausgabe: Anthropic hat kein TTS-Modell (Phase 11).
    can: { text: true, image: false, audio: false },
    keyPlaceholder: 'sk-ant-…',
    keySource: 'console.anthropic.com',
    modelPlaceholder: { text: 'claude-opus-5', image: '', audio: '' },
    voicePlaceholder: '',
    webWarning: null,
  },
  chatgpt: {
    id: 'chatgpt',
    label: 'ChatGPT',
    vendor: 'OpenAI',
    can: { text: true, image: true, audio: true },
    keyPlaceholder: 'sk-…',
    keySource: 'platform.openai.com',
    // Sprachausgabe: POST /v1/audio/speech, liefert die Audiodatei binaer
    // (mp3/opus/aac/flac/wav/pcm); Thai steht in der Sprachliste der Doku.
    // Festverdrahteter Schnappschuss (Nutzerwahl 08.09.2026): der datierte
    // 2025-12-15-Snapshot erkennt Woerter deutlich besser als der Alias;
    // Feld bleibt Freitext, ein anderer Name ist jederzeit eintippbar.
    modelPlaceholder: { text: 'gpt-5', image: 'gpt-image-1', audio: 'gpt-4o-mini-tts-2025-12-15' },
    voicePlaceholder: 'alloy',
    // Gemessen am 2026-09-03, siehe AE-27. Betrifft jeden echten Schluessel.
    webWarning:
      'Im Browser voraussichtlich unbrauchbar. Gemessen: Ein POST an api.openai.com mit ' +
      'einem Schlüssel, der mit „sk-" beginnt, bekommt eine Antwort ohne CORS-Header — ' +
      'der Browser wirft sie weg, und der Lauf meldet „Keine Antwort". Genau so beginnt ' +
      'jeder echte OpenAI-Schlüssel; mit einem anders geformten Schlüssel kommt dieselbe ' +
      'Anfrage durch. Ob ein GÜLTIGER Schlüssel die Ausnahme ist, ließ sich ohne einen ' +
      'solchen nicht prüfen — und die Anfrage könnte dabei trotzdem berechnet werden. ' +
      'Auf dem Gerät (Android/iOS) gibt es kein CORS; dort ist dieser Weg offen.',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    vendor: 'Google',
    can: { text: true, image: true, audio: true },
    keyPlaceholder: 'AIza…',
    keySource: 'aistudio.google.com',
    // Sprachausgabe ueber denselben generateContent-Aufruf wie Text und Bild,
    // mit responseModalities AUDIO; die Doku nennt Thai ("th") als unterstuetzt.
    modelPlaceholder: {
      text: 'gemini-2.5-flash',
      image: 'gemini-2.5-flash-image',
      audio: 'gemini-2.5-flash-preview-tts',
    },
    voicePlaceholder: 'Kore',
    webWarning: null,
  },
  stability: {
    id: 'stability',
    label: 'Stability AI',
    vendor: 'Stability AI',
    // Reiner Bildanbieter - Textmodelle gibt es dort nicht.
    can: { text: false, image: true, audio: false },
    keyPlaceholder: 'sk-…',
    keySource: 'platform.stability.ai',
    // Bei Stability steckt das Modell im Pfad (`…/generate/core`). Das Feld
    // nimmt beide Schreibweisen an, `stable-image-core` und `core`.
    modelPlaceholder: { text: '', image: 'stable-image-core', audio: '' },
    voicePlaceholder: '',
    webWarning: null,
  },
};

export function providersFor(capability: ProviderCapability): ProviderInfo[] {
  return PROVIDERS.map((id) => PROVIDER_INFO[id]).filter((info) => info.can[capability]);
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export type TextRequest = {
  /** Rollenanweisung. Wer keine getrennte Systemrolle kennt, stellt sie voran. */
  system: string;
  user: string;
  maxTokens: number;
};

export type TextResponse = {
  text: string;
  /**
   * Das Modell, das **tatsächlich** geantwortet hat, falls der Anbieter es
   * nennt — sonst das angefragte. Landet im erzeugten Dokument und macht im
   * Nachhinein nachvollziehbar, womit ein Inhalt entstanden ist.
   */
  model: string;
};

export type TextClient = {
  provider: ProviderId;
  model: string;
  complete(request: TextRequest): Promise<TextResponse>;
};

// ---------------------------------------------------------------------------
// Bild
// ---------------------------------------------------------------------------

export type ImageRequest = {
  prompt: string;
  /** Nicht jeder Anbieter kennt so ein Feld; wer nicht, hängt es an den Prompt. */
  negativePrompt: string;
  /** Wunschformat. Kein Versprechen — maßgeblich ist das der Antwort. */
  preferredFormat: 'webp' | 'png' | 'jpeg';
  aspectRatio: string;
  stylePreset: string;
};

export type ImageResponse = {
  base64: string;
  /** Das Format, das wirklich geliefert wurde. */
  format: 'webp' | 'png' | 'jpeg';
  model: string;
};

export type ImageClient = {
  provider: ProviderId;
  model: string;
  create(request: ImageRequest): Promise<ImageResponse>;
};

// ---------------------------------------------------------------------------
// Sprachausgabe (Phase 11)
// ---------------------------------------------------------------------------

export type AudioFormat = 'wav' | 'mp3';

export type AudioRequest = {
  text: string;
  /**
   * Seit Phase 16 alle vier Sprachen. Die Anbieter werten die Angabe derzeit
   * nicht aus - die Stimme steht in den Einstellungen -, sie wandert aber
   * durch bis in die Clip-ID und muss dort stimmen.
   */
  language: SpeechLanguage;
};

export type AudioResponse = {
  base64: string;
  /** Das Format, in dem die Daten wirklich vorliegen (fertig abspielbar). */
  format: AudioFormat;
  model: string;
  voice: string;
  /** Bekannt bei PCM/WAV; bei komprimierten Formaten nicht aus der Antwort ablesbar. */
  sampleRate?: number;
};

/**
 * „Text rein, abspielbare Audiodatei raus." Das Format entscheidet der
 * Anbieter: Gemini liefert rohes PCM, das hier zu WAV verpackt wird; OpenAI
 * liefert direkt mp3. Beides spielt `expo-audio` ab; die Ablage benennt die
 * Datei nach dem Format (AE-30).
 */
export type AudioClient = {
  provider: ProviderId;
  model: string;
  voice: string;
  synthesize(request: AudioRequest): Promise<AudioResponse>;
};

const CAPABILITY_NEGATED: Record<ProviderCapability, string> = {
  text: 'keinen Text',
  image: 'keine Bilder',
  audio: 'keine Sprachausgabe',
};

/**
 * Ein Anbieter kann das nicht — als Fehler, nicht als stiller Leerlauf.
 *
 * Die Oberfläche verhindert die Kombination bereits (das Auswahlfeld zeigt für
 * Bilder gar kein Claude an). Diese Sperre liegt trotzdem hier, weil
 * gespeicherte Einstellungen aus einer älteren Version eine Kombination
 * tragen können, die es inzwischen nicht mehr gibt — dieselbe Überlegung wie
 * beim dreifachen isConcrete-Tor (AE-15) und beim Prüfen an der Lesegrenze
 * (AE-25).
 */
export function unsupported(provider: ProviderId, capability: ProviderCapability): Error {
  const info = PROVIDER_INFO[provider];
  return new Error(
    `${info.label} (${info.vendor}) erzeugt ${CAPABILITY_NEGATED[capability]} — ` +
      'bitte in den Einstellungen einen anderen Anbieter wählen.'
  );
}
