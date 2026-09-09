import { useEffect } from 'react';

import { DirectionDashboard } from '@/components/direction-dashboard';
import { LanguagePicker } from '@/components/language-picker';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { FeatureLegend } from '@/components/feature-legend';
import { useLearnerLanguage } from '@/hooks/use-learner-language';
import { useLocale } from '@/lib/i18n';
import { featureIsImplemented } from '@/lib/languages/feature';
import { languageOf } from '@/lib/languages/registry';
import { migrateStore } from '@/lib/storage/migration';

/**
 * Übersicht — die Sprachauswahl steht an erster Stelle, und darunter der Weg
 * in den Lernen-Bereich (Phase 17, Ziel 1).
 *
 * Die Reihenfolge ist die Entscheidung: erst die Sprache, dann die Richtung.
 * Wer hier eine Sprache wählt, sieht sofort deren zwei Richtungen mit ihren
 * fälligen Karten, und jede dieser Karten führt in den Lernen-Bereich mit
 * genau dieser Sprache aktiv — das Profil trägt sie mit.
 *
 * WAS SEIT PHASE 17 NICHT MEHR HIER STEHT: die Kennzahlen des Grundstocks
 * (Einträge, Quellenquote, Wortarten). Sie waren der Nachweis aus Phase 2,
 * dass der Speicher wirklich beschrieben wird — für die Entwicklung wertvoll,
 * für Lernende ein Zahlenblock ohne Handlung. Sie stehen jetzt in den
 * Einstellungen unter „Diagnose".
 *
 * Der Migrationslauf (AE-43) wird hier einmal angestoßen: Er ist idempotent,
 * lässt Kartenzustände unangetastet und tut auf einem aktuellen Speicher
 * nichts.
 */
export default function DashboardScreen() {
  const { language, chooseLanguage } = useLearnerLanguage();
  const { t, systemLanguage, languageName } = useLocale();
  const definition = languageOf(language);

  useEffect(() => {
    migrateStore().catch((error) => {
      console.warn('[storage] Migration fehlgeschlagen, weiter mit dem vorhandenen Stand.', error);
    });
  }, []);

  return (
    <ScreenScaffold title={t('tabs.overview')} subtitle={t('home.subtitle')}>
      <LanguagePicker selected={language} onSelect={chooseLanguage} />

      <ThemedText type="subtitle">{t('common.learnGoal', { language: languageName(language) })}</ThemedText>
      <DirectionDashboard language={language} />

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
