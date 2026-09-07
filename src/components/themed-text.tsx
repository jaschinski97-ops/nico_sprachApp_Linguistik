import { Platform, PixelRatio, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'thaiLarge'
    | 'thaiMedium'
    | 'stat';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        // linkPrimary nutzt das Link-Token statt einer hart codierten Farbe —
        // damit hat es automatisch eine Dunkelmodus-Fassung mit AA-Kontrast.
        { color: theme[themeColor ?? (type === 'linkPrimary' ? 'link' : 'text')] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        type === 'thaiLarge' && styles.thaiLarge,
        type === 'thaiMedium' && styles.thaiMedium,
        type === 'stat' && styles.stat,
        style,
      ]}
      {...rest}
    />
  );
}

/**
 * Zeilenhöhe für großen Anzeigetext unter Systemschrift-Vergrößerung (UI-Review
 * 2026-09-07).
 *
 * WHY A FUNCTION: `lineHeight` in React Native does not grow with the system
 * font scale — but `fontSize` does, when `maxFontSizeMultiplier` allows it. A
 * fixed lineHeight therefore clips exactly those glyphs that are largest to
 * begin with (Thai vowels and tone marks above and below the base line). The
 * companion call is a `maxFontSizeMultiplier` with the same cap on the Text:
 *
 *   <ThemedText type="thaiLarge" maxFontSizeMultiplier={1.4}
 *     style={{ lineHeight: displayLineHeight(56, 1.4) }} />
 *
 * At normal font scale this results in the same values as the stylesheet.
 */
export function displayLineHeight(base: number, cap: number, factor = 1.4): number {
  const scale = Math.min(PixelRatio.getFontScale(), cap);
  return Math.ceil(base * scale * factor);
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
  /** Very large display text in Thai script (flashcard front, ThaiWord). */
  thaiLarge: {
    fontSize: 56,
    lineHeight: 80,
    fontWeight: '600',
    textAlign: 'center',
  },
  /** Medium-sized display text in Thai script (ThaiWord, exercise prompts). */
  thaiMedium: {
    fontSize: 32,
    lineHeight: 46,
    fontWeight: '600',
    textAlign: 'center',
  },
  /** Large key figures (progress tiles, fällige Karten). */
  stat: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
  },
});
