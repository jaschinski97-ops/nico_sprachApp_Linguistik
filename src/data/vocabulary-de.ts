import { VocabEntry } from './vocab-types';

import { VOCABULARY_AR } from './vocabulary-ar';
import { findVocab, VOCABULARY_EN, VOCABULARY_ES } from './vocabulary';

/**
 * Der deutsche Ziel-Pool — ABGELEITET, nicht von Hand gepflegt.
 *
 * NUTZERENTSCHEIDUNG (10.09., wörtlich): „Füge noch Deutsch zum Generieren
 * hinzu" — die Lernziele „Deutsch (von Arabisch/Englisch/Spanisch)" bekommen
 * echten Kartenstoff. Der deutsche Wortschatz liegt in der App längst vor:
 * als `german`-Feld auf jedem geprüften Eintrag des Bestands (Phase 2).
 * Diese Datei macht daraus die Sicht, die die Kopplung über `concept`
 * braucht — eine Zeile je BEGRIFF, nicht je Sprache.
 *
 * WARUM ABLEITEN STATT STATISCHER DATEI: Die deutschen Wörter SIND der
 * Bestand. Eine abgeschriebene Kopie würde beim nächsten Grundstoff-Eintrag
 * still veralten; die Ableitung hier zieht neue Vokabeln automatisch nach.
 * Pflegefrei schlägt explizit, solange es keinen eigenständigen deutschen
 * Grundstoff mit eigener Prüfung gibt (Stufe 2).
 *
 * WIE ABGELEITET WIRD: Über alle `concept`-Verweise der Bestands-Pools
 * (en/es) UND des arabischen Brücken-Pools — der Union der Begriffe. Je
 * Begriff steht hier der deutsche Text des geprüften ANKERS (der Eintrag
 * mit dieser ID, siehe `VocabEntry.concept`), nicht eine der Abschriften
 * der Kreuz-Pools.
 *
 * ZUM TYP: `VocabEntry.language` trägt zur Laufzeit `'de'`. Der Cast unten
 * ist die EINE Stelle, die das dokumentiert — `LanguageCode` selbst wird
 * bewusst NICHT erweitert: das würde die Picker und Pools aufreißen
 * (`VOCABULARY`-Sprachfilter, Registry, Sprachauswahl). Der Pool lebt
 * deshalb ausschließlich im ar_to_de-Pfad (`review-session`) und als
 * Generier-Quelle des Studios — er wird nie in `VOCABULARY` eingespeichert
 * und nie über `vocabularyFor` gelesen. Deutsch ist im Bestand Ziel, nicht
 * Ziel-Sprache mit eigenem Grundstoff.
 */
function deriveGermanPool(): VocabEntry[] {
  const concepts = new Set<string>();
  for (const entry of [...VOCABULARY_EN, ...VOCABULARY_ES, ...VOCABULARY_AR]) {
    if (entry.concept) concepts.add(entry.concept);
  }

  const pool: VocabEntry[] = [];
  for (const concept of concepts) {
    const anker = findVocab(concept);
    // Defensiv statt ratend: ein concept ohne Anker-Eintrag wäre Kartenstoff
    // ohne geprüfte Quelle — ausgelassen statt erfunden.
    if (!anker || !anker.german.trim()) continue;
    pool.push({
      ...anker,
      // Die EINE dokumentierte Stelle (siehe Kommentar zum Typ oben): Deutsch
      // als Ziel-Sprache, ohne `LanguageCode` aufzureißen.
      language: 'de' as VocabEntry['language'],
      id: concept,
      concept,
      // Die Zielform IST der deutsche Text; die Anker-Schreibung (etwa Thai)
      // bleibt als Quelle sichtbar, ist aber nicht die lernende Seite.
      term: anker.german,
      // Deutsch steht nicht in lateinischer Umschrift zur Lesehilfe — leer
      // statt einer Behauptung. Die Karte zeigt dann nur das Wort.
      romanization: '',
      syllables: [],
      // Beispiel, Lautschrift und Tonmerkmale gehören zur ANKER-Sprache und
      // würden hier falsch angezeigt — weg damit.
      exampleTerm: undefined,
      exampleRoman: undefined,
      exampleGerman: undefined,
      ipa: undefined,
      ipaAccent: undefined,
      ipaSyllables: undefined,
      tone: undefined,
      spanishNoun: undefined,
      spanishVerb: undefined,
      englishVerb: undefined,
      englishSpelling: undefined,
    });
  }
  return pool;
}

/** Die deutschen Ziel-Einträge — 84 Begriffe über den gesamten Bestand. */
export const VOCABULARY_DE: VocabEntry[] = deriveGermanPool();
