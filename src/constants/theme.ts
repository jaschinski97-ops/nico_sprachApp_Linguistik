/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    // Semantische Tokens (UI-Review 2026-09-07). Bis hierher kannte das Theme
    // nur Grautöne und die fünf Tonfarben — jede aussagekräftige Farbe war
    // woanders hart codiert (z. B. #3c87f7 für Links, ohne Dunkelmodus-Fassung).
    // Wie bei den Tonfarben (AE-24) gilt: Werte je Modus, AA nachgerechnet in
    // `tones.test.ts`.
    /** Fläche der jeweils wichtigsten Aktion (gefüllter Knopf). */
    accent: '#1a4f9e',
    /** Schrift auf der Akzentfläche. */
    accentText: '#ffffff',
    /** Textlinks — gedecktes Blau in der Richtung der alten #3c87f7, aber AA-tauglich. */
    link: '#0e4daa',
    /** „Richtig" — bewusst ein gesättigtes Grün, nicht die matte Tonfarbe „mittel". */
    success: '#14602f',
    /** „Falsch" — bewusst ein Purpurrot, nicht das terracotta-farbene „fallend". */
    error: '#9c1c3a',
    /** Warnkennzeichen für unbelegte Bedeutungen (früher hart codiertes #AE8B3F). */
    badge: '#6b4e0d',
    /** Dezente Steuerkannte (Knopf-Rahmen, gestrichelte Leer-Rahmen). */
    borderSubtle: '#7a7e85',
    /** Rein dekorative Flächen (Punktmuster, Fortschritts-Schiene) — kein AA-Maß. */
    decorGrey: '#a6a7ab',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    accent: '#8ab5f5',
    accentText: '#0d2a55',
    link: '#94bcf7',
    success: '#86c998',
    error: '#f2a8b6',
    badge: '#d8ba7c',
    borderSubtle: '#94979e',
    decorGrey: '#55585e',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
