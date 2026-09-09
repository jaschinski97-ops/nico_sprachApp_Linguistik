import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
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
 * Welche Sprache gelernt wird (Phase 15).
 *
 * EHRLICH ÜBER DAS, WAS ES NOCH NICHT GIBT (Pflicht 5): Englisch und Spanisch
 * stehen in der Liste, weil sie geplant sind — aber sie tragen sichtbar
 * „noch keine Inhalte", sind nicht auswählbar und melden das auch dem
 * Screenreader über `accessibilityState.disabled`. Sie so darzustellen, als
 * ließe sich damit lernen, wäre dieselbe Art von Unwahrheit wie ein Bild zu
 * einem abstrakten Wort oder eine erfundene Bestehensgrenze.
 *
 * Zu jeder Sprache steht, was sie schwer macht — und bei den leeren
 * zusätzlich, welches Merkmal für sie **entschieden** ist (AE-44). Das ist
 * keine Werbung, sondern die Auskunft, dass die Entscheidung schon getroffen
 * und belegt ist.
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
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{t('common.languageLabel')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('picker.hubNote')}
      </ThemedText>

      <View role="radiogroup" accessibilityLabel={t('picker.chooseA11y')} style={styles.row}>
        {LANGUAGE_ORDER.map((code) => {
          const language = languageOf(code);
          const usable = hasContent(code);
          const active = usable && selected === code;

          return (
            <Pressable
              key={code}
              onPress={() => usable && onSelect(code)}
              disabled={!usable}
              accessibilityRole="radio"
              accessibilityLabel={
                usable
                  ? `${languageName(code)} — ${language.challenge}`
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
              // Die Flex-Masse haengen am Pressable, nicht am inneren View:
              // Das Pressable ist eine Spalte, und dort haette `flexBasis: 220`
              // die HOEHE gemeint - genau so lief die Karte auf 375 px ueber
              // den Rand und wurde 220 Punkte hoch (Befund Phase 17).
              style={({ pressed }) => [styles.cell, pressed && usable && styles.pressed]}>
              <ThemedView
                type={active ? 'backgroundSelected' : 'background'}
                style={[
                  styles.option,
                  active ? { borderColor: toneColor('mid'), borderWidth: 2 } : styles.plain,
                  !usable && { ...styles.empty, borderColor: theme.borderSubtle },
                ]}>
                <View style={styles.head}>
                  <ThemedText type="smallBold">{languageName(code)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {language.endonym}
                  </ThemedText>
                </View>

                {usable ? (
                  <>
                    <ThemedText type="small" themeColor="textSecondary">
                      {language.challenge}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('picker.vocabAndFeature', {
                        count: language.entryCount,
                        feature: t(featureKey(code)),
                      })}
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <ThemedText type="small">{t('picker.empty')}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('picker.emptyFeature', {
                        feature: t(featureKey(code)),
                        kindNote:
                          language.feature.kind === 'derivable'
                            ? t('picker.kindDerivable')
                            : t('picker.kindPerWord'),
                      })}
                    </ThemedText>
                  </>
                )}
              </ThemedView>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 220,
    minWidth: 0,
  },
  option: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
    minHeight: 44,
    width: '100%',
  },
  plain: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  /** Leere Sprachen bleiben lesbar - abgeblendet, aber nicht unter AA. */
  empty: {
    opacity: 0.75,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
