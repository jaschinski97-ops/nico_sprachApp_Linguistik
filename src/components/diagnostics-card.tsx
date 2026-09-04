import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { vocabularyFor } from '@/data/vocabulary';
import { getActiveAudioBlobBackend, getAudioBlobStore } from '@/lib/clips/blob-store';
import { getActiveBlobBackend, getImageBlobStore } from '@/lib/images/blob-store';
import { LANGUAGE_ORDER, languageOf } from '@/lib/languages/registry';
import { LanguageCode } from '@/lib/languages/types';
import { loadVocabulary } from '@/lib/repository';
import { getActiveBackend, getStore } from '@/lib/storage';

type Row = { language: LanguageCode; stored: number; shipped: number; verified: number };

/**
 * Diagnose — was für Lernende Rauschen wäre und für die Entwicklung der
 * Nachweis ist (Phase 17, Ziel 2).
 *
 * Bis Phase 16 stand ein Teil davon als „Vokabel-Grundstock · Phase 2" auf
 * der Übersicht. Dort war es der Beleg, dass der Speicher tatsächlich
 * beschrieben und wieder gelesen wird — die Zahlen kommen aus der
 * Persistenzschicht, nicht aus dem Modul. Der Beleg bleibt wichtig, aber er
 * gehört dorthin, wo auch die Ablagen und Generatoren stehen.
 *
 * Die Zeile „im Speicher / ausgeliefert" zeigt genau die Abweichung, die
 * früher als Warnhinweis auf der Startseite stand: Weichen die beiden Zahlen
 * ab, ist der Grundstock im Speicher älter als die App.
 */
export function DiagnosticsCard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [backends, setBackends] = useState<{ data: string; images: string; clips: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getStore();
        const stored = await loadVocabulary();
        await getImageBlobStore();
        await getAudioBlobStore();
        if (cancelled) return;
        setRows(
          LANGUAGE_ORDER.map((language) => {
            const mine = stored.filter((entry) => entry.language === language);
            return {
              language,
              stored: mine.length,
              shipped: vocabularyFor(language).length,
              verified: mine.filter((entry) => entry.sourceVerified).length,
            };
          })
        );
        setBackends({
          data: getActiveBackend(),
          images: getActiveBlobBackend(),
          clips: getActiveAudioBlobBackend(),
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Diagnose</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Was im Speicher liegt und worauf es liegt. Für das Lernen ohne
        Bedeutung — nützlich, wenn etwas nicht so aussieht wie erwartet.
      </ThemedText>

      {error ? (
        <ThemedText type="small" themeColor="textSecondary">
          Konnte nicht geladen werden: {error}
        </ThemedText>
      ) : rows && backends ? (
        <>
          <View style={styles.table} role="table" accessibilityLabel="Vokabeln je Sprache">
            {rows.map((row) => (
              <View key={row.language} style={styles.row}>
                <ThemedText type="small">{languageOf(row.language).label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {row.stored} im Speicher · {row.shipped} ausgeliefert · {row.verified}{' '}
                  quellengeprüft
                </ThemedText>
              </View>
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Datenspeicher: {backends.data} · Bildablage: {backends.images} · Clipablage:{' '}
            {backends.clips}
          </ThemedText>
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Lade …
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  table: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
