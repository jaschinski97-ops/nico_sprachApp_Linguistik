import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { ApiKeysCard } from '@/components/api-keys-card';
import { SettingsRow } from '@/components/settings-row';
import { ThemedButton } from '@/components/themed-button';
import { ContentReport } from './content-report';
import { estimateRunCost } from './run-cost';
import { exportDrafts, studioRequest } from './content-client';
import { planDeliveryAudio } from '@/lib/content/audio-plan';
import { previewAudioDelivery } from '@/lib/content/delivery-preview';
import type { ExamModule } from '@/lib/exam/types';

import { DiagnosticsCard } from '@/components/diagnostics-card';
import { GeneratorCard, RunOption, StartArgs } from '@/components/generator-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { runClipBatch, missingClipSpecs } from '@/lib/clips/batch';
import { getActiveAudioBlobBackend, getAudioBlobStore } from '@/lib/clips/blob-store';
import { createClipGenerationClient } from '@/lib/clips/generator';
import { estimateClipBytes, formatBytes, planClips, planClipTestRun } from '@/lib/clips/plan';
import { AudioClipSpec } from '@/lib/clips/types';
import { runGenerationBatch, missingSpecs } from '@/lib/conversation/batch';
import { ConversationSituation } from '@/lib/conversation/types';
import { createGenerationClient } from '@/lib/conversation/generator';
import { FULL_RUN, planSituations } from '@/lib/conversation/plan';
import { runExamBatch, missingExamSpecs } from '@/lib/exam/batch';
import { createExamGenerationClient } from '@/lib/exam/generator';
import { EXAM_FULL_RUN, EXAM_TEST_RUN, planExamModules } from '@/lib/exam/plan';
import { getActiveBlobBackend, getImageBlobStore } from '@/lib/images/blob-store';
import { runImageBatch, missingImageSpecs } from '@/lib/images/batch';
import { createImageGenerationClient } from '@/lib/images/generator';
import { countImageCandidates, IMAGE_TEST_RUN, planImages } from '@/lib/images/plan';
import { vocabularyFor } from '@/data/vocabulary';
import { LanguageCode } from '@/lib/languages/types';
import { languageOf } from '@/lib/languages/registry';
import { loadProfile } from '@/lib/profile';
import { HELPER_AUDIO_PROVIDER, ProviderId } from '@/lib/providers/types';
import {
  defaultSettings,
  GENERATOR_GROUP_INFO,
  GeneratorChoice,
  GeneratorGroupId,
  GeneratorSettings,
  loadGeneratorSettings,
  setGeneratorChoice,
  setGeneratorProvider,
} from '@/lib/providers/settings';
import { helperAudioAvailable } from '@/lib/providers/audio';
import {
  loadExamModules,
  clearAudioClips,
  clearGeneratedExamModules,
  clearSituations,
  clearVocabImages,
  countAudioClips,
  countExamModules,
  countGeneratedExamModules,
  countSituations,
  countVocabImages,
  loadSituations,
  sumAudioClipBytes,
} from '@/lib/repository';

/**
 * Alle drei Generatoren teilen sich Aufbau und Bedienung (`GeneratorCard`),
 * darunter denselben Batch-Läufer und seit Phase 10 auch denselben
 * Anbieter-Vertrag; unterschiedlich sind nur Bauplan und Ablage.
 *
 * Die Anbieterwahl liegt **je Gruppe** getrennt (`meta/generators`), weil
 * genau das der Punkt ist: Claude erzeugt keine Bilder, also muss man Dialoge
 * und Bilder verschieden einstellen können.
 */

const SITUATION_RUNS: RunOption[] = [
  {
    id: 'test',
    label: 'Probelauf',
    hint: '16 Situationen (Thai) — alle Themen, Niveaus und Richtungen je einmal',
  },
  {
    id: 'full',
    label: 'Vollständiger Lauf',
    hint: `${planSituations(FULL_RUN).length} Situationen (Thai) — kostet echtes Geld und dauert`,
  },
];

// SEIT PHASE 16 AUSDRUECKLICH THAI. Die Planer sind sprachparametrisiert
// (Pflicht 4), aber diese Seite bietet die Wahl noch nicht an - und eine Zahl
// ohne Sprache waere hier eine stille Falschaussage. Was fehlt, steht in
// PROGRESS.md unter Phase 16.

const EXAM_RUNS: RunOption[] = [
  {
    id: 'test',
    label: 'Probelauf',
    hint: `${planExamModules(EXAM_TEST_RUN).length} Aufgaben — jede Kombination aus Stufe, Fertigkeit und Format einmal`,
  },
  {
    id: 'full',
    label: 'Vollständiger Lauf',
    hint: `${planExamModules(EXAM_FULL_RUN).length} Aufgaben — kostet echtes Geld und dauert`,
  },
];

/**
 * Der Bilderlauf haengt seit Phase 18 an der gewaehlten Sprache: Wie viele
 * Bilder es werden, steht erst fest, wenn die Sprache feststeht.
 */
function imageRunOptions(language: LanguageCode): RunOption[] {
  const alle = countImageCandidates(vocabularyFor(language));
  return [
    { id: 'test', label: 'Probelauf', hint: `${IMAGE_TEST_RUN} Bilder — kleiner Testlauf` },
    {
      id: 'full',
      label: 'Alle konkreten Vokabeln',
      hint: `${alle} Bilder (${languageOf(language).label}) — kostet echtes Geld und dauert`,
    },
  ];
}

/**
 * Die Umfänge des Clip-Laufs hängen vom Bestand ab (wie viele Situationen
 * gespeichert sind) und vom Anbieter (WAV bei Gemini, mp3 bei ChatGPT) —
 * deshalb werden sie je Aufruf gebaut, nicht als Konstante. Die Schätzung
 * steht **vor** dem Start am Knopf (Pflicht 3).
 */
function clipRunOptions(
  storedSituations: ConversationSituation[],
  provider: ProviderId,
  language: LanguageCode,
  exams: ExamModule[] = []
): { options: RunOption[]; specsFor: (optionId: string) => AudioClipSpec[] } {
  const plans: Record<string, AudioClipSpec[]> = {
    delivery: planDeliveryAudio(storedSituations, exams),
    test: planClipTestRun(vocabularyFor(language)),
    vocab: planClips({ language }),
    // Gespraechszuege gibt es bisher nur auf Thai (AE-48); sie haengen an den
    // gespeicherten Situationen und nicht an dieser Wahl.
    turns: planClips({ includeWords: false, includeExamples: false, situations: storedSituations }),
    all: planClips({ language, situations: storedSituations }),
  };
  const size = (specs: AudioClipSpec[]) => {
    const bytes = estimateClipBytes(specs, provider);
    return bytes === null ? '' : ` · geschätzt ${formatBytes(bytes)}`;
  };
  const options: RunOption[] = [
    { id: 'test', label: 'Probelauf', hint: `${plans.test.length} Clips — fünf Vokabeln samt Beispielsatz${size(plans.test)}` },
    { id: 'delivery', label: 'Auslieferung: alle Sprachen und Deutsch', hint: `${plans.delivery.length} Clips — Wörter, Beispiele, Dialoge und Hörtexte der Prüfungen${size(plans.delivery)}` },
    {
      id: 'vocab',
      label: 'Alle Vokabeln',
      hint: `${plans.vocab.length} Clips (${languageOf(language).label}) — jedes Wort und, wo es eines gibt, der Beispielsatz${size(plans.vocab)}`,
    },
    {
      id: 'turns',
      label: 'Gesprächszüge',
      hint:
        plans.turns.length === 0
          ? 'Keine gespeicherten Sprachsituationen — erst oben Dialoge erzeugen.'
          : `${plans.turns.length} Clips — jeder Thai-Zug der ${storedSituations.length} gespeicherten Situationen, gleiche Sätze nur einmal${size(plans.turns)}`,
    },
    { id: 'all', label: 'Alles', hint: `${plans.all.length} Clips${size(plans.all)} — kostet echtes Geld und dauert` },
  ];
  return { options, specsFor: (optionId) => plans[optionId] ?? plans.test };
}

export default function ContentStudio() {
  const [section, setSection] = useState<'home' | 'keys' | 'reports' | GeneratorGroupId>('home');
  const [running, setRunning] = useState(false);
  const [reportRevision, setReportRevision] = useState(0);
  const [exportMessage, setExportMessage] = useState('');
  const [situations, setSituations] = useState<number | null>(null);
  const [storedSituations, setStoredSituations] = useState<ConversationSituation[]>([]);
  const [clips, setClips] = useState<{ count: number; bytes: number } | null>(null);
  const [clipBackend, setClipBackend] = useState<string | null>(null);
  const [images, setImages] = useState<number | null>(null);
  const [blobBackend, setBlobBackend] = useState<string | null>(null);
  const [exams, setExams] = useState<{ total: number; generated: number } | null>(null);
  const [storedExams, setStoredExams] = useState<ExamModule[]>([]);
  const [generators, setGenerators] = useState<GeneratorSettings>(defaultSettings());
  /**
   * Fuer welche Sprache Bilder und Clips erzeugt werden.
   *
   * Voreingestellt ist die gerade gelernte Sprache — das ist fast immer die
   * gemeinte. Sie steht getrennt vom Lernprofil, weil ein Generierungslauf
   * eine einmalige Handlung ist und nicht bestimmen soll, was man lernt.
   */
  const [mediaLanguage, setMediaLanguage] = useState<LanguageCode>('th');

  const refreshSituations = useCallback(async () => {
    const count = await countSituations();
    setSituations(count);
    // Die Clip-Umfaenge haengen an den gespeicherten Situationen.
    setStoredSituations(await loadSituations());
  }, []);

  const refreshClips = useCallback(async () => {
    const [count, bytes] = await Promise.all([countAudioClips(), sumAudioClipBytes()]);
    setClips({ count, bytes });
  }, []);

  const refreshImages = useCallback(async () => {
    const count = await countVocabImages();
    setImages(count);
  }, []);

  const refreshExams = useCallback(async () => {
    const modules = await loadExamModules();
    setStoredExams(modules);
    setExams({ total: await countExamModules(), generated: await countGeneratedExamModules() });
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([countSituations(), loadSituations(), countVocabImages(), loadExamModules(),
      countExamModules(), countGeneratedExamModules(), countAudioClips(), sumAudioClipBytes()])
      .then(([situationsCount, dialogs, imagesCount, modules, total, generated, count, bytes]) => {
        if (cancelled) return;
        setSituations(situationsCount); setStoredSituations(dialogs); setImages(imagesCount);
        setStoredExams(modules); setExams({ total, generated }); setClips({ count, bytes });
      }).catch(() => { if (!cancelled) setExportMessage('Der gespeicherte Bestand konnte nicht geladen werden. Bitte Studio erneut öffnen.'); });
    getAudioBlobStore().then(() => setClipBackend(getActiveAudioBlobBackend()));
    // Erst der Zugriff laedt das Plattform-Backend; danach steht fest, was
    // tatsaechlich laeuft (Datei, IndexedDB oder Arbeitsspeicher).
    getImageBlobStore().then(() => setBlobBackend(getActiveBlobBackend()));
    loadProfile().then((profile) => setMediaLanguage(profile.language));
    // Studio-Vorgabe (Roadmap v2, Phase 2): Hörclips laufen über den lokalen
    // Helper, wenn er erreichbar ist — sein Schlüssel bleibt serverseitig.
    // Aber nur solange die Gruppe noch ihre Werksvorgabe trägt: Eine bewusst
    // gespeicherte Wahl (etwa Gemini direkt) wird nicht still umgebogen, und
    // ohne Helper gilt der Direktpfad wie bisher.
    (async () => {
      const stored = await loadGeneratorSettings();
      if (
        stored.audio.provider === GENERATOR_GROUP_INFO.audio.defaultProvider &&
        (await helperAudioAvailable())
      ) {
        const next = await setGeneratorProvider('audio', HELPER_AUDIO_PROVIDER);
        if (!cancelled) setGenerators(next);
        return;
      }
      if (!cancelled) setGenerators(stored);
    })().catch(() => {
      // Ohne Speicherstand bleibt die Werksvorgabe der Gruppe stehen.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Ein Anbieterwechsel zieht den Modellnamen mit (siehe `setGeneratorProvider`),
   * eine Modelleingabe nicht — sonst würde jeder Tastendruck den Anbieter
   * zurücksetzen.
   */
  const changeGenerator = useCallback(
    async (group: GeneratorGroupId, change: Partial<GeneratorChoice>) => {
      setGenerators(
        change.provider !== undefined
          ? await setGeneratorProvider(group, change.provider)
          : await setGeneratorChoice(group, change)
      );
    },
    []
  );

  const startSituations = useCallback(
    async ({ optionId, apiKey, provider, model, onProgress, shouldCancel, confirmRun }: StartArgs) => {
    await studioRequest('/state');
    const specs = planSituations(optionId === 'full' ? FULL_RUN : { variantsPerCombo: 1 });
    if (!await confirmRun(estimateRunCost('situations', provider, model, (await missingSpecs(specs)).map(() => ({}))))) return;
    await runGenerationBatch({
      specs,
      client: createGenerationClient(provider, apiKey, model),
      onProgress,
      shouldCancel,
      // Kleine Pause zwischen den Aufrufen, damit ein langer Lauf nicht
      // unnötig ins Rate-Limit rennt.
      delayMs: 400,
    });
    await exportDrafts(setExportMessage);
    setReportRevision(value => value + 1);
  },
    []
  );

  const startImages = useCallback(
    async ({ optionId, language, apiKey, provider, model, onProgress, shouldCancel, confirmRun }: StartArgs) => {
    await studioRequest('/state');
    const specs = planImages(
      optionId === 'full' ? { language } : { language, limit: IMAGE_TEST_RUN }
    );
    if (!await confirmRun(estimateRunCost('images', provider, model, (await missingImageSpecs(specs)).map(() => ({}))))) return;
    await runImageBatch({
      specs,
      client: createImageGenerationClient(provider, apiKey, model),
      onProgress,
      shouldCancel,
      // Bildaufrufe dauern deutlich länger als Textaufrufe; die Pause darf
      // entsprechend größer sein.
      delayMs: 800,
    });
    await exportDrafts(setExportMessage);
    setReportRevision(value => value + 1);
  },
    []
  );

  const startClips = useCallback(
    async ({ optionId, language, apiKey, provider, model, voice, onProgress, shouldCancel, confirmRun }: StartArgs) => {
      await studioRequest('/state');
      const specs = clipRunOptions(await loadSituations(), provider, language, await loadExamModules()).specsFor(optionId);
      if (!await confirmRun({ ...estimateRunCost('audio', provider, model, await missingClipSpecs(specs)),
        delivery: previewAudioDelivery(specs) })) return;
      await runClipBatch({
        specs,
        client: createClipGenerationClient(provider, apiKey, model, voice),
        onProgress,
        shouldCancel,
        // Gemessen am 2026-09-06 (Gratis-Tarif): 10 Requests/Minute — daher
        // 6500 ms. Mit aktivierter Abrechnung (AE-68) heben sich die Limits
        // deutlich; 1200 ms liegen mit ~50/min sicher darunter und halten
        // einen Auslieferungslauf von Stunden auf Minuten.
        // Der Helper begrenzt sich selbst auf 30 Aufrufe/Minute — 2200 ms
        // bleiben mit Pause auch bei kurzzeitiger Frame-Verzögerung darunter.
        delayMs: provider === 'gemini' ? 1200 : provider === 'chatgpt-helper' ? 2200 : 600,
      });
      await exportDrafts(setExportMessage);
      setReportRevision(value => value + 1);
    },
    []
  );

  const startExams = useCallback(
    async ({ optionId, apiKey, provider, model, onProgress, shouldCancel, confirmRun }: StartArgs) => {
      await studioRequest('/state');
      const specs = planExamModules(optionId === 'full' ? EXAM_FULL_RUN : EXAM_TEST_RUN);
      if (!await confirmRun(estimateRunCost('exam', provider, model, (await missingExamSpecs(specs)).map(() => ({}))))) return;
      await runExamBatch({
        specs,
        client: createExamGenerationClient(provider, apiKey, model),
        onProgress,
        shouldCancel,
        delayMs: 400,
      });
      await exportDrafts(setExportMessage);
      setReportRevision(value => value + 1);
    },
    []
  );

  return (
    <View style={{ gap: Spacing.three }}>
      {section !== 'home' ? <ThemedButton label="Studio-Übersicht" disabled={running} onPress={() => setSection('home')} /> : null}
      {section === 'home' ? <>
        <ThemedText type="small" themeColor="textSecondary">Was möchtest du verwalten?</ThemedText>
        <ThemedText type="smallBold">Inhalte erzeugen</ThemedText>
        <View style={{ borderRadius: 16, overflow: 'hidden', gap: 1 }}>
          <SettingsRow title="Bilder" detail="Vokabelbilder erstellen" icon="image-outline" onPress={() => setSection('images')} />
          <SettingsRow title="Audio" detail="Wörter, Sätze und Dialoge vertonen" icon="volume-medium-outline" onPress={() => setSection('audio')} />
          <SettingsRow title="Dialoge" detail="Sprachsituationen erstellen" icon="chatbubbles-outline" onPress={() => setSection('situations')} />
          <SettingsRow title="Prüfungsaufgaben" detail="Lese- und Höraufgaben erstellen" icon="ribbon-outline" onPress={() => setSection('exam')} />
        </View>
        <ThemedText type="smallBold">Verwaltung</ThemedText>
        <View style={{ borderRadius: 16, overflow: 'hidden', gap: 1 }}>
          <SettingsRow title="Anbieter & Schlüssel" detail="Zugänge zentral verwalten" icon="key-outline" onPress={() => setSection('keys')} />
          <SettingsRow title="Prüfberichte & Diagnose" detail="Qualität und gespeicherte Inhalte" icon="pulse-outline" onPress={() => setSection('reports')} />
        </View>
      </> : null}
      {section === 'keys' ? <ApiKeysCard /> : null}
      {section === 'reports' ? <><ContentReport revision={reportRevision} /><DiagnosticsCard /></> : null}
      {exportMessage ? <ThemedText accessibilityLiveRegion="polite" type="small">{exportMessage}</ThemedText> : null}
      {section === 'situations' ? (
      <GeneratorCard
        managedKeys onManageKeys={() => setSection('keys')} onRunningChange={setRunning}
        heading="Generator: Sprachsituationen"
        description="Dialoge einmalig erstellen und lokal zum Üben speichern."
        group="situations"
        choice={generators.situations}
        onChoiceChange={(change) => changeGenerator('situations', change)}
        statusLine={`Im Speicher: ${situations === null ? '…' : `${situations} Situationen`}`}
        runOptions={SITUATION_RUNS}
        onStart={startSituations}
        onDelete={clearSituations}
        deleteLabel="Alle Situationen löschen"
        canDelete={Boolean(situations && situations > 0)}
        onFinished={refreshSituations}
      />
      ) : null}

      {section === 'images' ? (
      <GeneratorCard
        managedKeys onManageKeys={() => setSection('keys')} onRunningChange={setRunning}
        heading="Generator: Bilder"
        description="Ein Bild je konkreter Vokabel. Abstrakte Wörter erhalten kein Bild."
        group="images"
        choice={generators.images}
        onChoiceChange={(change) => changeGenerator('images', change)}
        language={mediaLanguage}
        onLanguageChange={setMediaLanguage}
        statusLine={`Im Speicher: ${images === null ? '…' : `${images} Bilder insgesamt`} · Ablage ${blobBackend ?? '…'}`}
        runOptions={imageRunOptions(mediaLanguage)}
        onStart={startImages}
        onDelete={clearVocabImages}
        deleteLabel="Alle Bilder löschen"
        canDelete={Boolean(images && images > 0)}
        onFinished={refreshImages}
      />
      ) : null}

      {section === 'exam' ? (
      <GeneratorCard
        managedKeys onManageKeys={() => setSection('keys')} onRunningChange={setRunning}
        heading="Generator: Prüfungsaufgaben"
        description="Zusätzliche Lese- und Höraufgaben für Deutsch A1 und A2. Mitgelieferte Aufgaben bleiben erhalten."
        group="exam"
        choice={generators.exam}
        onChoiceChange={(change) => changeGenerator('exam', change)}
        statusLine={`Im Speicher: ${exams === null ? '…' : `${exams.total} Aufgaben, davon ${exams.generated} erzeugt`}`}
        runOptions={EXAM_RUNS}
        onStart={startExams}
        onDelete={clearGeneratedExamModules}
        deleteLabel="Erzeugte Aufgaben löschen"
        canDelete={Boolean(exams && exams.generated > 0)}
        onFinished={refreshExams}
      />
      ) : null}

      {section === 'audio' ? (
      <GeneratorCard
        managedKeys onManageKeys={() => setSection('keys')} onRunningChange={setRunning}
        heading="Generator: Hörclips"
        description="Synthetische Hörclips für Wörter, Sätze und Dialoge. Thai-Töne werden automatisch geprüft; das ersetzt keinen Hörtest."
        language={mediaLanguage}
        onLanguageChange={setMediaLanguage}
        group="audio"
        choice={generators.audio}
        onChoiceChange={(change) => changeGenerator('audio', change)}
        statusLine={`Im Speicher: ${clips === null ? '…' : `${clips.count} Clips, ${formatBytes(clips.bytes)}`} · Ablage ${clipBackend ?? '…'}${generators.audio.provider === 'gemini' ? ' · Pause je Aufruf: 6,5 Sekunden (Gemini-Ratenlimit)' : ''}${generators.audio.provider === 'chatgpt-helper' ? ' · Pause je Aufruf: 2,2 Sekunden (Helper-Ratenlimit, 30/min) · Schlüssel serverseitig' : ''}`}
        runOptions={clipRunOptions(storedSituations, generators.audio.provider, mediaLanguage, storedExams).options}
        onStart={startClips}
        onDelete={clearAudioClips}
        deleteLabel="Alle Clips löschen"
        canDelete={Boolean(clips && clips.count > 0)}
        onFinished={refreshClips}
      />
      ) : null}

    </View>
  );
}
