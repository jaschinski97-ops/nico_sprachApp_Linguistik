import * as SecureStore from 'expo-secure-store';

/**
 * Ablage des API-Schlüssels.
 *
 * NACHGEPRÜFT, NICHT ANGENOMMEN (AE-10): `expo-secure-store@57.0.2` hat auf
 * Web **gar keine** Implementierung — `src/ExpoSecureStore.web.ts` besteht
 * aus `export default {}`. Entsprechend liefert `isAvailableAsync()` dort
 * `false` (es prüft `!!ExpoSecureStore.getValueWithKeyAsync`), und ein Aufruf
 * von `setItemAsync` würde mit „is not a function" scheitern.
 *
 * Daraus folgt:
 * - **Nativ (iOS/Android):** Schlüssel liegt im Keychain/Keystore und
 *   übersteht Neustarts.
 * - **Web:** Schlüssel wird **nur im Arbeitsspeicher** gehalten, für die
 *   laufende Sitzung. Nach dem Neuladen muss er erneut eingegeben werden.
 *   Bewusst NICHT in `localStorage`: das wäre für jedes Skript derselben
 *   Herkunft lesbar und bliebe dauerhaft liegen — für einen API-Schlüssel,
 *   der echtes Geld ausgibt, ein schlechter Tausch gegen etwas Bequemlichkeit.
 *   Beim späteren WordPress-Einbau (Phase 8) wäre es noch schlechter.
 *
 * Die Weiche stellt `isAvailableAsync()` zur Laufzeit, nicht `Platform.OS` —
 * so verhält sich der Code richtig, falls eine Plattform die sichere Ablage
 * unerwartet nicht anbietet.
 */

const KEY_NAME = 'anthropic-api-key';

/** Nur für die laufende Sitzung, wenn keine sichere Ablage vorhanden ist. */
let sessionOnlyKey: string | null = null;

export type KeyStorageMode = 'secure-store' | 'session-only';

let cachedMode: KeyStorageMode | null = null;

export async function getKeyStorageMode(): Promise<KeyStorageMode> {
  if (cachedMode) return cachedMode;
  let available = false;
  try {
    available = await SecureStore.isAvailableAsync();
  } catch {
    available = false;
  }
  cachedMode = available ? 'secure-store' : 'session-only';
  return cachedMode;
}

export async function loadApiKey(): Promise<string | null> {
  if ((await getKeyStorageMode()) === 'session-only') {
    return sessionOnlyKey;
  }
  try {
    return await SecureStore.getItemAsync(KEY_NAME);
  } catch {
    return null;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if ((await getKeyStorageMode()) === 'session-only') {
    sessionOnlyKey = trimmed || null;
    return;
  }
  if (!trimmed) {
    await clearApiKey();
    return;
  }
  await SecureStore.setItemAsync(KEY_NAME, trimmed);
}

export async function clearApiKey(): Promise<void> {
  sessionOnlyKey = null;
  if ((await getKeyStorageMode()) === 'session-only') return;
  try {
    await SecureStore.deleteItemAsync(KEY_NAME);
  } catch {
    // Nichts gespeichert - kein Fehler.
  }
}

/** Nur für Tests. */
export function resetKeyStorageForTests(): void {
  sessionOnlyKey = null;
  cachedMode = null;
}

/**
 * Grobe Formprüfung, damit ein offensichtlicher Tippfehler nicht erst nach
 * einem fehlgeschlagenen Netzwerkaufruf auffällt. Bewusst nachsichtig: das
 * Format der Schlüssel gehört uns nicht und kann sich ändern.
 */
export function looksLikeApiKey(key: string): boolean {
  const trimmed = key.trim();
  return trimmed.length >= 20 && !/\s/.test(trimmed);
}
