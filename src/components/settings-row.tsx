import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  /** Erklärende Unterzeile — steht erst hier, nicht als Block davor. */
  detail?: string;
  /** Aktueller Wert rechts vom Titel (Einstellungsübersicht). */
  value?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Bei eingebauten (Akkordeon-)Zeilen gedrehter Pfeil statt Offenheits-Text. */
  expanded?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

/**
 * Eine Zeile der Einstellungs-Listen (UI-Review 10.09.): Bezeichnung links,
 * aktueller Wert rechts, kleiner Pfeil — Erklärungen erscheinen erst beim
 * Öffnen. Die Gruppe drumherum läuft mit `gap: 1` und `overflow: hidden`, die
 * 1-px-Lücken zwischen den Zeilen wirken so als Haarlinien.
 */
export function SettingsRow({ title, detail, value, icon, expanded, disabled, onPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled: disabled === true, expanded }}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      <ThemedView type="backgroundElement" style={styles.row}>
        {icon ? (
          <Ionicons name={icon} size={20} color={theme.textSecondary} accessible={false} />
        ) : null}
        <View style={styles.texts}>
          <ThemedText type="smallBold">{title}</ThemedText>
          {detail ? (
            <ThemedText type="small" themeColor="textSecondary">
              {detail}
            </ThemedText>
          ) : null}
        </View>
        {value ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.value}>
            {value}
          </ThemedText>
        ) : null}
        {onPress ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.textSecondary}
            accessible={false}
            style={expanded ? styles.chevronOpen : undefined}
          />
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  texts: {
    flexShrink: 1,
    gap: 1,
  },
  value: {
    flexShrink: 1,
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  pressed: {
    opacity: 0.7,
  },
});
