import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';

type Props = {
  heading: string;
  body: string;
  /** Phase of the plan in PROGRESS.md that will replace this placeholder. */
  phase: string;
};

/**
 * Marks a screen area that is deliberately still a Phase 0 placeholder, so the
 * running app itself shows what is real and what is not yet built.
 */
export function PlaceholderCard({ heading, body, phase }: Props) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="smallBold">{heading}</ThemedText>
        <ThemedView type="backgroundSelected" style={styles.badge}>
          <ThemedText type="small" themeColor="textSecondary">
            {phase}
          </ThemedText>
        </ThemedView>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {body}
      </ThemedText>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
