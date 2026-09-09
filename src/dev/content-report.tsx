import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme, useToneColor } from '@/hooks/use-theme';
import { studioRequest, type StudioState } from './content-client';

type ReportEntry = StudioState['report']['entries'][number];
type GroupKey = 'failed' | 'unchecked' | 'passed';

/**
 * Der Prüfbericht als kompaktes Debug-Protokoll.
 *
 * Bis zum 08.09.2026 listete diese Karte **jeden** Eintrag einzeln — bei
 * 3.900+ Clips war die Einstellungsseite danach mehrere Bildschirme lang.
 * Jetzt steht oben nur die Zusammenfassung, und die Einträge liegen in drei
 * zugeklappten Gruppen (ausgeschieden, ungeprüft, geprüft), die je 20 Zeilen
 * am Stück nachladen. Eine Zeile bleibt eine Zeile; die vollständigen
 * Messspuren liegen ohnehin in content/automatic-checks.json.
 */

const GROUPS: { key: GroupKey; title: string }[] = [
  { key: 'failed', title: 'Ausgeschieden' },
  { key: 'unchecked', title: 'Ungeprüft' },
  { key: 'passed', title: 'Automatisch geprüft' },
];

const PAGE = 20;
const PAGE_STEP = 50;

const KIND_LABELS: Record<string, string> = {
  audio: 'Audio',
  situations: 'Situationen',
  exam: 'Aufgaben',
  images: 'Bilder',
};

function count(entries: ReportEntry[], status: ReportEntry['status']): number {
  return entries.filter((entry) => entry?.status === status).length;
}

export function ContentReport({ revision }: { revision: number }) {
  const theme = useTheme();
  const [report, setReport] = useState<StudioState['report']>({ entries: [] });
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);
  const [filter, setFilter] = useState('');
  const [shown, setShown] = useState<Record<GroupKey, number>>({
    failed: PAGE,
    unchecked: PAGE,
    passed: PAGE,
  });
  // Nur beim ersten Laden: gleich die relevante Gruppe aufklappen — nach
  // einem Lauf sind das die Ausgeschiedenen, sonst bleibt alles zu.
  const autoOpened = useRef(false);

  // `setRefreshing(true)` bewusst NICHT hier: synchrones setState im Effect
  // löst Kaskaden-Renderings aus (react-hooks/set-state-in-effect) und wird
  // nur beim manuellen Aktualisieren gebraucht.
  async function refresh() {
    try {
      const state = await studioRequest<StudioState>('/state');
      setReport(state.report);
      setMessage('');
      if (!autoOpened.current) {
        autoOpened.current = true;
        setOpenGroup(count(state.report.entries, 'failed') > 0 ? 'failed' : null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [revision]);

  const manualRefresh = useCallback(() => {
    setRefreshing(true);
    void refresh();
  }, []);

  const counts = useMemo(
    () => ({
      failed: count(report.entries, 'failed'),
      unchecked: count(report.entries, 'unchecked'),
      passed: count(report.entries, 'passed'),
    }),
    [report.entries]
  );

  const kindLine = useMemo(() => {
    const byKind = new Map<string, number>();
    for (const entry of report.entries) {
      if (entry?.kind) byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);
    }
    return [...byKind.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([kind, n]) => `${KIND_LABELS[kind] ?? kind} ${n.toLocaleString('de-DE')}`)
      .join(' · ');
  }, [report.entries]);

  const toggle = (key: GroupKey) => {
    setShown((prev) => ({ ...prev, [key]: PAGE }));
    setOpenGroup((current) => (current === key ? null : key));
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">Automatischer Prüfbericht</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Prüfbericht aktualisieren"
          disabled={refreshing}
          onPress={manualRefresh}
          style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
          <ThemedText type="smallBold">
            {refreshing ? 'läuft …' : 'Aktualisieren'}
          </ThemedText>
        </Pressable>
      </View>

      {report.entries.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Noch kein Prüfbericht. Er erscheint nach dem ersten Export aus den
          Generatoren — pro Eintrag eine Zeile, Details in content/automatic-checks.json.
        </ThemedText>
      ) : (
        <>
          <View style={styles.summaryRow} accessibilityLabel="Zusammenfassung des Prüfberichts">
            <SummaryDot tone="high" value={counts.passed} label="geprüft" />
            <SummaryDot tone="falling" value={counts.failed} label="ausgeschieden" />
            <SummaryDot tone="low" value={counts.unchecked} label="ungeprüft" />
          </View>
          {kindLine ? (
            <ThemedText type="small" themeColor="textSecondary">
              {kindLine}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {report.limitations}
          </ThemedText>

          {GROUPS.map(({ key, title }) => {
            const open = openGroup === key;
            return (
              <View key={key}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  aria-expanded={open}
                  accessibilityLabel={`${title}: ${counts[key]} Einträge`}
                  onPress={() => toggle(key)}
                  style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">
                    {open ? '▼' : '▶'} {title} ({counts[key].toLocaleString('de-DE')})
                  </ThemedText>
                </Pressable>

                {open ? (
                  <GroupBody
                    entries={report.entries}
                    groupKey={key}
                    filter={filter}
                    shown={shown[key]}
                    onMore={() =>
                      setShown((prev) => ({ ...prev, [key]: prev[key] + PAGE_STEP }))
                    }
                  />
                ) : null}
              </View>
            );
          })}

          {openGroup ? (
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder="Nach Text oder ID filtern …"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Prüfbericht nach Text oder ID filtern"
              style={[styles.input, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
            />
          ) : null}

          <ThemedText type="small" themeColor="textSecondary">
            Vollständige Messspuren: content/automatic-checks.json. KI-Stimme,
            keine Muttersprachler-Aufnahme.
          </ThemedText>
        </>
      )}

      <ThemedText accessibilityLiveRegion="polite" type="small">
        {message}
      </ThemedText>
    </ThemedView>
  );
}

/**
 * Eine aufgeklappte Gruppe: gefilterte Zeilen, seitenweise nachgeladen.
 * Wichtig ist die Deckelung — auch 3.085 Treffer dürfen nie wieder die
 * ganze Seite rendern.
 */
function GroupBody({
  entries,
  groupKey,
  filter,
  shown,
  onMore,
}: {
  entries: ReportEntry[];
  groupKey: GroupKey;
  filter: string;
  shown: number;
  onMore: () => void;
}) {
  const needle = filter.trim().toLowerCase();
  const matches = useMemo(() => {
    const ofStatus = entries.filter((entry) => entry?.status === groupKey);
    if (!needle) return ofStatus;
    return ofStatus.filter((entry) =>
      `${entry.text ?? ''} ${entry.id}`.toLowerCase().includes(needle)
    );
  }, [entries, groupKey, needle]);

  const visible = matches.slice(0, shown);

  if (matches.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        {needle
          ? `Kein Treffer für „${filter.trim()}“.`
          : groupKey === 'failed'
            ? 'Nichts ausgeschieden — alles ist durchgekommen.'
            : 'Keine Einträge.'}
      </ThemedText>
    );
  }

  return (
    <View style={styles.groupBody}>
      {needle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {matches.length.toLocaleString('de-DE')} Treffer
        </ThemedText>
      ) : null}
      {visible.map((entry, index) => (
        <EntryRow key={`${entry.id}:${index}`} entry={entry} />
      ))}
      {matches.length > visible.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Weitere Einträge anzeigen, ${matches.length - visible.length} verbleibend`}
          onPress={onMore}
          style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Weitere anzeigen ({visible.length.toLocaleString('de-DE')} von{' '}
            {matches.length.toLocaleString('de-DE')})
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function EntryRow({ entry }: { entry: ReportEntry }) {
  if (entry.status === 'failed') {
    return (
      <View style={styles.row}>
        <ThemedText selectable type="smallBold">
          {entry.text ?? entry.id}
        </ThemedText>
        <ThemedText selectable type="small" themeColor="textSecondary">
          {entry.tone?.reason ?? 'Schema- oder Integritätsprüfung fehlgeschlagen.'}
        </ThemedText>
        {entry.tone?.summary ? (
          <ThemedText selectable type="small" themeColor="textSecondary">
            {entry.tone.summary.durMs} ms · Verlauf {entry.tone.summary.slope.toFixed(1)} Halbtöne
          </ThemedText>
        ) : null}
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <ThemedText type="small" numberOfLines={1}>
        {entry.text ?? entry.id}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {entry.id}
      </ThemedText>
    </View>
  );
}

function SummaryDot({
  tone,
  value,
  label,
}: {
  tone: 'high' | 'falling' | 'low';
  value: number;
  label: string;
}) {
  const toneColor = useToneColor();
  return (
    <View style={styles.counter}>
      <View style={[styles.dot, { backgroundColor: toneColor(tone) }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value.toLocaleString('de-DE')}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  // Wie generator-card: Mindesthöhe eines Tippziels (WCAG 2.2, 2.5.8 AA).
  tapTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  groupBody: {
    gap: Spacing.one,
    paddingLeft: Spacing.two,
  },
  row: {
    gap: 0,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.7,
  },
});
