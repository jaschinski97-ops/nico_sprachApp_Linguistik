import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { VocabEntry } from '@/data/vocabulary';
import { loadVocabImageUri } from '@/lib/repository';

/**
 * Das Bild zu einer Vokabel — falls eines erzeugt wurde.
 *
 * Zeigt nichts an, solange keines vorliegt: kein Platzhalter, kein
 * reservierter Kasten. Bilder sind ausdrücklich optional (der Grundstock muss
 * ohne Schlüssel und ohne Netz vollständig sein), und eine leere Fläche auf
 * jeder zweiten Karte wäre eine dauernde Erinnerung an etwas, das gar nicht
 * fehlt.
 *
 * Die Quelle kommt über die Repository-Schicht; ob dahinter eine Datei auf dem
 * Gerät oder ein Eintrag in der IndexedDB steckt, weiß die Karte nicht
 * (AE-14).
 */

export function VocabImageView({ entry }: { entry: VocabEntry }) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUri(null);
    // Abstrakte Einträge haben nie ein Bild - gar nicht erst nachsehen.
    if (!entry.isConcrete) return;
    // Sprache mitgeben: Ein installiertes Sprachpaket gewinnt gegen das
    // eingebettete Asset (Pack-Bild-Naht, Roadmap v2).
    loadVocabImageUri(entry.id, undefined, undefined, entry.language)
      .then((found) => {
        if (active) setUri(found);
      })
      .catch(() => {
        // Kein Bild ist kein Fehler, der den Lernfluss stören darf.
      });
    return () => {
      active = false;
    };
  }, [entry.id, entry.isConcrete, entry.language]);

  if (!uri) return null;

  return (
    <View style={styles.frame}>
      <Image
        source={{ uri }}
        style={styles.image}
        contentFit="cover"
        accessibilityLabel={`Bild zu ${entry.german}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 200,
    height: 200,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
