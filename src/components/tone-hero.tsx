import { StyleSheet, View } from 'react-native';

import { ThemedText, displayLineHeight } from './themed-text';

import { Spacing } from '@/constants/theme';
import { Tone } from '@/constants/tones';
import { useTheme, useToneColor } from '@/hooks/use-theme';

/**
 * HARDEINGABE BEWUSST: สวัสดี ist Lerninhalt und Markenwort der Übersicht —
 * kein UI-Text, den i18n übersetzen dürfte. Deshalb stehen auch Umschrift und
 * Ansage als Konstanten hier und nicht im Wörterbuch.
 */
const SEGMENTS: { text: string; tone: Tone }[] = [
  { text: 'สวัส', tone: 'low' },
  { text: 'ดี', tone: 'mid' },
];

const SYLLABLES: { text: string; tone: Tone }[] = [
  { text: 'sà', tone: 'low' },
  { text: 'wàt', tone: 'low' },
  { text: 'dii', tone: 'mid' },
];

/**
 * Identity-Hero der Übersicht (UI-Review 2026-09-09): Das Wort, um das alles
 * kreist, groß und in seinen Tönen — bevor irgendwo ein Knopf steht.
 *
 * Die Segmente dürfen gefärbt werden, obwohl `ThaiWord` die Thai-Schrift
 * einfarbig lässt: Dort muss die Silbenteilung aus Daten hergeleitet werden
 * und ist unzuverlässig (Bindekonsonanten), hier steht ein handverifizierter
 * fester Schnitt (สวัส | ดี) eines einzelnen Markenworts.
 */
export function ToneHero() {
  const toneColor = useToneColor();
  const theme = useTheme();

  return (
    // EINE Ansage fürs Ganze: Wort und Umschrift sind zusammen ein Inhalt.
    // Balken und Trennpunkte sind Dekor und bleiben dem Screenreader verborgen.
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel="สวัสดี — sà wàt dii"
      importantForAccessibility="no-hide-descendants"
      style={styles.wrapper}>
      <View style={styles.word}>
        {SEGMENTS.map((segment) => (
          <View key={segment.text} style={styles.segment}>
            <ThemedText
              maxFontSizeMultiplier={1.4}
              style={[
                styles.thai,
                { color: toneColor(segment.tone), lineHeight: displayLineHeight(64, 1.4) },
              ]}>
              {segment.text}
            </ThemedText>
            <View style={[styles.bar, { backgroundColor: toneColor(segment.tone) }]} />
          </View>
        ))}
      </View>

      <View style={styles.translit}>
        {SYLLABLES.map((syllable, index) => (
          <View key={syllable.text} style={styles.translitItem}>
            {index > 0 ? (
              <ThemedText style={[styles.sep, { color: theme.decorGrey }]}>·</ThemedText>
            ) : null}
            <ThemedText
              maxFontSizeMultiplier={1.4}
              style={[styles.translitText, { color: toneColor(syllable.tone) }]}>
              {syllable.text}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
  },
  word: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  segment: {
    // Streckt den Tonfarben-Balken auf die Breite seines eigenen Segments.
    alignItems: 'stretch',
  },
  thai: {
    fontSize: 64,
    fontWeight: '600',
  },
  bar: {
    height: 3,
    borderRadius: 2,
    marginTop: Spacing.half,
  },
  translit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  translitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  translitText: {
    fontSize: 20,
    fontWeight: '500',
  },
  sep: {
    fontSize: 20,
    marginHorizontal: Spacing.two,
  },
});
