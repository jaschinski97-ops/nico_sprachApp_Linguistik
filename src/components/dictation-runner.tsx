import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AudioPlayer } from 'expo-audio';

import { GermanPalette, SpanishPalette, ThaiPalette } from './character-palette';
import { ThemedText, displayLineHeight } from './themed-text';
import { ThemedView } from './themed-view';

import { dictationConfigFor, type DictationLanguage } from '@/data/dictation-config';
import type { SatzSprache } from '@/data/sentence-tasks';
import { Spacing } from '@/constants/theme';
import { useTheme, useToneColor } from '@/hooks/use-theme';
import {
  hasPronunciationClip,
  isLanguageAvailable,
  playPronunciationWithStatus,
  stopPronunciation,
} from '@/lib/audio';
import {
  buildDictationSession,
  dictationFootnote,
  type DictationTask,
} from '@/lib/dictation/tasks';
import {
  ratingForScore,
  scoreDictation,
  type DictationDiffToken,
  type DictationScore,
} from '@/lib/dictation/scoring';
import { type Rating } from '@/lib/fsrs/types';
import { type PairDirection } from '@/lib/languages/types';
import { languageOf } from '@/lib/languages/registry';
import { loadOrCreateCardState, rateCard } from '@/lib/repository';
import { recordDrill } from '@/lib/review-log';
import { resolveClipUri } from '@/lib/clips/lookup';
import { useLocale, type TranslationKey } from '@/lib/i18n';
import { ratingExplanation } from '@/lib/writing';

/**
 * Diktat — Satz hören, in der Zielsprache tippen, vergleichen (Roadmap v2,
 * Phase 1). Der Forschungsanker ist der Mehrwort-Chunk: Anders als die
 * Vokabelübungen fragt das Diktat den ganzen Satz ab, mit Interpunktion,
 * Satzakzent und — im Thai — Tonzeichen in Position.
 *
 * Ablauf je Aufgabe: Satz abspielen (mehrfach, mit hinterlegtem Clip auch
 * verlangsamt) → tippen → Auswertung mit Wort-für-Wort- bzw.
 * Zeichen-für-Zeichen-Vergleich → Rückmeldung → bei Erfolg fortgeschriebene
 * FSRS-Karte. Alles offline; die Wiedergabe läuft über dieselbe Policy wie
 * die Satzübungen (`purpose: 'sentence'`), also Clip vor Systemstimme, mit
 * ehrlicher Kennzeichnung, was gehört wurde.
 *
 * FSRS-Regel (dokumentiert in `lib/dictation/scoring.ts`): **Nur bestandene
 * Diktate bewerten** — genau richtig als „Gut", bestanden mit Abweichung als
 * „Schwer", nicht bestanden GAR NICHT. Die Rückmeldung sagt das ausdrücklich,
 * sonst bliebe unklar, warum eine scheiternde Aufgabe den Wortplan nicht
 * bewegt. Dieselbe Karte wie Karteikarte und freies Schreiben, kein zweiter
 * Schlüssel (AE-16).
 *
 * Der Runner hängt an `{ language, direction, onExit }` — er zieht sich Stoff,
 * Bewertung und Karte selbst. Die Richtung kommt seit dem 18.09.2026 vom
 * Aufrufer: Das Deutsch-Diktat (th_to_de) schreibt dieselbe Karte fort wie
 * Karteikarte und freies Schreiben dieser Richtung (AE-16), und die Sprache
 * ist die PRODUZIERTE Seite des Paars (`de` im Deutsch-Ziel), nicht mehr die
 * über `pairLanguageOf` abgeleitete Ankerseite.
 */

/** Verlangsamt, aber hörbar — innerhalb der expo-audio-Grenze (Android 0.1–2.0). */
const SLOW_RATE = 0.7;

/** Was in der Aufgabenzeile steht — je nachdem, welche Sprache getippt wird. Schlüssel ist die Diktat-Sprache (breiter als `LanguageCode`: de/fr sind als Ziele eingeplant). */
const AUFGABEN_KEYS: Record<DictationLanguage, TranslationKey> = {
  th: 'dictation.promptTh',
  de: 'dictation.promptDe',
  es: 'dictation.promptEs',
  en: 'dictation.promptEn',
};

/** FSRS-Bewertung → i18n-Key (die Labels selbst stehen in den Wörterbüchern). */
const RATING_KEYS: Record<Rating, TranslationKey> = {
  1: 'rating.again',
  2: 'rating.hard',
  3: 'rating.good',
  4: 'rating.easy',
};

const PLATZHALTER: Record<DictationLanguage, string> = {
  th: 'ภาษาไทย',
  de: 'dein Satz',
  es: 'tu frase',
  en: 'your sentence',
};

/** Die Zeichenhilfe der Sprache, IN die getippt wird — übernommen vom freien Schreiben. */
function Palette({
  language,
  onInsert,
  disabled,
}: {
  language: DictationLanguage;
  onInsert: (character: string) => void;
  disabled?: boolean;
}) {
  if (language === 'th') return <ThaiPalette onInsert={onInsert} disabled={disabled} />;
  if (language === 'de') return <GermanPalette onInsert={onInsert} disabled={disabled} />;
  if (language === 'es') return <SpanishPalette onInsert={onInsert} disabled={disabled} />;
  // Englisch: jedes Zeichen der Zielform steht auf jeder lateinischen
  // Tastatur.
  return null;
}

/** Anzeige-Name einer Diktat-Sprache — `de` hat keinen Registry-Eintrag (AE-11). */
const DIKTAT_SPRACHE_LABEL: Record<SatzSprache, string> = {
  th: languageOf('th').label,
  en: languageOf('en').label,
  es: languageOf('es').label,
  de: 'Deutsch',
};

export function DictationRunner({
  language,
  direction,
  onExit,
}: {
  language: SatzSprache;
  direction: PairDirection;
  onExit: () => void;
}) {
  const theme = useTheme();
  const toneColor = useToneColor();
  const { t, uiLanguage } = useLocale();
  const label = DIKTAT_SPRACHE_LABEL[language];

  // Die Aussaat würfelt die Runde neu — dieselbe Bauart wie alle anderen
  // Übungen, damit „Neue Runde" nicht dieselbe Folge zeigt. Die Zusammen-
  // stellung ist reine Datenrechnung (kein Store), deshalb synchron abgeleitet.
  const [seed, setSeed] = useState(() => Date.now());
  const session = useMemo(() => buildDictationSession(language, direction, seed), [language, direction, seed]);

  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [score, setScore] = useState<DictationScore | null>(null);
  const [rated, setRated] = useState<Rating | null>(null);
  const [results, setResults] = useState<DictationScore[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [audioNote, setAudioNote] = useState('');

  const slowPlayer = useRef<AudioPlayer | null>(null);
  const releaseSlowPlayer = useCallback(() => {
    const player = slowPlayer.current;
    slowPlayer.current = null;
    if (!player) return;
    try {
      player.remove();
    } catch {
      // Ein bereits freigegebener Player braucht nichts mehr.
    }
  }, []);

  // Beim Verlassen und beim Aufgabenwechsel: nichts spielt nach.
  useEffect(() => {
    return () => {
      releaseSlowPlayer();
      void stopPronunciation();
    };
  }, [releaseSlowPlayer, index]);

  const task = session[index] ?? null;
  const config = task ? dictationConfigFor(task.language) : null;
  const answered = score !== null;

  /** Normale Wiedergabe — dieselbe Policy wie die Satzübungen. */
  const play = useCallback(async (): Promise<boolean> => {
    if (!task) return false;
    const request = { text: task.text, language, purpose: 'sentence' as const };
    if (!await hasPronunciationClip(request) && await isLanguageAvailable(language) === false) {
      setNotice(t('dictation.noVoice', { language: label }));
      return false;
    }
    const playback = await playPronunciationWithStatus(request);
    setAudioNote(playback.kind === 'asset' ? t('sentence.audioClip') : playback.kind === 'tts' ? t('sentence.audioSystem') : t('dictation.noVoice', { language: label }));
    return playback.kind !== 'unavailable';
  }, [task, language, label, t]);

  /**
   * Verlangsamt nur ein hinterlegter Clip — die Systemstimme lässt sich über
   * die Wiedergabe-Policy nicht drosseln, und ein Fallback, der still schnell
   * spielt, würde vortäuschen, es sei langsam. Deshalb: Clip vorhanden →
   * expo-audio-Player mit `shouldCorrectPitch` (die Töne müssen bleiben);
   * sonst ehrlicher Hinweis und normale Geschwindigkeit.
   */
  const playSlow = useCallback(async (): Promise<boolean> => {
    if (!task) return false;
    const uri = await resolveClipUri({ text: task.text, language, purpose: 'sentence' }).catch(() => null);
    if (!uri) {
      setNotice(t('dictation.slowClipOnly'));
      return play();
    }
    releaseSlowPlayer();
    // Natives Modul erst bei Bedarf laden (dasselbe Muster wie `lib/audio`):
    // so bleibt der Player im Jest-Prozess austauschbar und lädt nicht beim
    // reinen Import der Komponente.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createAudioPlayer } = require('expo-audio') as typeof import('expo-audio');
    const player = createAudioPlayer({ uri });
    slowPlayer.current = player;
    try {
      player.shouldCorrectPitch = true;
      player.setPlaybackRate(SLOW_RATE, 'low');
    } catch {
      try {
        player.playbackRate = SLOW_RATE;
      } catch {
        setAudioNote(t('dictation.slowUnsupported'));
      }
    }
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish || status.error !== null) releaseSlowPlayer();
    });
    player.play();
    return true;
  }, [task, language, play, releaseSlowPlayer, t]);

  const submit = useCallback(async () => {
    if (!task || !config || busy || answered) return;
    setBusy(true);
    setNotice('');
    try {
      const next = scoreDictation(draft, task.text, config);
      setScore(next);
      setResults((previous) => [...previous, next]);
      // Die Fehlerquote des Diktats steuert die Gewichtung der Heutigen
      // Runde — protokolliert unabhängig vom Kartenschreiben.
      await recordDrill(next.passed, Date.now(), undefined, 'dictation').catch(() => {});
      if (next.passed) {
        // ratingForScore liefert bei `passed` immer 2 oder 3 — nie null.
        const rating = ratingForScore(next)!;
        const card = await loadOrCreateCardState(task.vocabId, task.direction);
        await rateCard(card, rating);
        setRated(rating);
      } else {
        setRated(null);
      }
    } finally {
      setBusy(false);
    }
  }, [task, config, busy, answered, draft]);

  const next = useCallback(() => {
    setScore(null);
    setRated(null);
    setDraft('');
    setNotice('');
    setAudioNote('');
    releaseSlowPlayer();
    setIndex((current) => current + 1);
  }, [releaseSlowPlayer]);

  if (session.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t('dictation.noneFor', { language: label })}</ThemedText>
        <ThemedText type="small">{dictationFootnote(language, uiLanguage)}</ThemedText>
        <ExitButton onExit={onExit} label={t('common.back')} />
      </ThemedView>
    );
  }

  if (!task) {
    const correct = results.filter((entry) => entry.passed).length;
    const exact = results.filter((entry) => entry.exact).length;
    const missed = session.filter((entry, position) => !results[position]?.passed);
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t('drill.roundDone')}</ThemedText>
        <ThemedText type="small">
          {t('dictation.summary', { correct, total: session.length, exact })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('dictation.onlyPassedRate')}
        </ThemedText>
        {missed.length > 0 ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {t('drill.mistakesTitle')}
            </ThemedText>
            {missed.map((entry) => (
              <ThemedText key={entry.id} type="small">
                {entry.text}
              </ThemedText>
            ))}
          </>
        ) : null}
        <View style={styles.row}>
          <Pressable
            onPress={() => {
              releaseSlowPlayer();
              setResults([]);
              setIndex(0);
              setSeed(Date.now());
            }}
            accessibilityRole="button"
            accessibilityLabel={t('dictation.newRoundA11y')}
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

  return (
    <>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('dictation.progress', { index: index + 1, total: session.length })}
        </ThemedText>
        <ExitButton onExit={onExit} label={t('dictation.exit')} compact />
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t(AUFGABEN_KEYS[task.language])}</ThemedText>

        <View style={styles.row}>
          <Pressable
            onPress={() => void play()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('dictation.play')}
            accessibilityState={{ disabled: busy }}
            style={({ pressed }) => [styles.action, { borderColor: theme.borderSubtle }, pressed && styles.pressed]}>
            <ThemedText type="smallBold">{t('dictation.play')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => void playSlow()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('dictation.playSlowA11y')}
            accessibilityState={{ disabled: busy }}
            style={({ pressed }) => [styles.action, { borderColor: theme.borderSubtle }, pressed && styles.pressed]}>
            <ThemedText type="smallBold">{t('dictation.slow')}</ThemedText>
          </Pressable>
        </View>
        {/* Ehrlich kennzeichnen, was gehört wurde: Clip oder Systemstimme. */}
        {audioNote ? (
          <ThemedText type="small" themeColor="textSecondary">
            {audioNote}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {t('dictation.relistenNote', { action: t('dictation.check') })}
        </ThemedText>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => void submit()}
          editable={!answered}
          multiline
          placeholder={PLATZHALTER[task.language]}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          // Rechtschreibhilfe aus: Sie würde genau die Fehler wegkorrigieren,
          // um die es beim Diktat geht.
          spellCheck={false}
          accessibilityLabel={t('dictation.inputA11y')}
          style={[styles.input, { color: theme.text, borderColor: theme.borderSubtle }]}
        />

        {!answered ? (
          <Palette
            language={task.language}
            onInsert={(character) => setDraft((current) => current + character)}
          />
        ) : null}

        {!answered ? (
          <View style={styles.row}>
            <Pressable
              onPress={() => void submit()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('dictation.checkA11y')}
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [pressed && styles.pressed, busy && styles.disabled]}>
              <ThemedView type="backgroundSelected" style={styles.wide}>
                <ThemedText type="smallBold">{t('dictation.check')}</ThemedText>
              </ThemedView>
            </Pressable>
          </View>
        ) : null}

        {score ? <Feedback score={score} rated={rated} task={task} toneColor={toneColor} themeText={theme.text} /> : null}

        {notice ? (
          <ThemedText accessibilityLiveRegion="polite" type="small">
            {notice}
          </ThemedText>
        ) : null}
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

/** Diff-Farben: grün (Ton `mid`) = sitzt, rot (Ton `falling`) = prüfen. */
function DiffLine({
  diff,
  toneColor,
  themeText,
}: {
  diff: DictationDiffToken[];
  toneColor: (tone: 'mid' | 'falling' | 'low') => string;
  themeText: string;
}) {
  const farbige = diff.filter((token) => token.status !== 'extra');
  const zuviel = diff.filter((token) => token.status === 'extra').map((token) => token.text.trim()).filter(Boolean);
  const { t } = useLocale();
  return (
    <View>
      {/* Display-Zeilenhöhe wie überall im Thai-Satzbau: sonst schneiden
          Tonzeichen an der Kante ein (UI-Review 2026-09-07). */}
      <Text maxFontSizeMultiplier={2} style={{ color: themeText, fontSize: 24, lineHeight: displayLineHeight(24, 2) }}>
        {farbige.map((token, position) => (
          <Text
            key={position}
            style={{
              color:
                token.status === 'match' ? toneColor('mid') : toneColor('falling'),
            }}>
            {token.text}
          </Text>
        ))}
      </Text>
      {zuviel.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('dictation.tooMuch', { tokens: zuviel.join(' ') })}
        </ThemedText>
      ) : null}
    </View>
  );
}

function Feedback({
  score,
  rated,
  task,
  toneColor,
  themeText,
}: {
  score: DictationScore;
  rated: Rating | null;
  task: DictationTask;
  toneColor: (tone: 'mid' | 'falling' | 'low') => string;
  themeText: string;
}) {
  const { t } = useLocale();
  const border = score.passed ? toneColor('mid') : toneColor('falling');
  const tonAnteil = task.language === 'th' || score.diacriticScore < 100;

  return (
    <ThemedView
      type="backgroundSelected"
      style={[styles.feedback, { borderColor: border, borderWidth: 2 }]}>
      <ThemedText type="smallBold">
        {score.passed ? (score.exact ? t('drill.exact') : t('dictation.passed')) : t('dictation.failed')}
      </ThemedText>

      {score.message ? (
        <ThemedText type="small" themeColor="textSecondary">
          {score.message}
        </ThemedText>
      ) : null}

      <ThemedText type="small">
        {t('dictation.baseScore', {
          base: score.baseScore,
          tonePart: tonAnteil ? t('dictation.toneScorePart', { score: score.diacriticScore }) : '',
        })}
      </ThemedText>

      <DiffLine diff={score.diff} toneColor={toneColor} themeText={themeText} />

      {/* Die Bedeutung und die Umschrift erst NACH der Auswertung — vorher
          wäre die Lösung lesbar, und das Diktat würde zum Abschreiben. */}
      <ThemedText type="small">{task.text}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {task.german}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {task.roman}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {task.focus}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        {rated
          ? t('rating.ratedAs', { rating: t(RATING_KEYS[rated]), explanation: ratingExplanation(rated) })
          : t('dictation.notRated')}
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
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 20,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
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
