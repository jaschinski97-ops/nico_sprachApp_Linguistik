import { readMeta, writeMeta } from '../repository';
import { DataStore } from '../storage';

import {
  isProviderId,
  PROVIDER_INFO,
  ProviderCapability,
  ProviderId,
  providersFor,
} from './types';

/**
 * Welcher Anbieter und welches Modell je Generator-Gruppe (Phase 10).
 *
 * DREI GRUPPEN, NICHT EINE EINSTELLUNG FÜR ALLES. Wer Dialoge von Claude und
 * Bilder von Gemini haben will, soll das können — und muss es sogar, weil
 * Claude überhaupt keine Bilder erzeugt. Eine einzige App-weite Anbieterwahl
 * hätte genau diese Kombination unmöglich gemacht.
 *
 * ABGELEGT IN DER SAMMLUNG `meta`, neben dem Lernprofil aus AE-17 — dieselbe
 * Stelle, die seit Phase 1 für „Einstellungen, Lernprofil, Zähler" vorgesehen
 * ist. **Ohne Schlüssel**: die Wahl ist eine Vorliebe, keine Geheimnis; die
 * Schlüssel liegen weiterhin getrennt und je Anbieter nach AE-10.
 *
 * NACHSICHTIG GELESEN wie das Lernprofil und die Dokumente an der Lesegrenze
 * (AE-25): Eine gespeicherte Einstellung aus einer älteren Version kann einen
 * Anbieter nennen, den es nicht mehr gibt, oder einen, der die verlangte
 * Fähigkeit gar nicht hat. Beides ergibt den Standard der Gruppe statt eines
 * Absturzes — Einstellungen sind kein Grund, eine App unbenutzbar zu machen.
 */

const SETTINGS_KEY = 'generators';

export const GENERATOR_GROUPS = ['situations', 'exam', 'images', 'audio'] as const;
export type GeneratorGroupId = (typeof GENERATOR_GROUPS)[number];

export type GeneratorGroupInfo = {
  id: GeneratorGroupId;
  label: string;
  needs: ProviderCapability;
  defaultProvider: ProviderId;
};

export const GENERATOR_GROUP_INFO: Record<GeneratorGroupId, GeneratorGroupInfo> = {
  situations: {
    id: 'situations',
    label: 'Sprachsituationen',
    needs: 'text',
    // Der Bestand aus Phase 4. Die Voreinstellung zu wechseln waere eine
    // stille Verhaltensaenderung fuer alle, die nichts umstellen.
    defaultProvider: 'claude',
  },
  exam: {
    id: 'exam',
    label: 'Prüfungsinhalte',
    needs: 'text',
    defaultProvider: 'claude',
  },
  images: {
    id: 'images',
    label: 'Bilder',
    needs: 'image',
    // Der Bestand aus Phase 5 (AE-13).
    defaultProvider: 'stability',
  },
  audio: {
    id: 'audio',
    label: 'Hörclips',
    needs: 'audio',
    // Kein Bestand, also die Wahl nach Messung: Gemini kam zuerst aus dem
    // Browser durch (AE-31); ChatGPT folgte mit der Nachmessung vom
    // 08.09.2026 (CORS-Header, siehe types.ts). Der Bestand bleibt bei
    // Gemini — ein Default wandert nicht still mit.
    defaultProvider: 'gemini',
  },
};

export type GeneratorChoice = {
  provider: ProviderId;
  /** Nur bei Sprachausgabe: die Stimme des Anbieters. Freitext wie das Modell. */
  voice?: string;
  /**
   * Freitext. **Nicht validiert** (Pflicht 5): Modellnamen wechseln zu oft,
   * um sie einzufrieren, und ein Katalog im Code wäre schon beim nächsten
   * Modellwechsel falsch — dann aber auf die schlimmste Art, nämlich indem er
   * ein gültiges Modell ablehnt.
   */
  model: string;
};

export type GeneratorSettings = Record<GeneratorGroupId, GeneratorChoice>;

export function defaultModelFor(provider: ProviderId, needs: ProviderCapability): string {
  return PROVIDER_INFO[provider].modelPlaceholder[needs];
}

export function defaultVoiceFor(provider: ProviderId): string {
  return PROVIDER_INFO[provider].voicePlaceholder;
}

export function defaultChoiceFor(group: GeneratorGroupId): GeneratorChoice {
  const info = GENERATOR_GROUP_INFO[group];
  const choice: GeneratorChoice = {
    provider: info.defaultProvider,
    model: defaultModelFor(info.defaultProvider, info.needs),
  };
  if (info.needs === 'audio') choice.voice = defaultVoiceFor(info.defaultProvider);
  return choice;
}

export function defaultSettings(): GeneratorSettings {
  return {
    situations: defaultChoiceFor('situations'),
    exam: defaultChoiceFor('exam'),
    images: defaultChoiceFor('images'),
    audio: defaultChoiceFor('audio'),
  };
}

/** Welche Anbieter für diese Gruppe überhaupt in Frage kommen. */
export function providersForGroup(group: GeneratorGroupId) {
  return providersFor(GENERATOR_GROUP_INFO[group].needs);
}

/**
 * Macht aus einem gespeicherten Wert eine brauchbare Wahl — oder dem Standard.
 *
 * Ein leeres Modellfeld ist ausdrücklich **kein** Fehler: Wer das Feld leert,
 * will den Vorschlag des Anbieters, nicht eine Fehlermeldung.
 */
export function normalizeChoice(raw: unknown, group: GeneratorGroupId): GeneratorChoice {
  const info = GENERATOR_GROUP_INFO[group];
  const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  const provider =
    isProviderId(value.provider) && PROVIDER_INFO[value.provider].can[info.needs]
      ? value.provider
      : info.defaultProvider;

  const model =
    typeof value.model === 'string' && value.model.trim() !== ''
      ? value.model.trim()
      : defaultModelFor(provider, info.needs);

  const choice: GeneratorChoice = { provider, model };
  if (info.needs === 'audio') {
    choice.voice =
      typeof value.voice === 'string' && value.voice.trim() !== ''
        ? value.voice.trim()
        : defaultVoiceFor(provider);
  }
  return choice;
}

export async function loadGeneratorSettings(store?: DataStore): Promise<GeneratorSettings> {
  const stored = await readMeta<Record<string, unknown>>(SETTINGS_KEY, {}, store);
  return {
    situations: normalizeChoice(stored?.situations, 'situations'),
    exam: normalizeChoice(stored?.exam, 'exam'),
    images: normalizeChoice(stored?.images, 'images'),
    audio: normalizeChoice(stored?.audio, 'audio'),
  };
}

export async function setGeneratorChoice(
  group: GeneratorGroupId,
  choice: Partial<GeneratorChoice>,
  store?: DataStore
): Promise<GeneratorSettings> {
  const current = await loadGeneratorSettings(store);
  const merged = normalizeChoice({ ...current[group], ...choice }, group);
  const next: GeneratorSettings = { ...current, [group]: merged };
  await writeMeta(SETTINGS_KEY, next, store);
  return next;
}

/**
 * Anbieter wechseln — und dabei den Modellnamen mitziehen.
 *
 * Der bisherige Name gehört dem alten Anbieter: `claude-opus-5` an Gemini zu
 * schicken ergibt nur einen Fehlschlag, den niemand sofort mit dem Wechsel in
 * Verbindung bringt. Deshalb setzt ein Anbieterwechsel den Vorschlag des neuen
 * Anbieters ein. Wer einen eigenen Namen eingetragen hatte, tippt ihn neu —
 * das ist der seltenere Fall und der offensichtlichere Verlust.
 */
export async function setGeneratorProvider(
  group: GeneratorGroupId,
  provider: ProviderId,
  store?: DataStore
): Promise<GeneratorSettings> {
  return setGeneratorChoice(
    group,
    {
      provider,
      model: defaultModelFor(provider, GENERATOR_GROUP_INFO[group].needs),
      voice: defaultVoiceFor(provider),
    },
    store
  );
}
