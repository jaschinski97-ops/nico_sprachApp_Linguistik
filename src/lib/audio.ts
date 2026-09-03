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
 * In Phase 3 gab es noch keine Clips, der Auflöser lieferte also immer `null`
 * und es lief alles über TTS. Seit Phase 11 hängt `lib/clips` einen
 * Auflöser ein — und zwar **über Text und Sprache**, nicht nur über eine
 * Asset-ID: die Gespräch-Seite ruft `playPronunciation({ text, language })`
 * ohne jede ID, und sie sollte dafür nicht angefasst werden. Reihenfolge:
 *
 *   1. `audioAssetId` gesetzt und auflösbar → Clip.
 *   2. Sonst: Clip zu (Sprache, Text) vorhanden → Clip.
 *   3. Sonst: `expo-speech`.
 *
 * Was abgespielt wurde, sagt der Rückgabewert (`asset` / `tts`) — die
 * Oberfläche kann damit ehrlich kennzeichnen, dass ein Clip eine
 * synthetische Stimme ist (Pflicht 4 der Phase 11).
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

/** Löst eine Asset-ID in eine abspielbare Quelle auf — synchron oder asynchron. */
export type AudioAssetResolver = (assetId: string) => string | null | Promise<string | null>;

let resolveAudioAsset: AudioAssetResolver = () => null;

export function registerAudioAssetResolver(resolver: AudioAssetResolver): void {
  resolveAudioAsset = resolver;
}

/** Findet zu (Sprache, Text) einen Clip — der Weg, den `lib/clips` benutzt. */
export type PronunciationClipLookup = (request: {
  text: string;
  language: SpeechLanguage;
}) => string | null | Promise<string | null>;

let lookupClip: PronunciationClipLookup = () => null;

export function registerPronunciationClipLookup(lookup: PronunciationClipLookup | null): void {
  lookupClip = lookup ?? (() => null);
}

/** Trennt die Wiedergabe von der Entscheidungslogik, damit sie testbar bleibt. */
export type PronunciationBackend = {
  playAsset(uri: string): Promise<void>;
  speak(text: string, locale: string, rate: number): Promise<void>;
  stop(): Promise<void>;
  /** Sprachkennungen der installierten Stimmen, z. B. `['de-DE', 'en-US']`. */
  availableLocales(): Promise<string[]>;
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
  async availableLocales() {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.map((voice) => voice.language);
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

  let uri: string | null = null;
  if (request.audioAssetId) {
    uri = await resolveAudioAsset(request.audioAssetId);
  }
  if (!uri) {
    // Ein Fehler beim Nachschlagen darf die Wiedergabe nicht verhindern -
    // dann eben TTS, wie vor Phase 11.
    uri = await Promise.resolve(lookupClip({ text, language: request.language })).catch(
      () => null
    );
  }
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

/**
 * Gibt es auf diesem Gerät eine Stimme für diese Sprache?
 *
 * Drei Antworten, nicht zwei: `true`, `false` und **`null` für „weiß ich
 * nicht"**. Das ist keine Bequemlichkeit, sondern nötig — manche Plattformen
 * liefern eine leere Stimmenliste, obwohl die Sprachausgabe funktioniert. Aus
 * einer leeren Liste „keine Thai-Stimme" zu schließen, würde die Ton-Übung
 * auf Geräten sperren, auf denen sie läuft. Gewarnt wird deshalb nur bei einem
 * eindeutigen `false`: die Liste ist da, aber die Sprache fehlt darin.
 *
 * Der Hinweis ist wichtig, weil eine fehlende Thai-Stimme keine Fehlfunktion
 * der App ist, sondern eine Systemeinstellung — ohne Erklärung bliebe die
 * Ton-Übung einfach stumm und wirkte kaputt.
 */
export async function isLanguageAvailable(
  language: SpeechLanguage
): Promise<boolean | null> {
  let locales: string[];
  try {
    locales = await backend.availableLocales();
  } catch {
    return null;
  }
  if (locales.length === 0) return null;
  const prefix = language.toLowerCase();
  return locales.some((locale) => locale.toLowerCase().startsWith(prefix));
}
