import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { ToneLegend } from './tone-legend';

import { Spacing } from '@/constants/theme';
import { VOCABULARY_ES } from '@/data/vocabulary';
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

const STRESS_ROWS: { rule: StressRow['rule']; label: string; detail: string }[] = [
  {
    rule: 'penultimate',
    label: 'Endet auf Vokal, „n" oder „s"',
    detail: 'vorletzte Silbe',
  },
  {
    rule: 'final',
    label: 'Endet auf einen anderen Konsonanten',
    detail: 'letzte Silbe',
  },
  {
    rule: 'acute',
    label: 'Ein Akut steht geschrieben',
    detail: 'genau dort — die Regel ist außer Kraft',
  },
];

function StressLegend({ compact }: { compact: boolean }) {

  // Beispiele aus dem Grundstock statt aus dem Kopf: das erste mehrsilbige
  // Wort, auf das die jeweilige Regel greift.
  const rows = useMemo<StressRow[]>(() => {
    const out: StressRow[] = [];
    for (const row of STRESS_ROWS) {
      for (const entry of VOCABULARY_ES) {
        const analysis = analyzeStress(entry.term);
        if (!analysis.ok || analysis.rule !== row.rule) continue;
        if (analysis.syllables.length < 2) continue;
        out.push({
          ...row,
          word: entry.term,
          syllables: analysis.syllables,
          stressedIndex: analysis.stressedIndex,
        });
        break;
      }
    }
    return out;
  }, []);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Betonung</ThemedText>
      {!compact ? (
        <ThemedText type="small" themeColor="textSecondary">
          Welche Silbe betont wird, steht in der Schreibung — zwei Regeln und
          eine Ausnahme. Wer sie kennt, muss die Betonung bei keinem neuen Wort
          nachschlagen.
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
          Ein Akut auf „i" oder „u" tut noch etwas anderes: Er trennt zwei
          Vokale, die sonst eine Silbe wären — „día" hat deshalb zwei.
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

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Aussprache</ThemedText>
      {!compact ? (
        <ThemedText type="small" themeColor="textSecondary">
          Anders als bei Thai und Spanisch gibt es hier keine Regel: Dieselbe
          Buchstabenfolge klingt von Wort zu Wort anders. Das ist kein Mangel
          dieser App, sondern der Befund — man muss sie Wort für Wort kennen.
        </ThemedText>
      ) : null}

      <View style={styles.rows}>
        {groups.map((group) => (
          <View key={group.grapheme} style={styles.spellingRow}>
            <ThemedView type="backgroundSelected" style={styles.grapheme}>
              <ThemedText type="smallBold">{group.grapheme}</ThemedText>
            </ThemedView>
            <View style={styles.spellingWords}>
              {group.members.map((member) => (
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
