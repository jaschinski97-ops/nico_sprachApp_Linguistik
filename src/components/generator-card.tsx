import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, Spacing } from '@/constants/theme';
import { TONES } from '@/constants/tones';
import { useTheme } from '@/hooks/use-theme';
import {
  clearApiKey,
  getKeyStorageMode,
  KeyStorageMode,
  loadApiKey,
  looksLikeApiKey,
  Provider,
  saveApiKey,
} from '@/lib/api-key';
import { BatchProgress } from '@/lib/generation/batch';

/**
 * Eine Generator-Karte: Schlüsselfeld, Umfangwahl, Start/Anhalten,
 * Fortschritt, Fehlerliste, Löschen.
 *
 * Seit Phase 5 gibt es zwei Generatoren (Sprachsituationen und Bilder) mit
 * unterschiedlichen Anbietern, aber demselben Ablauf. Die Karte ist deshalb
 * hier einmal gebaut und wird zweimal benutzt — genauso, wie der Batch-Läufer
 * darunter nur einmal existiert.
 */

export type RunOption = {
  id: string;
  label: string;
  hint: string;
};

export type StartArgs = {
  optionId: string;
  apiKey: string;
  onProgress: (progress: BatchProgress) => void;
  shouldCancel: () => boolean;
};

type Props = {
  heading: string;
  description: string;
  /** Welcher Schlüssel gebraucht wird — Ablage je Anbieter getrennt. */
  provider: Provider;
  keyPlaceholder: string;
  /** Eine Zeile mit Bestand und Modell. */
  statusLine: string;
  runOptions: RunOption[];
  onStart: (args: StartArgs) => Promise<void>;
  onDelete: () => Promise<void>;
  deleteLabel: string;
  /** Löschen nur anbieten, wenn es etwas zu löschen gibt. */
  canDelete: boolean;
  /** Nach Lauf und Löschen aufgerufen, damit der Bestand neu gezählt wird. */
  onFinished: () => void | Promise<void>;
};

export function GeneratorCard({
  heading,
  description,
  provider,
  keyPlaceholder,
  statusLine,
  runOptions,
  onStart,
  onDelete,
  deleteLabel,
  canDelete,
  onFinished,
}: Props) {
  const theme = useTheme();

  const [key, setKey] = useState('');
  const [keyStored, setKeyStored] = useState(false);
  const [mode, setMode] = useState<KeyStorageMode | null>(null);
  const [runOption, setRunOption] = useState(runOptions[0].id);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cancelRef = useRef(false);

  useEffect(() => {
    (async () => {
      setMode(await getKeyStorageMode());
      setKeyStored(Boolean(await loadApiKey(provider)));
    })();
  }, [provider]);

  const onSaveKey = useCallback(async () => {
    if (!looksLikeApiKey(key)) {
      setNotice('Das sieht nicht wie ein Schlüssel aus (zu kurz oder mit Leerzeichen).');
      return;
    }
    await saveApiKey(key, provider);
    setKeyStored(true);
    setKey('');
    setNotice('Schlüssel übernommen.');
  }, [key, provider]);

  const onClearKey = useCallback(async () => {
    await clearApiKey(provider);
    setKeyStored(false);
    setKey('');
    setNotice('Schlüssel gelöscht.');
  }, [provider]);

  const start = useCallback(async () => {
    setNotice(null);
    const apiKey = key.trim() || (await loadApiKey(provider));
    if (!apiKey) {
      setNotice('Erst einen API-Schlüssel eintragen.');
      return;
    }

    cancelRef.current = false;
    setRunning(true);
    setShowErrors(false);
    try {
      await onStart({
        optionId: runOption,
        apiKey,
        onProgress: setProgress,
        shouldCancel: () => cancelRef.current,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
      await onFinished();
    }
  }, [key, provider, runOption, onStart, onFinished]);

  const stop = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const remove = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDelete();
    setConfirmDelete(false);
    setProgress(null);
    await onFinished();
    setNotice('Bestand gelöscht.');
  }, [confirmDelete, onDelete, onFinished]);

  const activeOption = runOptions.find((option) => option.id === runOption) ?? runOptions[0];

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{heading}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {description}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {statusLine}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small">API-Schlüssel</ThemedText>
        <TextInput
          value={key}
          onChangeText={setKey}
          placeholder={keyStored ? 'gespeichert — zum Ersetzen neu eingeben' : keyPlaceholder}
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
          {keyStored ? <Button label="Löschen" onPress={onClearKey} disabled={running} /> : null}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small">Umfang</ThemedText>
        <View style={styles.buttonRow}>
          {runOptions.map((option) => (
            <Button
              key={option.id}
              label={option.label}
              onPress={() => setRunOption(option.id)}
              selected={runOption === option.id}
              disabled={running}
            />
          ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {activeOption.hint}
        </ThemedText>
      </View>

      <View style={styles.buttonRow}>
        {running ? (
          <Button label="Anhalten" onPress={stop} />
        ) : (
          <Button label="Start" onPress={start} />
        )}
      </View>

      {progress ? <ProgressPanel progress={progress} /> : null}

      {progress && progress.errors.length > 0 ? (
        <>
          <Pressable
            onPress={() => setShowErrors((visible) => !visible)}
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

      {canDelete ? (
        <View style={styles.buttonRow}>
          <Button
            label={confirmDelete ? 'Wirklich alles löschen?' : deleteLabel}
            onPress={remove}
            disabled={running}
          />
        </View>
      ) : null}
    </ThemedView>
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

export function Button({
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
