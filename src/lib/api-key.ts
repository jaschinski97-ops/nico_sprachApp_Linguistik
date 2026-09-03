import * as SecureStore from 'expo-secure-store';

import { PROVIDERS, ProviderId } from './providers/types';

/**
 * Ablage der API-Schlüssel.
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
 *
 * SEIT PHASE 5 MEHRERE ANBIETER: Anthropic erzeugte die Sprachsituationen,
 * Stability AI die Bilder (AE-13). Die Schlüssel liegen getrennt und nach genau
 * demselben Muster — ein gemeinsamer Schlüssel wäre schon deshalb falsch,
 * weil die Läufe unabhängig voneinander gestartet werden können und niemand
 * einen Schlüssel eintippen soll, den er gar nicht braucht.
 *
 * SEIT PHASE 10 SIND ES VIER (Pflicht 4). Am Muster ändert das nichts: nativ
 * Keychain, im Web nur Arbeitsspeicher für die Sitzung, Weiche über
 * `isAvailableAsync()`. Es gilt jetzt **je Anbieter** statt einmalig — die
 * Liste der Anbieter kommt aus `providers/types.ts`, damit es nicht zwei
 * Wahrheiten darüber gibt, welche es gibt.
 *
 * DER ABLAGENAME FÜR CLAUDE BLEIBT `anthropic-api-key`. Er heißt seit Phase 4
 * so und liegt auf den Geräten der Nutzer im Keychain; ihn zur Sauberkeit
 * umzubenennen, würde einen dort gespeicherten Schlüssel unauffindbar machen —
 * die App fragte kommentarlos erneut danach, und der alte Eintrag bliebe für
 * immer liegen.
 */

export type Provider = ProviderId;
export { PROVIDERS };

const KEY_NAMES: Record<Provider, string> = {
  claude: 'anthropic-api-key',
  chatgpt: 'openai-api-key',
  gemini: 'gemini-api-key',
  stability: 'stability-api-key',
};

/** Nur für die laufende Sitzung, wenn keine sichere Ablage vorhanden ist. */
const sessionOnlyKeys: Record<Provider, string | null> = {
  claude: null,
  chatgpt: null,
  gemini: null,
  stability: null,
};

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

export async function loadApiKey(provider: Provider): Promise<string | null> {
  if ((await getKeyStorageMode()) === 'session-only') {
    return sessionOnlyKeys[provider];
  }
  try {
    return await SecureStore.getItemAsync(KEY_NAMES[provider]);
  } catch {
    return null;
  }
}

export async function saveApiKey(key: string, provider: Provider): Promise<void> {
  const trimmed = key.trim();
  if ((await getKeyStorageMode()) === 'session-only') {
    sessionOnlyKeys[provider] = trimmed || null;
    return;
  }
  if (!trimmed) {
    await clearApiKey(provider);
    return;
  }
  await SecureStore.setItemAsync(KEY_NAMES[provider], trimmed);
}

export async function clearApiKey(provider: Provider): Promise<void> {
  sessionOnlyKeys[provider] = null;
  if ((await getKeyStorageMode()) === 'session-only') return;
  try {
    await SecureStore.deleteItemAsync(KEY_NAMES[provider]);
  } catch {
    // Nichts gespeichert - kein Fehler.
  }
}

/** Nur für Tests. */
export function resetKeyStorageForTests(): void {
  for (const provider of PROVIDERS) sessionOnlyKeys[provider] = null;
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
