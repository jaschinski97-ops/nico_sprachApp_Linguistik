import * as Speech from 'expo-speech';

/**
 * Aussprache-Wiedergabe.
 *
 * Aufrufer sagen nur *was* gesprochen werden soll und in welcher Sprache.
 * Ob dahinter ein vorproduzierter Clip oder die Sprachausgabe des Geräts
 * steckt, entscheidet dieses Modul:
 *
 *   1. Ist `audioAssetId` gesetzt UND lässt sich daraus eine Quelle auflösen
 *      -> vorproduzierter Clip.
 *   2. Sonst -> `expo-speech` (TTS), th-TH für Thai, de-DE für Deutsch.
 *
 * In Phase 3 gibt es noch keine Clips, der Auflöser liefert also immer `null`
 * und es läuft alles über TTS. Sobald der Content-Schritt Clips erzeugt, wird
 * per `registerAudioAssetResolver` ein Auflöser eingehängt — die aufrufenden
 * Screens ändern sich dabei nicht.
 */

export type SpeechLanguage = 'th' | 'de';

const LOCALE: Record<SpeechLanguage, string> = {
  th: 'th-TH',
  de: 'de-DE',
};

/** Thai etwas langsamer, die Töne sind sonst kaum herauszuhören. */
const RATE: Record<SpeechLanguage, number> = {
  th: 0.8,
  de: 0.95,
};

export type PronunciationRequest = {
  text: string;
  language: SpeechLanguage;
  /** Verweist auf einen vorproduzierten Clip, falls vorhanden. */
  audioAssetId?: string;
};

/** Was tatsächlich abgespielt wurde — nützlich für Tests und Anzeige. */
export type PlaybackKind = 'asset' | 'tts' | 'unavailable';

/** Löst eine Asset-ID in eine abspielbare Quelle auf. */
export type AudioAssetResolver = (assetId: string) => string | null;

let resolveAudioAsset: AudioAssetResolver = () => null;

export function registerAudioAssetResolver(resolver: AudioAssetResolver): void {
  resolveAudioAsset = resolver;
}

/** Trennt die Wiedergabe von der Entscheidungslogik, damit sie testbar bleibt. */
export type PronunciationBackend = {
  playAsset(uri: string): Promise<void>;
  speak(text: string, locale: string, rate: number): Promise<void>;
  stop(): Promise<void>;
};

const defaultBackend: PronunciationBackend = {
  async playAsset(uri) {
    // `expo-audio` wird erst hier geladen, nicht beim Import des Moduls.
    // Es braucht ein natives Modul und laesst sich im Testprozess gar nicht
    // importieren; ausserdem gibt es bis zum Content-Schritt noch keine Clips,
    // dieser Zweig wird also vorerst nie betreten.
    const { createAudioPlayer } = await import('expo-audio');
    const player = createAudioPlayer({ uri });
    player.play();
  },
  async speak(text, language, rate) {
    Speech.speak(text, { language, rate });
  },
  async stop() {
    await Speech.stop();
  },
};

let backend = defaultBackend;

/** Nur für Tests. */
export function setPronunciationBackend(next: PronunciationBackend | null): void {
  backend = next ?? defaultBackend;
}

/**
 * Spielt die Aussprache ab. Eine laufende Ausgabe wird vorher abgebrochen —
 * sonst stapeln sich die Äußerungen, wenn schnell mehrfach getippt wird.
 */
export async function playPronunciation(
  request: PronunciationRequest
): Promise<PlaybackKind> {
  const text = request.text.trim();
  if (!text) return 'unavailable';

  await backend.stop().catch(() => {
    // Nichts lief, das ist kein Fehler.
  });

  const uri = request.audioAssetId ? resolveAudioAsset(request.audioAssetId) : null;
  if (uri) {
    await backend.playAsset(uri);
    return 'asset';
  }

  await backend.speak(text, LOCALE[request.language], RATE[request.language]);
  return 'tts';
}

export async function stopPronunciation(): Promise<void> {
  await backend.stop().catch(() => {});
}
