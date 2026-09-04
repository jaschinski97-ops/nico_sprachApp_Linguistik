import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useToneColor } from '@/hooks/use-theme';
import { LANGUAGE_ORDER, languageOf, languagesWithContent } from '@/lib/languages/registry';
import { LanguageCode } from '@/lib/languages/types';

/**
 * Der kompakte Sprachwechsel für die Bereiche, die je Sprache arbeiten
 * (Phase 17, Ziel 4).
 *
 * WARUM ES IHN NEBEN DER GROSSEN AUSWAHL AUF DER ÜBERSICHT GIBT: Dieselbe
 * Überlegung wie bei der Standard-Lernrichtung (AE-17) — ein Standard darf
 * keine Einbahnstraße werden. Wer im Lernen-Bereich steht und merkt, dass er
 * heute lieber Spanisch übt, soll das dort tun können, nicht erst zurück auf
 * die Übersicht und schon gar nicht über die Einstellungen.
 *
 * Er zeigt nur Sprachen **mit** Inhalt. Die leeren stehen auf der Übersicht
 * ehrlich als leer (Pflicht 5 aus Phase 15); in einer Zeile aus Umschaltern
 * hätten sie nichts zu bieten.
 *
 * Dieselbe Bauart wie die Auswahlzeilen seit Phase 6: `role="radio"` mit
 * `aria-checked` direkt gesetzt, weil React Native Web den `accessibilityState`
 * nicht auf `aria-checked` abbildet (Befund aus Phase 10).
 */
export function LanguageSwitch({
  selected,
  onSelect,
  label = 'Sprache',
}: {
  selected: LanguageCode;
  onSelect: (language: LanguageCode) => void;
  /** Sichtbare Beschriftung der Zeile. */
  label?: string;
}) {
  const toneColor = useToneColor();
  const usable = new Set(languagesWithContent().map((language) => language.code));

  return (
    <View style={styles.row} role="radiogroup" accessibilityLabel="Sprache wechseln">
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {LANGUAGE_ORDER.filter((code) => usable.has(code)).map((code) => {
        const active = code === selected;
        return (
          <Pressable
            key={code}
            onPress={() => onSelect(code)}
            accessibilityRole="radio"
            accessibilityLabel={`${languageOf(code).label} lernen`}
            aria-checked={active}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <ThemedView
              type={active ? 'backgroundSelected' : 'backgroundElement'}
              style={[styles.chip, active ? { borderColor: toneColor('mid') } : null]}>
              <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
                {languageOf(code).label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 32,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
