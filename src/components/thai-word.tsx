import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ToneContour } from './tone-contour';

import { Spacing } from '@/constants/theme';
import { useToneColor } from '@/hooks/use-theme';
import { syllablesOf, uniformTone } from '@/data/vocab-helpers';
import { VocabEntry } from '@/data/vocabulary';

/**
 * Thai-Wort mit silbenweiser Tonfarbcodierung (AE-7).
 *
 * Jede Silbe der Umschrift bekommt die Farbe **ihres eigenen** Tons plus die
 * passende Konturglyphe. สวัสดี erscheint damit als drei verschieden gefärbte
 * Silben (tief-tief-mittel) statt einfarbig.
 *
 * Die Thai-Schrift selbst wird nur dann eingefärbt, wenn alle Silben denselben
 * Ton haben. Grund: die Datenlage kennt die Töne je Silbe, aber keine
 * verlässliche Silbengrenze in der Thai-Schrift — dort gibt es keine
 * Trennzeichen. ผลไม้ (`pǒn-lá-máai`, drei Silben) zeigt, warum ein naives
 * Aufteilen scheitern würde: die mittlere Silbe entsteht aus einem
 * Bindekonsonanten, den beide Nachbarn teilen. Lieber neutral als falsch
 * gefärbt — die Silbenfarben stehen an der Umschrift.
 */
export function ThaiWord({
  entry,
  size = 'large',
}: {
  entry: VocabEntry;
  size?: 'large' | 'medium';
}) {
  const syllables = syllablesOf(entry);
  const single = uniformTone(entry);
  const toneColor = useToneColor();

  return (
    <View style={styles.wrapper}>
      <ThemedText
        style={[
          size === 'large' ? styles.thaiLarge : styles.thaiMedium,
          single ? { color: toneColor(single) } : null,
        ]}>
        {entry.term}
      </ThemedText>

      <View style={styles.syllables}>
        {syllables.map((syllable, index) => (
          <View key={`${syllable.roman}-${index}`} style={styles.syllable}>
            <ToneContour tone={syllable.tone} height={12} />
            <ThemedText
              type={size === 'large' ? 'default' : 'small'}
              style={{ color: toneColor(syllable.tone) }}>
              {syllable.roman}
            </ThemedText>
            {index < syllables.length - 1 ? (
              <ThemedText type="small" themeColor="textSecondary">
                ·
              </ThemedText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  thaiLarge: {
    fontSize: 56,
    lineHeight: 78,
    fontWeight: '600',
    textAlign: 'center',
  },
  thaiMedium: {
    fontSize: 32,
    lineHeight: 46,
    fontWeight: '600',
    textAlign: 'center',
  },
  syllables: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  syllable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
