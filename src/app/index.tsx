import { useEffect } from 'react';

import { DirectionDashboard } from '@/components/direction-dashboard';
import { LanguagePicker } from '@/components/language-picker';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ToneLegend } from '@/components/tone-legend';
import { useLearnerLanguage } from '@/hooks/use-learner-language';
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
  const definition = languageOf(language);

  useEffect(() => {
    migrateStore().catch((error) => {
      console.warn('[storage] Migration fehlgeschlagen, weiter mit dem vorhandenen Stand.', error);
    });
  }, []);

  return (
    <ScreenScaffold title="Übersicht" subtitle="Welche Sprache lernst du heute?">
      <LanguagePicker selected={language} onSelect={chooseLanguage} />

      <ThemedText type="subtitle">{definition.label} lernen</ThemedText>
      <DirectionDashboard language={language} />

      {/* Die Tonlegende gehoert zum Thai-Merkmal, nicht zur Art des Merkmals:
          Seit Phase 16 ist auch die spanische Betonung „ableitbar und
          gebaut", und dort waeren fuenf Tonfarben schlicht falsch. */}
      {language === 'th' && featureIsImplemented(language) ? <ToneLegend /> : null}

      <ThemedText type="small" themeColor="textSecondary">
        {definition.feature.description}
      </ThemedText>
    </ScreenScaffold>
  );
}
