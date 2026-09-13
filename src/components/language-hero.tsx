import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText, displayLineHeight } from './themed-text';
import { STRESS_RULE_KEYS } from './feature-legend';

import { Spacing } from '@/constants/theme';
import { Tone } from '@/constants/tones';
import { VocabEntry } from '@/data/vocab-types';
import { VOCABULARY_EN, VOCABULARY_ES, findVocab } from '@/data/vocabulary';
import { useTheme, useToneColor } from '@/hooks/use-theme';
import { useLocale } from '@/lib/i18n';
import { LanguageCode } from '@/lib/languages/types';
import { analyzeStress } from '@/lib/stress/syllables';

/**
 * Der Gruß als gemeinsamer Begriff: Jeder Pool kennt `sawatdii` (Thai-Anker)
 * bzw. sein `concept`-Pendant — der Hero zeigt ihn in der Sprache, die gerade
 * gelernt wird (Nutzerwunsch 13.09.: „den Spruch auf die Sprache anpassen").
 *
 * HARDEINGABE BEWUSST NUR BEI THAI: สวัสดี ist Markenwort, und sein Silben-
 * schnitt ist handverifiziert (Bindekonsonanten lassen sich aus Daten nicht
 * zuverlässig teilen). Die anderen Sprachen lesen den Gruß aus ihrem
 * geprüften Grundstoff-Pool — dieselbe Ehrlichkeit wie in der Legende.
 * Fällt ein Pool darüber hinaus, zeigt der Hero die Thai-Marke.
 */
const GRUSS_KONZEPT = 'sawatdii';

const THAI_SEGMENTS: { text: string; tone: Tone }[] = [
  { text: 'สวัส', tone: 'low' },
  { text: 'ดี', tone: 'mid' },
];

const THAI_SYLLABLES: { text: string; tone: Tone }[] = [
  { text: 'sà', tone: 'low' },
  { text: 'wàt', tone: 'low' },
  { text: 'dii', tone: 'mid' },
];

/** Der Gruß eines Pools — über `concept` gekoppelt, notfalls über die ID. */
function eintragMitKonzept(entries: VocabEntry[]): VocabEntry | undefined {
  return (
    entries.find((entry) => entry.concept === GRUSS_KONZEPT) ??
    entries.find((entry) => entry.id === GRUSS_KONZEPT)
  );
}

/**
 * Identity-Hero der Übersicht: Der Gruß der GELEHRTEN Sprache, groß und mit
 * ihrem Merkmal — Töne bei Thai, Betonung bei Spanisch, Lautschrift bei
 * Englisch, der deutsche Gruß schlicht als Wort.
 */
export function LanguageHero({ language }: { language: LanguageCode | 'de' }) {
  if (language === 'es') return <GrussHero pool={VOCABULARY_ES} sprache="es" />;
  if (language === 'en') return <GrussHero pool={VOCABULARY_EN} sprache="en" />;
  if (language === 'de') return <DeutschHero />;
  return <ThaiHero />;
}

/** Färbt die Tonfarben-Balken und Umschrift der Thai-Marke (unverändert). */
function ThaiHero() {
  const toneColor = useToneColor();
  const theme = useTheme();

  return (
    // EINE Ansage fürs Ganze: Wort und Umschrift sind zusammen ein Inhalt.
    // Balken und Trennpunkte sind Dekor und bleiben dem Screenreader verborgen.
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel="สวัสดี — sà wàt dii"
      importantForAccessibility="no-hide-descendants"
      style={styles.wrapper}>
      <View style={styles.word}>
        {THAI_SEGMENTS.map((segment) => (
          <View key={segment.text} style={styles.segment}>
            <ThemedText
              maxFontSizeMultiplier={1.4}
              style={[
                styles.thai,
                { color: toneColor(segment.tone), lineHeight: displayLineHeight(64, 1.4) },
              ]}>
              {segment.text}
            </ThemedText>
            <View style={[styles.bar, { backgroundColor: toneColor(segment.tone) }]} />
          </View>
        ))}
      </View>

      <View style={styles.translit}>
        {THAI_SYLLABLES.map((syllable, index) => (
          <View key={syllable.text} style={styles.translitItem}>
            {index > 0 ? (
              <ThemedText style={[styles.sep, { color: theme.decorGrey }]}>·</ThemedText>
            ) : null}
            <ThemedText
              maxFontSizeMultiplier={1.4}
              style={[styles.translitText, { color: toneColor(syllable.tone) }]}>
              {syllable.text}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Der lateinisch geschriebene Gruß — Wort groß, eine kleine Merkhilfe unten.
 * Spanisch markiert die betonte Silbe (Regeltext als Merkhilfe), Englisch
 * zeigt nur die Lautschrift: Betonungsregeln sind das Merkmal von Spanisch,
 * nicht von Englisch — dessen Merkhilfe ist die Aussprache.
 */
function GrussHero({ pool, sprache }: { pool: VocabEntry[]; sprache: 'es' | 'en' }) {
  const { t } = useLocale();

  const gruss = useMemo(() => {
    const entry = eintragMitKonzept(pool);
    if (!entry) return null;
    // Nur bei Spanisch zählt die Betonung: Nur mehrsilbige Wörter haben eine
    // betonte Silbe, die man markieren kann — Einsilbler (und Fehlleufte)
    // zeigen das Wort schlicht.
    if (sprache === 'es') {
      const analyse = analyzeStress(entry.term);
      if (analyse.ok && analyse.rule !== 'monosyllable') {
        return {
          wort: entry.term,
          silben: analyse.syllables,
          betont: analyse.stressedIndex,
          // Der Regeltext ist die bessere Merkhilfe — er heißt das Muster,
          // das die Legende unten ausführt.
          hilfe: t(STRESS_RULE_KEYS[analyse.rule].label) as string,
        };
      }
    }
    return { wort: entry.term, silben: null, betont: -1, hilfe: entry.romanization };
    // Die Regelhilfe steht in der UI-Sprache — ein Sprachwechsel baut neu.
  }, [pool, sprache, t]);

  if (!gruss) return <ThaiHero />;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={gruss.silben ? `${gruss.wort} — ${gruss.silben.join('·')}` : gruss.wort}
      importantForAccessibility="no-hide-descendants"
      style={styles.wrapper}>
      <ThemedText maxFontSizeMultiplier={1.4} style={[styles.latin, { lineHeight: displayLineHeight(56, 1.4) }]}>
        {gruss.silben
          ? gruss.silben.map((silbe, index) => (
              <ThemedText
                key={index}
                style={[styles.latin, index === gruss.betont && styles.betont]}>
                {silbe}
              </ThemedText>
            ))
          : gruss.wort}
      </ThemedText>
      {gruss.hilfe ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hilfe}>
          {gruss.hilfe}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Deutsch: der deutsche Text des Thai-Ankers — „hallo, guten Tag". */
function DeutschHero() {
  const gruss = useMemo(() => findVocab(GRUSS_KONZEPT)?.german.trim(), []);
  // Vor dem ersten Komma steht die Formel, dahinter die Ergänzung — beide
  // Zeilen zusammen sind EIN Gruß, darum eine Ansage.
  const [kopf, ...rest] = (gruss ?? '').split(', ');
  if (!gruss || !kopf) return <ThaiHero />;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={gruss}
      importantForAccessibility="no-hide-descendants"
      style={styles.wrapper}>
      <ThemedText maxFontSizeMultiplier={1.4} style={[styles.latin, { lineHeight: displayLineHeight(56, 1.4) }]}>
        {kopf}
      </ThemedText>
      {rest.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hilfe}>
          {rest.join(', ')}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
  },
  word: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  segment: {
    // Streckt den Tonfarben-Balken auf die Breite seines eigenen Segments.
    alignItems: 'stretch',
  },
  thai: {
    fontSize: 64,
    fontWeight: '600',
  },
  /** Lateinische Grußwörter etwas kleiner als die Thai-Schrift. */
  latin: {
    fontSize: 56,
    fontWeight: '600',
  },
  /** Die betonte Silbe — wie im Legendenmuster: fett und unterstrichen. */
  betont: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  bar: {
    height: 3,
    borderRadius: 2,
    marginTop: Spacing.half,
  },
  hilfe: {
    marginTop: Spacing.one,
  },
  translit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  translitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  translitText: {
    fontSize: 20,
    fontWeight: '500',
  },
  sep: {
    fontSize: 20,
    marginHorizontal: Spacing.two,
  },
});
