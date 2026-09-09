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
  ExamSkill,
  EXAM_LEVELS,
} from '@/lib/exam/types';
import { TranslationKey, useLocale } from '@/lib/i18n';

/**
 * Prüfungsmodul.
 *
 * Der Screen zeigt zuerst die **echte** Struktur des jeweiligen Zertifikats —
 * mit Quelle und Abrufdatum. Das ist kein Beiwerk: Wer sich vorbereitet, muss
 * wissen, worauf. Und die App muss erkennbar machen, was belegt ist und was
 * sie selbst beisteuert (die Aufgaben).
 */

/** Prüfungsfertigkeiten als Übersetzungsschlüssel statt als deutsche Konstante. */
const EXAM_SKILL_KEYS: Record<ExamSkill, TranslationKey> = {
  lesen: 'skill.lesen',
  hoeren: 'skill.hoeren',
  schreiben: 'skill.schreiben',
  sprechen: 'skill.sprechen',
};

function isLevel(value: unknown): value is ExamLevel {
  return EXAM_LEVELS.includes(value as ExamLevel);
}

/** Fehlertext eines gescheiterten Ladevorgangs — wie im Fortschritts-Reiter. */
function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function ExamScreen() {
  const { t } = useLocale();
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
      <ScreenScaffold title={t('tabs.exam')} subtitle={t('exam.subtitleModule')}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">{t('exam.moduleLoadFailed')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('common.loadFailed', { message: moduleError })}
          </ThemedText>
        </ThemedView>
      </ScreenScaffold>
    );
  }

  if (params.module && module) {
    return (
      <ScreenScaffold title={t('tabs.exam')} subtitle={module.title}>
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
    <ScreenScaffold title={t('tabs.exam')} subtitle={t('exam.subtitle')}>
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
            ? t('exam.partsAsModules')
            : t('exam.partsTogether')}{' '}
          {t('exam.recommendation', {
            age: certificate.recommendedAge,
            units: `${certificate.teachingUnits[0]}–${certificate.teachingUnits[1]}`,
          })}
        </ThemedText>

        {certificate.parts.map((part) => (
          <View key={part.skill} style={styles.part}>
            <View style={styles.partHead}>
              <ThemedText type="smallBold">{t(EXAM_SKILL_KEYS[part.skill])}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {part.approximate ? t('exam.approxPrefix') : ''}
                {t('exam.minutes', { minutes: part.minutes })}
                {part.format === 'gruppe'
                  ? t('exam.formatGroup')
                  : part.format === 'paar'
                    ? t('exam.formatPair')
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
          {t('exam.retrievedPrefix', { date: certificate.retrieved })}
          <ExternalLink href={certificate.source}>{certificate.source}</ExternalLink>
          {t('exam.retrievedSuffix')}
        </ThemedText>
      </ThemedView>

      {overviewError ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('common.loadFailed', { message: overviewError })}
        </ThemedText>
      ) : overview === null ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('exam.loading')}
        </ThemedText>
      ) : (
        overview.map((group) => (
          <ThemedView key={group.skill} type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{t(EXAM_SKILL_KEYS[group.skill])}</ThemedText>
            {group.modules.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('exam.noModules', { level })}
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
                      {t('exam.moduleMinutes', { minutes: entry.minutes })}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))
            )}
          </ThemedView>
        ))
      )}

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t('exam.aboutTitle')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('exam.aboutBody')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('exam.aboutGermanOnly')}
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
