import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ExamRunner } from '@/components/exam-runner';
import { ExternalLink } from '@/components/external-link';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useToneColor } from '@/hooks/use-theme';
import { ExamOverview, loadExamModule, loadExamOverview } from '@/lib/exam/session';
import {
  certificateFor,
  ExamLevel,
  ExamModule,
  EXAM_LEVELS,
  SKILL_LABELS,
} from '@/lib/exam/types';

/**
 * Prüfungsmodul.
 *
 * Der Screen zeigt zuerst die **echte** Struktur des jeweiligen Zertifikats —
 * mit Quelle und Abrufdatum. Das ist kein Beiwerk: Wer sich vorbereitet, muss
 * wissen, worauf. Und die App muss erkennbar machen, was belegt ist und was
 * sie selbst beisteuert (die Aufgaben).
 */

function isLevel(value: unknown): value is ExamLevel {
  return EXAM_LEVELS.includes(value as ExamLevel);
}

/** Fehlertext eines gescheiterten Ladevorgangs — wie im Fortschritts-Reiter. */
function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function ExamScreen() {
  const params = useLocalSearchParams<{ level?: string; module?: string }>();
  const router = useRouter();

  const level: ExamLevel = isLevel(params.level) ? params.level : 'A1';
  const toneColor = useToneColor();

  const [overview, setOverview] = useState<ExamOverview[] | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [module, setModule] = useState<ExamModule | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOverviewError(null);
    loadExamOverview(level)
      .then((result) => {
        if (!cancelled) setOverview(result);
      })
      .catch((e) => {
        if (!cancelled) setOverviewError(messageOf(e));
      });
    return () => {
      cancelled = true;
    };
  }, [level]);

  useEffect(() => {
    let cancelled = false;
    setModuleError(null);
    if (!params.module) {
      setModule(null);
      return;
    }
    loadExamModule(params.module)
      .then((found) => {
        if (!cancelled) setModule(found);
      })
      .catch((e) => {
        if (!cancelled) setModuleError(messageOf(e));
      });
    return () => {
      cancelled = true;
    };
  }, [params.module]);

  if (params.module && moduleError) {
    return (
      <ScreenScaffold title="Prüfung" subtitle="Modul">
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Modul konnte nicht geladen werden</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Konnte nicht geladen werden: {moduleError}
          </ThemedText>
        </ThemedView>
      </ScreenScaffold>
    );
  }

  if (params.module && module) {
    return (
      <ScreenScaffold title="Prüfung" subtitle={module.title}>
        <ExamRunner
          module={module}
          key={module.id}
          onExit={() => router.setParams({ module: undefined })}
        />
      </ScreenScaffold>
    );
  }

  const certificate = certificateFor(level);

  return (
    <ScreenScaffold title="Prüfung" subtitle="Vorbereitung auf die Goethe-Zertifikate">
      <View style={styles.levelBar}>
        {EXAM_LEVELS.map((candidate) => (
          <Pressable
            key={candidate}
            onPress={() => router.setParams({ level: candidate, module: undefined })}
            accessibilityRole="button"
            accessibilityLabel={candidate}
            accessibilityState={{ selected: candidate === level }}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView
              type={candidate === level ? 'backgroundSelected' : 'backgroundElement'}
              style={[
                styles.levelButton,
                candidate === level && { borderColor: toneColor('mid') },
              ]}>
              <ThemedText type="small">{candidate}</ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{certificate.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {certificate.partsAreModules
            ? 'Vier Module, die einzeln oder in Kombination abgelegt werden können.'
            : 'Vier Prüfungsteile, die zusammen abgelegt werden.'}{' '}
          Empfohlen ab {certificate.recommendedAge} Jahren; bis zu dieser Stufe rechnet
          das Goethe-Institut mit {certificate.teachingUnits[0]}–{certificate.teachingUnits[1]}{' '}
          Unterrichtseinheiten à 45 Minuten.
        </ThemedText>

        {certificate.parts.map((part) => (
          <View key={part.skill} style={styles.part}>
            <View style={styles.partHead}>
              <ThemedText type="smallBold">{SKILL_LABELS[part.skill]}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {part.approximate ? 'etwa ' : ''}
                {part.minutes} Minuten
                {part.format === 'gruppe'
                  ? ' · Gruppenprüfung'
                  : part.format === 'paar'
                    ? ' · Paarprüfung'
                    : ''}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {part.description}
            </ThemedText>
          </View>
        ))}

        {/*
          Quelle und Abrufdatum gehoeren sichtbar in die App, nicht nur ins
          Protokoll: Pruefungsformate aendern sich, und wer sich darauf
          verlaesst, muss nachsehen koennen, wie alt die Angabe ist.
        */}
        <ThemedText type="small" themeColor="textSecondary">
          Struktur abgerufen am {certificate.retrieved} von{' '}
          <ExternalLink href={certificate.source}>{certificate.source}</ExternalLink>. Bitte
          vor der Anmeldung dort noch einmal nachsehen — Prüfungsformate ändern sich.
        </ThemedText>
      </ThemedView>

      {overviewError ? (
        <ThemedText type="small" themeColor="textSecondary">
          Konnte nicht geladen werden: {overviewError}
        </ThemedText>
      ) : overview === null ? (
        <ThemedText type="small" themeColor="textSecondary">
          Aufgaben werden geladen …
        </ThemedText>
      ) : (
        overview.map((group) => (
          <ThemedView key={group.skill} type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{SKILL_LABELS[group.skill]}</ThemedText>
            {group.modules.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Für {level} liegt hier noch keine Aufgabe. Weitere Aufgaben kommen
                mit App-Updates dazu.
              </ThemedText>
            ) : (
              group.modules.map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() => router.setParams({ level, module: entry.id })}
                  accessibilityRole="button"
                  accessibilityLabel={entry.title}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundSelected" style={styles.moduleRow}>
                    <ThemedText type="small">{entry.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      etwa {entry.minutes} Min
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))
            )}
          </ThemedView>
        ))
      )}

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Was das hier ist — und was nicht</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Die Struktur oben stammt vom Goethe-Institut. Die Aufgaben sind
          dagegen selbst geschrieben und sind keine Originalaufgaben und keine
          Modellsätze des Goethe-Instituts. Echte Modellsätze und Übungsmaterialien gibt es beim
          Goethe-Institut selbst.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Das Goethe-Institut zertifiziert Deutsch. Dieses Modul richtet sich
          deshalb an alle, die Deutsch lernen — gleich, ob ihre Sprache Thai,
          Englisch oder Spanisch ist. Für die Gegenrichtung ist hier bewusst
          nichts hinterlegt — der Grund steht im Projektprotokoll (AE-19).
        </ThemedText>
      </ThemedView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  levelBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  levelButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  levelButtonSelected: {},
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  part: {
    gap: Spacing.half,
  },
  partHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  moduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
