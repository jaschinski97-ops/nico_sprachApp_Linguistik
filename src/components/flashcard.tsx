import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TermWord } from './term-word';

import { SpeechLanguage } from '@/lib/audio';
import { languageOf } from '@/lib/languages/registry';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { VerificationBadge } from './verification-badge';
import { VocabImageView } from './vocab-image';

import { Spacing } from '@/constants/theme';
import { VocabEntry } from '@/data/vocabulary';
import { type PlaybackResult, playPronunciationWithStatus } from '@/lib/audio';
import { Direction } from '@/lib/fsrs/types';

/**
 * Karteikarte.
 *
 * Vorder- und Rückseite tauschen mit der Lernrichtung:
 *   th_to_de — vorne die Thai-Schrift (noch ohne Tonfarben, das ist ja die
 *              Leseaufgabe), hinten Umschrift mit Silbenfarben und Bedeutung.
 *   de_to_th — vorne das deutsche Wort samt Grammatik, hinten das thailändische
 *              Wort mit Tonfarben.
 *
 * Die Tonfarben erscheinen bewusst erst beim Aufdecken: vorher wären sie die
 * halbe Antwort.
 *
 * Das Bild (Phase 5) steht je nach Richtung an anderer Stelle, und zwar aus
 * demselben Grund:
 *   th_to_de — erst beim Aufdecken. Gefragt ist die Bedeutung, und ein Bild
 *              des Gegenstands IST die Bedeutung; vorne wäre es die Lösung.
 *   de_to_th — schon vorne, neben dem deutschen Wort. Gefragt ist hier die
 *              thailändische Form, die das Bild nicht verrät. Es verstärkt nur
 *              den Begriff, von dem aus abgerufen wird — genau der
 *              Dual-Coding-Effekt, wegen dem die Bilder überhaupt entstehen.
 */

type Props = {
  entry: VocabEntry;
  direction: Direction;
  revealed: boolean;
};

export function Flashcard({ entry, direction, revealed }: Props) {
  // SEIT PHASE 16 AUS DER RICHTUNG STATT AUS EINEM LITERAL: Vorher stand hier
  // `direction === 'th_to_de'`, und eine spanische Karte waere in beiden
  // Richtungen gleich gelaufen.
  const targetFirst = direction.endsWith('_to_de');
  const sprache = languageOf(entry.language);
  const anhoeren = `${sprache.label} anhören`;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {targetFirst ? (
        <>
          {revealed ? (
            <TermWord entry={entry} />
          ) : (
            <View style={styles.frontThai}>
              <ThemedText style={styles.thaiPlain}>{entry.term}</ThemedText>
            </View>
          )}
          <SpeakButton
            label={anhoeren}
            text={entry.term}
            language={entry.language}
            assetId={entry.audioAssetId}
          />
          {revealed ? (
            <>
              <VocabImageView entry={entry} />
              <GermanBlock entry={entry} />
            </>
          ) : null}
        </>
      ) : (
        <>
          <VocabImageView entry={entry} />
          <GermanBlock entry={entry} headline />
          {revealed ? (
            <>
              <TermWord entry={entry} />
              <SpeakButton
                label={anhoeren}
                text={entry.term}
                language={entry.language}
                assetId={entry.audioAssetId}
              />
            </>
          ) : (
            <SpeakButton label="Deutsch anhören" text={entry.german} language="de" />
          )}
        </>
      )}

      {revealed ? <ExampleBlock entry={entry} /> : null}
      {revealed ? <VerificationBadge entry={entry} /> : null}
    </ThemedView>
  );
}

function GermanBlock({ entry, headline = false }: { entry: VocabEntry; headline?: boolean }) {
  const chips: string[] = [];
  if (entry.germanNoun) {
    chips.push(`Plural: ${entry.germanNoun.plural}`);
  }
  if (entry.germanVerb) {
    chips.push(
      `${entry.germanVerb.thirdPerson} · ${entry.germanVerb.praeteritum} · ${entry.germanVerb.perfekt}`
    );
  }
  if (entry.germanAdjective) {
    chips.push(
      `${entry.germanAdjective.comparative} · ${entry.germanAdjective.superlative}`
    );
  }

  return (
    <View style={styles.germanBlock}>
      <ThemedText style={headline ? styles.germanLarge : styles.germanMedium}>
        {entry.german}
      </ThemedText>
      {chips.map((chip) => (
        <ThemedText key={chip} type="small" themeColor="textSecondary" style={styles.center}>
          {chip}
        </ThemedText>
      ))}
      {entry.note ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {entry.note}
        </ThemedText>
      ) : null}
    </View>
  );
}

/**
 * Der Beispielblock - seit Phase 16 nur, wenn ein Beispiel vorliegt.
 *
 * Fuer Englisch und Spanisch gibt es keine erfundenen Saetze; die Karte zeigt
 * dort stattdessen nichts, statt eine leere Zeile mit Lautsprechersymbol.
 */
function ExampleBlock({ entry }: { entry: VocabEntry }) {
  if (!entry.exampleTerm) return null;
  return (
    <ThemedView type="backgroundSelected" style={styles.example}>
      <View style={styles.exampleRow}>
        <View style={styles.exampleText}>
          <ThemedText type="small">{entry.exampleTerm}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {entry.exampleRoman}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {entry.exampleGerman}
          </ThemedText>
        </View>
        <SpeakButton
          label="▶"
          spokenLabel="Beispielsatz anhören"
          text={entry.exampleTerm}
          language={entry.language}
          compact
        />
      </View>
    </ThemedView>
  );
}

/**
 * Aussprache-Knopf.
 *
 * `spokenLabel` gibt es, weil die kompakte Fassung nur ein „▶" zeigt. Ohne
 * eigene Beschriftung läse ein Screenreader genau dieses Zeichen vor — die
 * Ansage „schwarzes rechtsweisendes Dreieck" sagt niemandem, was der Knopf tut
 * (Phase 9). Die Vorlesetaste ist ausserdem mindestens 44 Punkte gross, damit
 * sie auch mit dem Daumen zu treffen ist.
 */
function SpeakButton({
  label,
  spokenLabel,
  text,
  language,
  assetId,
  compact = false,
}: {
  label: string;
  /** Was der Screenreader sagt, wenn das Sichtbare nur ein Zeichen ist. */
  spokenLabel?: string;
  text: string;
  language: SpeechLanguage;
  assetId?: string;
  compact?: boolean;
}) {
  const [played, setPlayed] = useState<{ text: string; result: PlaybackResult } | null>(null);
  const playback = played?.text === text ? played.result : null;

  return (
    <View style={compact ? undefined : styles.speakColumn}>
      <Pressable
        onPress={() => {
          // Absichtlich ohne await: die Karte soll nicht auf die Sprachausgabe
          // warten. Fehler (z. B. keine Thai-Stimme installiert) dürfen den
          // Lernfluss nicht unterbrechen.
          playPronunciationWithStatus({ text, language, audioAssetId: assetId, purpose: 'vocabulary' })
            .then(result => setPlayed({ text, result }))
            .catch(() => {});
        }}
        accessibilityRole="button"
        accessibilityLabel={`${spokenLabel ?? label}: ${text}${
          playback ? ` (${playback.label})` : ''
        }`}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView
          type="backgroundSelected"
          style={compact ? styles.speakCompact : styles.speakButton}>
          <ThemedText type="small" themeColor="textSecondary">
            {compact ? label : `🔊 ${label}`}
          </ThemedText>
        </ThemedView>
      </Pressable>
      {/* Pflicht 4 (Phase 11): Ein Clip ist eine KI-Stimme. Das steht genau
          dann da, wenn einer gespielt hat - nicht als Dauerhinweis, der bald
          niemand mehr liest, und nicht bei der Sprachausgabe des Geraets, die
          ohnehin als solche erkennbar ist. */}
      {playback ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.syntheticNote}>
          {playback.label}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Kleinste sinnvolle Grösse eines Tippziels. */
export const MIN_TOUCH = 44;

const styles = StyleSheet.create({
  speakColumn: {
    gap: 2,
  },
  syntheticNote: {
    fontSize: 11,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
  },
  frontThai: {
    paddingVertical: Spacing.three,
  },
  thaiPlain: {
    fontSize: 56,
    lineHeight: 78,
    fontWeight: '600',
    textAlign: 'center',
  },
  germanBlock: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  germanLarge: {
    fontSize: 34,
    lineHeight: 46,
    fontWeight: '600',
    textAlign: 'center',
  },
  germanMedium: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '600',
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  example: {
    width: '100%',
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  exampleText: {
    flexShrink: 1,
    flexGrow: 1,
    gap: 2,
  },
  speakButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  speakCompact: {
    // Mindestens 44 Punkte in beide Richtungen - unter diesem Mass ist ein
    // Ziel mit dem Daumen kaum zu treffen (Apple HIG 44 pt, Android 48 dp).
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
