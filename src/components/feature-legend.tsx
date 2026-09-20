import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { ToneLegend } from './tone-legend';

import { Spacing } from '@/constants/theme';
import { VOCABULARY_ES } from '@/data/vocabulary';
import { useLocale } from '@/lib/i18n';
import { useTheme, useToneColor } from '@/hooks/use-theme';
import { LanguageCode } from '@/lib/languages/types';
import { graphemeGroups } from '@/lib/spelling/graphemes';
import { analyzeStress } from '@/lib/stress/syllables';

/**
 * Die Merkhilfe zur gewählten Sprache — je Sprache ihre eigene (Phase 18).
 *
 * BIS HIERHER GAB ES NUR DIE TONFARBEN, und die gehören zu Thai. Für Spanisch
 * und Englisch stand an derselben Stelle nichts, obwohl beide Sprachen genau
 * so ein Merkmal haben, an dem sich alles aufhängt — es ist nur ein anderes.
 * Diese Datei verteilt auf die drei Darstellungen.
 *
 * WAS ALLE DREI GEMEINSAM HABEN: Sie zeigen **eine** Sache, die man einmal
 * verstehen muss und danach überall wiedererkennt.
 *
 *   Thai      — fünf Töne, je Silbe einer, farbig und als Kontur.
 *   Spanisch  — zwei Regeln und eine Ausnahme, als Silbenmuster.
 *   Englisch  — dieselben Buchstaben, verschiedene Laute. Das ist keine Regel,
 *               sondern der Befund aus AE-44, und genau so steht es da.
 *
 * NICHTS DAVON IST GETIPPT: Die Beispiele für Spanisch werden aus dem
 * Grundstock gesucht (das erste Wort, auf das die jeweilige Regel greift), die
 * englischen Gruppen kommen aus `lib/spelling`. Wer den Grundstock ändert,
 * ändert die Legende mit.
 */
export function FeatureLegend({
  language,
  compact = false,
}: {
  language: LanguageCode;
  compact?: boolean;
}) {
  if (language === 'th') return <ToneLegend compact={compact} />;
  if (language === 'es') return <StressLegend compact={compact} />;
  return <SpellingLegend compact={compact} />;
}

/* ---------- Spanisch: die Betonungsregel als Silbenmuster ---------- */

type StressRow = {
  rule: 'penultimate' | 'final' | 'acute';
  label: string;
  detail: string;
  /** Ein Wort aus dem Grundstock, auf das genau diese Regel greift. */
  word: string;
  syllables: string[];
  stressedIndex: number;
};

/** Die drei Betonungsregeln als Übersetzungsschlüssel (auch der Hero nutzt sie). */
export const STRESS_RULE_KEYS = {
  penultimate: { label: 'legend.stressRulePenultimate', detail: 'legend.stressDetailPenultimate' },
  final: { label: 'legend.stressRuleFinal', detail: 'legend.stressDetailFinal' },
  acute: { label: 'legend.stressRuleAcute', detail: 'legend.stressDetailAcute' },
} as const;

function StressLegend({ compact }: { compact: boolean }) {
  const { t } = useLocale();

  // Beispiele aus dem Grundstock statt aus dem Kopf: das erste mehrsilbige
  // Wort, auf das die jeweilige Regel greift.
  const rows = useMemo<StressRow[]>(() => {
    const out: StressRow[] = [];
    for (const rule of ['penultimate', 'final', 'acute'] as const) {
      for (const entry of VOCABULARY_ES) {
        const analysis = analyzeStress(entry.term);
        if (!analysis.ok || analysis.rule !== rule) continue;
        if (analysis.syllables.length < 2) continue;
        out.push({
          rule,
          label: t(STRESS_RULE_KEYS[rule].label),
          detail: t(STRESS_RULE_KEYS[rule].detail),
          word: entry.term,
          syllables: analysis.syllables,
          stressedIndex: analysis.stressedIndex,
        });
        break;
      }
    }
    return out;
    // Die Regeln stehen in der UI-Sprache — ein Sprachwechsel baut sie neu.
  }, [t]);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{t('legend.stressTitle')}</ThemedText>
      {!compact ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('legend.stressBody')}
        </ThemedText>
      ) : null}

      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.rule} style={styles.row}>
            <SyllablePattern count={row.syllables.length} stressed={row.stressedIndex} />
            <View style={styles.rowText}>
              <ThemedText type="small">
                {row.syllables.map((syllable, index) => (
                  <ThemedText
                    key={index}
                    type="small"
                    style={index === row.stressedIndex ? styles.stressed : undefined}>
                    {index > 0 ? '·' : ''}
                    {syllable}
                  </ThemedText>
                ))}
                <ThemedText type="small" themeColor="textSecondary">
                  {'  '}
                  {row.detail}
                </ThemedText>
              </ThemedText>
              {!compact ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {row.label}
                </ThemedText>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {!compact ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('legend.stressAcuteNote')}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

/**
 * Das Silbenmuster als Punktreihe — das Gegenstück zur Tonkontur.
 *
 * Die betonte Silbe ist größer und trägt die Akzentfarbe der App, die auch
 * ausgewählte Knöpfe umrandet. Bewusst **keine** der fünf Tonfarben: Die
 * bedeuten Töne, und ein Ton ist keine Betonung (Pflicht 3 aus Phase 15).
 */
function SyllablePattern({ count, stressed }: { count: number; stressed: number }) {
  const theme = useTheme();
  const toneColor = useToneColor();
  return (
    <View style={styles.pattern} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === stressed
              ? { width: 12, height: 12, borderRadius: 6, backgroundColor: toneColor('mid') }
              : { backgroundColor: theme.decorGrey },
          ]}
        />
      ))}
    </View>
  );
}

/* ---------- Englisch: dieselbe Schreibung, verschiedene Laute ---------- */

function SpellingLegend({ compact }: { compact: boolean }) {
  const groups = useMemo(() => graphemeGroups(), []);
  const { t } = useLocale();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{t('legend.spellingTitle')}</ThemedText>
      {!compact ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('legend.spellingBody')}
        </ThemedText>
      ) : null}

      <View style={styles.rows}>
        {groups.map((group) => (
          <View key={group.grapheme} style={styles.spellingRow}>
            <ThemedView type="backgroundSelected" style={styles.grapheme}>
              <ThemedText type="smallBold">{group.grapheme}</ThemedText>
            </ThemedView>
            <View style={styles.spellingWords}>
              {group.members.filter((member, index, members) => members.findIndex(other => other.sound === member.sound) === index).map((member) => (
                <ThemedText key={member.entry.id} type="small" themeColor="textSecondary">
                  <ThemedText type="small">{member.entry.term}</ThemedText> {member.sound}
                </ThemedText>
              ))}
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
  rows: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowText: {
    flexShrink: 1,
  },
  pattern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    width: 52,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stressed: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  spellingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  grapheme: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
    minWidth: 56,
    alignItems: 'center',
  },
  spellingWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    flexShrink: 1,
  },
});
