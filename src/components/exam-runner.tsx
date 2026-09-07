import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedButton } from './themed-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { playPronunciation } from '@/lib/audio';
import { scoreExamModule } from '@/lib/exam/session';
import { ExamModule, isGradable, SKILL_LABELS, TASK_TYPE_LABELS } from '@/lib/exam/types';

/**
 * Eine Prüfungsaufgabe bearbeiten.
 *
 * Alle Fragen zu einem Text stehen **gleichzeitig** auf dem Schirm und werden
 * erst am Ende ausgewertet — so läuft es in der echten Prüfung auch, und beim
 * Lesen springt man zwischen Text und Fragen hin und her. Eine Frage nach der
 * anderen mit sofortiger Auflösung (wie bei den Übungen aus Phase 6) wäre ein
 * anderes Format und würde auf die Prüfung schlechter vorbereiten.
 *
 * Bei Hörtexten ist das Skript vor der Auswertung **nicht** zu sehen; es wird
 * vorgelesen und lässt sich beliebig oft wiederholen. Danach steht es da, denn
 * zum Nachvollziehen der eigenen Fehler braucht man es.
 */

export function ExamRunner({ module, onExit }: { module: ExamModule; onExit: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    isGradable(module) ? module.items.map(() => null) : []
  );
  const [checked, setChecked] = useState(false);
  const theme = useTheme();
  const [showModel, setShowModel] = useState(false);

  const score = useMemo(
    () => (isGradable(module) ? scoreExamModule(module, answers) : null),
    [module, answers]
  );

  const choose = useCallback(
    (itemIndex: number, optionIndex: number) => {
      if (checked) return;
      setAnswers((previous) => {
        const next = [...previous];
        next[itemIndex] = optionIndex;
        return next;
      });
    },
    [checked]
  );

  const speakStimulus = useCallback(() => {
    if (!module.stimulus) return;
    playPronunciation({ text: module.stimulus.body, language: 'de' }).catch(() => {});
  }, [module.stimulus]);

  const allAnswered = answers.every((answer) => answer !== null);

  return (
    <>
      <View style={styles.headerRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {SKILL_LABELS[module.skill]} · {module.level} · {TASK_TYPE_LABELS[module.taskType]} ·
          etwa {module.minutes} Min
        </ThemedText>
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel="Zurück zur Aufgabenübersicht"
          style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary">
            Zurück zur Übersicht
          </ThemedText>
        </Pressable>
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{module.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {module.instruction}
        </ThemedText>

        {module.stimulus ? (
          <Stimulus module={module} revealed={checked} onSpeak={speakStimulus} />
        ) : null}

        {isGradable(module) ? (
          module.items.map((item, itemIndex) => (
            <View key={item.id} style={styles.item}>
              <ThemedText type="small">
                {itemIndex + 1}. {item.prompt}
              </ThemedText>
              <View style={styles.options}>
                {item.options.map((option, optionIndex) => {
                  const chosen = answers[itemIndex] === optionIndex;
                  const correct = optionIndex === item.correctIndex;
                  // SEIT DEM UI-REVIEW 2026-09-07 success/error STATT DER
                  // TONFARBEN: „mittel“/„fallend“ bedeuten Thai-Töne, nicht
                  // Richtig/Falsch. Die Auswahl VOR dem Auswerten trägt die
                  // Akzentfarbe — sie ist eine Auswahl, kein Urteil.
                  const border = checked
                    ? correct
                      ? theme.success
                      : chosen
                        ? theme.error
                        : undefined
                    : chosen
                      ? theme.accent
                      : undefined;

                  return (
                    <Pressable
                      key={option}
                      onPress={() => choose(itemIndex, optionIndex)}
                      disabled={checked}
                      accessibilityRole="button"
                      accessibilityLabel={option}
                      accessibilityState={{ selected: chosen, disabled: checked }}
                      style={({ pressed }) => [styles.optionWrap, pressed && styles.pressed]}>
                      <ThemedView
                        type={chosen ? 'backgroundSelected' : 'background'}
                        style={[
                          styles.option,
                          border ? { borderColor: border, borderWidth: 2 } : styles.optionPlain,
                        ]}>
                        <ThemedText type="small">{option}</ThemedText>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>
              {checked ? (
                <ThemedText type="small" themeColor="textSecondary">
                  <ThemedText
                    type="small"
                    themeColor={answers[itemIndex] === item.correctIndex ? 'success' : 'error'}>
                    {answers[itemIndex] === item.correctIndex ? '✓ ' : '✗ '}
                  </ThemedText>
                  {item.explanation}
                </ThemedText>
              ) : null}
            </View>
          ))
        ) : (
          <ProductionTask
            module={module}
            showModel={showModel}
            onShowModel={() => setShowModel(true)}
          />
        )}
      </ThemedView>

      {isGradable(module) ? (
        checked ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">
              {score!.correct} von {score!.total} richtig
            </ThemedText>
            {/*
              Bewusst keine Bestehensgrenze: Wie viele Punkte zum Bestehen
              noetig sind, steht in den Durchfuehrungsbestimmungen und wurde
              hier nicht erhoben. Eine ausgedachte Grenze waere genau die Art
              von Erfindung, die dieses Modul vermeiden soll.
            */}
            <ThemedText type="small" themeColor="textSecondary">
              Das ist eine Übungsaufgabe, keine Prüfung — eine Bestehensgrenze
              steht hier bewusst nicht, weil sie nicht aus der Quelle erhoben
              wurde.
            </ThemedText>
            <View style={styles.row}>
              <ThemedButton label="Zurück zur Übersicht" onPress={onExit} />
            </View>
          </ThemedView>
        ) : (
          <ThemedButton
            label={allAnswered ? 'Auswerten' : 'Bitte alle Aufgaben beantworten'}
            accessibilityLabel="Auswerten"
            onPress={() => setChecked(true)}
            disabled={!allAnswered}
            variant="primary"
          />
        )
      ) : null}
    </>
  );
}

function Stimulus({
  module,
  revealed,
  onSpeak,
}: {
  module: ExamModule;
  revealed: boolean;
  onSpeak: () => void;
}) {
  const stimulus = module.stimulus!;

  if (stimulus.kind === 'audio') {
    return (
      <ThemedView type="backgroundSelected" style={styles.stimulus}>
        <Pressable
          onPress={onSpeak}
          accessibilityRole="button"
          accessibilityLabel="Text anhören"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.playButton}>
            <ThemedText type="smallBold">🔊 Text anhören</ThemedText>
          </ThemedView>
        </Pressable>
        {revealed ? (
          <ThemedText type="small" themeColor="textSecondary">
            {stimulus.body}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Der Text wird vorgelesen. Sie können ihn beliebig oft anhören; zu
            lesen ist er erst nach dem Auswerten.
          </ThemedText>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundSelected" style={styles.stimulus}>
      {stimulus.title ? <ThemedText type="smallBold">{stimulus.title}</ThemedText> : null}
      <ThemedText type="small">{stimulus.body}</ThemedText>
      {stimulus.entries?.map((entry) => (
        <ThemedText key={entry} type="small">
          {entry}
        </ThemedText>
      ))}
    </ThemedView>
  );
}

/**
 * Schreiben und Sprechen: Aufgabe, Musterlösung, Selbstkontrolle.
 *
 * Hier wird ausdrücklich **nicht** bewertet (AE-20). Einen freien Text oder
 * eine gesprochene Antwort automatisch zu benoten, ginge nur mit einem Modell,
 * und dessen Urteil wäre eine ungeprüfte Behauptung über die eigene
 * Prüfungsreife — teurer Irrtum kurz vor einer Prüfung, die Geld kostet.
 */
function ProductionTask({
  module,
  showModel,
  onShowModel,
}: {
  module: Extract<ExamModule, { taskType: 'production' }>;
  showModel: boolean;
  onShowModel: () => void;
}) {
  const production = module.production;

  return (
    <>
      <ThemedView type="backgroundSelected" style={styles.stimulus}>
        <ThemedText type="small">{production.task}</ThemedText>
        {production.bullets.map((bullet) => (
          <ThemedText key={bullet} type="small" themeColor="textSecondary">
            • {bullet}
          </ThemedText>
        ))}
      </ThemedView>

      <ThemedText type="small" themeColor="textSecondary">
        Diese Aufgabe wird nicht automatisch bewertet — freie Texte und
        gesprochene Antworten kann die App nicht zuverlässig beurteilen.
        Schreiben oder sprechen Sie erst selbst, vergleichen Sie dann mit der
        Musterlösung.
      </ThemedText>

      {showModel ? (
        <>
          <ThemedView type="backgroundSelected" style={styles.stimulus}>
            <ThemedText type="smallBold">Musterlösung</ThemedText>
            <ThemedText type="small">{production.modelAnswer}</ThemedText>
            {production.speakModelAnswer ? (
              <Pressable
                onPress={() => {
                  playPronunciation({ text: production.modelAnswer, language: 'de' }).catch(
                    () => {}
                  );
                }}
                accessibilityRole="button"
                accessibilityLabel="Musterlösung anhören"
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.playButton}>
                  <ThemedText type="small">🔊 Musterlösung anhören</ThemedText>
                </ThemedView>
              </Pressable>
            ) : null}
          </ThemedView>
          <View style={styles.item}>
            <ThemedText type="smallBold">Selbstkontrolle</ThemedText>
            {production.checklist.map((point) => (
              <ThemedText key={point} type="small" themeColor="textSecondary">
                ☐ {point}
              </ThemedText>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.row}>
          <ThemedButton label="Musterlösung zeigen" onPress={onShowModel} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  /**
   * Mindestgroesse eines Tippziels. WCAG 2.2 verlangt in 2.5.8 (AA) 24x24
   * CSS-Pixel; Apple und Google empfehlen 44 bzw. 48. Gemessen wurde im
   * Web-Build, dass reine Textknoepfe nur 20 Pixel hoch waren - also unter der
   * Norm. 44 ist der bequeme Wert und kostet hier nichts.
   */
  tapTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  stimulus: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  playButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignSelf: 'flex-start',
  },
  item: {
    gap: Spacing.two,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionWrap: {
    flexGrow: 1,
    flexBasis: 150,
  },
  option: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  optionPlain: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
