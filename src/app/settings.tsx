import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { DeveloperContent } from '@/components/developer-content';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { isContentDeveloper } from '@/lib/content/developer';
import {
  SYSTEM_LANGUAGE_SETTING,
  UI_LANGUAGES,
  LANGUAGE_DISPLAY_NAMES,
  localeTagFor,
  useLocale,
  type LanguageSetting,
  type TranslationKey,
} from '@/lib/i18n';
import { Spacing } from '@/constants/theme';
import { VOCABULARY } from '@/data/vocabulary';
import {
  BackupImportSummary,
  chooseBackupFile,
  exportBackup,
  restoreBackup,
} from '@/lib/backup';
import { isStorageDegraded } from '@/lib/storage';
import { useToneColor } from '@/hooks/use-theme';

type StatusMessage = { kind: 'success' | 'error'; text: string };

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

function messageOf(error: unknown, unknownLabel: string): string {
  return error instanceof Error ? error.message : unknownLabel;
}

function formatSummary(summary: BackupImportSummary, t: Translate, localeTag: string): string {
  const parts = [
    t('backup.partsCards', { cards: summary.cards }),
    t('backup.partsLog', { days: summary.logEntries }),
  ];
  if (summary.profileApplied) parts.push(t('backup.partsProfile'));
  const when = summary.exportedAt
    ? new Date(summary.exportedAt).toLocaleDateString(localeTag)
    : null;
  return `${t('backup.applied', { parts: parts.join(', ') })}${
    when ? t('backup.fromDate', { date: when }) : ''
  }`;
}

/**
 * Die Bestätigung vor dem Ersetzen. `Alert.alert` ist in react-native-web ein
 * No-Op — dort fällt der Dialog auf `window.confirm` zurück, damit auf beiden
 * Plattformen dieselbe bewusste Entscheidung nötig ist.
 */
function confirmReplace(t: Translate): Promise<boolean> {
  const question = t('backup.confirmQuestion');
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(question)
        : true
    );
  }
  return new Promise((resolve) => {
    Alert.alert(t('backup.confirmTitle'), question, [
      { text: t('backup.confirmCancel'), style: 'cancel', onPress: () => resolve(false) },
      {
        text: t('backup.confirmReplace'),
        style: 'destructive',
        onPress: () => resolve(true),
      },
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
  const { t } = useLocale();
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
      <ThemedText type="smallBold">{t('settings.warningTitle')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('settings.warningBody')}
      </ThemedText>
    </ThemedView>
  );
}

/**
 * App-Sprache (Roadmap v2, Phase 1): Vorgabe ist die Systemsprache des
 * Geräts — sie ist zugleich die künftige Brückensprache. Wer will, schaltet
 * hier fest um; die Wahl wird wie das Lernprofil im `meta`-Speicher bewahrt.
 *
 * Die Sprachen stehen unter ihren ENDONYMEN („español“, „ไทย“): Eine Sprache
 * muss sich auch dann finden lassen, wenn die Oberfläche gerade in einer
 * Sprache erscheint, die man nicht liest.
 */
function AppLanguageSection() {
  const { t, setting, setSetting } = useLocale();
  const toneColor = useToneColor();

  const options: { value: LanguageSetting; label: string }[] = [
    { value: SYSTEM_LANGUAGE_SETTING, label: t('appLanguage.system') },
    ...UI_LANGUAGES.map((language) => ({
      value: language as LanguageSetting,
      label: LANGUAGE_DISPLAY_NAMES[language][language],
    })),
  ];

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{t('appLanguage.title')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('appLanguage.body')}
      </ThemedText>
      <View style={styles.languageRow}>
        {options.map((option) => {
          const active = setting === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setSetting(option.value)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              aria-checked={active}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView
                type={active ? 'backgroundSelected' : 'backgroundElement'}
                style={[styles.languageChip, active && { borderColor: toneColor('mid') }]}>
                <ThemedText type="small">{option.label}</ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

function BackupSection() {
  const { t, uiLanguage } = useLocale();
  const [busy, setBusy] = useState<null | 'export' | 'import'>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const onExport = useCallback(async () => {
    if (busy) return;
    setBusy('export');
    setStatus(null);
    try {
      const fileName = await exportBackup();
      setStatus({ kind: 'success', text: t('backup.created', { fileName }) });
    } catch (error) {
      setStatus({ kind: 'error', text: messageOf(error, t('common.unknownError')) });
    } finally {
      setBusy(null);
    }
  }, [busy, t]);

  const onImport = useCallback(async () => {
    if (busy) return;
    setBusy('import');
    setStatus(null);
    try {
      const asset = await chooseBackupFile();
      // Abbrechen in der Dateiauswahl ist kein Fehler und verdient keine Meldung.
      if (!asset) return;
      if (!(await confirmReplace(t))) return;
      const summary = await restoreBackup(asset);
      setStatus({
        kind: 'success',
        text: formatSummary(summary, t, localeTagFor(uiLanguage)),
      });
    } catch (error) {
      setStatus({ kind: 'error', text: messageOf(error, t('common.unknownError')) });
    } finally {
      setBusy(null);
    }
  }, [busy, t, uiLanguage]);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{t('backup.title')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('backup.body')}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('backup.exportA11y')}
        disabled={busy !== null}
        onPress={onExport}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <ThemedView type="backgroundSelected" style={styles.actionButton}>
          <ThemedText type="smallBold">
            {busy === 'export' ? t('backup.exporting') : t('backup.exportButton')}
          </ThemedText>
        </ThemedView>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('backup.importA11y')}
        disabled={busy !== null}
        onPress={onImport}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <ThemedView type="backgroundSelected" style={styles.actionButton}>
          <ThemedText type="smallBold">
            {busy === 'import' ? t('backup.importing') : t('backup.importButton')}
          </ThemedText>
        </ThemedView>
      </Pressable>
      {status ? (
        status.kind === 'error' ? (
          <ThemedText type="smallBold">
            {t('backup.failed', { message: status.text })}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {status.text}
          </ThemedText>
        )
      ) : null}
    </ThemedView>
  );
}

/**
 * Die drei Schlüsselfelder nur im Debug-Betrieb. Der `require` liegt bewusst
 * IM Zweig (wie in developer-content.tsx): Ein statischer Import zöge
 * `lib/api-key` und die Anbieter-Clients in den Produktionsgraphen — genau
 * das meldet scripts/content/verify-production.cjs als Fehler.
 */
function DeveloperApiKeys() {
  if (__DEV__ && isContentDeveloper()) {
    const { ApiKeysCard } = require('@/components/api-keys-card');
    return <ApiKeysCard />;
  }
  return null;
}

export default function SettingsScreen() {
  const { t } = useLocale();
  return (
    <ScreenScaffold title={t('tabs.settings')} subtitle={t('settings.subtitle')}>
      <PersistenceWarning />
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t('settings.materialTitle')}</ThemedText>
        <ThemedText>
          {t('settings.materialCount', { count: VOCABULARY.length })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('settings.materialBody')}
        </ThemedText>
      </ThemedView>
      <AppLanguageSection />
      <BackupSection />
      {/* Drei Schlüsselfelder für den Debug-Ablauf; in Release rendert sie nichts. */}
      <DeveloperApiKeys />
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
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  languageChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
