import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useToneColor } from '@/hooks/use-theme';
import { useLocale } from '@/lib/i18n';
import { goalLanguage, zieleFuerBruecke } from '@/lib/languages/goals';
import { PairDirection } from '@/lib/languages/types';

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
  label,
}: {
  selected: PairDirection;
  onSelect: (direction: PairDirection) => void;
  /** Sichtbare Beschriftung der Zeile. Ohne Angabe: „Sprache“ in der App-Sprache. */
  label?: string;
}) {
  const toneColor = useToneColor();
  const { t, languageName, uiLanguage } = useLocale();

  return (
    <View style={styles.row} role="radiogroup" accessibilityLabel={t('common.switchLanguageA11y')}>
      <ThemedText type="small" themeColor="textSecondary">
        {label ?? t('common.languageLabel')}
      </ThemedText>
      {zieleFuerBruecke(uiLanguage).map((goal) => {
        const code = goalLanguage(goal);
        const active = goal.direction === selected;
        return (
          <Pressable
            key={goal.direction}
            onPress={() => onSelect(goal.direction)}
            accessibilityRole="radio"
            accessibilityLabel={t('common.learnGoal', { language: languageName(code) })}
            aria-checked={active}
            accessibilityState={{ checked: active }}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <ThemedView
              type={active ? 'backgroundSelected' : 'backgroundElement'}
              style={[styles.chip, active ? { borderColor: toneColor('mid') } : null]}>
              <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
                {languageName(code)}
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
    // Der Sprachwechsel ist der häufigste Klick der App — 44 statt 32 Punkte.
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
