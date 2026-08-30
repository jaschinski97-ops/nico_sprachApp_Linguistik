import { StyleSheet, View } from 'react-native';

import { PlaceholderCard } from '@/components/placeholder-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VocabSummary } from '@/components/vocab-summary';
import { Spacing } from '@/constants/theme';
import { TONES, TONE_KEYS } from '@/constants/tones';

export default function DashboardScreen() {
  return (
    <ScreenScaffold
      title="Übersicht"
      subtitle="Thai ↔ Deutsch Lernbegleiter">
      <ThemedView type="backgroundElement" style={styles.legend}>
        <ThemedText type="smallBold">Tonfarben</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Die fünf thailändischen Töne. Diese Farbcodierung zieht sich später
          durch alle Karten und Übungen.
        </ThemedText>
        <View style={styles.chips}>
          {TONE_KEYS.map((key) => (
            <View key={key} style={styles.chip}>
              <View style={[styles.swatch, { backgroundColor: TONES[key].color }]} />
              <View>
                <ThemedText type="small">{TONES[key].label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {TONES[key].mark}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </ThemedView>

      <VocabSummary />

      <PlaceholderCard
        phase="Phase 3"
        heading="Fällige Karten"
        body="Zeigt später die je Lernrichtung fälligen Karten aus dem FSRS-Planer."
      />
      <PlaceholderCard
        phase="Phase 6"
        heading="Lernrichtung"
        body="Umschalter zwischen „Thai für Deutsche“ und „Deutsch für Thailänder“ mit je eigenen Übungstypen."
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  legend: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
