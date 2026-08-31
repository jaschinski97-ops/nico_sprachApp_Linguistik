import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, GeneratorCard, RunOption, StartArgs } from '@/components/generator-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { runGenerationBatch } from '@/lib/conversation/batch';
import { createAnthropicClient, GENERATOR_MODEL } from '@/lib/conversation/generator';
import { FULL_RUN, planSituations } from '@/lib/conversation/plan';
import { getActiveBlobBackend, getImageBlobStore } from '@/lib/images/blob-store';
import { runImageBatch } from '@/lib/images/batch';
import { createStabilityImageClient, IMAGE_MODEL } from '@/lib/images/generator';
import { countImageCandidates, IMAGE_TEST_RUN, planImages } from '@/lib/images/plan';
import { Direction } from '@/lib/fsrs/types';
import { LearnerProfile, loadProfile, setDefaultDirection } from '@/lib/profile';
import { clearSituations, clearVocabImages, countSituations, countVocabImages } from '@/lib/repository';
import { DIRECTION_LABELS, DIRECTIONS } from '@/lib/review-session';

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
  const [profile, setProfile] = useState<LearnerProfile | null>(null);

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
    loadProfile().then(setProfile);
  }, [refreshSituations, refreshImages]);

  const chooseDefaultDirection = useCallback(async (direction: Direction | null) => {
    setProfile(await setDefaultDirection(direction));
  }, []);

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
    <ScreenScaffold title="Einstellungen" subtitle="Lernprofil, Inhalte erzeugen, API-Schlüssel">
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Standard-Lernrichtung</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Womit der Reiter „Lernen" startet. „Immer fragen" zeigt jedes Mal die
          Auswahl — sinnvoll, wenn zwei Menschen dasselbe Gerät benutzen oder
          wenn du beide Richtungen lernst. Die jeweils andere Richtung bleibt
          immer über „Richtung wechseln" erreichbar.
        </ThemedText>
        <View style={styles.buttonRow}>
          <Button
            label="Immer fragen"
            onPress={() => chooseDefaultDirection(null)}
            selected={profile !== null && profile.defaultDirection === null}
            disabled={profile === null}
          />
          {DIRECTIONS.map((direction) => (
            <Button
              key={direction}
              label={DIRECTION_LABELS[direction]}
              onPress={() => chooseDefaultDirection(direction)}
              selected={profile?.defaultDirection === direction}
              disabled={profile === null}
            />
          ))}
        </View>
      </ThemedView>

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
