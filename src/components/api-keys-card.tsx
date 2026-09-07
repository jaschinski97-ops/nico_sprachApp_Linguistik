import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedButton } from './themed-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  clearApiKey,
  getKeyStorageMode,
  KeyStorageMode,
  loadApiKey,
  looksLikeApiKey,
  saveApiKey,
} from '@/lib/api-key';
import {
  GeneratorGroupId,
  GeneratorSettings,
  loadGeneratorSettings,
  setGeneratorProvider,
} from '@/lib/providers/settings';
import { PROVIDER_INFO, providersFor, ProviderCapability, ProviderId } from '@/lib/providers/types';

/**
 * Die drei Schlüsselfelder für den Debug-Ablauf (Admin).
 *
 * BIS HIERHER: Schlüssel konnten nur im Web-Studio je Generator-Karte
 * eingetippt werden — auf einem nativen Debug-Build gab es gar kein Eingabefeld.
 * Diese Karte fasst die drei Fähigkeiten zusammen (Text, Audio, Bilder), je
 * Feld wählt man den Anbieter und legt dessen Schlüssel ab; die Wahl wird in
 * die Generator-Einstellungen der zugehörigen Gruppen übernommen, die
 * Generator-Karten im Studio zeigen sie danach von selbst.
 *
 * NUR DEBUG: In Release-Builds (`!__DEV__`) rendert die Karte nichts — es gibt
 * keinen Grund, Endnutzern ein Schlüsselfeld zu zeigen, und der Inhalt gehört
 * ohnehin pro Gerät in die sichere Ablage (`lib/api-key.ts`), nie ins Bundle.
 */

type Capability = {
  id: 'text' | 'audio' | 'images';
  label: string;
  hint: string;
  groups: GeneratorGroupId[];
  needs: ProviderCapability;
};

const CAPABILITIES: Capability[] = [
  {
    id: 'text',
    label: '1 · Text',
    hint:
      'Erzeugt Vokabeltexte, Sätze und Gesprächssituationen ' +
      '(Generator-Gruppen „Sprachsituationen" und „Prüfungsinhalte").',
    groups: ['situations', 'exam'],
    needs: 'text',
  },
  {
    id: 'audio',
    label: '2 · Audio',
    hint:
      'Vertont Vokabeln, Sätze und Übungsgespräche. Nach jedem Clip läuft ' +
      'automatisch die Tonhöhenprüfung; abgelehnte Clips werden nicht gespeichert.',
    groups: ['audio'],
    needs: 'audio',
  },
  {
    id: 'images',
    label: '3 · Bilder',
    hint: 'Erzeugt die Vokabelbilder.',
    groups: ['images'],
    needs: 'image',
  },
];

function providerLabel(provider: ProviderId): string {
  return PROVIDER_INFO[provider].vendor;
}

/** `providersFor` liefert Infoblöcke; hier nur die IDs, damit Option und Schlüsselablage dieselbe Sprache sprechen. */
function providerIdsFor(needs: ProviderCapability): ProviderId[] {
  return providersFor(needs).map((info) => info.id);
}

export function ApiKeysCard() {
  const theme = useTheme();
  const [mode, setMode] = useState<KeyStorageMode | null>(null);
  const [settings, setSettings] = useState<GeneratorSettings | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<ProviderId, string>>>({});
  const [stored, setStored] = useState<Partial<Record<ProviderId, boolean>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [keyMode, generatorSettings] = await Promise.all([
        getKeyStorageMode(),
        loadGeneratorSettings(),
      ]);
      if (cancelled) return;
      setMode(keyMode);
      setSettings(generatorSettings);
      const relevant = new Set<ProviderId>();
      for (const capability of CAPABILITIES) {
        for (const provider of providerIdsFor(capability.needs)) relevant.add(provider);
      }
      const nextStored: Partial<Record<ProviderId, boolean>> = {};
      for (const provider of relevant) nextStored[provider] = Boolean(await loadApiKey(provider));
      if (!cancelled) setStored(nextStored);
    })().catch(() => {
      // Ohne Speicher bleibt die Karte leer; die Generator-Karten melden es eh.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentProvider = (capability: Capability): ProviderId => {
    const options = providerIdsFor(capability.needs);
    const group = settings?.[capability.groups[0]];
    return group && options.includes(group.provider) ? group.provider : options[0];
  };

  const onSelectProvider = useCallback(
    async (capability: Capability, provider: ProviderId) => {
      if (busy) return;
      setBusy(true);
      setStatus(null);
      try {
        let next = settings;
        for (const group of capability.groups) {
          next = await setGeneratorProvider(group, provider);
        }
        setSettings(next);
        const keyStored = Boolean(await loadApiKey(provider));
        setStored((prev) => ({ ...prev, [provider]: keyStored }));
        setStatus(
          `${capability.label}: Anbieter ${providerLabel(provider)} für ${capability.groups.length} Gruppe(n) gesetzt.`
        );
      } catch (error) {
        setStatus(`Das ist schiefgegangen: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setBusy(false);
      }
    },
    [busy, settings]
  );

  const onSave = useCallback(
    async (capability: Capability, provider: ProviderId) => {
      if (busy) return;
      const key = (drafts[provider] ?? '').trim();
      if (!key) {
        setStatus('Das Feld ist leer — zum Entfernen eines Schlüssels „Löschen" nutzen.');
        return;
      }
      if (!looksLikeApiKey(key)) {
        setStatus('Das sieht nicht nach einem Schlüssel aus: mindestens 20 Zeichen, keine Leerzeichen.');
        return;
      }
      setBusy(true);
      setStatus(null);
      try {
        await saveApiKey(key, provider);
        setDrafts((prev) => ({ ...prev, [provider]: '' }));
        setStored((prev) => ({ ...prev, [provider]: true }));
        setStatus(`${capability.label}: Schlüssel für ${providerLabel(provider)} gespeichert.`);
      } catch (error) {
        setStatus(`Das ist schiefgegangen: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setBusy(false);
      }
    },
    [busy, drafts]
  );

  const onClear = useCallback(async (capability: Capability, provider: ProviderId) => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      await clearApiKey(provider);
      setDrafts((prev) => ({ ...prev, [provider]: '' }));
      setStored((prev) => ({ ...prev, [provider]: false }));
      setStatus(`${capability.label}: Schlüssel für ${providerLabel(provider)} gelöscht.`);
    } catch (error) {
      setStatus(`Das ist schiefgegangen: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  if (!__DEV__) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">API-Schlüssel (Debug)</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Drei Felder für den Inhalt-Ablauf: Anbieter wählen, Schlüssel eintippen, speichern.
        Die Wahl gilt für die zugehörigen Generator-Gruppen; im Web-Studio kannst du
        weiterhin pro Lauf abweichend wählen.
      </ThemedText>

      {CAPABILITIES.map((capability) => {
        const provider = currentProvider(capability);
        return (
          <View key={capability.id} style={styles.field}>
            <ThemedText type="small">{capability.label}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {capability.hint}
            </ThemedText>
            <View style={styles.chipRow} accessibilityRole="radiogroup">
              {providerIdsFor(capability.needs).map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: option === provider }}
                  disabled={busy}
                  onPress={() => {
                    void onSelectProvider(capability, option);
                  }}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView
                    type={option === provider ? 'backgroundSelected' : 'background'}
                    style={[styles.chip, option === provider && { borderColor: theme.accent }]}>
                    <ThemedText type="small">{providerLabel(option)}</ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={drafts[provider] ?? ''}
              onChangeText={(value) => setDrafts((prev) => ({ ...prev, [provider]: value }))}
              placeholder={
                stored[provider]
                  ? 'gespeichert — zum Ersetzen neu eingeben'
                  : PROVIDER_INFO[provider].keyPlaceholder
              }
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
            />
            <View style={styles.buttonRow}>
              <ThemedButton
                label="Schlüssel speichern"
                disabled={busy}
                onPress={() => {
                  void onSave(capability, provider);
                }}
              />
              {stored[provider] ? (
                <ThemedButton
                  label="Löschen"
                  disabled={busy}
                  onPress={() => {
                    void onClear(capability, provider);
                  }}
                />
              ) : null}
            </View>
          </View>
        );
      })}

      <ThemedText type="small" themeColor="textSecondary">
        {mode === 'secure-store'
          ? 'Schlüssel liegen verschlüsselt auf diesem Gerät (Keychain/Keystore) und überstehen Neustarts. Sie werden nie mit der App ausgeliefert.'
          : mode === 'session-only'
            ? 'Diese Umgebung hat keine sichere Ablage — Schlüssel bleiben nur für diese Sitzung im Arbeitsspeicher und sind nach dem Neuladen weg. Das ist Absicht (AE-10).'
            : 'Ablage wird geprüft …'}
      </ThemedText>
      {status ? (
        <ThemedText type="small" themeColor="textSecondary">
          {status}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    gap: Spacing.two,
    borderRadius: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
