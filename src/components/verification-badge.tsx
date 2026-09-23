import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import type { VocabEntry } from '@/data/vocab-types';

/**
 * Kennzeichen für Einträge, deren Bedeutung die Quelle nicht sauber deckt.
 *
 * Bewusst sichtbar, aber zurückhaltend: solche Karten sollen nicht mit
 * derselben Selbstverständlichkeit dastehen wie geprüfte, aber auch nicht
 * versteckt werden. Antippen zeigt den Grund aus `verificationNote`.
 *
 * Geprüfte Einträge bekommen gar kein Abzeichen — sonst wäre das Kennzeichen
 * überall und würde nichts mehr unterscheiden.
 */
export function VerificationBadge({ entry }: { entry: VocabEntry }) {
  const [open, setOpen] = useState(false);

  if (entry.sourceVerified || entry.verificationNote?.startsWith('KI-')) return null;

  return (
    <ThemedView type="backgroundSelected" style={styles.wrapper}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Hinweis zur Quellenlage anzeigen"
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        {/* Badge-Token statt hart codiertem #AE8B3F: mit Dunkelmodus-Fassung
            und AA-Kontrast auf allen Untergründen (nachgerechnet in
            `tones.test.ts`). */}
        <ThemedText type="small" themeColor="badge">
          ⚠
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          Bedeutung nicht quellengeprüft
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {open ? '▲' : '▼'}
        </ThemedText>
      </Pressable>

      {open ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {entry.verificationNote ?? 'Kein weiterer Hinweis hinterlegt.'}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    flexShrink: 1,
  },
  note: {
    paddingBottom: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
