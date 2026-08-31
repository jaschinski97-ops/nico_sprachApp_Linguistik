import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { ToneContour } from './tone-contour';

import { Spacing } from '@/constants/theme';
import { TONES } from '@/constants/tones';
import { isLanguageAvailable, playPronunciation } from '@/lib/audio';
import { buildDrillSession, DrillSession, scoreAnswers } from '@/lib/drills/session';
import { DRILL_META, DrillAnswer, DrillId, DrillQuestion } from '@/lib/drills/types';
import { recordDrill } from '@/lib/review-log';

/**
 * Eine Übungsrunde.
 *
 * Ablauf je Aufgabe: Frage zeigen (bei der Ton-Übung: abspielen), eine der
 * Antworten wählen, Auflösung sehen, weiter. Es gibt bewusst **keine**
 * Selbsteinschätzung wie beim Karteikasten — die Übungen laufen nicht durch
 * FSRS (AE-16), richtig oder falsch steht ohnehin fest, und eine zusätzliche
 * Frage „wie gut saß das?" wäre hier nur ein Klick ohne Wirkung.
 *
 * Die Auflösung erscheint **immer**, auch nach einer richtigen Antwort: bei
 * einer Auswahl mit drei bis fünf Möglichkeiten ist ein Treffer auch mal
 * geraten, und dann ist die Begründung das eigentlich Nützliche.
 */

export function DrillRunner({ drill, onExit }: { drill: DrillId; onExit: () => void }) {
  const meta = DRILL_META[drill];

  const [session, setSession] = useState<DrillSession | null>(null);
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<DrillAnswer[]>([]);
  const [voiceMissing, setVoiceMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSession(null);
    setIndex(0);
    setChosen(null);
    setAnswers([]);
    buildDrillSession({ drill }).then((built) => {
      if (!cancelled) setSession(built);
    });
    return () => {
      cancelled = true;
    };
  }, [drill, round]);

  // Nur die Ton-Uebung braucht eine Stimme. Gewarnt wird ausschliesslich bei
  // einem eindeutigen "nein" - siehe isLanguageAvailable.
  useEffect(() => {
    let cancelled = false;
    if (drill !== 'tone') {
      setVoiceMissing(false);
      return;
    }
    isLanguageAvailable('th').then((available) => {
      if (!cancelled) setVoiceMissing(available === false);
    });
    return () => {
      cancelled = true;
    };
  }, [drill]);

  const question = session?.questions[index] ?? null;

  const answer = useCallback(
    async (optionIndex: number) => {
      if (!question || chosen !== null) return;
      const correct = optionIndex === question.correctIndex;
      setChosen(optionIndex);
      setAnswers((previous) => [...previous, { question, chosenIndex: optionIndex, correct }]);
      await recordDrill(correct, Date.now()).catch(() => {
        // Ein fehlgeschlagener Protokolleintrag darf die Uebung nicht stoppen.
      });
    },
    [question, chosen]
  );

  const next = useCallback(() => {
    setChosen(null);
    setIndex((value) => value + 1);
  }, []);

  if (!session) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Übung wird zusammengestellt …
      </ThemedText>
    );
  }

  if (session.questions.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Keine passenden Vokabeln</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Für „{meta.label}" gibt es im Grundstock gerade keine geeigneten Einträge.
        </ThemedText>
        <Row>
          <Button label="Zurück" onPress={onExit} />
        </Row>
      </ThemedView>
    );
  }

  if (!question) {
    const score = scoreAnswers(answers);
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Runde beendet</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {score.correct} von {score.total} richtig.
        </ThemedText>
        {answers.some((entry) => !entry.correct) ? (
          <View style={styles.mistakes}>
            <ThemedText type="small">Das saß noch nicht:</ThemedText>
            {answers
              .filter((entry) => !entry.correct)
              .map((entry) => (
                <ThemedText
                  key={entry.question.id}
                  type="small"
                  themeColor="textSecondary">
                  {entry.question.solution}
                </ThemedText>
              ))}
          </View>
        ) : null}
        <Row>
          <Button label="Neue Runde" onPress={() => setRound((value) => value + 1)} />
          <Button label="Zurück" onPress={onExit} />
        </Row>
      </ThemedView>
    );
  }

  return (
    <>
      <View style={styles.headerRow}>
        <ThemedText type="small" themeColor="textSecondary">
          Aufgabe {index + 1} von {session.questions.length}
        </ThemedText>
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="small" themeColor="textSecondary">
            Übung verlassen
          </ThemedText>
        </Pressable>
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{meta.prompt}</ThemedText>

        {question.speak ? (
          <PlayBlock question={question} voiceMissing={voiceMissing} />
        ) : null}

        {question.visible ? (
          <View style={styles.promptBlock}>
            <ThemedText style={styles.promptText}>{question.visible}</ThemedText>
            {question.visibleHint ? (
              <ThemedText type="small" themeColor="textSecondary">
                {question.visibleHint}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        <View style={styles.options}>
          {question.options.map((option, optionIndex) => {
            const isChosen = chosen === optionIndex;
            const isCorrect = optionIndex === question.correctIndex;
            const answered = chosen !== null;
            const border =
              answered && isCorrect
                ? TONES.mid.color
                : answered && isChosen
                  ? TONES.falling.color
                  : undefined;

            return (
              <Pressable
                key={option.label}
                onPress={() => answer(optionIndex)}
                disabled={answered}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isChosen, disabled: answered }}
                style={({ pressed }) => [styles.optionWrap, pressed && styles.pressed]}>
                <ThemedView
                  type={isChosen ? 'backgroundSelected' : 'background'}
                  style={[
                    styles.option,
                    border ? { borderColor: border, borderWidth: 2 } : styles.optionPlain,
                  ]}>
                  {option.tone ? <ToneContour tone={option.tone} height={16} /> : null}
                  <ThemedText type="small">{option.label}</ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </View>

        {chosen !== null ? (
          <ThemedView type="backgroundSelected" style={styles.feedback}>
            <ThemedText type="smallBold">
              {chosen === question.correctIndex ? '✓ Richtig' : '✗ Nicht ganz'}
            </ThemedText>
            <ThemedText type="small">{question.solution}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {question.explanation}
            </ThemedText>
          </ThemedView>
        ) : null}
      </ThemedView>

      {chosen !== null ? (
        <Pressable
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel="Weiter"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundSelected" style={styles.wide}>
            <ThemedText type="smallBold">Weiter</ThemedText>
          </ThemedView>
        </Pressable>
      ) : null}
    </>
  );
}

/**
 * Der Hörteil der Ton-Übung.
 *
 * Das Wort wird beim Erscheinen einmal abgespielt und lässt sich beliebig oft
 * wiederholen — Töne hört man selten beim ersten Mal.
 */
function PlayBlock({
  question,
  voiceMissing,
}: {
  question: DrillQuestion;
  voiceMissing: boolean;
}) {
  const speak = question.speak!;
  const spokenFor = useRef<string | null>(null);

  const play = useCallback(() => {
    playPronunciation({ text: speak.text, language: speak.language }).catch(() => {
      // Eine stumme Ausgabe darf die Uebung nicht abbrechen.
    });
  }, [speak.text, speak.language]);

  useEffect(() => {
    if (spokenFor.current === question.id) return;
    spokenFor.current = question.id;
    play();
  }, [question.id, play]);

  return (
    <View style={styles.promptBlock}>
      <Pressable
        onPress={play}
        accessibilityRole="button"
        accessibilityLabel="Wort noch einmal anhören"
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundSelected" style={styles.playButton}>
          <ThemedText type="smallBold">🔊 Noch einmal anhören</ThemedText>
        </ThemedView>
      </Pressable>
      {voiceMissing ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Auf diesem Gerät ist keine Thai-Stimme installiert — die Übung bleibt
          dann stumm. Das ist eine Systemeinstellung, kein Fehler der App.
        </ThemedText>
      ) : null}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundSelected" style={styles.button}>
        <ThemedText type="small">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  promptBlock: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  promptText: {
    fontSize: 30,
    lineHeight: 42,
    fontWeight: '600',
    textAlign: 'center',
  },
  playButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionWrap: {
    flexGrow: 1,
    flexBasis: 120,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  optionPlain: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  feedback: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  mistakes: {
    gap: Spacing.one,
  },
  wide: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
