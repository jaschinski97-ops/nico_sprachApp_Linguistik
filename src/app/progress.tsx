import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LanguageSwitch } from '@/components/language-switch';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText, displayLineHeight } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Tone } from '@/constants/tones';
import { useToneColor } from '@/hooks/use-theme';
import { drillCount } from '@/lib/review-log';
import { useLearnerLanguage } from '@/hooks/use-learner-language';
import { TranslationKey, monthNamesFor, useLocale } from '@/lib/i18n';
import { CARD_STATE_ORDER, LearningStats, loadLearningStats } from '@/lib/stats';

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

/** Kartenzustände als Übersetzungsschlüssel statt als deutsche Konstante. */
const STATE_KEYS: Record<string, TranslationKey> = {
  new: 'state.new',
  learning: 'state.learning',
  review: 'state.review',
  mastered: 'state.mastered',
};

/**
 * „2026-05-12" → „12. Mai" — dieselbe Information wie die Spaltenbeschriftung,
 * nur als ganze Ansage. Die Monatsnamen kommen aus der UI-Sprache.
 */
function tagLabel(date: string, months: readonly string[]): string {
  const tag = Number(date.slice(8, 10));
  const monat = months[Number(date.slice(5, 7)) - 1];
  return monat ? `${tag}. ${monat}` : date;
}

export default function ProgressScreen() {
  const { t, languageName, uiLanguage } = useLocale();
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { language, chooseLanguage } = useLearnerLanguage();

  useEffect(() => {
    let cancelled = false;
    // Der Fortschritt gehoert zum Sprachpaar (Phase 16): Nach einem Wechsel
    // auf Spanisch zeigte die Seite sonst weiter die Thai-Zahlen.
    loadLearningStats(undefined, Date.now(), 14, language)
      .then((result) => {
        if (!cancelled) setStats(result);
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
      <ScreenScaffold title={t('tabs.progress')} subtitle={t('progress.subtitle')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('common.loadFailed', { message: error })}
        </ThemedText>
      </ScreenScaffold>
    );
  }

  if (!stats) {
    return (
      <ScreenScaffold title={t('tabs.progress')} subtitle={t('progress.subtitle')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('progress.loading')}
        </ThemedText>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      title={t('tabs.progress')}
      subtitle={t('progress.subtitleLanguage', { language: languageName(language) })}>
      <LanguageSwitch selected={language} onSelect={chooseLanguage} />

      <View style={styles.grid}>
        <Tile label={t('tile.reviewsToday')} value={String(stats.reviewsToday)} />
        <Tile label={t('tile.drillsToday')} value={String(stats.drillsToday)} hint={t('tile.drillsHint')} />
        <Tile
          label={t('tile.streak')}
          value={String(stats.streak)}
          hint={stats.streak === 1 ? t('tile.dayOne') : t('tile.dayMany')}
        />
        {/* SEIT PHASE 18 KEIN BESTAND MEHR, sondern Erarbeitetes: „168 Karten
            gesamt" ist die Groesse des Stapels und sagt ueber den Fortschritt
            nichts. Begonnen heisst: mindestens einmal bewertet. */}
        <Tile label={t('tile.started')} value={String(stats.totalCards - stats.cardStates.new)} />
        <Tile label={t('tile.mastered')} value={String(stats.cardStates.mastered)} />
      </View>

      <ReviewChart stats={stats} months={monthNamesFor(uiLanguage)} />
      <CardStates stats={stats} />

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
        {/* `stat` ist die gemeinsame Stufe für Kennzahlen (UI-Review
            2026-09-07); die Zeilenhöhe wächst mit der Systemschrift mit. */}
        <ThemedText
          type="stat"
          maxFontSizeMultiplier={2}
          style={{ lineHeight: displayLineHeight(34, 2, 1.17) }}>
          {value}
        </ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
    </ThemedView>
  );
}

function ReviewChart({ stats, months }: { stats: LearningStats; months: readonly string[] }) {
  // Wiederholungen und Uebungen werden gestapelt, nicht summiert dargestellt:
  // beides ist Lernzeit, aber nur die Wiederholungen laufen durch FSRS
  // (AE-16). Eine gemeinsame Saeule ohne Trennung wuerde die Beschriftung
  // "Wiederholungen" zur Unwahrheit machen.
  const toneColor = useToneColor();
  const { t } = useLocale();
  const max = Math.max(1, ...stats.days.map((day) => day.total + drillCount(day)));

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{t('chart.perDay')}</ThemedText>
      <View style={styles.legend}>
        <LegendDot color={toneColor('mid')} label={t('chart.legendReviews')} />
        <LegendDot color={toneColor('high')} label={t('chart.legendDrills')} />
      </View>

      <View style={styles.chart}>
        {stats.days.map((day) => (
          // Screenreader: Eine Spalte = EINE Ansage mit Datum und beiden Werten
          // (UI-Review 2026-09-07). Balken, Ziffer und Tageszahl sind
          // Verzierungen derselben Information und werden versteckt — sonst
          // liest der Reader „12, 12, 8, 3, 12“ statt einem Satz.
          <View
            key={day.date}
            style={styles.barColumn}
            accessible
            accessibilityLabel={t('chart.columnA11y', {
              date: tagLabel(day.date, months),
              reviews: day.total,
              drills: drillCount(day),
            })}>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.barValue}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
              {day.total + drillCount(day) > 0 ? day.total + drillCount(day) : ''}
            </ThemedText>
            <View
              style={styles.barTrack}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
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
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.barLabel}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
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
          ? stats.totalDrills > 0
            ? t('chart.loggedSinceWithDrills', {
                since: stats.loggedSince,
                reviews: stats.totalReviews,
                drills: stats.totalDrills,
                correct: stats.totalDrillsCorrect,
              })
            : t('chart.loggedSince', {
                since: stats.loggedSince,
                reviews: stats.totalReviews,
              })
          : t('chart.empty')}
      </ThemedText>
    </ThemedView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      {/* Farbfläche ist Dekoration — die Information trägt der Text daneben. */}
      <View
        style={[styles.swatch, { backgroundColor: color }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * Wie das Erarbeitete verteilt ist.
 *
 * SEIT PHASE 18 OHNE DEN ZUSTAND „neu". Er machte am Anfang 100 % aus, und
 * ein Balken, der zu hundert Prozent „noch nicht angefangen" anzeigt, ist
 * keine Fortschrittsanzeige, sondern die Größe des Stapels. Wie viele Karten
 * noch warten, steht darunter als Satz — als Auskunft, nicht als Balken.
 */
function CardStates({ stats }: { stats: LearningStats }) {
  const toneColor = useToneColor();
  const { t } = useLocale();
  const zustaende = CARD_STATE_ORDER.filter((state) => state !== 'new');
  const begonnen = zustaende.reduce((sum, state) => sum + stats.cardStates[state], 0);
  const offen = stats.cardStates.new;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{t('states.title')}</ThemedText>

      {begonnen === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('states.empty')}
        </ThemedText>
      ) : (
        <>
          {/* Als EINE Ansage statt fünf namenloser Farbsegmente: die Anteile
              stehen ohnehin darunter, hier sagt sie der Screenreader komplett
              (UI-Review 2026-09-07). */}
          <View
            style={styles.stackedBar}
            accessible
            accessibilityLabel={t('states.distributionA11y', {
              parts: zustaende
                .filter((state) => stats.cardStates[state] > 0)
                .map((state) => `${t(STATE_KEYS[state])} ${stats.cardStates[state]}`)
                .join(', '),
            })}>
            {zustaende.map((state) => {
              const count = stats.cardStates[state];
              if (count === 0) return null;
              return (
                <View
                  key={state}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
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
            {zustaende.map((state) => (
              <View key={state} style={styles.legendItem}>
                <View
                  style={[styles.swatch, { backgroundColor: toneColor(STATE_TONES[state]) }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <ThemedText type="small">{t(STATE_KEYS[state])}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {stats.cardStates[state]} ({Math.round((stats.cardStates[state] / begonnen) * 100)}{' '}
                  %)
                </ThemedText>
              </View>
            ))}
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            {t('states.masteredNote')}
          </ThemedText>
        </>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        {offen === 0
          ? t('states.allStarted')
          : t('states.notStarted', { count: offen, total: stats.totalCards })}
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
