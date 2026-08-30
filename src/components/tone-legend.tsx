import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { ToneContour } from './tone-contour';

import { Spacing } from '@/constants/theme';
import { TONE_KEYS, TONES } from '@/constants/tones';

/**
 * Die fünf Grundtöne mit Kontur, Farbe und Tonzeichen.
 *
 * `compact` lässt die Erklärtexte weg — für die Lernansicht, wo die Legende
 * nur als Erinnerung dient.
 */
export function ToneLegend({ compact = false }: { compact?: boolean }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Tonfarben</ThemedText>
      {!compact ? (
        <ThemedText type="small" themeColor="textSecondary">
          Die fünf thailändischen Töne. Bei mehrsilbigen Wörtern hat jede Silbe
          ihren eigenen Ton — die Farben stehen deshalb an der Umschrift, Silbe
          für Silbe.
        </ThemedText>
      ) : null}
      <View style={styles.row}>
        {TONE_KEYS.map((tone) => (
          <View key={tone} style={styles.item}>
            <ToneContour tone={tone} height={13} />
            <View>
              <ThemedText type="small" style={{ color: TONES[tone].color }}>
                {TONES[tone].label}
              </ThemedText>
              {!compact ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {TONES[tone].mark}
                </ThemedText>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
