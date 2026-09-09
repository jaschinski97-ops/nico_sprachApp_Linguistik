import { Link } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DirectionDashboard, useDirectionSummaries } from '@/components/direction-dashboard';
import { FeatureLegend } from '@/components/feature-legend';
import { LanguagePicker } from '@/components/language-picker';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ToneHero } from '@/components/tone-hero';

import { Spacing } from '@/constants/theme';
import { useLearnerLanguage } from '@/hooks/use-learner-language';
import { useTheme } from '@/hooks/use-theme';
import { useLocale } from '@/lib/i18n';
import { featureIsImplemented } from '@/lib/languages/feature';
import { languageOf } from '@/lib/languages/registry';
import { migrateStore } from '@/lib/storage/migration';

/**
 * Übersicht — Handlung zuerst (UI-Review 2026-09-09): Das Markenwort in seinen
 * Tönen, der Weg in die Sitzung, und erst dann die Auswahl als Abschnitte
 * darunter.
 *
 * Der CTA trägt die fälligen Karten als ehrliche Zahl — nur solange sie
 * geladen ist, nie als Deko: Während des Ladens bleibt der Knopf schlicht, bei
 * null steht „nichts fällig“. Der Zahlenstand wird EINMAL gehoben
 * (`useDirectionSummaries`) und an das Dashboard durchgereicht. Das frühere
 * „{{language}} lernen“ ist dafür entfallen — das Abschnittslabel „Richtungen
 * · Thai“ sagt dasselbe, und Dopplung bleibt Dopplung, auch wenn sie höflich
 * klingt.
 *
 * Der Migrationslauf (AE-43) wird hier einmal angestoßen: Er ist idempotent,
 * lässt Kartenzustände unangetastet und tut auf einem aktuellen Speicher
 * nichts.
 */
export default function DashboardScreen() {
  const { language, chooseLanguage } = useLearnerLanguage();
  const { t, systemLanguage, languageName } = useLocale();
  const theme = useTheme();
  const definition = languageOf(language);
  const due = useDirectionSummaries(language);
  const totalDue = due.summaries?.reduce((sum, item) => sum + item.due, 0) ?? null;

  useEffect(() => {
    migrateStore().catch((error) => {
      console.warn('[storage] Migration fehlgeschlagen, weiter mit dem vorhandenen Stand.', error);
    });
  }, []);

  return (
    <ScreenScaffold title={t('tabs.overview')} subtitle={t('home.subtitle')}>
      <ToneHero />

      <Link href="/review" asChild>
        {/* accessible: Knopf und Badge sind eine Handlung — der Screenreader
            soll sie als eine Ansage bringen, nicht als zwei Elemente.
            Die Fläche steht bewusst auf dem inneren View, NICHT auf dem
            Pressable: expo-routers asChild-Klon ersetzt den Style des Kindes,
            ein Style am Pressable selbst landet nie im DOM (UI-Review
            2026-09-09, im Web-Build gemessen). */}
        <Pressable
          accessible
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}>
          <View style={[styles.cta, { backgroundColor: theme.accent }]}>
            <ThemedText type="default" style={[styles.ctaLabel, { color: theme.accentText }]}>
              {t('home.heroCta')}
            </ThemedText>
            {totalDue === null ? null : totalDue > 0 ? (
              <View style={[styles.ctaBadge, { borderColor: theme.accentText }]}>
                <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                  {t('home.dueBadge', { count: totalDue })}
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="small" style={{ color: theme.accentText }}>
                {t('home.nothingDue')}
              </ThemedText>
            )}
          </View>
        </Pressable>
      </Link>

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('home.sectionLanguages')}
        </ThemedText>
        <LanguagePicker selected={language} onSelect={chooseLanguage} />
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('home.sectionDirections', { language: languageName(language) })}
        </ThemedText>
        <DirectionDashboard language={language} loaded={due} />
      </View>

      {/* Seit Phase 18 hat jede Sprache ihre eigene Merkhilfe: Tonfarben bei
          Thai, die Betonungsregel bei Spanisch, die Schriftstueck-Gruppen bei
          Englisch. Vorher stand hier fuer zwei von drei Sprachen nichts - die
          Bedingung war auf die Toene gemuenzt und schloss die anderen aus. */}
      {featureIsImplemented(language) ? <FeatureLegend language={language} /> : null}

      <ThemedText type="small" themeColor="textSecondary">
        {definition.feature.description}
      </ThemedText>

      {/* Dezent, ganz unten: welche Sprache das Gerät meldet. Sie ist die
          Brückensprache der App — wer abweichend davon lernt, sieht hier,
          worauf die Voreinstellung beruht. */}
      <ThemedText type="small" themeColor="textSecondary">
        {t('home.systemLanguage', { language: languageName(systemLanguage) })}
      </ThemedText>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  ctaLabel: {
    fontWeight: '700',
  },
  ctaBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
