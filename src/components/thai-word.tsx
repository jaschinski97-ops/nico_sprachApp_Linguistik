import { StyleSheet, View } from 'react-native';

import { ThemedText, displayLineHeight } from './themed-text';
import { ToneContour } from './tone-contour';

import { Spacing } from '@/constants/theme';
import { useToneColor } from '@/hooks/use-theme';
import { syllablesOf, uniformTone } from '@/data/vocab-helpers';
import { VocabEntry } from '@/data/vocab-types';

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
  // Skalierungsschutz (UI-Review 2026-09-07): Die sehr große Fassung darf die
  // Systemschrift nur um den Faktor 1,4 vergrößern — mehr würde jede Karte
  // sprengen; die Zeilenhöhe wächst über `displayLineHeight` mit, damit die
  // oberen und unteren Thai-Diakritika nicht abgeschnitten werden.
  const cap = size === 'large' ? 1.4 : 2;

  return (
    <View style={styles.wrapper}>
      <ThemedText
        type={size === 'large' ? 'thaiLarge' : 'thaiMedium'}
        maxFontSizeMultiplier={cap}
        style={[
          { lineHeight: displayLineHeight(size === 'large' ? 56 : 32, cap) },
          single ? { color: toneColor(single) } : null,
        ]}>
        {entry.term}
      </ThemedText>

      <View style={styles.syllables}>
        {syllables.map((syllable, index) => (
          <View key={`${syllable.roman}-${index}`} style={styles.syllable}>
            {/* Seit Phase 16 ist der Ton im Typ optional - Spanisch und
                Englisch haben keinen. Hier kommen nur Thai-Eintraege an;
                sollte doch einmal eine Silbe ohne Ton auftauchen, bleibt sie
                ungefaerbt statt in einer geratenen Farbe. */}
            {syllable.tone ? <ToneContour tone={syllable.tone} height={12} /> : null}
            <ThemedText
              type={size === 'large' ? 'default' : 'small'}
              style={syllable.tone ? { color: toneColor(syllable.tone) } : null}>
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
