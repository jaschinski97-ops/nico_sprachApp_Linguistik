import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/generator-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { studioRequest } from './content-client';

type LoeschZahlen = { katalog: number; stage: number; assets: number };

/**
 * Wartung: alle GENERIERTEN Inhalte auf einmal löschen (Nutzerwunsch
 * 15.09.). ZWEI Schritte bewusst getrennt — erst ZÄHLEN (Vorschau), dann
 * nach ausdrücklicher Bestätigung LÖSCHEN. Das Provenienz-Urteil trifft die
 * Pipeline (`pipeline.clearGenerated`, Stichtag 14.09.2026 = Abschluss des
 * Grundstocks; KI-Vokabeln über ki--IDs) — diese Karte rechnet nichts
 * selbst, sie zeigt nur, was die Pipeline melden würde. Der Grundstock
 * (840 Katalog-Einträge, statische Vokabeln in src/data) bleibt unberührt.
 */
export function WartungKarte() {
  const [zahlen, setZahlen] = useState<LoeschZahlen | null>(null);
  const [meldung, setMeldung] = useState('');
  const [arbeit, setArbeit] = useState(false);

  const vorschau = useCallback(async () => {
    setArbeit(true);
    setMeldung('');
    try {
      setZahlen(await studioRequest<LoeschZahlen>('/catalog/clear-generated'));
    } catch (error) {
      setMeldung(error instanceof Error ? error.message : String(error));
    } finally {
      setArbeit(false);
    }
  }, []);

  const loeschen = useCallback(async () => {
    setArbeit(true);
    try {
      const neu = await studioRequest<LoeschZahlen>('/catalog/clear-generated', {});
      setZahlen(null);
      setMeldung(
        `Gelöscht: ${neu.katalog} Katalog-Einträge · ${neu.stage} Stage-Entwürfe · ${neu.assets} Asset-Dateien. Der Grundstock bleibt unverändert.`
      );
    } catch (error) {
      setMeldung(error instanceof Error ? error.message : String(error));
    } finally {
      setArbeit(false);
    }
  }, []);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Wartung — generierte Inhalte löschen</ThemedText>
      {!zahlen ? (
        <View style={styles.zeile}>
          <Button label="Generierte Inhalte zählen …" onPress={vorschau} disabled={arbeit} />
          <ThemedText type="small" themeColor="textSecondary">
            Zählt zuerst, was als „generiert“ zählt (alles nach dem
            Grundstock-Abschluss 13.09.) — nichts wird ohne zweite Bestätigung gelöscht.
          </ThemedText>
        </View>
      ) : (
        <ThemedView type="backgroundSelected" style={styles.box}>
          <ThemedText selectable type="small">
            {`Als generiert gezählt: ${zahlen.katalog} Katalog-Einträge · ${zahlen.stage} Stage-Entwürfe · ${zahlen.assets} Asset-Dateien. Der Grundstock und die statischen Vokabeln bleiben.`}
          </ThemedText>
          <View style={styles.zeile}>
            <Button label="Wirklich alles löschen" onPress={loeschen} disabled={arbeit} />
            <Button label="Abbrechen" onPress={() => setZahlen(null)} disabled={arbeit} />
          </View>
        </ThemedView>
      )}
      <ThemedText accessibilityLiveRegion="polite" type="small" themeColor="textSecondary">
        {meldung}
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
  zeile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  box: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.two,
  },
});
