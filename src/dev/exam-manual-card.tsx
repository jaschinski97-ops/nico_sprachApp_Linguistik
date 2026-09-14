import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/generator-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { loadApiKey } from '@/lib/api-key';
import { BUILTIN_EXAM_MODULES } from '@/data/exam-modules';
import { ExamModule, isValidExamModule } from '@/lib/exam/types';
import {
  baueUebersetzPrompt,
  UEBERTRAGbare_ZIELE,
  uebertragePruefung,
  type UebertragZiel,
} from '@/lib/exam/translate';
import { createTextClient } from '@/lib/providers/text';
import { defaultModelFor, loadGeneratorSettings } from '@/lib/providers/settings';
import { pruefeExamKreuz, schluesselPruefer } from '@/lib/content/kreuzpruefung';
import { estimateRunCost } from './run-cost';
import { studioRequest } from './content-client';

/**
 * Manuelle Prüfungs-Pflege (Phase 2, Schritt 3): Der Prüfungsaufgaben-
 * Generator ist entfernt. Prüfungen für Deutsch (Stufen A1–B2, Fertigkeiten
 * Lesen/Hören/Schreiben/Sprechen) entstehen NUR noch hier —
 *   1. als JSON-Import eines vollständigen ExamModule (`source: 'manual'`),
 *   2. oder durch die 1:1-ÜBERTRAGUNG einer gepflegten deutschen Prüfung:
 *      die KI übersetzt ausschließlich die Textfelder (gleiche Aufgaben,
 *      gleiche Struktur, gleiche Lösungen), die Prüfung des Ergebnisses
 *      (Struktur + Schrift) läuft lokal, und gespeichert wird nur, was
 *      beide Prüfungen besteht.
 */
export function ExamManualCard({ onSaved }: { onSaved: () => void }) {
  const theme = useTheme();
  const [ids, setIds] = useState<string[]>([]);
  const [importText, setImportText] = useState('');
  const [meldung, setMeldung] = useState('');

  // Übertragung
  const [quelle, setQuelle] = useState<ExamModule | null>(null);
  const [ziele, setZiele] = useState<UebertragZiel[]>([]);

  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'ergebnis'>('idle');

  const ladeIds = useCallback(async () => {
    try {
      const state = await studioRequest<{ ids: string[] }>('/exam/manual');
      setIds(state.ids);
    } catch {
      setIds([]);
    }
  }, []);

  useEffect(() => {
    void ladeIds();
  }, [ladeIds]);

  const importieren = useCallback(async () => {
    setMeldung('');
    try {
      const dokument = JSON.parse(importText);
      if (!isValidExamModule(dokument)) throw Error('Verletzt den ExamModule-Vertrag.');
      if (dokument.source !== 'manual') throw Error('source muss "manual" sein.');
      const antwort = await studioRequest<{ ok: boolean; id: string; total: number }>('/exam/manual', { dokument });
      setImportText('');
      setMeldung(`Gespeichert: ${antwort.id} · ${antwort.total} manuell gebündelt. Neustart des Bundles lädt die neue Datei.`);
      onSaved();
    } catch (error) {
      setMeldung(error instanceof Error ? error.message : String(error));
    }
  }, [importText, onSaved]);

  const uebertragen = useCallback(async () => {
    if (!quelle || ziele.length === 0) return;
    setRunning(true);
    setMeldung('');
    try {
      const settings = await loadGeneratorSettings();
      const { provider, model } = settings.situations;
      const apiKey = (await loadApiKey(provider)) ?? '';
      const client = createTextClient(provider, apiKey, model);
      // Phase 2, Schritt 5: die Kreuzprüfung — der ANDERE Anbieter bewertet
      // das übersetzte Modul; sein Urteil wird angezeigt und geht in die
      // Speicher-Entscheidung ein.
      const schluessel: Partial<Record<string, string | null>> = {
        gemini: await loadApiKey('gemini'),
        chatgpt: await loadApiKey('chatgpt'),
        'chatgpt-helper': 'serverseitig',
      };
      const hatSchluessel = (anbieter: string): boolean => Boolean(schluessel[anbieter]);
      const clientFuer = (anbieter: Parameters<typeof defaultModelFor>[0]) =>
        createTextClient(
          anbieter,
          (schluessel[anbieter] ?? '') as string,
          defaultModelFor(anbieter, 'text')
        );

      const ergebnisse: { ziel: UebertragZiel; modul: ExamModule; kreuz: string }[] = [];
      const fehler: string[] = [];
      for (const ziel of ziele) {
        try {
          const antwort = await client.complete({
            system:
              'Du übersetzt Prüfungsaufgaben 1:1 und antwortest ausschließlich mit JSON. Du erfindest keine neuen Aufgaben und veränderst keine Lösungen.',
            user: baueUebersetzPrompt(quelle, ziel),
            maxTokens: 4000,
          });
          const ergebnis = uebertragePruefung(quelle, ziel, antwort.text, { model });
          if (!ergebnis.ok) {
            fehler.push(`${ziel}: ${ergebnis.fehler.join(' | ')}`);
            continue;
          }
          const kreuz = await pruefeExamKreuz(ergebnis.modul, provider, hatSchluessel, clientFuer);
          ergebnisse.push({
            ziel,
            modul: ergebnis.modul,
            kreuz: kreuz.geprueft ? 'Kreuzprüfung bestanden' : `Kreuzprüfung: Mangel — ${kreuz.gruende.join('; ') || 'siehe Urteil'}`,
          });
        } catch (error) {
          fehler.push(`${ziel}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      setUebersetzt(ergebnisse);
      setPhase('ergebnis');
      setMeldung(
        `${ergebnisse.length} von ${ziele.length} Übertragungen erzeugt und geprüft.` +
          (fehler.length ? ` Fehler: ${fehler.join(' | ')}` : '')
      );
    } catch (error) {
      setMeldung(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  }, [quelle, ziele]);

  const [uebersetzt, setUebersetzt] = useState<
    { ziel: UebertragZiel; modul: ExamModule; kreuz: string }[]
  >([]);

  const speichern = useCallback(async () => {
    setRunning(true);
    setMeldung('');
    try {
      for (const { modul } of uebersetzt) {
        await studioRequest('/exam/manual', { dokument: modul });
      }
      await ladeIds();
      onSaved();
      setPhase('idle');
      setUebersetzt([]);
      setMeldung(`Gespeichert und gebündelt: ${uebersetzt.map((e) => e.ziel).join(', ')}.`);
    } catch (error) {
      setMeldung(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  }, [uebersetzt, ladeIds, onSaved]);

  const kosten =
    ziele.length > 0 && quelle
      ? estimateRunCost('situations', 'gemini', 'gemini-2.5-flash', ziele.map(() => ({ text: '' })))
      : null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Prüfungen manuell pflegen (Deutsch, A1–B2)</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {ids.length > 0
          ? `Manuell gepflegt: ${ids.join(', ')}`
          : 'Noch keine manuell gepflegten Prüfungen.'}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="smallBold">JSON-Import</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Vollständiges ExamModule mit source „manual" — Stufen A1/A2/B1/B2,
          Fertigkeiten lesen/hoeren/schreiben/sprechen. Schema wird vor dem
          Speichern geprüft.
        </ThemedText>
        <TextInput
          value={importText}
          onChangeText={setImportText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Prüfungs-JSON einfügen"
          placeholder='{ "id": "…", "source": "manual", "level": "A1", … }'
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, styles.hoch, { color: theme.text, borderColor: Colors.dark.backgroundSelected }]}
        />
        <Button label="Prüfen und speichern" onPress={importieren} disabled={!importText.trim()} />
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Auf Thai, Englisch, Spanisch übertragen</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          KI-Übersetzung einer gepflegten Prüfung 1:1: gleiche Aufgaben, gleiche
          Struktur, gleiche Lösungen. Das Ergebnis wird lokal geprüft
          (Struktur + Schrift) und erst nach Ihrer Bestätigung gespeichert.
        </ThemedText>
        <View style={styles.zeile}>
          {BUILTIN_EXAM_MODULES.slice(0, 24).map((module) => (
            <Pressable
              key={module.id}
              accessibilityRole="button"
              accessibilityState={{ selected: quelle?.id === module.id }}
              onPress={() => { setQuelle(module); setPhase('idle'); setUebersetzt([]); }}
              disabled={running}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.pressed,
                quelle?.id === module.id && { borderColor: theme.accent, borderWidth: 1 },
              ]}>
              <ThemedText type="small" themeColor={quelle?.id === module.id ? 'text' : 'textSecondary'}>
                {module.id}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.zeile}>
          {UEBERTRAGbare_ZIELE.map((ziel) => (
            <Pressable
              key={ziel}
              accessibilityRole="button"
              accessibilityState={{ selected: ziele.includes(ziel) }}
              onPress={() =>
                setZiele((alt) =>
                  alt.includes(ziel) ? alt.filter((z) => z !== ziel) : [...alt, ziel]
                )
              }
              disabled={running}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.pressed,
                ziele.includes(ziel) && { borderColor: theme.accent, borderWidth: 1 },
              ]}>
              <ThemedText type="small" themeColor={ziele.includes(ziel) ? 'text' : 'textSecondary'}>
                {ziel}
              </ThemedText>
            </Pressable>
          ))}
          {phase === 'idle' || phase === 'confirm' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Übertragung starten"
              disabled={running || !quelle || ziele.length === 0}
              onPress={() => setPhase('confirm')}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed,
                (!quelle || ziele.length === 0) && { opacity: 0.5 }]}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                Übertragen …
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {phase === 'confirm' && kosten ? (
          <ThemedView type="backgroundSelected" style={styles.confirmBox}>
            <ThemedText selectable type="small">
              {`${ziele.length} Anbieteraufruf(e) · Anbieter: ${'gemini'} · geschätzte Kosten ${
                kosten.usd === null ? 'ohne Tarif hinterlegt — selbst schätzen' : `≈ ${kosten.usd.toFixed(4)} $`
              }`}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{kosten.basis}</ThemedText>
            <View style={styles.zeile}>
              <Button label="Kosten bestätigen und übertragen" onPress={uebertragen} />
              <Button label="Abbrechen" onPress={() => setPhase('idle')} />
            </View>
          </ThemedView>
        ) : null}

        {phase === 'ergebnis' && uebersetzt.length > 0 ? (
          <ThemedView type="backgroundSelected" style={styles.confirmBox}>
            <ThemedText type="small" selectable>
              {uebersetzt
                .map((e) => `${e.modul.id} (${e.ziel}): ${e.kreuz}`)
                .join(' · ')}{' '}
              — Struktur-1:1, Schrift-Check und Schema bestanden.
            </ThemedText>
            <Button label="Als manuell speichern" onPress={speichern} disabled={running} />
          </ThemedView>
        ) : null}
      </View>

      <ThemedText accessibilityLiveRegion="polite" type="small" themeColor="textSecondary">
        {meldung}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Entfernen eines Moduls: Datei content/exam/manual/&lt;id&gt;.json löschen und
        „npm run exam:manual" ausführen — bewusst manuell, damit keine
        Prüfungen im Vorbeigehen verschwinden.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.two,
  },
  zeile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: Colors.dark.backgroundSelected,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    fontSize: 13,
  },
  hoch: {
    minHeight: 140,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  confirmBox: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
