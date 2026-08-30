import { DirectionDashboard } from '@/components/direction-dashboard';
import { PlaceholderCard } from '@/components/placeholder-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ToneLegend } from '@/components/tone-legend';
import { VocabSummary } from '@/components/vocab-summary';

export default function DashboardScreen() {
  return (
    <ScreenScaffold title="Übersicht" subtitle="Thai ↔ Deutsch Lernbegleiter">
      <DirectionDashboard />

      <ToneLegend />

      <VocabSummary />

      <PlaceholderCard
        phase="Phase 6"
        heading="Lernrichtung im Profil"
        body="Eigene grammatikspezifische Übungstypen je Richtung — Artikel und Kasus für Thailänder, Töne und Schrift für Deutsche."
      />
    </ScreenScaffold>
  );
}
