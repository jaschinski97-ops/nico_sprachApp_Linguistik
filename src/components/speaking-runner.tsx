import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MeasuredToneContour } from './measured-tone-contour';
import { ThemedButton } from './themed-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { ToneContour } from './tone-contour';

import { Spacing } from '@/constants/theme';
import { TONES } from '@/constants/tones';
import { useMicrophoneCapture } from '@/hooks/use-microphone-capture';
import { useToneColor } from '@/hooks/use-theme';
import { playPronunciation, stopPronunciation } from '@/lib/audio';
import {
  analyzeToneContour,
  CapturedPcm,
  feedbackForMeasurement,
  SPEAKING_LIMITATIONS,
  SPEAKING_PRIVACY_NOTICE,
  SpeakingPrompt,
  ToneContourFeedback,
  ToneContourMeasurement,
} from '@/lib/speaking';
import { buildSpeakingSession, SpeakingSession } from '@/lib/speaking/session';

/** Einsilbige Wörter brauchen selten mehr; die Grenze hält Rechenzeit und Speicher klein. */
const MAX_ATTEMPT_MS = 4_000;

type AttemptResult = {
  capture: Pick<CapturedPcm, 'durationMs' | 'reachedLimit'>;
  measurement: ToneContourMeasurement;
  feedback: ToneContourFeedback;
};

/**
 * Lokale Sprechübung für Thai-Töne.
 *
 * Die Aufnahmewege sind plattformspezifisch, ab hier kommt aber immer
 * flüchtiges Mono-PCM an. Sollton und Rückmeldung stammen ausschließlich aus
 * den verifizierten Silbendaten; `playPronunciation` ist nur das sichtbar so
 * bezeichnete Hörbeispiel und wird nie an die Auswertung übergeben (AE-32).
 */
export function SpeakingRunner({ onExit }: { onExit: () => void }) {
  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [buildFailed, setBuildFailed] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [exampleNotice, setExampleNotice] = useState<string | null>(null);
  // WeakSet verhindert Doppelverarbeitung bei manuellem Stopp + Effect, ohne
  // den grossen PCM-Puffer selbst am Leben zu halten.
  const processedCapturesRef = useRef(new WeakSet<CapturedPcm>());
  const mountedRef = useRef(true);
  const capture = useMicrophoneCapture({ maxDurationMs: MAX_ATTEMPT_MS });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSession(null);
    setBuildFailed(null);
    setIndex(0);
    setAttempts(0);
    setResult(null);
    capture.cancel();
    buildSpeakingSession()
      .then((built) => {
        if (!cancelled) setSession(built);
      })
      .catch((e) => {
        // Wie im Fortschritts-Reiter: Ohne den Catch bliebe der Spinner für
        // immer stehen, wenn Zusammenstellen oder Speicher scheitern.
        if (!cancelled) setBuildFailed(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      capture.cancel();
      void stopPronunciation();
    };
    // Der Capture-Controller aendert seine Objektidentitaet mit seinem Status;
    // ein Neustart der Sitzung soll nur von `round` abhaengen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const prompt = session?.prompts[index] ?? null;

  const processCapture = useCallback(
    async (recording: CapturedPcm, activePrompt: SpeakingPrompt) => {
      if (processedCapturesRef.current.has(recording)) return;
      processedCapturesRef.current.add(recording);
      setProcessing(true);

      // Erst den Zwischenzustand malen, dann die synchrone F0-Rechnung starten.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      try {
        const measurement = analyzeToneContour(recording.samples, recording.sampleRate);
        const feedback = feedbackForMeasurement(activePrompt, measurement);
        if (mountedRef.current) {
          setResult({
            capture: {
              durationMs: recording.durationMs,
              reachedLimit: recording.reachedLimit,
            },
            measurement,
            feedback,
          });
          setAttempts((value) => value + 1);
        }
      } finally {
        // Auch das letzte PCM-Ergebnis wird nach der Auswertung aus dem Hook
        // entfernt. Im UI bleiben nur Dauer, Kontur und Rueckmeldung; die
        // Samples werden weder im Zustand behalten noch gespeichert/uebertragen.
        capture.clear();
        if (mountedRef.current) setProcessing(false);
      }
    },
    [capture]
  );

  // Der automatische Vier-Sekunden-Stopp kann keinen Rückgabewert an einen
  // Button liefern; er erscheint deshalb als `lastCapture` und läuft hier in
  // dieselbe Auswertung wie ein manueller Stopp.
  useEffect(() => {
    if (capture.lastCapture && prompt) {
      void processCapture(capture.lastCapture, prompt);
    }
  }, [capture.lastCapture, processCapture, prompt]);

  const start = useCallback(async () => {
    if (!prompt || processing) return;
    await stopPronunciation();
    setResult(null);
    setExampleNotice(null);
    await capture.start();
  }, [capture, processing, prompt]);

  const stop = useCallback(async () => {
    if (!prompt || processing) return;
    const recording = await capture.stop();
    if (recording) await processCapture(recording, prompt);
  }, [capture, processCapture, processing, prompt]);

  const playExample = useCallback(async () => {
    if (!prompt || capture.status !== 'idle' || processing) return;
    try {
      const kind = await playPronunciation({ text: prompt.thai, language: 'th' });
      setExampleNotice(
        kind === 'asset'
          ? 'KI-Clip abgespielt — nur Hörbeispiel, nie Bewertungsmaßstab.'
          : kind === 'tts'
            ? 'Gerätestimme abgespielt — nur Hörbeispiel, nie Bewertungsmaßstab.'
            : 'Auf diesem Gerät ist kein Hörbeispiel verfügbar.'
      );
    } catch {
      setExampleNotice('Das Hörbeispiel konnte nicht abgespielt werden. Die Aufnahme funktioniert davon unabhängig.');
    }
  }, [capture.status, processing, prompt]);

  const next = useCallback(() => {
    capture.cancel();
    capture.clear();
    setResult(null);
    setExampleNotice(null);
    setIndex((value) => value + 1);
  }, [capture]);

  if (buildFailed) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Sprechübung konnte nicht geladen werden</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Konnte nicht zusammengestellt werden: {buildFailed}
        </ThemedText>
        <View style={styles.buttonRow}>
          <ActionButton label="Erneut versuchen" onPress={() => setRound((value) => value + 1)} />
          <ActionButton label="Zurück" onPress={onExit} />
        </View>
      </ThemedView>
    );
  }

  if (!session) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Sprechübung wird zusammengestellt …
      </ThemedText>
    );
  }

  if (session.prompts.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Keine passende Sollkontur</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Die Übung nimmt nur vollständig quellengeprüfte, einsilbige Thai-Wörter. So wird
          keine Silbengrenze geraten.
        </ThemedText>
        <ActionButton label="Zurück" onPress={onExit} />
      </ThemedView>
    );
  }

  if (!prompt) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Runde beendet</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {attempts} Tonkontur{attempts === 1 ? '' : 'en'} lokal ausgewertet. Es gibt bewusst
          keine Punktzahl: Gemessen wurde nicht die vollständige Aussprache.
        </ThemedText>
        <View style={styles.buttonRow}>
          <ActionButton label="Neue Runde" onPress={() => setRound((value) => value + 1)} />
          <ActionButton label="Zurück" onPress={onExit} />
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <View style={styles.headerRow}>
        <ThemedText type="small" themeColor="textSecondary">
          Wort {index + 1} von {session.prompts.length}
        </ThemedText>
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel="Sprechübung verlassen"
          style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary">
            Übung verlassen
          </ThemedText>
        </Pressable>
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Sprich dieses Wort</ThemedText>
        <ThemedText type="subtitle" style={styles.thaiWord}>
          {prompt.thai}
        </ThemedText>
        <ThemedText>{prompt.romanization}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {prompt.german}
        </ThemedText>

        <TargetBlock prompt={prompt} />

        <View style={styles.field}>
          <ActionButton
            label="Synthetisches Hörbeispiel"
            onPress={playExample}
            disabled={capture.status !== 'idle' || processing}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Der Clip hilft nur beim Anhören. Die Bewertung vergleicht deine Aufnahme nicht mit
            dieser Stimme.
          </ThemedText>
          {exampleNotice ? (
            <ThemedText type="small" themeColor="textSecondary">
              {exampleNotice}
            </ThemedText>
          ) : null}
        </View>

        <ThemedView type="backgroundSelected" style={styles.notice}>
          <ThemedText type="smallBold">Mikrofon und Datenschutz</ThemedText>
          <ThemedText type="small">{SPEAKING_PRIVACY_NOTICE}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Bewertet wird nur die Tonhöhenkontur — nicht Konsonanten, Vokallänge,
            Aspiration oder die vollständige Aussprache; deshalb gibt es keine Punktzahl.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Falls die Freigabe noch fehlt, erscheint die Systemabfrage erst, wenn du „Aufnahme
            starten“ wählst. Nach spätestens vier Sekunden stoppt die Aufnahme automatisch.
          </ThemedText>
        </ThemedView>

        <View style={styles.buttonRow}>
          {/* Aufnahme-Start und -Stopp sind der Kern-CTA dieser Übung und
              tragen deshalb die Akzentfläche (UI-Review 2026-09-07). Die
              übrigen Aktionsflächen bleiben beim grauen Chip. */}
          {capture.isRecording ? (
            <ThemedButton label="Stoppen und lokal auswerten" onPress={stop} variant="primary" />
          ) : (
            <ThemedButton
              label={
                capture.status === 'requesting-permission'
                  ? 'Mikrofonfreigabe wird angefragt …'
                  : capture.status === 'stopping' || processing
                    ? 'Wird lokal ausgewertet …'
                    : 'Aufnahme starten'
              }
              onPress={start}
              disabled={capture.status !== 'idle' || processing}
              variant="primary"
            />
          )}
          {capture.isRecording ? (
            <ActionButton label="Verwerfen" onPress={capture.cancel} secondary />
          ) : null}
        </View>

        {capture.isRecording ? (
          <ThemedText type="small" accessibilityLiveRegion="polite">
            ● Aufnahme läuft · {(capture.elapsedMs / 1_000).toFixed(1)} s
          </ThemedText>
        ) : null}

        {capture.error ? (
          <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
            {capture.error.message}
          </ThemedText>
        ) : null}

        {result ? <FeedbackBlock result={result} /> : null}

        {result ? (
          <View style={styles.buttonRow}>
            <ActionButton label="Noch einmal aufnehmen" onPress={start} />
            <ActionButton label="Nächstes Wort" onPress={next} secondary />
          </View>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary">
          Diese Teilmessung verändert deinen FSRS-Karteikasten nicht.
        </ThemedText>
      </ThemedView>
    </>
  );
}

function TargetBlock({ prompt }: { prompt: SpeakingPrompt }) {
  const toneColor = useToneColor();
  const color = toneColor(prompt.targetTone);
  return (
    <View style={styles.targetBlock}>
      <View style={styles.targetRow}>
        <ToneContour tone={prompt.targetTone} height={22} color={color} />
        <ThemedText type="smallBold" style={{ color }}>
          Sollform: {TONES[prompt.targetTone].label}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Quelle: quellengeprüfter Silbenton aus Wiktionary-IPA
        {prompt.source ? ' · Quellenlink im Vokabeleintrag' : ''}. Nicht aus TTS oder einem
        Hörclip.
      </ThemedText>
    </View>
  );
}

function FeedbackBlock({ result }: { result: AttemptResult }) {
  const { feedback, measurement, capture } = result;
  const heading =
    feedback.verdict === 'compatible'
      ? 'Kontur vereinbar'
      : feedback.verdict === 'needs-work'
        ? 'Kontur noch nicht vereinbar'
        : feedback.verdict === 'register-uncalibrated'
          ? 'Kontur gemessen – Register offen'
        : 'Nicht zuverlässig messbar';

  return (
    <ThemedView type="backgroundSelected" style={styles.feedback} accessibilityLiveRegion="polite">
      <ThemedText type="smallBold">{heading}</ThemedText>
      <ThemedText type="small">{feedback.message}</ThemedText>
      {measurement.status === 'measured' ? (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Messkurve: relative Halbtöne; die gestrichelte Linie ist der Median dieser Aufnahme.
          </ThemedText>
          <MeasuredToneContour points={measurement.summary.pts} />
          <ThemedText type="small" themeColor="textSecondary">
            Bewertete stimmhafte Strecke: {measurement.summary.durMs} ms · Aufnahme:{' '}
            {(capture.durationMs / 1_000).toFixed(1)} s
            {capture.reachedLimit ? ' · automatisch gestoppt' : ''}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.limitations}>
        <ThemedText type="smallBold">Was diese Rückmeldung nicht bewertet</ThemedText>
        {SPEAKING_LIMITATIONS.map((limitation) => (
          <ThemedText key={limitation} type="small" themeColor="textSecondary">
            • {limitation}
          </ThemedText>
        ))}
      </View>
    </ThemedView>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  secondary,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}>
      <ThemedView
        type={secondary ? 'backgroundElement' : 'backgroundSelected'}
        style={styles.button}>
        <ThemedText type="small">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tapTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  thaiWord: {
    textAlign: 'center',
  },
  field: {
    gap: Spacing.one,
  },
  targetBlock: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  notice: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  feedback: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  limitations: {
    gap: Spacing.one,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
