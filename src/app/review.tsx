import { PlaceholderCard } from '@/components/placeholder-card';
import { ScreenScaffold } from '@/components/screen-scaffold';

export default function ReviewScreen() {
  return (
    <ScreenScaffold
      title="Lernen"
      subtitle="Karteikarten mit FSRS-Wiederholungsplanung">
      <PlaceholderCard
        phase="Phase 1"
        heading="FSRS-Planer"
        body="Retrievability- und Stabilitätsberechnung samt Persistenz des Kartenzustands."
      />
      <PlaceholderCard
        phase="Phase 3"
        heading="Karteikarten-Flow"
        body="Aufdecken, bewerten (Nochmal / Schwer / Gut / Leicht), Tonfarben und Audio-Wiedergabe."
      />
    </ScreenScaffold>
  );
}
