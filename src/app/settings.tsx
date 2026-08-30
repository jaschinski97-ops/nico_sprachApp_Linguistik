import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PlaceholderCard } from '@/components/placeholder-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { TONES } from '@/constants/tones';
import {
  clearApiKey,
  getKeyStorageMode,
  KeyStorageMode,
  loadApiKey,
  looksLikeApiKey,
  saveApiKey,
} from '@/lib/api-key';
import { BatchProgress, runGenerationBatch } from '@/lib/conversation/batch';
import { createAnthropicClient, GENERATOR_MODEL } from '@/lib/conversation/generator';
import { FULL_RUN, planSituations } from '@/lib/conversation/plan';
import { clearSituations, countSituations } from '@/lib/repository';
import { useTheme } from '@/hooks/use-theme';

type RunSize = 'test' | 'full';

const RUN_SIZES: { id: RunSize; label: string; hint: string; variants: number }[] = [
  {
    id: 'test',
    label: 'Probelauf',
    hint: '16 Situationen — alle Themen, Niveaus und Richtungen je einmal',
    variants: 1,
  },
  {
    id: 'full',
    label: 'Vollständiger Lauf',
    hint: `${planSituations(FULL_RUN).length} Situationen — kostet echtes Geld und dauert`,
    variants: FULL_RUN.variantsPerCombo!,
  },
];

export default function SettingsScreen() {
  const theme = useTheme();

  const [key, setKey] = useState('');
  const [keyStored, setKeyStored] = useState(false);
  const [mode, setMode] = useState<KeyStorageMode | null>(null);
  const [stored, setStored] = useState<number | null>(null);
  const [runSize, setRunSize] = useState<RunSize>('test');
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cancelRef = useRef(false);

  const refreshCount = useCallback(async () => {
    setStored(await countSituations());
  }, []);

  useEffect(() => {
    (async () => {
      setMode(await getKeyStorageMode());
      setKeyStored(Boolean(await loadApiKey()));
      await refreshCount();
    })();
  }, [refreshCount]);

  const onSaveKey = useCallback(async () => {
    if (!looksLikeApiKey(key)) {
      setNotice('Das sieht nicht wie ein Schlüssel aus (zu kurz oder mit Leerzeichen).');
      return;
    }
    await saveApiKey(key);
    setKeyStored(true);
    setKey('');
    setNotice('Schlüssel übernommen.');
  }, [key]);

  const onClearKey = useCallback(async () => {
    await clearApiKey();
    setKeyStored(false);
    setKey('');
    setNotice('Schlüssel gelöscht.');
  }, []);

  const onStart = useCallback(async () => {
    setNotice(null);
    const apiKey = key.trim() || (await loadApiKey());
    if (!apiKey) {
      setNotice('Erst einen API-Schlüssel eintragen.');
      return;
    }

    const variants = RUN_SIZES.find((r) => r.id === runSize)!.variants;
    const specs = planSituations({ variantsPerCombo: variants });

    cancelRef.current = false;
    setRunning(true);
    setShowErrors(false);
    try {
      await runGenerationBatch({
        specs,
        client: createAnthropicClient(apiKey),
        onProgress: setProgress,
        shouldCancel: () => cancelRef.current,
        // Kleine Pause zwischen den Aufrufen, damit ein langer Lauf nicht
        // unnötig ins Rate-Limit rennt.
        delayMs: 400,
      });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      await refreshCount();
    }
  }, [key, runSize, refreshCount]);

  const onStop = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const onDeleteAll = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await clearSituations();
    setConfirmDelete(false);
    setProgress(null);
    await refreshCount();
    setNotice('Alle Situationen gelöscht.');
  }, [confirmDelete, refreshCount]);

  return (
    <ScreenScaffold title="Einstellungen" subtitle="Inhalte erzeugen, API-Schlüssel">
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Generator: Sprachsituationen</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Dialoge werden einmalig erzeugt und lokal gespeichert. Danach
          funktioniert das Üben ohne Internet und ohne Schlüssel — es gibt
          bewusst keinen Live-Chat.
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary">
          Im Speicher: {stored === null ? '…' : `${stored} Situationen`} · Modell{' '}
          {GENERATOR_MODEL}
        </ThemedText>

        <View style={styles.field}>
          <ThemedText type="small">API-Schlüssel</ThemedText>
          <TextInput
            value={key}
            onChangeText={setKey}
            placeholder={keyStored ? 'gespeichert — zum Ersetzen neu eingeben' : 'sk-ant-…'}
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              { color: theme.text, borderColor: Colors.dark.backgroundSelected },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {mode === 'secure-store'
              ? 'Wird verschlüsselt auf dem Gerät abgelegt (Keychain/Keystore) und übersteht Neustarts.'
              : mode === 'session-only'
                ? 'Im Browser gibt es keine sichere Ablage — der Schlüssel bleibt nur für diese Sitzung im Arbeitsspeicher und ist nach dem Neuladen weg. Das ist Absicht (AE-10).'
                : '…'}
          </ThemedText>
          <View style={styles.buttonRow}>
            <Button label="Schlüssel übernehmen" onPress={onSaveKey} disabled={running} />
            {keyStored ? (
              <Button label="Löschen" onPress={onClearKey} disabled={running} />
            ) : null}
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText type="small">Umfang</ThemedText>
          <View style={styles.buttonRow}>
            {RUN_SIZES.map((size) => (
              <Button
                key={size.id}
                label={size.label}
                onPress={() => setRunSize(size.id)}
                selected={runSize === size.id}
                disabled={running}
              />
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {RUN_SIZES.find((r) => r.id === runSize)!.hint}
          </ThemedText>
        </View>

        <View style={styles.buttonRow}>
          {running ? (
            <Button label="Anhalten" onPress={onStop} />
          ) : (
            <Button label="Start" onPress={onStart} />
          )}
        </View>

        {progress ? <ProgressPanel progress={progress} /> : null}

        {progress && progress.errors.length > 0 ? (
          <>
            <Pressable
              onPress={() => setShowErrors((v) => !v)}
              accessibilityRole="button"
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="small" themeColor="textSecondary">
                {showErrors ? '▲' : '▼'} {progress.errors.length} Fehlschläge anzeigen
              </ThemedText>
            </Pressable>
            {showErrors
              ? progress.errors.slice(0, 20).map((error) => (
                  <ThemedText key={error.id} type="small" themeColor="textSecondary">
                    {error.id}: {error.message}
                  </ThemedText>
                ))
              : null}
          </>
        ) : null}

        {notice ? (
          <ThemedText type="small" themeColor="textSecondary">
            {notice}
          </ThemedText>
        ) : null}

        {stored && stored > 0 ? (
          <View style={styles.buttonRow}>
            <Button
              label={confirmDelete ? 'Wirklich alle löschen?' : 'Alle Situationen löschen'}
              onPress={onDeleteAll}
              disabled={running}
            />
          </View>
        ) : null}
      </ThemedView>

      <PlaceholderCard
        phase="Phase 5"
        heading="Generator: Bilder"
        body="Gleiches Prinzip, aber nur für konkrete Vokabeln (isConcrete). Abstrakte Wörter und Partikel bekommen bewusst kein Bild."
      />
    </ScreenScaffold>
  );
}

function ProgressPanel({ progress }: { progress: BatchProgress }) {
  const pct = progress.total === 0 ? 0 : Math.round((progress.processed / progress.total) * 100);

  return (
    <View style={styles.field}>
      <ThemedText type="small">
        {progress.processed} / {progress.total}
        {progress.cancelled ? ' — angehalten' : progress.done ? ' — fertig' : ''}
      </ThemedText>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: TONES.mid.color }]} />
      </View>

      {/* Erfolge und Fehler bewusst getrennt: eine Gesamtzahl würde einen
          teilweise misslungenen Lauf wie einen gelungenen aussehen lassen. */}
      <View style={styles.counters}>
        <Counter label="Erzeugt" value={progress.ok} color={TONES.mid.color} />
        <Counter label="Fehlgeschlagen" value={progress.failed} color={TONES.falling.color} />
        <Counter label="Übersprungen" value={progress.skipped} color={TONES.low.color} />
      </View>

      {progress.current ? (
        <ThemedText type="small" themeColor="textSecondary">
          gerade: {progress.current}
        </ThemedText>
      ) : null}
    </View>
  );
}

function Counter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.counter}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function Button({
  label,
  onPress,
  disabled,
  selected,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(selected) }}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}>
      <ThemedView
        type={selected ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.button, selected && styles.buttonSelected]}>
        <ThemedText type="small">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  buttonSelected: {
    borderWidth: 1,
    borderColor: TONES.mid.color,
  },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: 'rgba(127,127,127,0.25)',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  counters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
