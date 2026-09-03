import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DrillRunner } from '@/components/drill-runner';
import { Flashcard } from '@/components/flashcard';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { SpeakingRunner } from '@/components/speaking-runner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ToneLegend } from '@/components/tone-legend';
import { WritingRunner } from '@/components/writing-runner';
import { Spacing } from '@/constants/theme';
import { useToneColor } from '@/hooks/use-theme';
import { DRILL_META, DrillId, drillsForDirection } from '@/lib/drills/types';
import { Direction, Rating, RATING_LABELS } from '@/lib/fsrs/types';
import { LearnerProfile, loadProfile, setDefaultDirection } from '@/lib/profile';
import { rateCard } from '@/lib/repository';
import {
  buildReviewQueue,
  directionLabel,
  directionPrompt,
  DIRECTIONS,
  ReviewItem,
} from '@/lib/review-session';

const RATINGS: Rating[] = [1, 2, 3, 4];

/** Karteikarten oder eine der richtungseigenen Übungen. */
type Mode = 'cards' | DrillId | 'speaking' | 'writing';

function isDirection(value: unknown): value is Direction {
  return value === 'de_to_th' || value === 'th_to_de';
}

function parseMode(value: unknown, direction: Direction): Mode {
  const drills: string[] = drillsForDirection(direction);
  if (direction === 'de_to_th' && value === 'speaking') return 'speaking';
  // Freies Schreiben gibt es in BEIDEN Richtungen - anders als die
  // Auswahluebungen, die je Richtung verschieden sind (Phase 14).
  if (value === 'writing') return 'writing';
  return typeof value === 'string' && drills.includes(value) ? (value as Mode) : 'cards';
}

function modesForDirection(direction: Direction): Mode[] {
  return [
    'cards',
    ...drillsForDirection(direction),
    ...(direction === 'de_to_th' ? (['speaking'] as const) : []),
    'writing',
  ];
}

function modeLabel(mode: Mode): string {
  if (mode === 'cards') return 'Karteikarten';
  if (mode === 'speaking') return 'Sprechen';
  if (mode === 'writing') return 'Schreiben';
  return DRILL_META[mode].label;
}

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ direction?: string; mode?: string; waehlen?: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<LearnerProfile | null>(null);

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  const remember = useCallback(async (direction: Direction | null) => {
    setProfile(await setDefaultDirection(direction));
  }, []);

  if (!profile) {
    return (
      <ScreenScaffold title="Lernen" subtitle="Lernrichtung">
        <ThemedText type="small" themeColor="textSecondary">
          Lade Lernprofil …
        </ThemedText>
      </ScreenScaffold>
    );
  }

  const explicit = isDirection(params.direction) ? params.direction : null;
  // `waehlen=1` setzt der Wechsel-Knopf: die Auswahl muss auch dann erreichbar
  // bleiben, wenn eine Standard-Richtung hinterlegt ist - sonst waere der
  // Standard eine Einbahnstrasse.
  const direction = params.waehlen === '1' ? null : (explicit ?? profile.defaultDirection);

  if (!direction) {
    return (
      <DirectionPicker
        profile={profile}
        onPick={(picked) => router.setParams({ direction: picked, waehlen: undefined })}
      />
    );
  }

  const mode = parseMode(params.mode, direction);

  return (
    <ScreenScaffold title="Lernen" subtitle={directionLabel(direction)}>
      <ModeBar
        direction={direction}
        mode={mode}
        onPick={(picked) =>
          router.setParams({
            direction,
            mode: picked === 'cards' ? undefined : picked,
            waehlen: undefined,
          })
        }
      />

      <DirectionBar
        direction={direction}
        profile={profile}
        onSwitch={() => router.setParams({ direction: undefined, mode: undefined, waehlen: '1' })}
        onRemember={remember}
      />

      {mode === 'cards' ? (
        <CardSession direction={direction} key={direction} />
      ) : mode === 'writing' ? (
        <WritingRunner
          key={`${direction}:writing`}
          direction={direction}
          onExit={() => router.setParams({ direction, mode: undefined })}
        />
      ) : mode === 'speaking' ? (
        <SpeakingRunner
          key={`${direction}:speaking`}
          onExit={() => router.setParams({ direction, mode: undefined })}
        />
      ) : (
        <DrillRunner
          drill={mode}
          key={`${direction}:${mode}`}
          onExit={() => router.setParams({ direction, mode: undefined })}
        />
      )}

      <ToneLegend compact />
    </ScreenScaffold>
  );
}

/**
 * Ohne gewählte Richtung wird nicht gelernt. Die beiden Richtungen sind
 * unterschiedliche Aufgaben und werden nie in einer Sitzung vermischt.
 */
function DirectionPicker({
  profile,
  onPick,
}: {
  profile: LearnerProfile;
  onPick: (direction: Direction) => void;
}) {
  return (
    <ScreenScaffold title="Lernen" subtitle="Welche Richtung möchtest du üben?">
      {DIRECTIONS.map((direction) => (
        <Pressable
          key={direction}
          onPress={() => onPick(direction)}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.pickerCard}>
            <ThemedText type="smallBold">
              {directionLabel(direction)}
              {profile.defaultDirection === direction ? ' · Standard' : ''}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {directionPrompt(direction)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Karteikarten ·{' '}
              {modesForDirection(direction).slice(1).map(modeLabel).join(' · ')}
            </ThemedText>
          </ThemedView>
        </Pressable>
      ))}
      <ToneLegend />
    </ScreenScaffold>
  );
}

/** Umschalter zwischen Karteikarten und den Übungen dieser Richtung. */
function ModeBar({
  direction,
  mode,
  onPick,
}: {
  direction: Direction;
  mode: Mode;
  onPick: (mode: Mode) => void;
}) {
  const modes = modesForDirection(direction);
  const toneColor = useToneColor();

  return (
    <View style={styles.modeBar}>
      {modes.map((candidate) => {
        const label = modeLabel(candidate);
        const selected = candidate === mode;
        return (
          <Pressable
            key={candidate}
            onPress={() => onPick(candidate)}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView
              type={selected ? 'backgroundSelected' : 'backgroundElement'}
              style={[styles.modeButton, selected && { borderColor: toneColor('mid') }]}>
              <ThemedText type="small">{label}</ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Richtung wechseln und den Standard setzen — an derselben Stelle.
 *
 * Der Standard wird nur gesetzt, wenn er ausdrücklich gesetzt wird, und er ist
 * dort sichtbar, wo er wirkt (AE-17). Eine still aus der letzten Wahl
 * abgeleitete Voreinstellung würde die App nach einem einzigen Tippen
 * festlegen, ohne dass jemand das gewollt hätte.
 */
function DirectionBar({
  direction,
  profile,
  onSwitch,
  onRemember,
}: {
  direction: Direction;
  profile: LearnerProfile;
  onSwitch: () => void;
  onRemember: (direction: Direction | null) => void;
}) {
  const isDefault = profile.defaultDirection === direction;

  return (
    <View style={styles.directionBar}>
      <Pressable
        onPress={onSwitch}
        accessibilityRole="button"
        accessibilityLabel="Lernrichtung wechseln"
        style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
        <ThemedText type="small" themeColor="textSecondary">
          Richtung wechseln
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => onRemember(isDefault ? null : direction)}
        accessibilityRole="button"
        accessibilityLabel={
          isDefault
            ? 'Diese Richtung nicht mehr als Standard verwenden'
            : 'Diese Richtung als Standard merken'
        }
        accessibilityState={{ selected: isDefault }}
        style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
        <ThemedText type="small" themeColor="textSecondary">
          {isDefault ? '★ Standard — aufheben' : '☆ Als Standard merken'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function CardSession({ direction }: { direction: Direction }) {
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
      <ThemedText type="small" themeColor="textSecondary">
        Sitzung wird zusammengestellt …
      </ThemedText>
    );
  }

  const item = queue[index];

  if (!item) {
    return (
      <ThemedView type="backgroundElement" style={styles.summary}>
        <ThemedText type="smallBold">{rated > 0 ? 'Sitzung beendet' : 'Nichts fällig'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {rated > 0
            ? `${rated} Karten bewertet, davon ${again}× „Nochmal".`
            : 'In dieser Richtung ist gerade keine Karte fällig. Die Übungen oben gehen trotzdem — sie brauchen keine Fälligkeit.'}
        </ThemedText>
        <View style={styles.actions}>
          <ActionButton label="Erneut prüfen" onPress={restart} />
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <ThemedText type="small" themeColor="textSecondary">
        Karte {index + 1} von {queue.length}
      </ThemedText>

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
    </>
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
  /**
   * Mindestgroesse eines Tippziels. WCAG 2.2 verlangt in 2.5.8 (AA) 24x24
   * CSS-Pixel; Apple und Google empfehlen 44 bzw. 48. Gemessen wurde im
   * Web-Build, dass reine Textknoepfe nur 20 Pixel hoch waren - also unter der
   * Norm. 44 ist der bequeme Wert und kostet hier nichts.
   */
  tapTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  pickerCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  modeBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  modeButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeButtonSelected: {},
  directionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
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
