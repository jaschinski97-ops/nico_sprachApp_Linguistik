import { PlaceholderCard } from '@/components/placeholder-card';
import { ScreenScaffold } from '@/components/screen-scaffold';

export default function ProgressScreen() {
  return (
    <ScreenScaffold title="Fortschritt" subtitle="Lernverlauf und Prüfungsvorbereitung">
      <PlaceholderCard
        phase="Phase 3"
        heading="Lernstatistik"
        body="Wiederholungen pro Tag, Kartenzustände und fällige Karten je Richtung."
      />
      <PlaceholderCard
        phase="Phase 7"
        heading="Prüfungsmodul"
        body="Übungen nach der tatsächlichen Modulstruktur des Goethe-Instituts — Struktur wird erst aus den Originalseiten erhoben, nicht geraten."
      />
    </ScreenScaffold>
  );
}
