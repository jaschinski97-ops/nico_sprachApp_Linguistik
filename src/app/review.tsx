import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Flashcard } from '@/components/flashcard';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ToneLegend } from '@/components/tone-legend';
import { Spacing } from '@/constants/theme';
import { Direction, Rating, RATING_LABELS } from '@/lib/fsrs/types';
import { rateCard } from '@/lib/repository';
import {
  buildReviewQueue,
  DIRECTION_LABELS,
  DIRECTION_PROMPTS,
  DIRECTIONS,
  ReviewItem,
} from '@/lib/review-session';

const RATINGS: Rating[] = [1, 2, 3, 4];

function isDirection(value: unknown): value is Direction {
  return value === 'de_to_th' || value === 'th_to_de';
}

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ direction?: string }>();
  const router = useRouter();

  const direction = isDirection(params.direction) ? params.direction : null;

  if (!direction) {
    return <DirectionPicker onPick={(d) => router.setParams({ direction: d })} />;
  }
  return <ReviewSession direction={direction} key={direction} />;
}

/**
 * Ohne gewählte Richtung wird nicht gelernt. Die beiden Richtungen sind
 * unterschiedliche Aufgaben und werden nie in einer Sitzung vermischt.
 */
function DirectionPicker({ onPick }: { onPick: (direction: Direction) => void }) {
  return (
    <ScreenScaffold title="Lernen" subtitle="Welche Richtung möchtest du üben?">
      {DIRECTIONS.map((direction) => (
        <Pressable
          key={direction}
          onPress={() => onPick(direction)}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.pickerCard}>
            <ThemedText type="smallBold">{DIRECTION_LABELS[direction]}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {DIRECTION_PROMPTS[direction]}
            </ThemedText>
          </ThemedView>
        </Pressable>
      ))}
      <ToneLegend />
    </ScreenScaffold>
  );
}

function ReviewSession({ direction }: { direction: Direction }) {
  const router = useRouter();

  const [queue, setQueue] = useState<ReviewItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rated, setRated] = useState(0);
  const [again, setAgain] = useState(0);

  useEffect(() => {
    let cancelled = false;
    buildReviewQueue(direction).then((items) => {
      if (!cancelled) setQueue(items);
    });
    return () => {
      cancelled = true;
    };
  }, [direction]);

  const rate = useCallback(
    async (rating: Rating) => {
      if (busy || !queue) return;
      const item = queue[index];
      if (!item) return;

      setBusy(true);
      await rateCard(item.card, rating);
      setRated((value) => value + 1);
      if (rating === 1) setAgain((value) => value + 1);
      setIndex((value) => value + 1);
      setRevealed(false);
      setBusy(false);
    },
    [busy, queue, index]
  );

  const restart = useCallback(() => {
    setQueue(null);
    setIndex(0);
    setRevealed(false);
    buildReviewQueue(direction).then(setQueue);
  }, [direction]);

  if (!queue) {
    return (
      <ScreenScaffold title="Lernen" subtitle={DIRECTION_LABELS[direction]}>
        <ThemedText type="small" themeColor="textSecondary">
          Sitzung wird zusammengestellt …
        </ThemedText>
      </ScreenScaffold>
    );
  }

  const item = queue[index];

  if (!item) {
    return (
      <ScreenScaffold title="Lernen" subtitle={DIRECTION_LABELS[direction]}>
        <ThemedView type="backgroundElement" style={styles.summary}>
          <ThemedText type="smallBold">
            {rated > 0 ? 'Sitzung beendet' : 'Nichts fällig'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {rated > 0
              ? `${rated} Karten bewertet, davon ${again}× „Nochmal".`
              : 'In dieser Richtung ist gerade keine Karte fällig. Schau später wieder rein.'}
          </ThemedText>
          <View style={styles.actions}>
            <ActionButton label="Erneut prüfen" onPress={restart} />
            <ActionButton
              label="Richtung wechseln"
              onPress={() => router.setParams({ direction: undefined })}
            />
          </View>
        </ThemedView>
        <ToneLegend compact />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Lernen" subtitle={DIRECTION_LABELS[direction]}>
      <View style={styles.progressRow}>
        <ThemedText type="small" themeColor="textSecondary">
          Karte {index + 1} von {queue.length}
        </ThemedText>
        <Pressable
          onPress={() => router.setParams({ direction: undefined })}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="small" themeColor="textSecondary">
            Richtung wechseln
          </ThemedText>
        </Pressable>
      </View>

      <Flashcard entry={item.entry} direction={direction} revealed={revealed} />

      {revealed ? (
        <View style={styles.ratings}>
          {RATINGS.map((rating) => (
            <Pressable
              key={rating}
              onPress={() => rate(rating)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Bewertung ${RATING_LABELS[rating]}`}
              style={({ pressed }) => [styles.ratingWrap, pressed && styles.pressed]}>
              <ThemedView type="backgroundSelected" style={styles.ratingButton}>
                <ThemedText type="small">{RATING_LABELS[rating]}</ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable
          onPress={() => setRevealed(true)}
          accessibilityRole="button"
          accessibilityLabel="Antwort aufdecken"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundSelected" style={styles.revealButton}>
            <ThemedText type="smallBold">Aufdecken</ThemedText>
          </ThemedView>
        </Pressable>
      )}

      <ToneLegend compact />
    </ScreenScaffold>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundSelected" style={styles.actionButton}>
        <ThemedText type="small">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pickerCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  ratings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  ratingWrap: {
    flexGrow: 1,
    flexBasis: 110,
  },
  ratingButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  revealButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  summary: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
