/**
 * Typisierte Zugriffe auf den Dokumentspeicher.
 *
 * Die Screens sollen weder Sammlungsnamen noch Schlüsselformate kennen — sie
 * rufen hier ab. Der Speicher selbst kommt aus `lib/storage` und ist je nach
 * Plattform SQLite oder AsyncStorage (AE-3).
 */

import { VOCABULARY, VocabEntry } from '@/data/vocabulary';

import { BUILTIN_EXAM_MODULES } from '@/data/exam-modules';
import { bundledAssetUri, bundledDocuments, preferBundled } from './content/bundled';
import { isContentDeveloper } from './content/developer';

import { ConversationSituation, isValidSituation } from './conversation/types';
import { ExamModule, isValidExamModule } from './exam/types';
import { getAudioBlobStore } from './clips/blob-store';
import { invalidateClipIndex } from './clips/lookup';
import { AudioBlobStore, AudioClip, isValidAudioClip } from './clips/types';
import { getImageBlobStore } from './images/blob-store';
import { ImageBlobStore, VocabImage } from './images/types';

import { createCardState, reviewCard } from './fsrs/fsrs';
import { cardKey, Direction, FSRSCardState, Rating } from './fsrs/types';
import { recordReview } from './review-log';
import { DataStore, getStore } from './storage';

/**
 * Beim Lesen aussortierte Dokumente einmal melden.
 *
 * Sie werden bewusst nur ausgelassen und nicht geloescht: Vielleicht kann eine
 * spaetere Version mehr damit anfangen, und stilles Loeschen von Nutzerdaten
 * ist die schlechtere Voreinstellung. Die Meldung sorgt dafuer, dass ein
 * Schema-Bruch nicht voellig unbemerkt bleibt.
 */
function meldeAussortierte(was: string, roh: number, gueltig: number): void {
  if (roh !== gueltig) {
    console.warn(
      `[repository] ${roh - gueltig} von ${roh} ${was} sind unbrauchbar und werden ` +
        'beim Anzeigen ausgelassen (vermutlich aus einer aelteren Version).'
    );
  }
}

/* ---------- Vokabeln ---------- */

/**
 * Schreibt den mitgelieferten Grundstock in den Speicher.
 *
 * Bewusst idempotent und ueberschreibend: der Grundstock ist Teil der App,
 * nicht Nutzerdaten. Nutzerfortschritt liegt in der Sammlung `cards` und wird
 * hiervon nicht angefasst.
 */
export async function seedVocabulary(
  store?: DataStore,
  entries: VocabEntry[] = VOCABULARY
): Promise<number> {
  const db = store ?? (await getStore());
  await db.putMany(
    'vocab',
    entries.map((entry) => ({ id: entry.id, value: entry }))
  );
  return entries.length;
}

export async function loadVocabulary(store?: DataStore): Promise<VocabEntry[]> {
  const db = store ?? (await getStore());
  return db.getAll<VocabEntry>('vocab');
}

export async function loadVocabEntry(
  id: string,
  store?: DataStore
): Promise<VocabEntry | null> {
  const db = store ?? (await getStore());
  return db.get<VocabEntry>('vocab', id);
}

/* ---------- Kartenzustände ---------- */

export async function loadCardState(
  vocabId: string,
  direction: Direction,
  store?: DataStore
): Promise<FSRSCardState | null> {
  const db = store ?? (await getStore());
  return db.get<FSRSCardState>('cards', cardKey(vocabId, direction));
}

/**
 * Lädt den Kartenzustand oder legt ihn an, falls die Vokabel in dieser
 * Richtung noch nie gelernt wurde. Die neu angelegte Karte wird sofort
 * gespeichert, damit sie auch nach einem Neustart existiert.
 */
export async function loadOrCreateCardState(
  vocabId: string,
  direction: Direction,
  store?: DataStore,
  now: number = Date.now()
): Promise<FSRSCardState> {
  const db = store ?? (await getStore());
  const existing = await loadCardState(vocabId, direction, db);
  if (existing) return existing;

  const fresh = createCardState(vocabId, direction, now);
  await saveCardState(fresh, db);
  return fresh;
}

export async function saveCardState(card: FSRSCardState, store?: DataStore): Promise<void> {
  const db = store ?? (await getStore());
  await db.put('cards', cardKey(card.vocabId, card.direction), card);
}

export async function loadAllCardStates(store?: DataStore): Promise<FSRSCardState[]> {
  const db = store ?? (await getStore());
  return db.getAll<FSRSCardState>('cards');
}

/**
 * Wendet eine Bewertung an und schreibt das Ergebnis fort.
 *
 * Die Rechnung selbst macht `reviewCard` aus dem FSRS-Modul — hier wird sie
 * nur mit der Persistenz verbunden, damit die Screens weder die Formeln noch
 * den Speicher direkt anfassen.
 */
export async function rateCard(
  card: FSRSCardState,
  rating: Rating,
  store?: DataStore,
  now: number = Date.now()
): Promise<FSRSCardState> {
  const updated = reviewCard(card, rating, now);
  await saveCardState(updated, store);
  // Einziger Ort, an dem bewertet wird - deshalb auch der einzige Ort, an dem
  // das Tagesprotokoll fortgeschrieben werden muss.
  await recordReview(card.direction, rating, now, store);
  return updated;
}

export async function loadCardStatesForDirection(
  direction: Direction,
  store?: DataStore
): Promise<FSRSCardState[]> {
  const all = await loadAllCardStates(store);
  return all.filter((card) => card.direction === direction);
}

/* ---------- Sprachsituationen ---------- */

export async function loadSituations(store?: DataStore): Promise<ConversationSituation[]> {
  if (!__DEV__ || (!store && !isContentDeveloper())) return bundledDocuments('situations');
  const db = store ?? (await getStore());
  const roh = await db.getAll<unknown>('situations');
  const situations = roh.filter(isValidSituation);
  meldeAussortierte('Sprachsituationen', roh.length, situations.length);
  return preferBundled('situations', situations);
}

export async function loadSituation(
  id: string,
  store?: DataStore
): Promise<ConversationSituation | null> {
  return (await loadSituations(store)).find((situation) => situation.id === id) ?? null;
}

export async function countSituations(store?: DataStore): Promise<number> {
  return (await loadSituations(store)).length;
}

export async function clearSituations(store?: DataStore): Promise<void> {
  const db = store ?? (await getStore());
  await db.clear('situations');
}

/* ---------- Vokabelbilder (Phase 5) ---------- */

/**
 * Die Bilder liegen zweigeteilt: Metadaten in der Sammlung `images`, die
 * Bilddaten im Blob-Speicher (AE-14). Die Screens sollen davon nichts wissen
 * und fragen hier nach einer fertigen `uri`.
 */

export async function loadVocabImage(
  vocabId: string,
  store?: DataStore
): Promise<VocabImage | null> {
  const shipped = bundledDocuments('images').find((image) => image.id === vocabId);
  if (shipped) return shipped;
  if (!__DEV__ || (!store && !isContentDeveloper())) return null;
  const db = store ?? (await getStore());
  return db.get<VocabImage>('images', vocabId);
}

export async function loadVocabImages(store?: DataStore): Promise<VocabImage[]> {
  if (!__DEV__ || (!store && !isContentDeveloper())) return bundledDocuments('images');
  const db = store ?? (await getStore());
  const images = await db.getAll<VocabImage>('images');
  return preferBundled('images', images);
}

export async function countVocabImages(store?: DataStore): Promise<number> {
  return (await loadVocabImages(store)).length;
}

/**
 * Anzeigbare Quelle für das Bild einer Vokabel, oder `null`.
 *
 * `null` heißt hier ausdrücklich auch: Metadaten vorhanden, Datei aber weg.
 * Dann zeigt die Karte einfach kein Bild, statt eine leere Fläche zu
 * reservieren — und der nächste Generierungslauf holt das Bild nach.
 */
export async function loadVocabImageUri(
  vocabId: string,
  store?: DataStore,
  blobStore?: ImageBlobStore
): Promise<string | null> {
  const shipped = await bundledAssetUri('images', vocabId);
  if (shipped) return shipped;
  if (!__DEV__ || (!store && !isContentDeveloper())) return null;
  const doc = await loadVocabImage(vocabId, store);
  if (!doc) return null;
  const blobs = blobStore ?? (await getImageBlobStore());
  return blobs.uri(doc.blobKey);
}

export async function clearVocabImages(
  store?: DataStore,
  blobStore?: ImageBlobStore
): Promise<void> {
  const db = store ?? (await getStore());
  const blobs = blobStore ?? (await getImageBlobStore());
  // Erst die Dateien, dann die Dokumente: bricht es dazwischen ab, bleiben
  // Dokumente ohne Datei zurueck - die gelten als "fehlt" und werden neu
  // erzeugt. Andersherum blieben Dateien liegen, von denen niemand mehr weiss.
  await blobs.clear();
  await db.clear('images');
}

/* ---------- Hoerclips (Phase 11) ---------- */

/**
 * Wie die Bilder zweigeteilt: Metadaten in der Sammlung `audio`, die
 * Audiodaten im Blob-Speicher (AE-30). Gelesen wird nachsichtig (AE-25).
 */

export async function loadAudioClips(store?: DataStore): Promise<AudioClip[]> {
  if (!__DEV__ || (!store && !isContentDeveloper())) return bundledDocuments('audio');
  const db = store ?? (await getStore());
  const raw = await db.getAll<unknown>('audio');
  const clips = raw.filter(isValidAudioClip);
  meldeAussortierte('Hoerclips', raw.length, clips.length);
  return preferBundled('audio', clips);
}

export async function countAudioClips(store?: DataStore): Promise<number> {
  return (await loadAudioClips(store)).length;
}

/** Summe der abgelegten Audiodaten in Byte — die gemessene Zahl neben der Schaetzung. */
export async function sumAudioClipBytes(store?: DataStore): Promise<number> {
  return (await loadAudioClips(store)).reduce((sum, clip) => sum + clip.byteSize, 0);
}

export async function clearAudioClips(
  store?: DataStore,
  blobStore?: AudioBlobStore
): Promise<void> {
  const db = store ?? (await getStore());
  const blobs = blobStore ?? (await getAudioBlobStore());
  // Erst die Dateien, dann die Dokumente - wie bei den Bildern.
  await blobs.clear();
  await db.clear('audio');
  invalidateClipIndex();
}

/* ---------- Pruefungsmodule (Phase 7) ---------- */

/**
 * Spielt die mitgelieferten Aufgaben ein.
 *
 * Wie beim Vokabel-Grundstock: idempotent und ueberschreibend, weil sie Teil
 * der App sind und nicht Nutzerdaten. Erzeugte Aufgaben (`source: 'generated'`)
 * werden dabei nicht angefasst.
 */
export async function seedExamModules(
  store?: DataStore,
  modules: ExamModule[] = BUILTIN_EXAM_MODULES
): Promise<number> {
  const db = store ?? (await getStore());
  await db.putMany(
    'exam',
    modules.map((module) => ({ id: module.id, value: module }))
  );
  return modules.length;
}

export async function loadExamModules(store?: DataStore): Promise<ExamModule[]> {
  if (!__DEV__ || (!store && !isContentDeveloper())) return preferBundled('exam', BUILTIN_EXAM_MODULES);
  const db = store ?? (await getStore());
  const roh = await db.getAll<unknown>('exam');
  let modules = roh.filter(isValidExamModule);
  meldeAussortierte('Pruefungsaufgaben', roh.length, modules.length);

  // Geprueft wird, ob die MITGELIEFERTEN Aufgaben da sind - nicht, ob die
  // Sammlung leer ist. Der Unterschied ist keine Feinheit: wer auf einem
  // frischen Geraet erst Aufgaben erzeugt und dann die Pruefung oeffnet,
  // haette sonst nur die erzeugten und nie die mitgelieferten.
  const vorhanden = new Set(modules.map((module) => module.id));
  const fehlt = BUILTIN_EXAM_MODULES.some((module) => !vorhanden.has(module.id));
  if (fehlt) {
    await seedExamModules(db);
    modules = (await db.getAll<unknown>('exam')).filter(isValidExamModule);
  }

  return preferBundled('exam', modules);
}

export async function countExamModules(store?: DataStore): Promise<number> {
  return (await loadExamModules(store)).length;
}

export async function countGeneratedExamModules(store?: DataStore): Promise<number> {
  return (await loadExamModules(store)).filter((module) => module.source === 'generated').length;
}

/**
 * Loescht nur die erzeugten Aufgaben.
 *
 * Die mitgelieferten bleiben: sie sind Teil der App und muessen ohne
 * Schluessel und ohne Netz da sein - dieselbe Regel wie beim
 * Vokabel-Grundstock.
 */
export async function clearGeneratedExamModules(store?: DataStore): Promise<void> {
  const db = store ?? (await getStore());
  const modules = await db.getAll<ExamModule>('exam');
  for (const module of modules) {
    if (module.source === 'generated') await db.remove('exam', module.id);
  }
}

/* ---------- Einstellungen / Lernprofil ---------- */

export async function readMeta<T>(key: string, fallback: T, store?: DataStore): Promise<T> {
  const db = store ?? (await getStore());
  const value = await db.get<T>('meta', key);
  return value === null ? fallback : value;
}

export async function writeMeta<T>(key: string, value: T, store?: DataStore): Promise<void> {
  const db = store ?? (await getStore());
  await db.put('meta', key, value);
}
