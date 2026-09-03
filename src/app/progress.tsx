import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlaceholderCard } from '@/components/placeholder-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Tone } from '@/constants/tones';
import { useToneColor } from '@/hooks/use-theme';
import { drillCount } from '@/lib/review-log';
import { directionLabel } from '@/lib/review-session';
import { CARD_STATE_LABELS, CARD_STATE_ORDER, LearningStats, loadLearningStats } from '@/lib/stats';

/**
 * Kartenzustaende auf Toene abgebildet - die Farbe selbst kommt zur Laufzeit
 * aus dem Anzeigemodus (AE-24).
 */
const STATE_TONES: Record<string, Tone> = {
  new: 'low',
  learning: 'falling',
  review: 'high',
  mastered: 'mid',
};

export default function ProgressScreen() {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLearningStats()
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <ScreenScaffold title="Fortschritt" subtitle="Lernverlauf">
        <ThemedText type="small" themeColor="textSecondary">
          Konnte nicht geladen werden: {error}
        </ThemedText>
      </ScreenScaffold>
    );
  }

  if (!stats) {
    return (
      <ScreenScaffold title="Fortschritt" subtitle="Lernverlauf">
        <ThemedText type="small" themeColor="textSecondary">
          Lade Lernstand …
        </ThemedText>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Fortschritt" subtitle="Lernverlauf und Prüfungsvorbereitung">
      <View style={styles.grid}>
        <Tile label="Heute wiederholt" value={String(stats.reviewsToday)} />
        <Tile label="Heute geübt" value={String(stats.drillsToday)} hint="Aufgaben" />
        <Tile
          label="Tage in Folge"
          value={String(stats.streak)}
          hint={stats.streak === 1 ? 'Tag' : 'Tage'}
        />
        <Tile label="Jetzt fällig" value={String(stats.totalDue)} />
        <Tile label="Karten gesamt" value={String(stats.totalCards)} />
      </View>

      <ReviewChart stats={stats} />
      <CardStates stats={stats} />

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Fällige Karten je Richtung</ThemedText>
        {stats.perDirection.map((summary) => (
          <View key={summary.direction} style={styles.row}>
            <ThemedText type="small">{directionLabel(summary.direction)}</ThemedText>
            <ThemedText type="smallBold">
              {summary.due} von {summary.total}
            </ThemedText>
          </View>
        ))}
      </ThemedView>

      <PlaceholderCard
        phase="Phase 7"
        heading="Prüfungsmodul"
        body="Übungen nach der tatsächlichen Modulstruktur des Goethe-Instituts — Struktur wird erst aus den Originalseiten erhoben, nicht geraten."
      />
    </ScreenScaffold>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.tile}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.tileValue}>
        <ThemedText style={styles.bigNumber}>{value}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
    </ThemedView>
  );
}

function ReviewChart({ stats }: { stats: LearningStats }) {
  // Wiederholungen und Uebungen werden gestapelt, nicht summiert dargestellt:
  // beides ist Lernzeit, aber nur die Wiederholungen laufen durch FSRS
  // (AE-16). Eine gemeinsame Saeule ohne Trennung wuerde die Beschriftung
  // "Wiederholungen" zur Unwahrheit machen.
  const toneColor = useToneColor();
  const max = Math.max(1, ...stats.days.map((day) => day.total + drillCount(day)));

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Pro Tag</ThemedText>
      <View style={styles.legend}>
        <LegendDot color={toneColor('mid')} label="Wiederholungen" />
        <LegendDot color={toneColor('high')} label="Übungen" />
      </View>

      <View style={styles.chart}>
        {stats.days.map((day) => (
          <View key={day.date} style={styles.barColumn}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.barValue}>
              {day.total + drillCount(day) > 0 ? day.total + drillCount(day) : ''}
            </ThemedText>
            <View style={styles.barTrack}>
              {drillCount(day) > 0 ? (
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${(drillCount(day) / max) * 100}%`,
                      backgroundColor: toneColor('high'),
                    },
                  ]}
                />
              ) : null}
              <View
                style={[
                  styles.barFill,
                  {
                    height: `${(day.total / max) * 100}%`,
                    backgroundColor: day.total > 0 ? toneColor('mid') : 'transparent',
                  },
                ]}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.barLabel}>
              {day.date.slice(8)}
            </ThemedText>
          </View>
        ))}
      </View>

      {/*
        Diese Einschränkung gehört sichtbar in die App, nicht nur ins
        Protokoll: die Zahlen sind sonst leicht als vollständige Lernhistorie
        misszuverstehen.
      */}
      <ThemedText type="small" themeColor="textSecondary">
        {stats.loggedSince
          ? `Protokolliert seit ${stats.loggedSince} · insgesamt ${stats.totalReviews} Wiederholungen${
              stats.totalDrills > 0
                ? ` und ${stats.totalDrills} Übungsaufgaben, davon ${stats.totalDrillsCorrect} richtig`
                : ''
            }. Frühere Sitzungen sind nicht enthalten — das Tagesprotokoll wurde erst mit dieser Version eingeführt.`
          : 'Noch keine Wiederholungen protokolliert. Die Historie beginnt mit der ersten bewerteten Karte; frühere Sitzungen sind nicht enthalten.'}
      </ThemedText>
    </ThemedView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function CardStates({ stats }: { stats: LearningStats }) {
  const toneColor = useToneColor();
  const total = Math.max(1, stats.totalCards);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Kartenzustände</ThemedText>

      <View style={styles.stackedBar}>
        {CARD_STATE_ORDER.map((state) => {
          const count = stats.cardStates[state];
          if (count === 0) return null;
          return (
            <View
              key={state}
              style={{
                flexGrow: count,
                flexBasis: 0,
                backgroundColor: toneColor(STATE_TONES[state]),
              }}
            />
          );
        })}
      </View>

      <View style={styles.legend}>
        {CARD_STATE_ORDER.map((state) => (
          <View key={state} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: toneColor(STATE_TONES[state]) }]} />
            <ThemedText type="small">{CARD_STATE_LABELS[state]}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {stats.cardStates[state]} ({Math.round((stats.cardStates[state] / total) * 100)} %)
            </ThemedText>
          </View>
        ))}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        „Gemeistert" heißt: die berechnete Stabilität liegt über 21 Tagen.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  tile: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 150,
    minWidth: 0,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  tileValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  bigNumber: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
  },
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
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.half,
    height: 150,
    marginTop: Spacing.one,
  },
  barColumn: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: 'center',
    height: '100%',
  },
  barValue: {
    fontSize: 11,
    lineHeight: 14,
  },
  barTrack: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 11,
    lineHeight: 16,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
