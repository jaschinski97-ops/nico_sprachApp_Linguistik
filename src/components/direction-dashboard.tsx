import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText, displayLineHeight } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { LanguageCode } from '@/lib/languages/types';
import { directionLabel, DirectionSummary, summarizeAllDirections } from '@/lib/review-session';

/**
 * Fällige Karten je Lernrichtung — bewusst getrennt, nicht als eine Zahl.
 *
 * „Deutsch für Thailänder" und „Thai für Deutsche" sind unterschiedliche
 * Lernprobleme mit eigenem Kartenbestand. Eine gemeinsame Summe würde
 * verschleiern, dass eine Richtung schon lange liegen geblieben ist.
 */
export function DirectionDashboard({ language }: { language: LanguageCode }) {
  const [summaries, setSummaries] = useState<DirectionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSummaries(null);
    summarizeAllDirections(language)
      .then((result) => {
        if (!cancelled) setSummaries(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  if (error) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Fällige Karten</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Konnte nicht geladen werden: {error}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!summaries) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Fällige Karten</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Lade Kartenstand …
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.grid}>
      {summaries.map((summary) => (
        // Die Flex-Größe hängt bewusst an diesem View und nicht am Pressable:
        // `Link asChild` macht aus dem Pressable ein <a>, und das wuchs im
        // Web-Build nicht auf die Spaltenbreite, sondern blieb bei seiner
        // Inhaltsbreite stehen — beide Karten waren dadurch unterschiedlich
        // breit. Ein neutrales View als Flex-Kind verhält sich verlässlich.
        <View key={summary.direction} style={styles.cell}>
          <Link
            href={{ pathname: '/review', params: { direction: summary.direction } }}
            asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${directionLabel(summary.direction)} lernen, ${summary.due} Karten fällig`}
              style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">
                  {directionLabel(summary.direction)}
                </ThemedText>

                <View style={styles.numbers}>
                  {/* Gleiche Kennzahl-Stufe wie die Kacheln im Fortschritts
                      Reiter (`stat`) — dieselbe Aussage, dieselbe Schrift
                      (UI-Review 2026-09-07). */}
                  <ThemedText
                    type="stat"
                    maxFontSizeMultiplier={2}
                    style={{ lineHeight: displayLineHeight(34, 2, 1.17) }}>
                    {summary.due}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {summary.due === 1 ? 'Karte fällig' : 'Karten fällig'}
                  </ThemedText>
                </View>

                <ThemedText type="small" themeColor="textSecondary">
                  {summary.total} Karten gesamt · {summary.fresh} neu ·{' '}
                  {summary.mastered} gemeistert
                </ThemedText>

                <ThemedView type="backgroundSelected" style={styles.cta}>
                  <ThemedText type="small">Diese Richtung üben →</ThemedText>
                </ThemedView>
              </ThemedView>
            </Pressable>
          </Link>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  cell: {
    // Zwei Spalten im breiten Fenster, eine auf dem Handy: die Zelle darf
    // schrumpfen, bricht aber unter ~260px auf eine eigene Zeile um.
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 260,
    minWidth: 0,
  },
  pressable: {
    width: '100%',
    height: '100%',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    height: '100%',
  },
  numbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  cta: {
    marginTop: 'auto',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
});
