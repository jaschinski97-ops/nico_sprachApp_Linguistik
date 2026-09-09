import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocale } from '@/lib/i18n';
import { LanguageCode } from '@/lib/languages/types';
import { directionLabel, DirectionSummary, summarizeAllDirections } from '@/lib/review-session';

/**
 * Fällige Karten je Lernrichtung — bewusst getrennt, nicht als eine Zahl.
 *
 * „Deutsch für Thailänder“ und „Thai für Deutsche“ sind unterschiedliche
 * Lernprobleme mit eigenem Kartenbestand. Eine gemeinsame Summe würde
 * verschleiern, dass eine Richtung schon lange liegen geblieben ist.
 */
export type DirectionSummaries = {
  summaries: DirectionSummary[] | null;
  error: string | null;
};

/**
 * Lädt die Richtungs-Zahlen einer Sprache. Mit `enabled = false` bleibt der
 * Lauf aus: Die Übersicht hebt diesen Zustand einmal hierher, zeigt daraus
 * ihr CTA-Badge und reicht ihn durch — EIN Lesevorgang versorgt beide.
 */
export function useDirectionSummaries(language: LanguageCode, enabled = true): DirectionSummaries {
  const [summaries, setSummaries] = useState<DirectionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setSummaries(null);
    setError(null);
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
  }, [language, enabled]);

  return { summaries, error };
}

export function DirectionDashboard({
  language,
  loaded,
}: {
  language: LanguageCode;
  /** Von der Übersicht durchgereichter Ladezustand — fehlt er, lädt die Komponente selbst. */
  loaded?: DirectionSummaries;
}) {
  const internal = useDirectionSummaries(language, loaded === undefined);
  const state = loaded ?? internal;
  const theme = useTheme();
  const { t } = useLocale();

  if (state.error) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t('dashboard.title')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('common.loadFailed', { message: state.error })}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!state.summaries) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t('dashboard.title')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('dashboard.loading')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View>
      {state.summaries.map((summary, index) => {
        const label = directionLabel(summary.direction);
        return (
          <View key={summary.direction}>
            {/* Die ganze Zeile ist der Tippziebel; die Fällig-Zahl steckt im
                Ansagetext, damit der Screenreader beide Infos auf einmal hat.
                Die Zeilenfläche liegt auf dem inneren View, denn der
                asChild-Klon des Links ersetzt den Pressable-Style (im
                Web-Build gemessen) — dort wäre die Zeile unformatiert. */}
            <Link
              href={{ pathname: '/review', params: { direction: summary.direction } }}
              asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('dashboard.cta', { direction: label })} — ${t(
                  'home.dueBadge',
                  { count: summary.due }
                )}`}
                style={({ pressed }) => pressed && styles.pressed}>
                <View
                  style={[
                    styles.row,
                    // Haarlinien nur zwischen den Zeilen — an der ersten fehlt
                    // der Partner, den sie trennen könnte.
                    index > 0 && { borderTopWidth: 1, borderColor: theme.decorGrey },
                  ]}>
                  <ThemedText type="default" style={styles.name}>
                    {label}
                  </ThemedText>

                  <ThemedView type="accent" style={styles.badge}>
                    <ThemedText type="smallBold" themeColor="accentText">
                      {t('home.dueBadge', { count: summary.due })}
                    </ThemedText>
                  </ThemedView>
                </View>
              </Pressable>
            </Link>

            <ThemedText type="small" themeColor="textSecondary" style={styles.totals}>
              {t('dashboard.totals', {
                total: summary.total,
                fresh: summary.fresh,
                mastered: summary.mastered,
              })}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingVertical: Spacing.two,
  },
  name: {
    fontWeight: '600',
    flexShrink: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  totals: {
    marginTop: Spacing.half,
    marginBottom: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
