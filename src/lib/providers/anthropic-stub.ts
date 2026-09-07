// Nativer Ersatz für `@anthropic-ai/sdk` (AE-10/12).
//
// metro.config.js lenkt jeden Import des SDK auf Android/iOS auf diese Datei
// um: Das echte SDK braucht `node:fs` und gehört nur in den Web-Build des
// Inhaltsstudios. Früher löste Metro das Paket auf Native zu einem leeren
// Modul auf — fiel dort eine Annahme (etwa ein Env-Flag im Dev-Build), crashte
// die App kryptisch mit „undefined is not a constructor". Dieser Stub hält das
// SDK aus dem nativen Bundle (gleiche Wirkung) und wirft stattdessen beim
// Konstruieren wie beim Zugriff auf `messages` eine klare, deutschsprachige
// Meldung. Der Nutzerfluss (Lernen, Prüfung, Gespräch) importiert das SDK
// nicht; erreichen kann man diesen Fehler nur aus dem Web-Debug-Studio-Code,
// der auf Native niemals laufen darf.
//
// Die Exporte spiegeln das Shape, das src/lib/providers/text.ts als einziger
// Konsument verwendet: Default-Export der konstruierbaren Klasse plus die
// Typnamen `Anthropic.Message` und `Anthropic.TextBlock`.

export const ANTHROPIC_NATIVE_UNAVAILABLE =
  'Das Inhaltsstudio mit KI-Generatoren ist nur im Web-Debug-Studio verfügbar, nicht in der nativen App.';

function unavailableError(): Error {
  return new Error(ANTHROPIC_NATIVE_UNAVAILABLE);
}

export interface AnthropicOptions {
  apiKey?: string;
  dangerouslyAllowBrowser?: boolean;
}

export interface MessageCreateParams {
  model: string;
  max_tokens: number;
  output_config?: { effort?: string };
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export class Anthropic {
  constructor(_options?: AnthropicOptions) {
    throw unavailableError();
  }

  get messages(): { create(_params: MessageCreateParams): Promise<Anthropic.Message> } {
    throw unavailableError();
  }
}

export namespace Anthropic {
  export type TextBlock = { type: 'text'; text: string };
  export type Message = {
    id?: string;
    model: string | null;
    stop_reason: string | null;
    content: TextBlock[];
  };
}

export default Anthropic;
