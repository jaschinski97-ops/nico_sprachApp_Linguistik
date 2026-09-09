import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { TONE_KEYS } from '@/constants/tones';
import { useTheme, useToneColor } from '@/hooks/use-theme';
import { TranslationKey, useLocale } from '@/lib/i18n';
import { hasContent, LANGUAGE_ORDER, languageOf } from '@/lib/languages/registry';
import { LanguageCode } from '@/lib/languages/types';

/**
 * Das Sprachmerkmal als Übersetzungsschlüssel (Registry bleibt unangetastet).
 * Bewusst als lockere Tabelle mit Vorgabe: Der Sprachkanon wächst gerade
 * (Roadmap v2), und ein Code ohne Eintrag fällt zur Aussprache-Merkhilfe zurück.
 */
const FEATURE_KEYS: Record<string, TranslationKey> = {
  th: 'feature.tones',
  es: 'feature.stress',
  en: 'feature.pronunciation',
  fr: 'feature.pronunciation',
  de: 'feature.pronunciation',
};

function featureKey(code: LanguageCode): TranslationKey {
  return FEATURE_KEYS[code] ?? 'feature.pronunciation';
}

/**
 * Welche Sprache gelernt wird (Phase 15) — als Haarlinien-Zeilen statt als
 * Kartenstapel (UI-Review 2026-09-09): Die aktive Sprache ist eine abgerundete
 * Fläche, die übrigen sind offene Zeilen mit Trennlinie dazwischen.
 *
 * EHRLICH ÜBER DAS, WAS ES NOCH NICHT GIBT (Pflicht 5): Sprachen ohne Inhalte
 * bleiben in der Liste, sind aber abgeblendet, nicht auswählbar und melden das
 * dem Screenreader über `accessibilityState.disabled`. Was dafür aus der
 * Zeile gewichen ist (Vokabelzahl, Merkmal), trägt das a11y-Label weiter —
 * die Information verschwindet, sie wechselt nur den Kanal.
 */
export function LanguagePicker({
  selected,
  onSelect,
}: {
  selected: LanguageCode;
  onSelect: (language: LanguageCode) => void;
}) {
  const toneColor = useToneColor();
  const theme = useTheme();
  const { t, languageName } = useLocale();

  return (
    <View role="radiogroup" accessibilityLabel={t('picker.chooseA11y')}>
      {LANGUAGE_ORDER.map((code, index) => {
        const language = languageOf(code);
        const usable = hasContent(code);
        const active = usable && selected === code;
        // Haarlinien nur zwischen offenen Zeilen: Die aktive Zeile ist eine
        // Fläche, und an ihren Kanten wäre die Trennlinie doppelt.
        const previous = index > 0 ? LANGUAGE_ORDER[index - 1] : null;
        const previousActive = previous !== null && hasContent(previous) && selected === previous;
        const showHairline = index > 0 && !active && !previousActive;

        return (
          <Pressable
            key={code}
            onPress={() => usable && onSelect(code)}
            disabled={!usable}
            accessibilityRole="radio"
            accessibilityLabel={
              usable
                ? `${languageName(code)} — ${language.challenge} · ${t('home.vocabCount', {
                    count: language.entryCount,
                  })} · ${t(featureKey(code))}`
                : `${languageName(code)} — ${t('picker.empty')} ${t('picker.emptyFeature', {
                    feature: t(featureKey(code)),
                    kindNote:
                      language.feature.kind === 'derivable'
                        ? t('picker.kindDerivable')
                        : t('picker.kindPerWord'),
                  })}`
            }
            aria-checked={active}
            accessibilityState={{ disabled: !usable }}
            style={({ pressed }) => [
              styles.row,
              active && { backgroundColor: theme.backgroundElement },
              showHairline && { borderTopWidth: 1, borderColor: theme.decorGrey },
              !usable && styles.empty,
              pressed && usable && styles.pressed,
            ]}>
            <ThemedText type="default" style={[styles.name, styles.shrink]}>
              {languageName(code)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.shrink}>
              {language.endonym}
            </ThemedText>

            {code === 'th' ? (
              // Die fünf Töne in fester Reihenfolge — ein Dekor, das die
              // Zeile unterscheidet, aber nichts sagt, was das Label nicht
              // schon sagt.
              <View
                style={styles.dots}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none">
                {TONE_KEYS.map((tone) => (
                  <View key={tone} style={[styles.dot, { backgroundColor: toneColor(tone) }]} />
                ))}
              </View>
            ) : null}

            <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
              {usable ? t('home.vocabCount', { count: language.entryCount }) : t('picker.empty')}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
  },
  shrink: {
    flexShrink: 1,
  },
  name: {
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  meta: {
    marginLeft: 'auto',
  },
  /** Leere Sprachen bleiben lesbar - abgeblendet, aber nicht unter AA. */
  empty: {
    opacity: 0.75,
  },
  pressed: {
    opacity: 0.7,
  },
});
