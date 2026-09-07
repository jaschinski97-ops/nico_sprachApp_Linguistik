import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { MeasuredToneContour } from './measured-tone-contour';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { SENTENCE_FOOTNOTE_BY_LANGUAGE, SENTENCE_LIMITS } from '@/data/sentence-tasks';
import { useMicrophoneCapture } from '@/hooks/use-microphone-capture';
import { hasPronunciationClip, isLanguageAvailable, playPronunciationWithStatus, stopPronunciation } from '@/lib/audio';
import { LanguageCode } from '@/lib/languages/types';
import { languageOf } from '@/lib/languages/registry';
import type { CapturedPcm } from '@/lib/speaking';
import { measureSentence, preparationRemaining, sentenceAnswers, sentenceSession,
  SENTENCE_WINDOWS_MS, type SentenceMeasurement, type SentenceMode } from '@/lib/speaking/sentence-session';

export function SentenceAction({ label, onPress, disabled = false }: {
  label: string; onPress: () => void; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.action, { opacity: disabled ? .45 : pressed ? .65 : 1 }]}>
    <ThemedText type="smallBold">{label}</ThemedText>
  </Pressable>;
}

export function SentenceRunner({ mode, language, onExit }: { mode: SentenceMode; language: LanguageCode; onExit: () => void }) {
  const [seed] = useState(() => Date.now());
  const [tasks] = useState(() => sentenceSession(language, seed));
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(0);
  const [preparedAt, setPreparedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [heard, setHeard] = useState(false);
  const [headphones, setHeadphones] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<SentenceMeasurement | null>(null);
  const [stage, setStage] = useState<'prepare' | 'record' | 'result'>('prepare');
  const task = tasks[index];
  const windowMs = mode === 'sentenceRepeat' ? SENTENCE_WINDOWS_MS[round] : 15_000;
  const capture = useMicrophoneCapture({ maxDurationMs: windowMs, allowPlayback: mode === 'shadowing' });
  const captureRef = useRef(capture); captureRef.current = capture;
  const generation = useRef(0);
  const locked = useRef(false);
  const processed = useRef(new WeakSet<CapturedPcm>());
  const active = useRef(false);
  const stageRef = useRef(stage); stageRef.current = stage;
  const remaining = preparationRemaining(preparedAt, now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') return;
      generation.current++; active.current = false; locked.current = false;
      captureRef.current.cancel(); void stopPronunciation();
      setBusy(false); setStage('prepare'); setResult(null); setHeard(false);
      setPreparedAt(Date.now()); setNow(Date.now());
      setNotice('Unterbrochen. Die Aufnahme wurde verworfen; bereite den Satz erneut vor.');
    });
    return () => {
      sub.remove(); generation.current++; active.current = false;
      captureRef.current.cancel(); void stopPronunciation();
    };
  }, []);

  async function play(concurrentRecording = false): Promise<boolean> {
    const turn = generation.current;
    const label = languageOf(language).label;
    const request = { text: task.text, language, purpose: 'sentence' as const };
    if (!await hasPronunciationClip(request) && await isLanguageAvailable(language) === false) {
      if (turn === generation.current) setNotice(`Kein Satzclip und keine ${label}-Systemstimme verfügbar. Installiere eine ${label}-Stimme oder nutze ein Gerät mit ${label}-Sprachausgabe. Ohne hörbaren Satz wird keine Antwort bewertet.`);
      return false;
    }
    if (turn !== generation.current) return false;
    const playback = await playPronunciationWithStatus({ ...request, ...(concurrentRecording ? { concurrentRecording: true } : {}) });
    if (turn !== generation.current) { await stopPronunciation(); return false; }
    setNotice(playback.label);
    return playback.kind !== 'unavailable';
  }

  async function listen() {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    const turn = generation.current;
    try { if (await play() && turn === generation.current) setHeard(true); }
    catch { if (turn === generation.current) setNotice('Die Satzwiedergabe ist fehlgeschlagen. Versuche es erneut.'); }
    finally { if (turn === generation.current) { locked.current = false; setBusy(false); } }
  }

  async function finish(recording: CapturedPcm) {
    if (!active.current || processed.current.has(recording)) return;
    processed.current.add(recording); active.current = false;
    const turn = generation.current;
    setBusy(true); locked.current = true;
    await stopPronunciation();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    try {
      if (turn !== generation.current) return;
      setResult(measureSentence(recording)); setStage('result');
    } catch { if (turn === generation.current) { setNotice('Die Aufnahme konnte nicht ausgewertet werden.'); setStage('prepare'); } }
    finally {
      if (turn === generation.current) { captureRef.current.clear(); setBusy(false); locked.current = false; }
    }
  }
  useEffect(() => {
    if (capture.lastCapture) void finish(capture.lastCapture);
    // finish uses refs so a changed capture controller cannot process PCM twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture.lastCapture]);

  async function start() {
    // Enforce in the handler too; a stale enabled button cannot skip planning.
    if (locked.current || stageRef.current !== 'prepare' || preparationRemaining(preparedAt, Date.now()) > 0 ||
      !heard || (mode === 'shadowing' && !headphones)) return;
    locked.current = true; setBusy(true);
    const turn = generation.current;
    await stopPronunciation();
    const started = await captureRef.current.start();
    if (turn !== generation.current) { captureRef.current.cancel(); return; }
    if (!started) { locked.current = false; setBusy(false); return; }
    active.current = true; setResult(null); setStage('record');
    try {
      if (mode === 'shadowing' && !await play(true)) {
        active.current = false; captureRef.current.cancel(); setStage('prepare');
      }
    } catch {
      active.current = false; captureRef.current.cancel(); setStage('prepare');
      setNotice('Das Vorbild konnte nicht starten. Die Aufnahme wurde verworfen.');
    } finally { if (turn === generation.current) { setBusy(false); locked.current = false; } }
  }
  async function stop() {
    if (!active.current || locked.current) return;
    const recording = await captureRef.current.stop();
    if (recording) await finish(recording);
    else { active.current = false; setStage('prepare'); }
  }
  function reset(nextIndex: number, nextRound = 0) {
    generation.current++; active.current = false; locked.current = false;
    captureRef.current.cancel(); captureRef.current.clear(); void stopPronunciation();
    setIndex(nextIndex); setRound(nextRound); setHeard(false); setAnswer(null);
    setResult(null); setBusy(false); setStage('prepare'); setNotice('');
    setPreparedAt(Date.now()); setNow(Date.now());
  }
  // Eine Sprache ohne geprüfte Sätze bekommt keinen vorgetäuschten Ablauf:
  // kein Mikrofon, keine Wiedergabe — nur der ehrliche Hinweis, was fehlt
  // (AE-66). Sobald die Registry Satzstoff führt, läuft alles wie bei Thai.
  if (tasks.length === 0) return <ThemedView style={styles.card}>
    <ThemedText type="subtitle">Noch kein Satzmaterial für {languageOf(language).label}</ThemedText>
    <ThemedText type="small">{SENTENCE_FOOTNOTE_BY_LANGUAGE[language]}</ThemedText>
    <SentenceAction label="Zurück" onPress={onExit} />
  </ThemedView>;

  if (!task) return <ThemedView style={styles.card}>
    <ThemedText type="subtitle">Runde abgeschlossen</ThemedText>
    <ThemedText>{mode === 'sentenceListening' ? `${correct} von ${tasks.length} Satzbedeutungen richtig gewählt.` : `${tasks.length} Sätze bearbeitet. Keine Aussprachebewertung und keine Änderung am Wiederholungsplan.`}</ThemedText>
    <ThemedText type="small">{SENTENCE_LIMITS}</ThemedText>
    <SentenceAction label="Neue Runde" onPress={() => { setCorrect(0); reset(0); }} />
    <SentenceAction label="Zurück" onPress={onExit} />
  </ThemedView>;

  const listening = mode === 'sentenceListening';
  return <ThemedView style={styles.card} type="backgroundElement">
    <View style={styles.row}><ThemedText type="small">Satz {index + 1} von {tasks.length}</ThemedText>
      <SentenceAction label="Satzübung verlassen" onPress={onExit} /></View>
    <ThemedText type="subtitle">{listening ? 'Satz verstehen' : mode === 'shadowing' ? 'Mit dem Satz mitsprechen' : 'Denselben Satz wiederholen'}</ThemedText>
    <ThemedText type="small">{SENTENCE_LIMITS}</ThemedText>
    {!listening && <>
      <ThemedText type="small">{mode === 'sentenceRepeat' ? `Runde ${round + 1} von 3 · 12 / 9 / 6 Sekunden. Anpassung des 4:3:2-Verhältnisses an kurze Sätze, kein 4/3/2-Minuten-Vortrag. Der Effekt wechselnder Zuhörer und echter Mitteilungsabsicht wird hier nicht abgedeckt.` : 'Höre den Satz zuerst. Sprich danach während des Vorbilds mit. Nutze Kopfhörer: Über Lautsprecher kann das Vorbild in deiner Mikrofonmessung landen.'}</ThemedText>
      <ThemedText type="smallBold">{task.german}</ThemedText>
      {(stage !== 'record' || mode === 'shadowing') && <><ThemedText type="subtitle">{task.text}</ThemedText><ThemedText>{task.roman}</ThemedText></>}
      {stage === 'prepare' && <>
        <ThemedText type="smallBold">Verpflichtende Vorbereitung · noch {Math.ceil(remaining / 1000)} Sekunden</ThemedText>
        <ThemedText type="small">Kläre die Bedeutung und plane den ganzen Satz. {task.focus} Die 15 Sekunden sind eine Übungsentscheidung, kein wissenschaftlich ermitteltes Optimum.</ThemedText>
      </>}
    </>}
    {(listening || stage === 'prepare') && <SentenceAction label={heard ? 'Satz erneut hören' : 'Satz hören'} onPress={() => void listen()} disabled={busy} />}
    <ThemedText type="small">Das Hörbeispiel ist kein Bewertungsmaßstab für deine Aufnahme.</ThemedText>
    <ThemedText accessibilityLiveRegion="polite" type="small">{capture.error?.message || notice}</ThemedText>
    {!listening && stage === 'prepare' && <>
      {mode === 'shadowing' && <SentenceAction label={headphones ? 'Kopfhörer bestätigt' : 'Ich verwende Kopfhörer'} onPress={() => setHeadphones(value => !value)} />}
      <ThemedText type="small">Mikrofon erst nach „Aufnahme starten“. Nur flüchtiger Gerätespeicher, kein Upload. Höchstens {windowMs / 1000} Sekunden; danach wird die Aufnahme ausgewertet und verworfen.</ThemedText>
      <SentenceAction label="Aufnahme starten" onPress={() => void start()} disabled={busy || remaining > 0 || !heard || (mode === 'shadowing' && !headphones)} />
    </>}
    {!listening && stage === 'record' && <>
      <ThemedText accessibilityLiveRegion="polite">Noch {Math.max(0, Math.ceil((windowMs - capture.elapsedMs) / 1000))} Sekunden</ThemedText>
      <SentenceAction label="Aufnahme beenden" onPress={() => void stop()} disabled={busy} />
    </>}
    {result && <>
      <ThemedText type="smallBold">Lokale Messung · {(result.durationMs / 1000).toFixed(1)} Sekunden Aufnahme</ThemedText>
      <ThemedText type="small">{result.voicedFramePercent} % der Analysefenster haben messbare Periodizität. Das ist keine Sprechzeit-, Tempo- oder Flüssigkeitsnote. {result.reachedLimit ? 'Das Zeitfenster ist abgelaufen; ob der Satz vollständig war, wird nicht erkannt.' : ''}</ThemedText>
      {result.contour.status === 'measured' ? <><MeasuredToneContour points={result.contour.summary.pts} /><ThemedText type="small">Nur längster zusammenhängender F0-Abschnitt, {result.contour.summary.durMs} ms. Kein Sollvergleich für den Satz; Worttöne, Konsonanten, Vokallänge, Aspiration und Vollständigkeit sind nicht bewertet.</ThemedText></> : <ThemedText type="small">Keine ausreichende stimmhafte Strecke messbar. Das bedeutet nicht, dass dein Satz falsch war.</ThemedText>}
      <SentenceAction label="Noch einmal vorbereiten" onPress={() => reset(index, round)} />
      <SentenceAction label={mode === 'sentenceRepeat' && round < 2 ? 'Nächstes Zeitfenster vorbereiten' : 'Nächster Satz'} onPress={() => mode === 'sentenceRepeat' && round < 2 ? reset(index, round + 1) : reset(index + 1)} />
    </>}
    {listening && <>
      <ThemedText type="smallBold">Welche ganze Aussage oder Frage hast du gehört?</ThemedText>
      {sentenceAnswers(task, seed + index).map(option => <SentenceAction key={option} label={option} disabled={!heard || answer !== null || busy}
        onPress={() => { if (!heard || answer !== null) return; setAnswer(option); if (option === task.german) setCorrect(value => value + 1); void stopPronunciation(); }} />)}
      {answer !== null && <>
        <ThemedText accessibilityLiveRegion="polite">{answer === task.german ? 'Richtig.' : `Gemeint ist: ${task.german}`}</ThemedText>
        <ThemedText>{task.text}</ThemedText><ThemedText>{task.roman}</ThemedText>
        <ThemedText type="small">{task.focus}</ThemedText>
        <SentenceAction label="Nächster Satz" onPress={() => reset(index + 1)} />
      </>}
    </>}
    <ThemedText type="small">{SENTENCE_FOOTNOTE_BY_LANGUAGE[language]}</ThemedText>
  </ThemedView>;
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, gap: Spacing.two, borderRadius: Spacing.three },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  action: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: '#888888', borderRadius: 8, padding: Spacing.two },
});
