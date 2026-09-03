import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ChoiceRow, GeneratorCard, RunOption, StartArgs } from '@/components/generator-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { runClipBatch } from '@/lib/clips/batch';
import { getActiveAudioBlobBackend, getAudioBlobStore } from '@/lib/clips/blob-store';
import { createClipGenerationClient } from '@/lib/clips/generator';
import { estimateClipBytes, formatBytes, planClips, planClipTestRun } from '@/lib/clips/plan';
import { AudioClipSpec } from '@/lib/clips/types';
import { runGenerationBatch } from '@/lib/conversation/batch';
import { ConversationSituation } from '@/lib/conversation/types';
import { createGenerationClient } from '@/lib/conversation/generator';
import { FULL_RUN, planSituations } from '@/lib/conversation/plan';
import { runExamBatch } from '@/lib/exam/batch';
import { createExamGenerationClient } from '@/lib/exam/generator';
import { EXAM_FULL_RUN, EXAM_TEST_RUN, planExamModules } from '@/lib/exam/plan';
import { getActiveBlobBackend, getImageBlobStore } from '@/lib/images/blob-store';
import { runImageBatch } from '@/lib/images/batch';
import { createImageGenerationClient } from '@/lib/images/generator';
import { countImageCandidates, IMAGE_TEST_RUN, planImages } from '@/lib/images/plan';
import { Direction } from '@/lib/fsrs/types';
import { LearnerProfile, loadProfile, setDefaultDirection } from '@/lib/profile';
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
import { directionLabel, DIRECTIONS } from '@/lib/review-session';

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
    hint: '16 Situationen — alle Themen, Niveaus und Richtungen je einmal',
  },
  {
    id: 'full',
    label: 'Vollständiger Lauf',
    hint: `${planSituations(FULL_RUN).length} Situationen — kostet echtes Geld und dauert`,
  },
];

const IMAGE_CANDIDATES = countImageCandidates();

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

const IMAGE_RUNS: RunOption[] = [
  {
    id: 'test',
    label: 'Probelauf',
    hint: `${IMAGE_TEST_RUN} Bilder — kleiner Testlauf`,
  },
  {
    id: 'full',
    label: 'Alle konkreten Vokabeln',
    hint: `${IMAGE_CANDIDATES} Bilder — kostet echtes Geld und dauert`,
  },
];

/**
 * Die Umfänge des Clip-Laufs hängen vom Bestand ab (wie viele Situationen
 * gespeichert sind) und vom Anbieter (WAV bei Gemini, mp3 bei ChatGPT) —
 * deshalb werden sie je Aufruf gebaut, nicht als Konstante. Die Schätzung
 * steht **vor** dem Start am Knopf (Pflicht 3).
 */
function clipRunOptions(
  storedSituations: ConversationSituation[],
  provider: ProviderId
): { options: RunOption[]; specsFor: (optionId: string) => AudioClipSpec[] } {
  const plans: Record<string, AudioClipSpec[]> = {
    test: planClipTestRun(),
    vocab: planClips({}),
    turns: planClips({ includeWords: false, includeExamples: false, situations: storedSituations }),
    all: planClips({ situations: storedSituations }),
  };
  const size = (specs: AudioClipSpec[]) => {
    const bytes = estimateClipBytes(specs, provider);
    return bytes === null ? '' : ` · geschätzt ${formatBytes(bytes)}`;
  };
  const options: RunOption[] = [
    { id: 'test', label: 'Probelauf', hint: `${plans.test.length} Clips — fünf Vokabeln samt Beispielsatz${size(plans.test)}` },
    { id: 'vocab', label: 'Alle Vokabeln', hint: `${plans.vocab.length} Clips — jedes Wort und jeder Beispielsatz${size(plans.vocab)}` },
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
  const [situations, setSituations] = useState<number | null>(null);
  const [storedSituations, setStoredSituations] = useState<ConversationSituation[]>([]);
  const [clips, setClips] = useState<{ count: number; bytes: number } | null>(null);
  const [clipBackend, setClipBackend] = useState<string | null>(null);
  const [images, setImages] = useState<number | null>(null);
  const [blobBackend, setBlobBackend] = useState<string | null>(null);
  const [exams, setExams] = useState<{ total: number; generated: number } | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [generators, setGenerators] = useState<GeneratorSettings>(defaultSettings());

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
    loadProfile().then(setProfile);
    loadGeneratorSettings().then(setGenerators);
  }, [refreshSituations, refreshImages, refreshExams, refreshClips]);

  const chooseDefaultDirection = useCallback(async (direction: Direction | null) => {
    setProfile(await setDefaultDirection(direction));
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
    async ({ optionId, apiKey, provider, model, onProgress, shouldCancel }: StartArgs) => {
    const specs = planSituations(optionId === 'full' ? FULL_RUN : { variantsPerCombo: 1 });
    await runGenerationBatch({
      specs,
      client: createGenerationClient(provider, apiKey, model),
      onProgress,
      shouldCancel,
      // Kleine Pause zwischen den Aufrufen, damit ein langer Lauf nicht
      // unnötig ins Rate-Limit rennt.
      delayMs: 400,
    });
  },
    []
  );

  const startImages = useCallback(
    async ({ optionId, apiKey, provider, model, onProgress, shouldCancel }: StartArgs) => {
    const specs = planImages(optionId === 'full' ? {} : { limit: IMAGE_TEST_RUN });
    await runImageBatch({
      specs,
      client: createImageGenerationClient(provider, apiKey, model),
      onProgress,
      shouldCancel,
      // Bildaufrufe dauern deutlich länger als Textaufrufe; die Pause darf
      // entsprechend größer sein.
      delayMs: 800,
    });
  },
    []
  );

  const startClips = useCallback(
    async ({ optionId, apiKey, provider, model, voice, onProgress, shouldCancel }: StartArgs) => {
      const specs = clipRunOptions(storedSituations, provider).specsFor(optionId);
      await runClipBatch({
        specs,
        client: createClipGenerationClient(provider, apiKey, model, voice),
        onProgress,
        shouldCancel,
        delayMs: 600,
      });
    },
    [storedSituations]
  );

  const startExams = useCallback(
    async ({ optionId, apiKey, provider, model, onProgress, shouldCancel }: StartArgs) => {
      const specs = planExamModules(optionId === 'full' ? EXAM_FULL_RUN : EXAM_TEST_RUN);
      await runExamBatch({
        specs,
        client: createExamGenerationClient(provider, apiKey, model),
        onProgress,
        shouldCancel,
        delayMs: 400,
      });
    },
    []
  );

  return (
    <ScreenScaffold title="Einstellungen" subtitle="Lernprofil, Inhalte erzeugen, API-Schlüssel">
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Standard-Lernrichtung</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Womit der Reiter „Lernen" startet. „Immer fragen" zeigt jedes Mal die
          Auswahl — sinnvoll, wenn zwei Menschen dasselbe Gerät benutzen oder
          wenn du beide Richtungen lernst. Die jeweils andere Richtung bleibt
          immer über „Richtung wechseln" erreichbar.
        </ThemedText>
        <ChoiceRow label="Standard-Lernrichtung">
          <Button
            label="Immer fragen"
            onPress={() => chooseDefaultDirection(null)}
            selected={profile !== null && profile.defaultDirection === null}
            disabled={profile === null}
          />
          {DIRECTIONS.map((direction) => (
            <Button
              key={direction}
              label={directionLabel(direction)}
              onPress={() => chooseDefaultDirection(direction)}
              selected={profile?.defaultDirection === direction}
              disabled={profile === null}
            />
          ))}
        </ChoiceRow>
      </ThemedView>

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
        description="Ein Bild je konkreter Vokabel, einmalig erzeugt und lokal gespeichert — danach offline auf der Karteikarte. Abstrakte Wörter, Partikeln und Funktionswörter bekommen bewusst kein Bild: ein Bild zu „nicht“ wäre keine Merkhilfe."
        group="images"
        choice={generators.images}
        onChoiceChange={(change) => changeGenerator('images', change)}
        statusLine={`Im Speicher: ${images === null ? '…' : `${images} von ${IMAGE_CANDIDATES} Bildern`} · Ablage ${blobBackend ?? '…'}`}
        runOptions={IMAGE_RUNS}
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
        description="Eine Aufnahme je Vokabel, Beispielsatz und Gesprächszug, einmalig erzeugt und lokal gespeichert — danach spielt „Anhören“ den Clip statt der Sprachausgabe des Geräts, auch wenn dort keine Thai-Stimme installiert ist. Es sind synthetische Stimmen, keine Muttersprachler-Aufnahmen; die App sagt das beim Abspielen dazu. Ob die Töne stimmen, ist gemessen (AE-31), nicht versprochen."
        group="audio"
        choice={generators.audio}
        onChoiceChange={(change) => changeGenerator('audio', change)}
        statusLine={`Im Speicher: ${clips === null ? '…' : `${clips.count} Clips, ${formatBytes(clips.bytes)}`} · Ablage ${clipBackend ?? '…'}`}
        runOptions={clipRunOptions(storedSituations, generators.audio.provider).options}
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
        — jeweils mit einem lesbaren Fehler statt einer CORS-Blockade. Bei
        ChatGPT ist es der umgekehrte Fall; die Begründung steht bei der
        Anbieterwahl. Auf dem Gerät (Android/iOS) gibt es CORS nicht, dort
        gelten diese Einschränkungen alle nicht.
      </ThemedText>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
