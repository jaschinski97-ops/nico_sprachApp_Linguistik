import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GermanPalette, SpanishPalette, ThaiPalette } from './character-palette';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, Spacing } from '@/constants/theme';
import { useTheme, useToneColor } from '@/hooks/use-theme';
import { useLocale, type TranslationKey } from '@/lib/i18n';
import { Direction, type Rating } from '@/lib/fsrs/types';
import {
  buildWritingSession,
  ratingExplanation,
  submitWriting,
  summarizeWriting,
  WritingResult,
  WritingSession,
} from '@/lib/writing';
import { WritingLanguage } from '@/lib/writing/compare';

/**
 * Freies Schreiben — die einzige Übung, die den Kartenzustand fortschreibt.
 *
 * Ablauf je Aufgabe: Vorgabe lesen, Antwort tippen, absenden, Rückmeldung
 * lesen, weiter. Die Rückmeldung nennt bei einem Fehler ausdrücklich **was**
 * falsch war (Großschreibung, Umlaut, Artikel, Tonzeichen) und sagt, was die
 * Bewertung mit der Wiederholung macht — sonst wäre für Lernende nicht
 * erkennbar, warum eine Vokabel wiederkommt.
 *
 * Die Eingabehilfe hängt an der Antwortsprache: Thai bekommt die
 * Zeichenpalette (AE-39), Deutsch die Umlaute, Spanisch die Akzentzeichen.
 * Englisch bekommt keine — dort steht jedes Zeichen der Zielform ohnehin auf
 * jeder lateinischen Tastatur.
 */

/** Was in der Aufgabenzeile steht — je nachdem, welche Sprache getippt wird. */
const AUFGABEN_KEYS: Record<WritingLanguage, TranslationKey> = {
  de: 'writing.promptDe',
  th: 'writing.promptTh',
  es: 'writing.promptEs',
  en: 'writing.promptEn',
};

/** FSRS-Bewertung → i18n-Key (die Labels selbst stehen in den Wörterbüchern). */
const RATING_KEYS: Record<Rating, TranslationKey> = {
  1: 'rating.again',
  2: 'rating.hard',
  3: 'rating.good',
  4: 'rating.easy',
};

/**
 * Platzhalter im Eingabefeld — bewusst in der ZIELsprache, nicht in der
 * Oberflächensprache: Hier steht, was der Lerner zu tippen im Begriff ist.
 */
const PLATZHALTER: Record<WritingLanguage, string> = {
  de: 'deine Antwort',
  th: 'ภาษาไทย',
  es: 'tu respuesta',
  en: 'your answer',
};

/** Die Zeichenhilfe der jeweiligen Sprache — oder keine. */
function Palette({
  language,
  onInsert,
}: {
  language: WritingLanguage;
  onInsert: (character: string) => void;
}) {
  if (language === 'th') return <ThaiPalette onInsert={onInsert} />;
  if (language === 'de') return <GermanPalette onInsert={onInsert} />;
  if (language === 'es') return <SpanishPalette onInsert={onInsert} />;
  return null;
}

export function WritingRunner({
  direction,
  onExit,
}: {
  direction: Direction;
  onExit: () => void;
}) {
  const theme = useTheme();
  const toneColor = useToneColor();
  const { t } = useLocale();

  const [session, setSession] = useState<WritingSession | null>(null);
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [result, setResult] = useState<WritingResult | null>(null);
  const [results, setResults] = useState<WritingResult[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSession(null);
    setIndex(0);
    setDraft('');
    setResult(null);
    setResults([]);
    buildWritingSession({ direction }).then((next) => {
      if (!cancelled) setSession(next);
    });
    return () => {
      cancelled = true;
    };
  }, [direction, round]);

  const prompt = session?.prompts[index] ?? null;

  const submit = useCallback(async () => {
    if (!prompt || busy || result) return;
    setBusy(true);
    try {
      const next = await submitWriting(prompt, draft);
      setResult(next);
      setResults((previous) => [...previous, next]);
    } finally {
      setBusy(false);
    }
  }, [prompt, draft, busy, result]);

  const next = useCallback(() => {
    setResult(null);
    setDraft('');
    setIndex((current) => current + 1);
  }, []);

  if (!session) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('writing.assembling')}
        </ThemedText>
      </ThemedView>
    );
  }

  if (session.prompts.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small">
          {t('writing.noneForDirection')}
        </ThemedText>
        <ExitButton onExit={onExit} label={t('drill.exit')} />
      </ThemedView>
    );
  }

  if (index >= session.prompts.length) {
    const score = summarizeWriting(results);
    const missed = results.filter((entry) => !entry.verdict.correct);
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t('drill.roundDone')}</ThemedText>
        <ThemedText type="small">
          {t('writing.summary', { correct: score.correct, total: score.total, exact: score.exact })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('writing.countsAsReview')}
        </ThemedText>
        {missed.length > 0 ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {t('drill.mistakesTitle')}
            </ThemedText>
            {missed.map((entry) => (
              <ThemedText key={entry.prompt.id} type="small">
                {entry.prompt.solution}
              </ThemedText>
            ))}
          </>
        ) : null}
        <View style={styles.row}>
          <Pressable
            onPress={() => setRound((current) => current + 1)}
            accessibilityRole="button"
            accessibilityLabel={t('drill.newRound')}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundSelected" style={styles.wide}>
              <ThemedText type="smallBold">{t('drill.newRound')}</ThemedText>
            </ThemedView>
          </Pressable>
          <ExitButton onExit={onExit} label={t('common.back')} />
        </View>
      </ThemedView>
    );
  }

  if (!prompt) return null;

  const answered = result !== null;

  return (
    <>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('writing.taskOf', { index: index + 1, total: session.prompts.length })}
        </ThemedText>
        <ExitButton onExit={onExit} label={t('drill.exit')} compact />
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">
          {t(AUFGABEN_KEYS[prompt.language])}
        </ThemedText>

        <View style={styles.promptBlock}>
          <ThemedText style={styles.promptText}>{prompt.shown}</ThemedText>
          {prompt.shownHint ? (
            <ThemedText type="small" themeColor="textSecondary">
              {prompt.shownHint}
            </ThemedText>
          ) : null}
        </View>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          editable={!answered}
          placeholder={PLATZHALTER[prompt.language]}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          // Rechtschreibhilfe aus: Sie wuerde genau die Fehler wegkorrigieren,
          // um die es hier geht.
          spellCheck={false}
          accessibilityLabel={t('writing.inputA11y')}
          style={[styles.input, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
        />

        {/* Eine Zeichenhilfe nur, wo die Tastatur wirklich nicht reicht:
            Thai braucht eine ganze Belegung, Deutsch die Umlaute, Spanisch die
            Akzentzeichen. Englisch braucht keine — dort steht jedes Zeichen
            der Zielform auf jeder lateinischen Tastatur. */}
        {!answered ? <Palette
            language={prompt.language}
            onInsert={(character) => setDraft((current) => current + character)}
          /> : null}

        {!answered ? (
          <View style={styles.row}>
            <Pressable
              onPress={submit}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('writing.checkA11y')}
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [pressed && styles.pressed, busy && styles.disabled]}>
              <ThemedView type="backgroundSelected" style={styles.wide}>
                <ThemedText type="smallBold">{t('writing.check')}</ThemedText>
              </ThemedView>
            </Pressable>
          </View>
        ) : null}

        {result ? <Feedback result={result} toneColor={toneColor} /> : null}
      </ThemedView>

      {answered ? (
        <Pressable
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel={t('common.next')}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundSelected" style={styles.wide}>
            <ThemedText type="smallBold">{t('common.next')}</ThemedText>
          </ThemedView>
        </Pressable>
      ) : null}
    </>
  );
}

function Feedback({
  result,
  toneColor,
}: {
  result: WritingResult;
  toneColor: (tone: 'mid' | 'falling' | 'low') => string;
}) {
  const { t } = useLocale();
  const { verdict, rating, prompt } = result;
  const border = verdict.correct ? toneColor('mid') : toneColor('falling');

  return (
    <ThemedView
      type="backgroundSelected"
      style={[styles.feedback, { borderColor: border, borderWidth: 2 }]}>
      <ThemedText type="smallBold">
        {verdict.exact ? t('drill.exact') : verdict.correct ? t('drill.correct') : t('drill.wrong')}
      </ThemedText>

      {verdict.message ? (
        <ThemedText type="small" themeColor="textSecondary">
          {verdict.message}
        </ThemedText>
      ) : null}

      <ThemedText type="small">{prompt.solution}</ThemedText>
      {prompt.extras.map((extra) => (
        <ThemedText key={extra} type="small" themeColor="textSecondary">
          {extra}
        </ThemedText>
      ))}

      {/* Sichtbar machen, was die Antwort mit der Wiederholung macht - sonst
          bliebe unerklaerlich, warum eine Vokabel frueher wiederkommt. */}
      <ThemedText type="small" themeColor="textSecondary">
        {t('rating.ratedAs', { rating: t(RATING_KEYS[rating]), explanation: ratingExplanation(rating) })}
      </ThemedText>
    </ThemedView>
  );
}

function ExitButton({
  onExit,
  label,
  compact = false,
}: {
  onExit: () => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onExit}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
      <ThemedText type="small" themeColor="textSecondary">
        {compact ? label : label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** Mindestgroesse eines Tippziels, wie in Phase 9 festgelegt. */
  tapTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  promptBlock: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  promptText: {
    fontSize: 30,
    lineHeight: 44,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 20,
    minHeight: 48,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  wide: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
  },
  feedback: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
