import { DeveloperContent } from '@/components/developer-content';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { VOCABULARY } from '@/data/vocabulary';

export default function SettingsScreen() {
  return (
    <ScreenScaffold title="Einstellungen" subtitle="Dein Lernbegleiter">
      <ThemedView type="backgroundElement" style={{ padding: Spacing.three, gap: Spacing.two, borderRadius: Spacing.three }}>
        <ThemedText type="smallBold">Dein Lernmaterial</ThemedText>
        <ThemedText>{VOCABULARY.length} Wörter · Thai, Englisch und Spanisch</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Lernmaterial gehört zur App. Neue Wörter, Dialoge und Übungen kommen mit App-Updates.
          Dein Lernfortschritt bleibt auf diesem Gerät.
        </ThemedText>
      </ThemedView>
      <DeveloperContent />
    </ScreenScaffold>
  );
}
