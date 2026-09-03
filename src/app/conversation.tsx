import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useToneColor } from '@/hooks/use-theme';
import { PlaybackKind, playPronunciation } from '@/lib/audio';
import { ConversationSituation, TOPIC_LABELS } from '@/lib/conversation/types';
import { Direction } from '@/lib/fsrs/types';
import { loadSituations } from '@/lib/repository';
import { DIRECTION_LABELS, DIRECTIONS } from '@/lib/review-session';

export default function ConversationScreen() {
  const [situations, setSituations] = useState<ConversationSituation[] | null>(null);
  const [direction, setDirection] = useState<Direction>('de_to_th');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSituations().then((all) => {
      if (!cancelled) setSituations(all);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () => (situations ?? []).filter((s) => s.direction === direction),
    [situations, direction]
  );

  if (!situations) {
    return (
      <ScreenScaffold title="Gespräch" subtitle="Vorproduzierte Sprachsituationen">
        <ThemedText type="small" themeColor="textSecondary">
          Lade Situationen …
        </ThemedText>
      </ScreenScaffold>
    );
  }

  if (situations.length === 0) {
    return (
      <ScreenScaffold title="Gespräch" subtitle="Vorproduzierte Sprachsituationen">
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Noch keine Situationen erzeugt</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Dialoge werden einmalig unter „Einstellungen" erzeugt — dafür wird
            ein eigener API-Schlüssel gebraucht. Danach sind sie dauerhaft
            gespeichert und funktionieren ohne Internet und ohne Schlüssel.
          </ThemedText>
        </ThemedView>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      title="Gespräch"
      subtitle={`${situations.length} Situationen — offline nutzbar`}>
      <View style={styles.row}>
        {DIRECTIONS.map((d) => (
          <Pressable
            key={d}
            onPress={() => setDirection(d)}
            accessibilityRole="button"
            accessibilityState={{ selected: direction === d }}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView
              type={direction === d ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.chip}>
              <ThemedText type="small">{DIRECTION_LABELS[d]}</ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </View>

      {visible.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Für diese Richtung wurde noch nichts erzeugt.
        </ThemedText>
      ) : (
        visible.map((situation) => (
          <SituationCard
            key={situation.id}
            situation={situation}
            open={openId === situation.id}
            onToggle={() => setOpenId(openId === situation.id ? null : situation.id)}
          />
        ))
      )}
    </ScreenScaffold>
  );
}

function SituationCard({
  situation,
  open,
  onToggle,
}: {
  situation: ConversationSituation;
  open: boolean;
  onToggle: () => void;
}) {
  const toneColor = useToneColor();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => pressed && styles.pressed}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="smallBold">{situation.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {TOPIC_LABELS[situation.topic]} · {situation.level}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {open ? '▲' : '▼'}
          </ThemedText>
        </View>
      </Pressable>

      {open ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {situation.setting}
          </ThemedText>

          {situation.scriptTurns.map((turn, index) => (
            <View
              key={index}
              style={[
                styles.turn,
                turn.speaker === 'learner' && { borderLeftColor: toneColor('mid') },
              ]}>
              <View style={styles.turnHeader}>
                <ThemedText type="small" themeColor="textSecondary">
                  {turn.speaker === 'learner' ? 'Du' : 'Gegenüber'}
                </ThemedText>
                <TurnSpeakButton text={turn.thai} />
              </View>
              <ThemedText>{turn.thai}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {turn.roman}
              </ThemedText>
              <ThemedText type="small">{turn.german}</ThemedText>
            </View>
          ))}

          <ThemedView type="backgroundSelected" style={styles.corrections}>
            <ThemedText type="smallBold">Typische Fehler</ThemedText>
            {situation.corrections.map((hint, index) => (
              <View key={index}>
                <ThemedText type="small">{hint.issue}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {hint.explanation}
                </ThemedText>
              </View>
            ))}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary">
            Erzeugt am {new Date(situation.generatedAt).toLocaleDateString('de-DE')} mit{' '}
            {situation.modelUsed}
          </ThemedText>
        </>
      ) : null}
    </ThemedView>
  );
}

/**
 * Vorlesetaste eines Zugs. Seit Phase 11 kann dahinter ein Clip stecken
 * (`lib/clips`, gefunden ueber Text und Sprache - deshalb ohne ID). Spielt
 * einer, steht „KI-Stimme" daneben: eine synthetische Aufnahme, keine
 * Muttersprachler-Aufnahme (Pflicht 4).
 */
function TurnSpeakButton({ text }: { text: string }) {
  const [played, setPlayed] = useState<PlaybackKind | null>(null);
  return (
    <View style={styles.turnSpeak}>
      {played === 'asset' ? (
        <ThemedText type="small" themeColor="textSecondary">
          KI-Stimme
        </ThemedText>
      ) : null}
      <Pressable
        onPress={() => {
          playPronunciation({ text, language: 'th' })
            .then(setPlayed)
            .catch(() => {});
        }}
        accessibilityRole="button"
        accessibilityLabel={`Anhören: ${text}${
          played === 'asset' ? ' (synthetische Stimme, keine Muttersprachler-Aufnahme)' : ''
        }`}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedText type="small" themeColor="textSecondary">
          🔊
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  turnSpeak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerText: {
    flexShrink: 1,
  },
  turn: {
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingLeft: Spacing.two,
    gap: 2,
  },
  turnLearner: {
    // Die eigenen Zeilen sind die zu uebenden - sie bekommen die Markierung.
    // Die Farbe kommt zur Laufzeit aus dem Anzeigemodus (AE-24).
  },
  turnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  corrections: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
