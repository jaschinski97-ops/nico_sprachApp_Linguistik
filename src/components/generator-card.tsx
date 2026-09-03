import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, Spacing } from '@/constants/theme';

import { useTheme, useToneColor } from '@/hooks/use-theme';
import {
  clearApiKey,
  getKeyStorageMode,
  KeyStorageMode,
  loadApiKey,
  looksLikeApiKey,
  saveApiKey,
} from '@/lib/api-key';
import { BatchProgress } from '@/lib/generation/batch';
import {
  GeneratorChoice,
  GeneratorGroupId,
  GENERATOR_GROUP_INFO,
  providersForGroup,
} from '@/lib/providers/settings';
import { PROVIDER_INFO, ProviderId } from '@/lib/providers/types';

/**
 * Eine Generator-Karte: Anbieterwahl, Modellfeld, Schlüsselfeld, Umfangwahl,
 * Start/Anhalten, Fortschritt, Fehlerliste, Löschen.
 *
 * Seit Phase 5 gibt es mehrere Generatoren mit unterschiedlichen Anbietern,
 * aber demselben Ablauf. Die Karte ist deshalb hier einmal gebaut und wird
 * dreimal benutzt — genauso, wie der Batch-Läufer darunter nur einmal
 * existiert.
 *
 * WARUM DIE ANBIETERWAHL EINE KNOPFREIHE IST UND KEIN AUFKLAPPFELD: Die
 * Vorgabe von Phase 10 sagt „Dropdown". React Native hat kein plattformweites
 * Aufklappfeld — ein echtes bräuchte eine zusätzliche Abhängigkeit oder eine
 * eigene Umsetzung je Plattform, und `@expo/ui` ist nativ-only, also im
 * Web-Build (der einzigen bisher prüfbaren Umgebung, B-2) nicht zu gebrauchen.
 * Bei drei bis vier Möglichkeiten ist eine Reihe ohnehin die bessere Bedienung:
 * alles ist gleichzeitig sichtbar, es braucht einen Tipp statt zwei, und es
 * ist genau das Muster, das in dieser App schon für Umfang und Lernrichtung
 * benutzt und in Phase 9 auf Tippziele, Fokus und Beschriftung geprüft wurde.
 *
 * DER SCHLÜSSEL HÄNGT AM ANBIETER, nicht an der Karte: Wer von Claude auf
 * Gemini umstellt, sieht sofort das Schlüsselfeld für Gemini — und der
 * Claude-Schlüssel bleibt liegen, wo er war (AE-10, jetzt je Anbieter).
 */

export type RunOption = {
  id: string;
  label: string;
  hint: string;
};

export type StartArgs = {
  optionId: string;
  apiKey: string;
  provider: ProviderId;
  /** Freitext aus dem Modellfeld — ungeprüft, siehe Pflicht 5. */
  model: string;
  onProgress: (progress: BatchProgress) => void;
  shouldCancel: () => boolean;
};

type Props = {
  heading: string;
  description: string;
  /** Welche Generator-Gruppe — bestimmt, welche Anbieter überhaupt taugen. */
  group: GeneratorGroupId;
  /** Aktuell gewählter Anbieter und Modellname. */
  choice: GeneratorChoice;
  /** Wird beim Umstellen aufgerufen und legt die Wahl dauerhaft ab. */
  onChoiceChange: (change: Partial<GeneratorChoice>) => void | Promise<void>;
  /** Eine Zeile mit Bestand. */
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
  group,
  choice,
  onChoiceChange,
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

  const groupInfo = GENERATOR_GROUP_INFO[group];
  const provider = choice.provider;
  const providerInfo = PROVIDER_INFO[provider];
  const choices = providersForGroup(group);

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
        provider,
        // Leeres Feld heisst „nimm den Vorschlag" - kein Grund fuer eine
        // Fehlermeldung, und geprueft wird der Name ohnehin nicht (Pflicht 5).
        model: choice.model.trim() || providerInfo.modelPlaceholder[groupInfo.needs],
        onProgress: setProgress,
        shouldCancel: () => cancelRef.current,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
      await onFinished();
    }
  }, [key, provider, providerInfo, groupInfo, choice.model, runOption, onStart, onFinished]);

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
        <ThemedText type="small">Anbieter</ThemedText>
        <ChoiceRow label={`Anbieter für ${heading}`}>
          {choices.map((info) => (
            <Button
              key={info.id}
              label={info.label}
              onPress={() => onChoiceChange({ provider: info.id })}
              selected={provider === info.id}
              disabled={running}
            />
          ))}
        </ChoiceRow>
        <ThemedText type="small" themeColor="textSecondary">
          {providerInfo.label === providerInfo.vendor
            ? `${providerInfo.label}: Schlüssel von ${providerInfo.keySource}.`
            : `${providerInfo.label} kommt von ${providerInfo.vendor}; Schlüssel von ${providerInfo.keySource}.`}
          {' '}
          Zur Auswahl stehen nur Anbieter, die {groupInfo.needs === 'image' ? 'Bilder' : 'Text'}{' '}
          erzeugen — Claude kann keine Bilder, Stability AI keinen Text.
        </ThemedText>
        {/* Nur im Web: nativ gibt es kein CORS, dort gilt der Hinweis nicht. */}
        {Platform.OS === 'web' && providerInfo.webWarning ? (
          <ThemedView type="backgroundSelected" style={styles.warning}>
            <ThemedText type="small">⚠ {providerInfo.webWarning}</ThemedText>
          </ThemedView>
        ) : null}
      </View>

      <View style={styles.field}>
        <ThemedText type="small">Modell</ThemedText>
        <TextInput
          value={choice.model}
          onChangeText={(value) => onChoiceChange({ model: value })}
          placeholder={providerInfo.modelPlaceholder[groupInfo.needs]}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!running}
          accessibilityLabel={`Modellname für ${heading}`}
          style={[styles.input, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Freitext, bewusst ohne Prüfung: Modellnamen wechseln zu oft, um sie in
          der App festzuschreiben. Leer lassen nimmt „
          {providerInfo.modelPlaceholder[groupInfo.needs]}".
          {provider === 'gemini'
            ? ' Bei Gemini ist ein Tippfehler im Namen nicht vom falschen Schlüssel zu unterscheiden — die API meldet beides als „API key not valid" (gemessen, AE-26).'
            : ''}
        </ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText type="small">API-Schlüssel für {providerInfo.vendor}</ThemedText>
        <TextInput
          value={key}
          onChangeText={setKey}
          placeholder={
            keyStored ? 'gespeichert — zum Ersetzen neu eingeben' : providerInfo.keyPlaceholder
          }
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
            ? `Wird verschlüsselt auf dem Gerät abgelegt (Keychain/Keystore) und übersteht Neustarts. Jeder Anbieter hat seinen eigenen Platz — der Wechsel hierüber löscht keinen anderen Schlüssel.`
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
        <ChoiceRow label={`Umfang für ${heading}`}>
          {runOptions.map((option) => (
            <Button
              key={option.id}
              label={option.label}
              onPress={() => setRunOption(option.id)}
              selected={runOption === option.id}
              disabled={running}
            />
          ))}
        </ChoiceRow>
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
            accessibilityLabel={`${progress.errors.length} Fehlschläge anzeigen`}
            accessibilityState={{ expanded: showErrors }}
            style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
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
  const toneColor = useToneColor();
  const pct = progress.total === 0 ? 0 : Math.round((progress.processed / progress.total) * 100);

  return (
    <View style={styles.field}>
      <ThemedText type="small">
        {progress.processed} / {progress.total}
        {progress.cancelled ? ' — angehalten' : progress.done ? ' — fertig' : ''}
      </ThemedText>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: toneColor('mid') }]} />
      </View>

      {/* Erfolge und Fehler bewusst getrennt: eine Gesamtzahl würde einen
          teilweise misslungenen Lauf wie einen gelungenen aussehen lassen. */}
      <View style={styles.counters}>
        <Counter label="Erzeugt" value={progress.ok} color={toneColor('mid')} />
        <Counter label="Fehlgeschlagen" value={progress.failed} color={toneColor('falling')} />
        <Counter label="Übersprungen" value={progress.skipped} color={toneColor('low')} />
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

/**
 * Eine Reihe, in der genau eine Möglichkeit gewählt ist.
 *
 * Sie trägt `radiogroup`, damit ein Screenreader die Knöpfe darin als
 * **zusammengehörige Auswahl** ansagt („1 von 3") statt als drei einzelne
 * Knöpfe, zwischen denen kein Zusammenhang erkennbar wäre.
 */
export function ChoiceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.buttonRow}>
      {children}
    </View>
  );
}

/**
 * Knopf — als Aktion, oder als eine Möglichkeit unter mehreren.
 *
 * IM WEB-BUILD NACHGEMESSEN (Phase 10): `accessibilityState={{ selected }}`
 * erzeugt in dieser React-Native-Web-Fassung **gar kein** ARIA-Attribut. Die
 * gewählte Möglichkeit war also nur an ihrer Umrandung zu erkennen — für
 * Sehende sichtbar, für einen Screenreader unsichtbar. Betroffen war nicht nur
 * die neue Anbieterwahl, sondern auch Umfang und Standard-Lernrichtung, die
 * seit Phase 4 bzw. 6 bestehen; die Prüfung in Phase 9 hat Beschriftung,
 * Tippziel und Fokus gemessen, aber nicht den Zustand.
 *
 * `radio` + `checked` wird dagegen zu `role="radio"` und `aria-checked`
 * übersetzt — nachgemessen, nicht angenommen. Ein Knopf **ohne** `selected`
 * bleibt eine gewöhnliche Aktion (Start, Löschen) und behält `role="button"`;
 * ein Aktionsknopf als Radiobutton wäre die falsche Auskunft.
 */
export function Button({
  label,
  onPress,
  disabled,
  selected,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Gesetzt heißt: eine Möglichkeit unter mehreren, nicht eine Aktion. */
  selected?: boolean;
}) {
  const toneColor = useToneColor();
  const istWahl = selected !== undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={istWahl ? 'radio' : 'button'}
      accessibilityLabel={label}
      // `aria-checked` DIREKT, nicht ueber accessibilityState: im Web-Build
      // gemessen, dass React Native Web weder `selected` noch `checked` aus
      // accessibilityState in ein ARIA-Attribut uebersetzt. Ein `role="radio"`
      // ohne `aria-checked` waere schlechter als gar keins - die Rolle
      // verspricht einen Zustand, den niemand abfragen kann.
      aria-checked={istWahl ? Boolean(selected) : undefined}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}>
      <ThemedView
        type={selected ? 'backgroundSelected' : 'backgroundElement'}
        style={[
          styles.button,
          selected && styles.buttonSelected,
          selected && { borderColor: toneColor('mid') },
        ]}>
        <ThemedText type="small">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /**
   * Mindestgroesse eines Tippziels. WCAG 2.2 verlangt in 2.5.8 (AA) 24x24
   * CSS-Pixel; Apple und Google empfehlen 44 bzw. 48. Gemessen wurde im
   * Web-Build, dass reine Textknoepfe nur 20 Pixel hoch waren - also unter der
   * Norm. 44 ist der bequeme Wert und kostet hier nichts.
   */
  tapTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  warning: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
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
