import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { studioRequest, type StudioState } from './content-client';

export function ContentReport({ revision }: { revision: number }) {
  const [report, setReport] = useState<StudioState['report']>({ entries: [] });
  const [message, setMessage] = useState('');
  async function refresh() {
    try { setReport((await studioRequest<StudioState>('/state')).report); setMessage(''); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }
  useEffect(() => { void refresh(); }, [revision]);
  return <ThemedView type="backgroundElement" style={{ padding: Spacing.three, gap: Spacing.two, borderRadius: Spacing.three }}>
    <ThemedText type="subtitle">Automatischer Prüfbericht</ThemedText>
    <ThemedText type="small">Nach dem Lauf werden Inhalte automatisch geprüft und übernommen. Fehlgeschlagene und nicht prüfbare Thai-Clips bleiben außerhalb des Katalogs; dort nutzt die App System-TTS.</ThemedText>
    <ThemedText type="small">{report.limitations}</ThemedText>
    <ThemedText type="small">{report.entries.filter(entry => entry?.status === 'passed').length} automatisch geprüft · {report.entries.filter(entry => entry?.status === 'failed').length} aussortiert · {report.entries.filter(entry => entry?.status === 'unchecked').length} ungeprüft</ThemedText>
    <Pressable accessibilityRole="button" onPress={refresh}><ThemedText type="smallBold">Bericht aktualisieren</ThemedText></Pressable>
    <ThemedText accessibilityLiveRegion="polite" type="small">{message}</ThemedText>
    {report.entries.map((entry) => <ThemedView key={`${entry.kind}:${entry.id}`}>
      <ThemedText selectable type="smallBold">{entry.kind} · {entry.text ?? entry.id} · {entry.status === 'passed' ? 'automatisch geprüft' : entry.status === 'failed' ? 'aussortiert' : 'ungeprüft'}</ThemedText>
      <ThemedText selectable type="small">{entry.tone?.reason ?? 'Schema und Integrität geprüft; keine sprachliche oder bildinhaltliche Qualitätsprüfung.'}</ThemedText>
      {entry.tone?.summary ? <ThemedText selectable type="small">{entry.tone.summary.durMs} ms · Verlauf {entry.tone.summary.slope.toFixed(1)} Halbtöne · Kontur {entry.tone.summary.pts.map(value => value.toFixed(1)).join(' / ')}</ThemedText> : null}
    </ThemedView>)}
    <ThemedText type="small">Vollständige Messspuren: content/automatic-checks.json. KI-Stimme, keine Muttersprachler-Aufnahme.</ThemedText>
  </ThemedView>;
}
