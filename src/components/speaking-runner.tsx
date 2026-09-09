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
import { useLocale, type TranslationKey } from '@/lib/i18n';
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

/** Tonname → i18n-Key (constants/tones bleibt unverändert). */
const TONE_NAME_KEYS: Record<keyof typeof TONES, TranslationKey> = {
  mid: 'tone.mid',
  low: 'tone.low',
  falling: 'tone.falling',
  high: 'tone.high',
  rising: 'tone.rising',
};

/** Auswertungs-Urteil → i18n-Key (die Beschriftungen stehen in den Wörterbüchern). */
const VERDICT_KEYS: Record<ToneContourFeedback['verdict'], TranslationKey> = {
  compatible: 'speaking.verdictCompatible',
  'needs-work': 'speaking.verdictNeedsWork',
  'register-uncalibrated': 'speaking.verdictRegister',
  unmeasurable: 'speaking.verdictUnreliable',
};

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
  const { t } = useLocale();
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
          ? t('speaking.noticeClip')
          : kind === 'tts'
            ? t('speaking.noticeTts')
            : t('speaking.noticeNone')
      );
    } catch {
      setExampleNotice(t('speaking.noticeError'));
    }
  }, [capture.status, processing, prompt, t]);

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
        <ThemedText type="smallBold">{t('speaking.loadFailedTitle')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('cards.assembleFailed', { message: buildFailed })}
        </ThemedText>
        <View style={styles.buttonRow}>
          <ActionButton label={t('common.retry')} onPress={() => setRound((value) => value + 1)} />
          <ActionButton label={t('common.back')} onPress={onExit} />
        </View>
      </ThemedView>
    );
  }

  if (!session) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        {t('speaking.assembling')}
      </ThemedText>
    );
  }

  if (session.prompts.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t('speaking.noTarget')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('speaking.noTargetBody')}
        </ThemedText>
        <ActionButton label={t('common.back')} onPress={onExit} />
      </ThemedView>
    );
  }

  if (!prompt) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t('drill.roundDone')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t(
            attempts === 1 ? 'speaking.roundSummaryOne' : 'speaking.roundSummaryMany',
            { count: attempts }
          )}
        </ThemedText>
        <View style={styles.buttonRow}>
          <ActionButton label={t('drill.newRound')} onPress={() => setRound((value) => value + 1)} />
          <ActionButton label={t('common.back')} onPress={onExit} />
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <View style={styles.headerRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('speaking.progress', { index: index + 1, total: session.prompts.length })}
        </ThemedText>
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel={t('speaking.exitA11y')}
          style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('drill.exit')}
          </ThemedText>
        </Pressable>
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t('speaking.sayThisWord')}</ThemedText>
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
            label={t('speaking.playExample')}
            onPress={playExample}
            disabled={capture.status !== 'idle' || processing}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t('speaking.clipNote')}
          </ThemedText>
          {exampleNotice ? (
            <ThemedText type="small" themeColor="textSecondary">
              {exampleNotice}
            </ThemedText>
          ) : null}
        </View>

        <ThemedView type="backgroundSelected" style={styles.notice}>
          <ThemedText type="smallBold">{t('speaking.privacyTitle')}</ThemedText>
          <ThemedText type="small">{SPEAKING_PRIVACY_NOTICE}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('speaking.scopedNote')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('speaking.permissionNote', { action: t('speaking.start') })}
          </ThemedText>
        </ThemedView>

        <View style={styles.buttonRow}>
          {/* Aufnahme-Start und -Stopp sind der Kern-CTA dieser Übung und
              tragen deshalb die Akzentfläche (UI-Review 2026-09-07). Die
              übrigen Aktionsflächen bleiben beim grauen Chip. */}
          {capture.isRecording ? (
            <ThemedButton label={t('speaking.stop')} onPress={stop} variant="primary" />
          ) : (
            <ThemedButton
              label={
                capture.status === 'requesting-permission'
                  ? t('speaking.requestingPermission')
                  : capture.status === 'stopping' || processing
                    ? t('speaking.evaluating')
                    : t('speaking.start')
              }
              onPress={start}
              disabled={capture.status !== 'idle' || processing}
              variant="primary"
            />
          )}
          {capture.isRecording ? (
            <ActionButton label={t('speaking.discard')} onPress={capture.cancel} secondary />
          ) : null}
        </View>

        {capture.isRecording ? (
          <ThemedText type="small" accessibilityLiveRegion="polite">
            {t('speaking.recording', { seconds: (capture.elapsedMs / 1_000).toFixed(1) })}
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
            <ActionButton label={t('speaking.retry')} onPress={start} />
            <ActionButton label={t('speaking.nextWord')} onPress={next} secondary />
          </View>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary">
          {t('speaking.noFsrs')}
        </ThemedText>
      </ThemedView>
    </>
  );
}

function TargetBlock({ prompt }: { prompt: SpeakingPrompt }) {
  const { t } = useLocale();
  const toneColor = useToneColor();
  const color = toneColor(prompt.targetTone);
  return (
    <View style={styles.targetBlock}>
      <View style={styles.targetRow}>
        <ToneContour tone={prompt.targetTone} height={22} color={color} />
        <ThemedText type="smallBold" style={{ color }}>
          {t('speaking.targetForm', { tone: t(TONE_NAME_KEYS[prompt.targetTone]) })}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {t('speaking.source', { link: prompt.source ? t('speaking.sourceLink') : '' })}
      </ThemedText>
    </View>
  );
}

function FeedbackBlock({ result }: { result: AttemptResult }) {
  const { t } = useLocale();
  const { feedback, measurement, capture } = result;
  const heading = t(VERDICT_KEYS[feedback.verdict]);

  return (
    <ThemedView type="backgroundSelected" style={styles.feedback} accessibilityLiveRegion="polite">
      <ThemedText type="smallBold">{heading}</ThemedText>
      <ThemedText type="small">{feedback.message}</ThemedText>
      {measurement.status === 'measured' ? (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('speaking.curveNote')}
          </ThemedText>
          <MeasuredToneContour points={measurement.summary.pts} />
          <ThemedText type="small" themeColor="textSecondary">
            {t('speaking.measuredLine', {
              duration: measurement.summary.durMs,
              seconds: (capture.durationMs / 1_000).toFixed(1),
              limit: capture.reachedLimit ? t('speaking.autoStopped') : '',
            })}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.limitations}>
        <ThemedText type="smallBold">{t('speaking.limitationsTitle')}</ThemedText>
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
