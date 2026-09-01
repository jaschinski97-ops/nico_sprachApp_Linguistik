/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { ColorScheme, Tone, toneColor } from '@/constants/tones';
import { useColorScheme } from '@/hooks/use-color-scheme';

function activeScheme(scheme: ReturnType<typeof useColorScheme>): ColorScheme {
  return scheme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[activeScheme(useColorScheme())];
}

/**
 * Die Tonfarben des aktuellen Anzeigemodus.
 *
 * Seit Phase 9 hat jeder Ton zwei Farben (AE-24). Wer eine braucht, holt sie
 * hier — dann kann sie nicht mehr aus dem falschen Modus stammen.
 */
export function useToneColor(): (tone: Tone) => string {
  const scheme = activeScheme(useColorScheme());
  return (tone: Tone) => toneColor(tone, scheme);
}
