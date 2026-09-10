import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { TONE_KEYS } from '@/constants/tones';
import { useTheme, useToneColor } from '@/hooks/use-theme';
import { TranslationKey, useLocale } from '@/lib/i18n';
import { goalEndonym, goalLanguage, LERNZIELE } from '@/lib/languages/goals';
import { languageOf } from '@/lib/languages/registry';
import { Direction, LanguageCode } from '@/lib/languages/types';
import { DirectionSummary } from '@/lib/review-session';

/**
 * Das Sprachmerkmal als Übersetzungsschlüssel (Registry bleibt unangetastet).
 * Bewusst als lockere Tabelle mit Vorgabe: Der Sprachkanon wächst gerade
 * (Roadmap v2), und ein Code ohne Eintrag fällt zur Aussprache-Merkhilfe zurück.
 */
const FEATURE_KEYS: Record<string, TranslationKey> = {
  th: 'feature.tones',
  es: 'feature.stress',
  en: 'feature.pronunciation',
};

function featureKey(code: LanguageCode): TranslationKey {
  return FEATURE_KEYS[code] ?? 'feature.pronunciation';
}

/**
 * Die Auswahl als LERNZIELE statt als Richtungen (Nutzerentscheidung
 * 2026-09-10, wörtlich: „Ich wollte dieses ‚Deutsch → Thai‘ und
 * ‚Thai → Deutsch‘ weghaben. Deutsch muss noch als eigene Sprache eingefügt
 * werden.“): Vier Zeilen — Thai, Englisch, Spanisch, Deutsch — hinter denen
 * intern jeweils eine Richtung steht (`lib/languages/goals`).
 *
 * EHRLICH BEI DEN ZAHLEN: Die Fällig-Badges kommen aus `useDirectionSummaries`
 * und decken nur die beiden Richtungen der aktuellen Paarsprache ab — Zeilen
 * fremder Paarsprachen stehen bewusst ohne Zahl, solange nichts geladen ist,
 * wird keine behauptet. Die Wortzahl des Deutsch-Ziels ist der Thai-Pool: Es
 * gibt keinen eigenen deutschen Grundstoff, die Richtung fragt Thai-Wörter auf
 * Deutsch ab.
 *
 * Bauart wie bisher (UI-Review 2026-09-09): aktives Ziel als abgerundete
 * Fläche, die übrigen als offene Zeilen mit Trennlinie.
 */
export function LanguagePicker({
  selected,
  selectedDirection,
  onSelect,
  due,
}: {
  selected: LanguageCode;
  /** Gemerkte Richtung des Profils — bei Thai entscheidet sie, WELCHES der beiden Ziele (Thai/Deutsch) aktiv ist. */
  selectedDirection: Direction | null;
  /** Wählt ein Ziel; die Richtung trägt Sprache und Lesezeichen zugleich. Navigation passiert bewusst NICHT hier. */
  onSelect: (direction: Direction) => void;
  /** Geladene Fälligkeitszahlen der aktuellen Paarsprache; `null`, solange nichts geladen ist. */
  due: readonly DirectionSummary[] | null;
}) {
  const toneColor = useToneColor();
  const theme = useTheme();
  const { t, languageName } = useLocale();

  const fälligJeRichtung = new Map(
    (due ?? []).map((summary) => [summary.direction, summary.due])
  );
  // Aktives Ziel: die gemerkte Richtung, wenn sie zur gewählten Sprache
  // gehört, sonst das erste Ziel dieser Sprache — Thai hat zwei Ziele, darum
  // reicht die Sprache allein nicht als „aktuell“.
  const zieleDerSprache = LERNZIELE.filter((ziel) => ziel.language === selected);
  const aktiveRichtung =
    selectedDirection && zieleDerSprache.some((ziel) => ziel.direction === selectedDirection)
      ? selectedDirection
      : (zieleDerSprache[0]?.direction ?? null);

  return (
    <View role="radiogroup" accessibilityLabel={t('picker.chooseA11y')}>
      {LERNZIELE.map((ziel, index) => {
        const name = languageName(goalLanguage(ziel));
        const endonym = goalEndonym(ziel);
        const gelehrteSprache = goalLanguage(ziel);
        const wortschatz = languageOf(ziel.language).entryCount;
        const fällig = fälligJeRichtung.get(ziel.direction);
        const active = ziel.direction === aktiveRichtung;
        // Haarlinien nur zwischen offenen Zeilen: Die aktive Zeile ist eine
        // Fläche, und an ihren Kanten wäre die Trennlinie doppelt.
        const previous = index > 0 ? LERNZIELE[index - 1] : null;
        const previousActive = previous !== null && previous.direction === aktiveRichtung;
        const showHairline = index > 0 && !active && !previousActive;

        return (
          <Pressable
            key={ziel.direction}
            onPress={() => onSelect(ziel.direction)}
            accessibilityRole="radio"
            accessibilityLabel={
              [
                t('dashboard.cta', { direction: name }),
                fällig !== undefined ? t('home.dueBadge', { count: fällig }) : null,
                t('home.vocabCount', { count: wortschatz }),
                gelehrteSprache !== 'de' ? languageOf(gelehrteSprache).challenge : null,
                gelehrteSprache !== 'de' ? t(featureKey(gelehrteSprache)) : null,
              ]
                .filter((part): part is string => part !== null)
                .join(' — ')
            }
            aria-checked={active}
            style={({ pressed }) => [
              styles.row,
              active && { backgroundColor: theme.backgroundElement },
              showHairline && { borderTopWidth: 1, borderColor: theme.decorGrey },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="default" style={[styles.name, styles.shrink]}>
              {name}
            </ThemedText>
            {/* Bei Deutsch fallen Name und Endonym in eines zusammen — doppelt
                gelesen stört nur. */}
            {endonym !== name ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.shrink}>
                {endonym}
              </ThemedText>
            ) : null}

            {/* Tonpunkte nur, wenn das Ziel Thai PRODUZIERT (de_to_th) — das
                Merkmal hängt an der hervorgebrachten Sprache, nicht an der
                Paar-Sprache: th_to_de produziert Deutsch, also keine Punkte. */}
            {gelehrteSprache === 'th' ? (
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
              {gelehrteSprache === 'de'
                ? // Ehrlich, woher der Bestand kommt: Deutsch hat keinen eigenen
                  // Grundstoff, die Richtung fragt den Thai-Pool auf Deutsch ab.
                  t('picker.goalDeutschDetail', { count: wortschatz })
                : t('home.vocabCount', { count: wortschatz })}
            </ThemedText>

            {/* Badge nur, wenn die Zahl wirklich geladen ist — niemals geraten. */}
            {fällig !== undefined ? (
              <ThemedView type="accent" style={styles.badge}>
                <ThemedText type="smallBold" themeColor="accentText">
                  {t('home.dueBadge', { count: fällig })}
                </ThemedText>
              </ThemedView>
            ) : null}
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
  badge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
