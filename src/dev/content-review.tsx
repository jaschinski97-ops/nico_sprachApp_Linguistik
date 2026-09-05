import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { ContentEntry } from '@/lib/content/types';
import { exportDrafts, STUDIO_URL, studioRequest, syncRejections } from './content-client';

function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ padding: 12, opacity: disabled ? 0.4 : 1 }}>
    <ThemedText type="smallBold">{label}</ThemedText>
  </Pressable>;
}
export function ContentReview() {
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [reviewer, setReviewer] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState(false);
  const [seen, setSeen] = useState(false);
  const entry = entries[index];
  async function refresh() {
    const state = await syncRejections();
    const combined = new Map(state.shipped.entries.map((item) => [`${item.kind}:${item.id}`, item]));
    for (const item of state.stage.entries) combined.set(`${item.kind}:${item.id}`, item);
    setEntries([...combined.values()]);
  }
  async function action(work: () => Promise<void>) {
    setBusy(true);
    try { await work(); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  useEffect(() => { refresh().catch((error) => setMessage(error.message)); }, []);
  useEffect(() => { setHeard(false); setSeen(false); setReason(''); }, [entry?.digest]);
  async function review(status: 'approved' | 'rejected') {
    await studioRequest('/review', { kind: entry.kind, id: entry.id, digest: entry.digest, reviewer, reason, status });
    setMessage(status === 'approved' ? 'Dieser Inhalt ist freigegeben.' : 'Diese ID ist dauerhaft gesperrt, auch nach Löschen der Laufzeitdaten.');
  }
  return <ThemedView type="backgroundElement" style={{ padding: Spacing.three, gap: Spacing.two, borderRadius: Spacing.three }}>
    <ThemedText type="subtitle">Inhaltsprüfung und Repo-Übernahme</ThemedText>
    <ThemedText type="small">1. Generator laufen lassen. 2. Exportieren und komprimieren. 3. Jeden Inhalt prüfen. 4. Freigegebenes übernehmen. Rohdaten bleiben lokal. Eine Ablehnung sperrt die ID für spätere Läufe.</ThemedText>
    <Button label="Laufzeitdaten exportieren und Audio komprimieren" disabled={busy} onPress={() => action(() => exportDrafts(setMessage))} />
    <Button label="Prüfliste aktualisieren" disabled={busy} onPress={() => action(refresh)} />
    <TextInput accessibilityLabel="Name der prüfenden Person" placeholder="Name der prüfenden Person" value={reviewer} onChangeText={setReviewer} style={{ backgroundColor: '#fff', color: '#17202a', padding: 12 }} />
    <ThemedText accessibilityLiveRegion="polite" type="small">{message}</ThemedText>
    {entry ? <View style={{ gap: Spacing.two }}>
      <ThemedText type="smallBold">{index + 1}/{entries.length} · {entry.kind} · {entry.id} · {entry.review?.status ?? 'ungeprüft'}</ThemedText>
      {entry.asset && entry.kind === 'images' ? <img src={`${STUDIO_URL}/asset/${entry.asset}`} alt={`Prüfbild ${entry.id}`} onLoad={() => setSeen(true)} style={{ width: 240, maxWidth: '100%' }} /> : null}
      {entry.asset && entry.kind === 'audio' ? <audio key={entry.digest} controls preload="none" src={`${STUDIO_URL}/asset/${entry.asset}`} onEnded={() => setHeard(true)} aria-label="Komprimierten Clip vollständig anhören" /> : null}
      {entry.kind === 'audio' ? <ThemedText type="small">Original: {entry.sourceBytes} Byte · MP3: {entry.byteSize} Byte. Freigabe erst nach vollständigem Anhören.</ThemedText> : null}
      <ThemedText selectable type="small">{JSON.stringify(entry.document, null, 2)}</ThemedText>
      <TextInput accessibilityLabel="Prüfnotiz oder Ablehnungsgrund" placeholder="Prüfnotiz / Ablehnungsgrund" multiline value={reason} onChangeText={setReason} style={{ backgroundColor: '#fff', color: '#17202a', padding: 12 }} />
      <Button label="Diesen Inhalt nach eigener Prüfung freigeben" disabled={busy || !reviewer.trim() || entry.review?.status === 'rejected' || (entry.kind === 'audio' && !heard) || (entry.kind === 'images' && !seen)} onPress={() => action(() => review('approved'))} />
      <Button label="Diesen Inhalt ablehnen und dauerhaft sperren" disabled={busy || !reviewer.trim() || !reason.trim() || entry.review?.status === 'rejected'} onPress={() => action(() => review('rejected'))} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Button label="Vorheriger Inhalt" disabled={busy || index === 0} onPress={() => setIndex(index - 1)} />
        <Button label="Nächster Inhalt" disabled={busy || index >= entries.length - 1} onPress={() => setIndex(index + 1)} />
      </View>
    </View> : <ThemedText type="small">Noch kein Inhalt exportiert.</ThemedText>}
    <Button label={`Freigegebenes ins Repo übernehmen (${entries.filter((item) => item.review?.status === 'approved').length})`} disabled={busy || !entries.some((item) => item.review?.status === 'approved')} onPress={() => action(async () => {
      const result = await studioRequest<{ entries: number; pending: number; rejected: number; budgetBytes: number }>('/publish', {});
      setMessage(`${result.entries} Inhalte im Repo · ${result.budgetBytes} Byte · ${result.pending} ungeprüft zurückgehalten · ${result.rejected} abgelehnt. Vor dem Build „npm run content:check“ ausführen.`);
    })} />
  </ThemedView>;
}
