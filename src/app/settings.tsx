import { PlaceholderCard } from '@/components/placeholder-card';
import { ScreenScaffold } from '@/components/screen-scaffold';

export default function SettingsScreen() {
  return (
    <ScreenScaffold title="Einstellungen" subtitle="Lernrichtung, Inhalte, API-Schlüssel">
      <PlaceholderCard
        phase="Phase 4"
        heading="Generator: Sprachsituationen"
        body="Eigenes Feld für den API-Schlüssel, Start-Knopf und Fortschrittsbalken. Der Schlüssel bleibt auf dem Gerät und wird nur für den Generierungslauf gebraucht."
      />
      <PlaceholderCard
        phase="Phase 5"
        heading="Generator: Bilder"
        body="Gleiches Prinzip, aber nur für konkrete Vokabeln (isConcrete). Abstrakte Wörter und Partikel bekommen bewusst kein Bild."
      />
    </ScreenScaffold>
  );
}
