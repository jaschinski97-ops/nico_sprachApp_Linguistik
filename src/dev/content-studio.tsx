import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { ContentReport } from './content-report';
import { estimateRunCost } from './run-cost';
import { exportDrafts, studioRequest } from './content-client';
import { planDeliveryAudio } from '@/lib/content/audio-plan';
import { previewAudioDelivery } from '@/lib/content/delivery-preview';
import { loadExamModules } from '@/lib/repository';
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
import {
  defaultSettings,
  GeneratorChoice,
  GeneratorGroupId,
  GeneratorSettings,
  loadGeneratorSettings,
  setGeneratorChoice,
  setGeneratorProvider,
} from '@/lib/providers/settings';
import {
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
import { ProviderId } from '@/lib/providers/types';

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

export default function SettingsScreen() {
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
    setSituations(await countSituations());
    // Die Clip-Umfaenge haengen an den gespeicherten Situationen.
    setStoredSituations(await loadSituations());
  }, []);

  const refreshClips = useCallback(async () => {
    setClips({ count: await countAudioClips(), bytes: await sumAudioClipBytes() });
  }, []);

  const refreshImages = useCallback(async () => {
    setImages(await countVocabImages());
  }, []);

  const refreshExams = useCallback(async () => {
    setStoredExams(await loadExamModules());
    setExams({ total: await countExamModules(), generated: await countGeneratedExamModules() });
  }, []);

  useEffect(() => {
    refreshSituations();
    refreshImages();
    refreshExams();
    refreshClips();
    getAudioBlobStore().then(() => setClipBackend(getActiveAudioBlobBackend()));
    // Erst der Zugriff laedt das Plattform-Backend; danach steht fest, was
    // tatsaechlich laeuft (Datei, IndexedDB oder Arbeitsspeicher).
    getImageBlobStore().then(() => setBlobBackend(getActiveBlobBackend()));
    loadProfile().then((profile) => setMediaLanguage(profile.language));
    loadGeneratorSettings().then(setGenerators);
  }, [refreshSituations, refreshImages, refreshExams, refreshClips]);

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
        delayMs: provider === 'gemini' ? 1200 : 600,
      });
      await exportDrafts(setExportMessage);
      setReportRevision(value => value + 1);
    },
    [storedSituations]
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
      <ContentReport revision={reportRevision} />
      <ThemedText accessibilityLiveRegion="polite" type="small">{exportMessage}</ThemedText>
      <DiagnosticsCard />

      <GeneratorCard
        heading="Generator: Sprachsituationen"
        description="Dialoge werden einmalig erzeugt und lokal gespeichert. Danach funktioniert das Üben ohne Internet und ohne Schlüssel — es gibt bewusst keinen Live-Chat."
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

      <GeneratorCard
        heading="Generator: Bilder"
        description="Ein Bild je konkreter Vokabel, einmalig erzeugt und lokal gespeichert — danach offline auf der Karteikarte, ohne Netz und ohne Schlüssel. Abstrakte Wörter, Partikeln und Funktionswörter bekommen bewusst kein Bild: ein Bild zu „nicht“ wäre keine Merkhilfe."
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

      <GeneratorCard
        heading="Generator: Prüfungsaufgaben"
        description="Zusätzliche Lese- und Höraufgaben für die Goethe-Zertifikate A1 und A2. Die mitgelieferten Aufgaben bleiben immer erhalten; erzeugt wird nur, was dazukommt. Schreiben und Sprechen werden bewusst nicht erzeugt — dort gäbe es keine geprüfte Musterlösung."
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

      <GeneratorCard
        heading="Generator: Hörclips"
        description="Eine Aufnahme je Vokabel, Beispielsatz und Gesprächszug, einmalig erzeugt und lokal gespeichert — danach spielt „Anhören“ den Clip statt der Sprachausgabe des Geräts, auch wenn dort gar keine Stimme dieser Sprache installiert ist. Genau darauf laufen auch die Hörübungen. Es sind synthetische Stimmen, keine Muttersprachler-Aufnahmen; die App sagt das beim Abspielen dazu. Ob die Töne stimmen, ist gemessen (AE-31), nicht versprochen."
        language={mediaLanguage}
        onLanguageChange={setMediaLanguage}
        group="audio"
        choice={generators.audio}
        onChoiceChange={(change) => changeGenerator('audio', change)}
        statusLine={`Im Speicher: ${clips === null ? '…' : `${clips.count} Clips, ${formatBytes(clips.bytes)}`} · Ablage ${clipBackend ?? '…'}${generators.audio.provider === 'gemini' ? ' · Pause je Aufruf: 6,5 Sekunden (Gemini-Ratenlimit)' : ''}`}
        runOptions={clipRunOptions(storedSituations, generators.audio.provider, mediaLanguage, storedExams).options}
        onStart={startClips}
        onDelete={clearAudioClips}
        deleteLabel="Alle Clips löschen"
        canDelete={Boolean(clips && clips.count > 0)}
        onFinished={refreshClips}
      />

      <ThemedText type="small" themeColor="textSecondary">
        Jede Gruppe hat ihren eigenen Anbieter und ihren eigenen Schlüssel. Das
        ist kein Selbstzweck: Claude erzeugt überhaupt keine Bilder, deshalb
        stehen dort andere Anbieter zur Wahl als bei Dialogen und
        Prüfungsaufgaben. Voreingestellt bleibt, was bisher lief — Claude für
        Text, Stability AI für Bilder. Schlüssel werden nur für
        Generierungsläufe gebraucht, nie zum Lernen: Wer nichts erzeugt,
        braucht keinen einzigen.
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        Am 03.09.2026 aus diesem Web-Build gemessen: Claude (mit seinem
        Sonderheader), Gemini und Stability AI antworten direkt aus dem Browser
        — jeweils mit einem lesbaren Fehler statt einer CORS-Blockade. ChatGPT
        war davon ausgenommen (AE-27), hat aber mit der Nachmessung vom
        08.09.2026 aufgeholt: Preflight und POST mit gültigem Schlüssel
        kommen mit CORS-Headern durch, OpenAI läuft seither ebenfalls aus
        dem Browser. Auf dem Gerät (Android/iOS) gibt es CORS nicht, dort
        gelten diese Einschränkungen alle nicht.
      </ThemedText>
    </View>
  );
}
