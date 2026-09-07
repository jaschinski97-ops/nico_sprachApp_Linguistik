import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet } from 'react-native';

import { DeveloperContent } from '@/components/developer-content';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { VOCABULARY } from '@/data/vocabulary';
import {
  BackupImportSummary,
  chooseBackupFile,
  exportBackup,
  restoreBackup,
} from '@/lib/backup';
import { isStorageDegraded } from '@/lib/storage';

type StatusMessage = { kind: 'success' | 'error'; text: string };

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Unbekannter Fehler.';
}

function formatSummary(summary: BackupImportSummary): string {
  const parts = [
    `${summary.cards} Karten`,
    `${summary.logEntries} Tage Lernprotokoll`,
  ];
  if (summary.profileApplied) parts.push('Lernprofil');
  const when = summary.exportedAt
    ? new Date(summary.exportedAt).toLocaleDateString('de-DE')
    : null;
  return `Übernommen: ${parts.join(', ')}.${when ? ` (Sicherung vom ${when}.)` : ''}`;
}

/**
 * Die Bestätigung vor dem Ersetzen. `Alert.alert` ist in react-native-web ein
 * No-Op — dort fällt der Dialog auf `window.confirm` zurück, damit auf beiden
 * Plattformen dieselbe bewusste Entscheidung nötig ist.
 */
function confirmReplace(): Promise<boolean> {
  const question =
    'Die Sicherung ersetzt deine komplette Lernhistorie auf diesem Gerät. Diesen Schritt gehen?';
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(question)
        : true
    );
  }
  return new Promise((resolve) => {
    Alert.alert('Lernhistorie ersetzen?', question, [
      { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Ersetzen', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/**
 * Persistenz-Warnung (P1 aus dem Backend-Review): läuft die App auf dem
 * Notfall-Speicher, geht der Fortschritt beim Schließen verloren. Die Warnung
 * blockiert nichts — sie sagt nur ehrlich, was los ist, und verweist auf die
 * Sicherung direkt darunter.
 */
function PersistenceWarning() {
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // isStorageDegraded() wartet die Backend-Wahl ab — beim ersten Rendern
    // steht das Ergebnis also bereit oder kommt kurz danach.
    isStorageDegraded()
      .then((value) => {
        if (!cancelled) setDegraded(value);
      })
      .catch(() => {
        // Wer die Frage nicht beantworten kann, darf die App nicht
        // blockieren: ohne Erkenntnis keine Warnung.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!degraded) return null;
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">
        Lernfortschritt wird nur bis zum Schließen der App gespeichert
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Der dauerhafte Speicher auf diesem Gerät konnte nicht geöffnet werden.
        Alles, was du jetzt lernst, ist nach dem Schließen der App verloren.
        Sichere deinen Fortschritt unten als Datei, solange er noch da ist.
      </ThemedText>
    </ThemedView>
  );
}

function BackupSection() {
  const [busy, setBusy] = useState<null | 'export' | 'import'>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const onExport = useCallback(async () => {
    if (busy) return;
    setBusy('export');
    setStatus(null);
    try {
      const fileName = await exportBackup();
      setStatus({ kind: 'success', text: `Sicherung erstellt: ${fileName}` });
    } catch (error) {
      setStatus({ kind: 'error', text: messageOf(error) });
    } finally {
      setBusy(null);
    }
  }, [busy]);

  const onImport = useCallback(async () => {
    if (busy) return;
    setBusy('import');
    setStatus(null);
    try {
      const asset = await chooseBackupFile();
      // Abbrechen in der Dateiauswahl ist kein Fehler und verdient keine Meldung.
      if (!asset) return;
      if (!(await confirmReplace())) return;
      const summary = await restoreBackup(asset);
      setStatus({ kind: 'success', text: formatSummary(summary) });
    } catch (error) {
      setStatus({ kind: 'error', text: messageOf(error) });
    } finally {
      setBusy(null);
    }
  }, [busy]);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Sicherung &amp; Wiederherstellen</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Sichere deinen Lernfortschritt als Datei — etwa vor einem Gerätewechsel
        oder einer Neuinstallation. Eine solche Sicherung kannst du hier
        wiederherstellen; sie ersetzt dann die Lernhistorie auf diesem Gerät.
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lernhistorie als Datei sichern"
        disabled={busy !== null}
        onPress={onExport}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <ThemedView type="backgroundSelected" style={styles.actionButton}>
          <ThemedText type="smallBold">
            {busy === 'export' ? 'Sicherung läuft …' : 'Lernhistorie sichern'}
          </ThemedText>
        </ThemedView>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sicherung einlesen und Lernhistorie ersetzen"
        disabled={busy !== null}
        onPress={onImport}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <ThemedView type="backgroundSelected" style={styles.actionButton}>
          <ThemedText type="smallBold">
            {busy === 'import' ? 'Wird eingelesen …' : 'Sicherung wiederherstellen'}
          </ThemedText>
        </ThemedView>
      </Pressable>
      {status ? (
        status.kind === 'error' ? (
          <ThemedText type="smallBold">Das ist schiefgegangen: {status.text}</ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {status.text}
          </ThemedText>
        )
      ) : null}
    </ThemedView>
  );
}

export default function SettingsScreen() {
  return (
    <ScreenScaffold title="Einstellungen" subtitle="Dein Lernbegleiter">
      <PersistenceWarning />
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Dein Lernmaterial</ThemedText>
        <ThemedText>{VOCABULARY.length} Wörter · Thai, Englisch und Spanisch</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Lernmaterial gehört zur App. Neue Wörter, Dialoge und Übungen kommen mit App-Updates.
          Dein Lernfortschritt bleibt auf diesem Gerät.
        </ThemedText>
      </ThemedView>
      <BackupSection />
      <DeveloperContent />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    gap: Spacing.two,
    borderRadius: Spacing.three,
  },
  actionButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
