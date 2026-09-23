import { Platform } from 'react-native';

/**
 * Normale Wiedergabe-Audiositzung der App.
 *
 * WARUM ÜBERHAUPT: Ohne ausdrückliche Einstellung läuft iOS in der
 * Kategorie `soloAmbient` — der Stumm-Schalter macht dann jede Aussprache
 * unhörbar. Außerdem stellt `AudioStream.start()` (expo-audio 57) die
 * Sitzung auf `.record`/`.measurement` und setzt sie beim Stopp NICHT
 * zurück: Nach einer Aufnahme blieben Clips und Gerätestimme stumm, bis die
 * App neu startet. Diese Funktion ist der eine Rückweg in den
 * Wiedergabemodus — beim App-Start und nach jeder Mikrofonaufnahme.
 *
 * Fehler werden bewusst geschluckt: Eine nicht umstellbare Sitzung darf
 * weder den Start noch das Beenden einer Aufnahme blockieren.
 */
export const PLAYBACK_AUDIO_MODE = { allowsRecording: false, playsInSilentMode: true } as const;

export async function restorePlaybackAudioMode(): Promise<void> {
  // Im Browser gibt es keine Audiositzung; die Web-Aufnahme nutzt Web Audio.
  if (Platform.OS === 'web') return;
  try {
    const { setAudioModeAsync } = require('expo-audio') as typeof import('expo-audio');
    await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
  } catch {
    // Siehe oben: nie blockieren.
  }
}
