import { Pressable, StyleSheet, View } from 'react-native';

import { ThaiWord } from './thai-word';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { VerificationBadge } from './verification-badge';
import { VocabImageView } from './vocab-image';

import { Spacing } from '@/constants/theme';
import { VocabEntry } from '@/data/vocabulary';
import { playPronunciation } from '@/lib/audio';
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
  const thaiFirst = direction === 'th_to_de';

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {thaiFirst ? (
        <>
          {revealed ? (
            <ThaiWord entry={entry} />
          ) : (
            <View style={styles.frontThai}>
              <ThemedText style={styles.thaiPlain}>{entry.thai}</ThemedText>
            </View>
          )}
          <SpeakButton
            label="Thai anhören"
            text={entry.thai}
            language="th"
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
              <ThaiWord entry={entry} />
              <SpeakButton
                label="Thai anhören"
                text={entry.thai}
                language="th"
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

function ExampleBlock({ entry }: { entry: VocabEntry }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.example}>
      <View style={styles.exampleRow}>
        <View style={styles.exampleText}>
          <ThemedText type="small">{entry.exampleThai}</ThemedText>
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
          text={entry.exampleThai}
          language="th"
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
  language: 'th' | 'de';
  assetId?: string;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        // Absichtlich ohne await: die Karte soll nicht auf die Sprachausgabe
        // warten. Fehler (z. B. keine Thai-Stimme installiert) dürfen den
        // Lernfluss nicht unterbrechen.
        playPronunciation({ text, language, audioAssetId: assetId }).catch(() => {});
      }}
      accessibilityRole="button"
      accessibilityLabel={`${spokenLabel ?? label}: ${text}`}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type="backgroundSelected"
        style={compact ? styles.speakCompact : styles.speakButton}>
        <ThemedText type="small" themeColor="textSecondary">
          {compact ? label : `🔊 ${label}`}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

/** Kleinste sinnvolle Grösse eines Tippziels. */
export const MIN_TOUCH = 44;

const styles = StyleSheet.create({
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
