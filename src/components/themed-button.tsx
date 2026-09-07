import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  /** Beschriftung — sichtbar und (ohne eigenen Override) auch die Screenreader-Ansage. */
  label: string;
  /**
   * `primary` — Akzentfläche für den jeweils wichtigsten nächsten Schritt
   * (Aufdecken, Weiter, Aufnahme starten). `secondary` ist der bestehende
   * graue Chip für alles Übrige; so bleibt die Akzentfarbe eine Aussage
   * darüber, was als Nächstes zu tun ist, statt bloßer Schmuck.
   */
  variant?: 'primary' | 'secondary';
};

/**
 * Der gemeinsame Knopf (UI-Review 2026-09-07).
 *
 * Bis hierher rollte jede Datei ihr eigenes Pressable-Muster: gleiche Optik,
 * aber je eigene Mindesthöhe, eigenen Disabled-Zustand, eigene Pressed-Opacity
 * — und die Kern-CTAs sahen aus wie jede Nebenaktion. Diese Komponente bündelt
 * das: mindestens 44 Punkte hoch (WCAG 2.2 AA 2.5.8; 44 ist der bequeme Wert
 * aus Apple HIG / Material), Pressed- und Disabled-Zustand, `button`-Rolle.
 */
export function ThemedButton({ label, variant = 'secondary', disabled, ...rest }: ThemedButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}
      {...rest}>
      <ThemedView
        type={primary ? 'background' : 'backgroundSelected'}
        style={[styles.button, primary && { backgroundColor: theme.accent }]}>
        <ThemedText type={primary ? 'smallBold' : 'small'} themeColor={primary ? 'accentText' : 'text'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
