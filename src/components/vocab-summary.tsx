import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { vocabularyFor } from '@/data/vocabulary';
import { LanguageCode } from '@/lib/languages/types';
import { loadVocabulary, seedVocabulary } from '@/lib/repository';

type Summary = {
  total: number;
  verified: number;
  concrete: number;
  byPos: [string, number][];
};

/**
 * Phase-2-Nachweis: der Grundstock wird beim Öffnen in den Speicher gespielt
 * und von dort wieder gelesen — die Zahlen stammen also aus der
 * Persistenzschicht, nicht direkt aus dem Modul. Phase 3 ersetzt das durch das
 * richtige Dashboard mit fälligen Karten.
 */
export function VocabSummary({ language }: { language: LanguageCode }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await seedVocabulary();
        // Nur der Grundstock der gewaehlten Sprache: Eine Zahl ueber alle drei
        // haette hier keine Bedeutung - gelernt wird immer ein Paar.
        const entries = (await loadVocabulary()).filter((e) => e.language === language);
        if (cancelled) return;

        const counts = new Map<string, number>();
        entries.forEach((entry) => {
          counts.set(entry.partOfSpeech, (counts.get(entry.partOfSpeech) ?? 0) + 1);
        });

        setSummary({
          total: entries.length,
          verified: entries.filter((e) => e.sourceVerified).length,
          concrete: entries.filter((e) => e.isConcrete).length,
          byPos: [...counts.entries()].sort((a, b) => b[1] - a[1]),
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.rowBetween}>
        <ThemedText type="smallBold">Vokabel-Grundstock</ThemedText>
        <ThemedView type="backgroundSelected" style={styles.badge}>
          <ThemedText type="small" themeColor="textSecondary">
            Phase 2
          </ThemedText>
        </ThemedView>
      </View>

      {error ? (
        <ThemedText type="small" themeColor="textSecondary">
          Konnte nicht geladen werden: {error}
        </ThemedText>
      ) : summary ? (
        <>
          <View style={styles.stats}>
            <Stat label="Einträge" value={String(summary.total)} />
            <Stat
              label="Quellengeprüft"
              value={`${summary.verified} von ${summary.total}`}
            />
            <Stat label="Bildfähig (konkret)" value={String(summary.concrete)} />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {summary.byPos.map(([pos, n]) => `${pos} ${n}`).join(' · ')}
          </ThemedText>
          {summary.total !== vocabularyFor(language).length ? (
            <ThemedText type="small" themeColor="textSecondary">
              Achtung: im Speicher {summary.total}, im Modul{' '}
              {vocabularyFor(language).length}.
            </ThemedText>
          ) : null}
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Lade Vokabeln …
        </ThemedText>
      )}
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  stat: {
    minWidth: 130,
  },
});
