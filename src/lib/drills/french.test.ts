import { VOCABULARY_FR, VocabEntry } from '@/data/vocabulary';
import { FrenchVocabEntry } from '@/data/vocab-types';
import { accentGraphemesOf, accentRuleFor, ACCENT_OPTIONS } from '@/data/french-spelling';

import { DataStore, MemoryDataStore } from '../storage';

import {
  buildAccentFrQuestion,
  buildFrStressQuestion,
  buildMuteEQuestion,
  canBuildAccentFrQuestion,
  canBuildFrStressQuestion,
  canBuildMuteEQuestion,
} from './questions';
import { buildDrillSession } from './session';
import { DRILL_META, DRILLS, drillsForDirection } from './types';

const T0 = Date.UTC(2026, 8, 1, 10);

/**
 * Die französischen Regel-Übungen (Paarmatrix-Start, Roadmap v2).
 *
 * Die französischen Einträge liegen NICHT im Speicher-Grundstoff — die
 * Übungen laufen gegen `VOCABULARY_FR` direkt, wie es nach der Auslieferung
 * der Seeder tun wird. Drei Aussagen:
 *
 * 1. **Regel und Daten stimmen überein** — jede Aufgabe ist aus der
 *    Silbenauszeichnung abgeleitet und widerspricht ihr nie.
 * 2. **Keine Aufgabe erfindet etwas** — Optionen sind Silben des Worts,
 *    Silbenzahlen bis zur geschriebenen Länge, oder das feste Klanginventar
 *    aus `french-spelling.ts`.
 * 3. **Im App-Bestand bleibt alles ehrlich leer** — eine Sitzung für
 *    Französisch findet keine Karten, solange der Grundstoff nicht
 *    ausgeliefert ist.
 */

function fr(id: string): FrenchVocabEntry {
  const entry = VOCABULARY_FR.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Testdaten erwarten den Eintrag "${id}".`);
  return entry;
}

describe('Registrierung und Verdrahtung', () => {
  it('listet genau die drei französischen Übungen unter de_to_fr', () => {
    expect(drillsForDirection('de_to_fr')).toEqual(['stressFr', 'muteE', 'accentFr']);
    for (const drill of ['stressFr', 'muteE', 'accentFr'] as const) {
      expect(DRILLS).toContain(drill);
      expect(DRILL_META[drill].feature).toBe('fr');
      expect(DRILL_META[drill].side).toBe('toTarget');
      // Lese-Übungen: Die Audio-Naht kennt bislang kein Französisch.
      expect(DRILL_META[drill].skill).toBe('lesen');
    }
  });

  it('nimmt keine andere Sprache', () => {
    // Ein Eintrag aus jedem ausgelieferten Grundstoff taugt für keine der
    // drei Übungen — das Merkmal hängt an der Sprache. Die Skeletons prüfen
    // nur den Sprach-Gate am Anfang jedes canBuild.
    const fremd = [
      { language: 'th' },
      { language: 'es' },
      { language: 'en' },
    ] as unknown as VocabEntry[];
    for (const fremder of fremd) {
      expect(canBuildFrStressQuestion(fremder)).toBe(false);
      expect(canBuildMuteEQuestion(fremder)).toBe(false);
      expect(canBuildAccentFrQuestion(fremder)).toBe(false);
    }
  });
});

describe('Betonung bestimmen (stressFr)', () => {
  it('baut für jedes mehrsilbige regelkonforme Wort eine Aufgabe', () => {
    const geeignet = VOCABULARY_FR.filter(canBuildFrStressQuestion);
    // Runde 2 hat den Grundstoff auf 150 Einträge ausgebaut — der Topf muss
    // deutlich über dem Runde-1-Minimum von 15 liegen.
    expect(geeignet.length).toBeGreaterThanOrEqual(25);
    for (const entry of geeignet) {
      const frage = buildFrStressQuestion(entry);
      expect(frage.drill).toBe('stressFr');
      expect(frage.speak).toBeNull();
      expect(frage.options).toHaveLength(entry.syllables.length);
      expect(frage.correctIndex).toBe(
        entry.syllables.map((s) => s.stressed).indexOf(true)
      );
      expect(frage.explanation).toContain('Silbe');
    }
  });

  it('nimmt einsilbige Wörter nicht — die Frage hätte nur eine Antwort', () => {
    expect(canBuildFrStressQuestion(fr('fr_un'))).toBe(false);
    expect(canBuildFrStressQuestion(fr('fr_bon'))).toBe(false);
  });

  it('zeigt das Wort ohne Silbentrennung — sonst ist die letzte Silbe ablesbar', () => {
    const frage = buildFrStressQuestion(fr('fr_bonjour'));
    expect(frage.visible).toBe('bonjour');
    expect(frage.visibleHint).toBe('hallo, guten Tag');
  });

  it('begründet bei stummem Schluss-e mit der gesprochenen Silbe', () => {
    const frage = buildFrStressQuestion(fr('fr_fromage'));
    expect(frage.explanation).toContain('verstummt');
    expect(frage.correctIndex).toBe(1); // fro-MA-ge — das Schluss-e zählt nicht mit.
  });
});

describe('Stummes e (muteE)', () => {
  it('stellt die gesprochene gegen die geschriebene Silbenzahl', () => {
    const geeignet = VOCABULARY_FR.filter(canBuildMuteEQuestion);
    // Auftragszahl aus Runde 2: mindestens 15 Einträge mit stummem Schluss-e.
    expect(geeignet.length).toBeGreaterThanOrEqual(15);
    for (const entry of geeignet) {
      const frage = buildMuteEQuestion(entry);
      const geschrieben = entry.syllables.length;
      const gesprochen = entry.syllables.filter((s) => !s.mute).length;
      expect(frage.options).toHaveLength(geschrieben);
      expect(frage.correctIndex).toBe(gesprochen - 1);
      expect(Number(frage.options[frage.correctIndex].label)).toBe(gesprochen);
      expect(frage.explanation).toContain('keinen Laut');
    }
  });

  it('nimmt Wörter ohne stummes Schluss-e nicht', () => {
    expect(canBuildMuteEQuestion(fr('fr_maison'))).toBe(false);
    expect(canBuildMuteEQuestion(fr('fr_petit'))).toBe(false);
  });
});

describe('Akzentzeichen lesen (accentFr)', () => {
  it('fragt genau die Wörter mit einem eindeutigen gelernten Zeichen', () => {
    const geeignet = VOCABULARY_FR.filter(canBuildAccentFrQuestion);
    // Auftragszahl aus Runde 2: mindestens 12 Einträge mit einem eindeutig
    // gelernten Akzentzeichen (é, è, ê oder ç).
    expect(geeignet.length).toBeGreaterThanOrEqual(12);
    for (const entry of geeignet) {
      const frage = buildAccentFrQuestion(entry);
      expect(frage.options).toHaveLength(ACCENT_OPTIONS.length);
      expect(frage.speak).toBeNull();
      const zeichen = [...new Set(accentGraphemesOf(entry.term))][0];
      const regel = accentRuleFor(zeichen)!;
      expect(frage.correctIndex).toBe(
        ACCENT_OPTIONS.findIndex((option) => option.sound === regel.sound)
      );
    }
  });

  it('gibt dem é den geschlossenen und dem è den offenen Laut', () => {
    const cafe = buildAccentFrQuestion(fr('fr_cafe'));
    expect(cafe.correctIndex).toBe(
      ACCENT_OPTIONS.findIndex((option) => option.sound === 'e_geschlossen')
    );
    const pere = buildAccentFrQuestion(fr('fr_pere'));
    expect(pere.correctIndex).toBe(
      ACCENT_OPTIONS.findIndex((option) => option.sound === 'e_offen')
    );
  });

  it('überspringt Wörter mit mehreren verschiedenen gelernten Zeichen', () => {
    // Zwei verschiedene gelernte Zeichen (è und ç) würden die Frage
    // mehrdeutig machen — der Gate schließt solche Wörter aus, damit Runde 2
    // beim Nachlegen nicht neu erfinden muss, wann eine Aufgabe entsteht.
    const doppelt = { ...fr('fr_pere'), term: 'èça', id: 'fr_test' };
    expect(canBuildAccentFrQuestion(doppelt)).toBe(false);
  });
});

describe('Im App-Bestand bleibt Französisch ehrlich leer', () => {
  it('findet für eine französische Sitzung keine Karten', async () => {
    const store: DataStore = new MemoryDataStore();
    await store.init();
    const session = await buildDrillSession({
      drill: 'stressFr',
      language: 'fr',
      store,
      now: T0,
      seed: 1,
    });
    // Der Grundstoff ist nicht ausgeliefert — available 0 statt Stoff aus
    // einer anderen Sprache. Genau das ist der Punkt.
    expect(session.available).toBe(0);
    expect(session.questions).toEqual([]);
  });
});
