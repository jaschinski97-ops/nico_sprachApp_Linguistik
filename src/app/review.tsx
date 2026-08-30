import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PlaceholderCard } from '@/components/placeholder-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TONES } from '@/constants/tones';
import { DAY_MS, retrievability, reviewCard } from '@/lib/fsrs/fsrs';
import { FSRSCardState, Rating, RATING_LABELS } from '@/lib/fsrs/types';
import { createCardState } from '@/lib/fsrs/fsrs';
import { loadOrCreateCardState, saveCardState } from '@/lib/repository';
import { getActiveBackend, getStore } from '@/lib/storage';

/**
 * Phase-1-Nachweis: eine einzelne echte FSRS-Karte, deren Zustand den
 * App-Neustart übersteht. Phase 3 ersetzt das durch den richtigen
 * Karteikarten-Flow über den Vokabel-Grundstock.
 */
const DEMO = {
  id: 'gai',
  thai: 'ไก่',
  roman: 'gài',
  tone: 'low' as const,
  german: 'Huhn',
};

const RATINGS: Rating[] = [1, 2, 3, 4];

function formatDue(due: number, now: number): string {
  const diffDays = (due - now) / DAY_MS;
  if (diffDays <= 0) return 'jetzt fällig';
  if (diffDays < 1) return `in ${Math.round(diffDays * 24)} h`;
  return `in ${Math.round(diffDays)} Tagen`;
}

function formatNumber(value: number | null, digits = 2): string {
  return value === null ? '—' : value.toFixed(digits);
}

export default function ReviewScreen() {
  const [card, setCard] = useState<FSRSCardState | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    loadOrCreateCardState(DEMO.id, 'th_to_de').then((loaded) => {
      if (!cancelled) {
        setCard(loaded);
        setNow(Date.now());
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card || busy) return;
      setBusy(true);
      const at = Date.now();
      const next = reviewCard(card, rating, at);
      setCard(next);
      setNow(at);
      await saveCardState(next);
      setBusy(false);
    },
    [card, busy]
  );

  const reset = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const at = Date.now();
    const fresh = createCardState(DEMO.id, 'th_to_de', at);
    setCard(fresh);
    setNow(at);
    await saveCardState(fresh);
    setBusy(false);
  }, [busy]);

  const [backend, setBackend] = useState<string>('…');
  useEffect(() => {
    getStore().then(() => setBackend(getActiveBackend()));
  }, []);

  const tone = TONES[DEMO.tone];

  return (
    <ScreenScaffold title="Lernen" subtitle="Karteikarten mit FSRS-Wiederholungsplanung">
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.rowBetween}>
          <ThemedText type="smallBold">Persistenz-Prüfung</ThemedText>
          <ThemedView type="backgroundSelected" style={styles.badge}>
            <ThemedText type="small" themeColor="textSecondary">
              Phase 1
            </ThemedText>
          </ThemedView>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Bewerte die Karte, lade die Seite neu (bzw. schließe die App in Expo Go
          ganz und öffne sie wieder). Bleiben die Werte stehen, ist die
          Persistenz in Ordnung.
        </ThemedText>

        <View style={styles.word}>
          <ThemedText style={[styles.thai, { color: tone.color }]}>{DEMO.thai}</ThemedText>
          <View>
            <ThemedText>
              {DEMO.roman} — {DEMO.german}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {tone.adjective} Ton · {tone.mark}
            </ThemedText>
          </View>
        </View>

        {card ? (
          <>
            <View style={styles.stats}>
              <Stat label="Zustand" value={card.state} />
              <Stat label="Wiederholungen" value={String(card.reps)} />
              <Stat label="Lapses" value={String(card.lapses)} />
              <Stat label="Stabilität (Tage)" value={formatNumber(card.stability)} />
              <Stat label="Difficulty" value={formatNumber(card.difficulty)} />
              <Stat label="Retrievability" value={retrievability(card, now).toFixed(3)} />
              <Stat label="Nächste Fälligkeit" value={formatDue(card.due, now)} />
            </View>

            <View style={styles.buttons}>
              {RATINGS.map((rating) => (
                <Pressable
                  key={rating}
                  onPress={() => rate(rating)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Bewertung ${RATING_LABELS[rating]}`}
                  style={({ pressed }) => [styles.buttonWrap, pressed && styles.pressed]}>
                  <ThemedView type="backgroundSelected" style={styles.button}>
                    <ThemedText type="small">{RATING_LABELS[rating]}</ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={reset}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Karte zurücksetzen"
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="small" themeColor="textSecondary">
                Karte zurücksetzen
              </ThemedText>
            </Pressable>

            <ThemedText type="small" themeColor="textSecondary">
              Speicher: {backend}
            </ThemedText>
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Lade Kartenzustand …
          </ThemedText>
        )}
      </ThemedView>

      <PlaceholderCard
        phase="Phase 3"
        heading="Karteikarten-Flow"
        body="Aufdecken, bewerten, Tonfarben und Audio-Wiedergabe über den gesamten Vokabel-Grundstock statt nur einer Demo-Karte."
      />
    </ScreenScaffold>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowBetween: {
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
  word: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  thai: {
    fontSize: 44,
    lineHeight: 60,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  stat: {
    minWidth: 120,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  buttonWrap: {
    flexGrow: 1,
    flexBasis: 100,
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
