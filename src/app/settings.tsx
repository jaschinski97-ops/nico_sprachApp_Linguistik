import { useCallback, useEffect, useState } from 'react';

import { GeneratorCard, RunOption, StartArgs } from '@/components/generator-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { runGenerationBatch } from '@/lib/conversation/batch';
import { createAnthropicClient, GENERATOR_MODEL } from '@/lib/conversation/generator';
import { FULL_RUN, planSituations } from '@/lib/conversation/plan';
import { getActiveBlobBackend, getImageBlobStore } from '@/lib/images/blob-store';
import { runImageBatch } from '@/lib/images/batch';
import { createStabilityImageClient, IMAGE_MODEL } from '@/lib/images/generator';
import { countImageCandidates, IMAGE_TEST_RUN, planImages } from '@/lib/images/plan';
import { clearSituations, clearVocabImages, countSituations, countVocabImages } from '@/lib/repository';

/**
 * Beide Generatoren teilen sich Aufbau und Bedienung (`GeneratorCard`) und
 * darunter denselben Batch-Läufer; unterschiedlich sind nur Anbieter,
 * Bauplan und Ablage.
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

export default function SettingsScreen() {
  const [situations, setSituations] = useState<number | null>(null);
  const [images, setImages] = useState<number | null>(null);
  const [blobBackend, setBlobBackend] = useState<string | null>(null);

  const refreshSituations = useCallback(async () => {
    setSituations(await countSituations());
  }, []);

  const refreshImages = useCallback(async () => {
    setImages(await countVocabImages());
  }, []);

  useEffect(() => {
    refreshSituations();
    refreshImages();
    // Erst der Zugriff laedt das Plattform-Backend; danach steht fest, was
    // tatsaechlich laeuft (Datei, IndexedDB oder Arbeitsspeicher).
    getImageBlobStore().then(() => setBlobBackend(getActiveBlobBackend()));
  }, [refreshSituations, refreshImages]);

  const startSituations = useCallback(async ({ optionId, apiKey, onProgress, shouldCancel }: StartArgs) => {
    const specs = planSituations(optionId === 'full' ? FULL_RUN : { variantsPerCombo: 1 });
    await runGenerationBatch({
      specs,
      client: createAnthropicClient(apiKey),
      onProgress,
      shouldCancel,
      // Kleine Pause zwischen den Aufrufen, damit ein langer Lauf nicht
      // unnötig ins Rate-Limit rennt.
      delayMs: 400,
    });
  }, []);

  const startImages = useCallback(async ({ optionId, apiKey, onProgress, shouldCancel }: StartArgs) => {
    const specs = planImages(optionId === 'full' ? {} : { limit: IMAGE_TEST_RUN });
    await runImageBatch({
      specs,
      client: createStabilityImageClient(apiKey),
      onProgress,
      shouldCancel,
      // Bildaufrufe dauern deutlich länger als Textaufrufe; die Pause darf
      // entsprechend größer sein.
      delayMs: 800,
    });
  }, []);

  return (
    <ScreenScaffold title="Einstellungen" subtitle="Inhalte erzeugen, API-Schlüssel">
      <GeneratorCard
        heading="Generator: Sprachsituationen"
        description="Dialoge werden einmalig erzeugt und lokal gespeichert. Danach funktioniert das Üben ohne Internet und ohne Schlüssel — es gibt bewusst keinen Live-Chat."
        provider="anthropic"
        keyPlaceholder="sk-ant-…"
        statusLine={`Im Speicher: ${situations === null ? '…' : `${situations} Situationen`} · Modell ${GENERATOR_MODEL}`}
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
        provider="stability"
        keyPlaceholder="sk-…"
        statusLine={`Im Speicher: ${images === null ? '…' : `${images} von ${IMAGE_CANDIDATES} Bildern`} · Modell ${IMAGE_MODEL} · Ablage ${blobBackend ?? '…'}`}
        runOptions={IMAGE_RUNS}
        onStart={startImages}
        onDelete={clearVocabImages}
        deleteLabel="Alle Bilder löschen"
        canDelete={Boolean(images && images > 0)}
        onFinished={refreshImages}
      />

      <ThemedText type="small" themeColor="textSecondary">
        Die beiden Generatoren brauchen verschiedene Anbieter: Anthropic
        erzeugt keine Bilder, Stability AI schon. Beide Schlüssel liegen
        getrennt und werden nur für Generierungsläufe gebraucht, nie zum
        Lernen.
      </ThemedText>
    </ScreenScaffold>
  );
}
