import { PlaceholderCard } from '@/components/placeholder-card';
import { ScreenScaffold } from '@/components/screen-scaffold';

export default function ConversationScreen() {
  return (
    <ScreenScaffold
      title="Gespräch"
      subtitle="Vorproduzierte Sprachsituationen — offline nutzbar">
      <PlaceholderCard
        phase="Phase 4"
        heading="Situationen"
        body="Dialoge werden einmalig über den Generator in den Einstellungen erzeugt und dann lokal gespeichert. Kein API-Key im normalen Betrieb nötig."
      />
    </ScreenScaffold>
  );
}
