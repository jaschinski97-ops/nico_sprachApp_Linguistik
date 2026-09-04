import { useCallback, useEffect, useState } from 'react';

import { DirectionDashboard } from '@/components/direction-dashboard';
import { LanguagePicker } from '@/components/language-picker';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ToneLegend } from '@/components/tone-legend';
import { VocabSummary } from '@/components/vocab-summary';
import { featureIsImplemented } from '@/lib/languages/feature';
import { languageOf } from '@/lib/languages/registry';
import { LanguageCode } from '@/lib/languages/types';
import { LearnerProfile, loadProfile, setLanguage } from '@/lib/profile';
import { migrateStore } from '@/lib/storage/migration';

/**
 * Übersicht — seit Phase 15 mit der Sprachauswahl an erster Stelle.
 *
 * Sie steht oben, weil sie alles darunter bestimmt: Welche Richtungen es gibt,
 * welche Übungen, welches Merkmal. Die Tonlegende erscheint nur, wenn die
 * gewählte Sprache überhaupt Töne hat — sie war bis Phase 14 eine feste
 * Einrichtung der Oberfläche und ist jetzt an das Merkmal gebunden.
 *
 * Der Migrationslauf (AE-43) wird hier einmal angestoßen: Er ist idempotent,
 * lässt Kartenzustände unangetastet und tut auf einem aktuellen Speicher
 * nichts.
 */
export default function DashboardScreen() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);

  useEffect(() => {
    migrateStore()
      .catch((error) => {
        console.warn('[storage] Migration fehlgeschlagen, weiter mit dem vorhandenen Stand.', error);
      })
      .then(() => loadProfile())
      .then(setProfile);
  }, []);

  const chooseLanguage = useCallback(async (language: LanguageCode) => {
    setProfile(await setLanguage(language));
  }, []);

  const language = profile?.language ?? 'th';
  const definition = languageOf(language);

  return (
    <ScreenScaffold title="Übersicht" subtitle={`${definition.label} ↔ Deutsch Lernbegleiter`}>
      <LanguagePicker selected={language} onSelect={chooseLanguage} />

      <DirectionDashboard language={language} />

      {/* Die Tonlegende gehoert zum Thai-Merkmal. In Phase 15 stand hier
          „ableitbar und gebaut" als Bedingung - seit Phase 16 trifft das auch
          auf die spanische Betonung zu, und dort waeren fuenf Tonfarben
          schlicht falsch. Es geht also um die Toene selbst, nicht um die Art
          des Merkmals. */}
      {language === 'th' && featureIsImplemented(language) ? <ToneLegend /> : null}

      <VocabSummary language={language} />

      <ThemedText type="small" themeColor="textSecondary">
        {definition.feature.description}
      </ThemedText>
    </ScreenScaffold>
  );
}
