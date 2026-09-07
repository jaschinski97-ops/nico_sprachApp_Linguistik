import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DrillRunner } from '@/components/drill-runner';
import { Flashcard } from '@/components/flashcard';
import { LanguageSwitch } from '@/components/language-switch';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { SpeakingRunner } from '@/components/speaking-runner';
import { SentenceRunner } from '@/components/sentence-runner';
import type { SentenceMode } from '@/lib/speaking/sentence-session';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FeatureLegend } from '@/components/feature-legend';
import { WritingRunner } from '@/components/writing-runner';
import { Spacing } from '@/constants/theme';
import { useToneColor } from '@/hooks/use-theme';
import { DRILL_META, DrillId, drillsForDirection, SKILL_LABELS } from '@/lib/drills/types';
import { Direction, Rating, RATING_LABELS } from '@/lib/fsrs/types';
import { languageOf } from '@/lib/languages/registry';
import { directionsFor, isLanguageCode, languageOfDirection } from '@/lib/languages/types';
import { LearnerProfile, loadProfile, setLanguage, setReviewSpot } from '@/lib/profile';
import { LanguageCode } from '@/lib/languages/types';
import { rateCard } from '@/lib/repository';
import { buildReviewQueue, directionLabel, ReviewItem } from '@/lib/review-session';

const RATINGS: Rating[] = [1, 2, 3, 4];

/** Fehlertext eines gescheiterten Ladevorgangs — wie im Fortschritts-Reiter. */
function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Karteikarten oder eine der richtungseigenen Übungen. */
type Mode = 'cards' | DrillId | 'speaking' | 'writing' | SentenceMode;

/**
 * Ist das eine Richtung, die es wirklich gibt?
 *
 * SEIT PHASE 16 AUS DEM SPRACHMODELL STATT ALS ZWEI LITERALE. Vorher stand
 * hier `value === 'de_to_th' || value === 'th_to_de'`; ein Aufruf mit
 * `?direction=de_to_es` waere still auf die Richtungsauswahl zurueckgefallen.
 */
function isDirection(value: unknown): value is Direction {
  if (typeof value !== 'string') return false;
  const teile = value.split('_to_');
  if (teile.length !== 2) return false;
  const [von, nach] = teile;
  return (von === 'de' && isLanguageCode(nach)) || (nach === 'de' && isLanguageCode(von));
}

function parseMode(value: unknown, direction: Direction): Mode {
  // SEIT AE-66 ÜBER DIE MODESLISTE STATT EINZELNER LITERALE: `?mode=shadowing`
  // ist für jede Richtung gültig oder fällt auf Karteikarten zurück — auch ein
  // gemerkter Modus einer alten Richtung kann nie einen ungültigen Zustand
  // ergeben.
  const modes: string[] = modesForDirection(direction);
  return typeof value === 'string' && modes.includes(value) ? (value as Mode) : 'cards';
}

function modesForDirection(direction: Direction): Mode[] {
  const language = languageOfDirection(direction);
  return [
    'cards',
    ...drillsForDirection(direction),
    // Die Wort-Sprechübung misst Tonhöhenkonturen gegen geprüfte Silbentöne
    // und ist deshalb an Thai gebunden (AE-48) — aber seit AE-66 in BEIDEN
    // Richtungen des Thai-Paares, denn Thai aussprechen wird in beiden
    // geübt. Für andere Sprachen fällt sie weg, bis ein vergleichbares
    // Messverfahren gebaut ist.
    ...(language === 'th' ? (['speaking'] as const) : []),
    // Die Satzübungen gehören seit AE-66 zu jeder Richtung jedes Paars. Welche
    // Sprache tatsächlich Satzstoff hat, entscheidet allein die Registry in
    // `data/sentence-tasks.ts`; eine Sprache ohne geprüfte Sätze zeigt einen
    // ehrlichen Hinweis statt erfundenem Stoff.
    ...(['shadowing', 'sentenceRepeat', 'sentenceListening'] as const),
    // Freies Schreiben gibt es in BEIDEN Richtungen - anders als die
    // Auswahluebungen, die je Richtung verschieden sind (Phase 14).
    'writing',
  ];
}

function modeLabel(mode: Mode): string {
  if (mode === 'cards') return 'Karteikarten';
  if (mode === 'speaking') return 'Sprechen';
  if (mode === 'writing') return 'Schreiben';
  if (mode === 'shadowing') return 'Shadowing';
  if (mode === 'sentenceRepeat') return 'Satz wiederholen';
  if (mode === 'sentenceListening') return 'Satz verstehen';
  return DRILL_META[mode].label;
}

/**
 * Die Übungen nach Fertigkeit gruppiert (Phase 18).
 *
 * VORHER WAR ES EINE FLACHE REIHE, und die sagte nicht, dass „Töne hören",
 * „Ton herleiten", „Artikel" und „Schreiben" vier verschiedene Dinge üben.
 * Gruppiert sieht man auf einen Blick, was eine Richtung abdeckt — Hören,
 * Lesen, Sprechen, Schreiben, dazu Wortschatz und deutsche Grammatik.
 *
 * Die Reihenfolge ist fest und für alle Sprachen dieselbe: Wer von Thai auf
 * Spanisch wechselt, sucht „Hören" nicht an einer neuen Stelle.
 */
type Group = { label: string; modes: Mode[] };

function groupsForDirection(direction: Direction): Group[] {
  const modes = modesForDirection(direction);
  const drills = modes.filter((mode): mode is DrillId => mode in DRILL_META);
  const bySkill = (skill: 'hoeren' | 'lesen' | 'grammatik') =>
    drills.filter((drill) => DRILL_META[drill].skill === skill);

  const groups: Group[] = [{ label: 'Wortschatz', modes: ['cards'] }];
  const hoeren: Mode[] = bySkill('hoeren');
  hoeren.push('sentenceListening');
  groups.push({ label: SKILL_LABELS.hoeren, modes: hoeren });
  const lesen = bySkill('lesen');
  if (lesen.length > 0) groups.push({ label: SKILL_LABELS.lesen, modes: lesen });
  // „Sprechen" enthält die Wort-Übung nur bei Thai (AE-48); die Satzübungen
  // gehören seit AE-66 zu jeder Sprache — mit oder ohne Wort-Übung davor.
  const sprechen: Mode[] = [];
  if (modes.includes('speaking')) sprechen.push('speaking');
  sprechen.push('shadowing', 'sentenceRepeat');
  groups.push({ label: 'Sprechen', modes: sprechen });
  if (modes.includes('writing')) groups.push({ label: 'Schreiben', modes: ['writing'] });
  const grammatik = bySkill('grammatik');
  if (grammatik.length > 0) groups.push({ label: SKILL_LABELS.grammatik, modes: grammatik });
  return groups;
}

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ direction?: string; mode?: string; waehlen?: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadProfile()
      .then((loaded) => {
        if (!cancelled) setProfile(loaded);
      })
      .catch((e) => {
        if (!cancelled) setProfileError(messageOf(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Jede Wahl im Lernen-Reiter wird gemerkt (Phase 18).
   *
   * Nicht als „Standard", den man setzt und wieder aufhebt, sondern als
   * Lesezeichen: Beim nächsten Öffnen steht man wieder dort. Zurückgesetzt
   * wird es nur durch eine Sprachwahl auf der Übersicht — die Geste „von vorn".
   */
  const remember = useCallback(async (direction: Direction | null, mode?: Mode) => {
    setProfile(await setReviewSpot(direction ? { direction, mode: mode ?? 'cards' } : null));
  }, []);

  // Sprachwechsel mitten im Lernen-Bereich (Phase 17, Ziel 4). Die Richtung
  // gehoerte zur alten Sprache und faellt weg; die Auswahl zeigt dann die
  // zwei Richtungen der neuen.
  const chooseLanguage = useCallback(
    async (language: LanguageCode) => {
      setProfile(await setLanguage(language));
      router.setParams({ direction: undefined, mode: undefined, waehlen: undefined });
    },
    [router]
  );

  const open = useCallback(
    (direction: Direction, mode: Mode) => {
      router.setParams({
        direction,
        mode: mode === 'cards' ? undefined : mode,
        waehlen: undefined,
      });
    },
    [router]
  );

  if (profileError) {
    return (
      <ScreenScaffold title="Lernen" subtitle="Lernrichtung">
        <ThemedText type="small" themeColor="textSecondary">
          Konnte nicht geladen werden: {profileError}
        </ThemedText>
      </ScreenScaffold>
    );
  }

  if (!profile) {
    return (
      <ScreenScaffold title="Lernen" subtitle="Lernrichtung">
        <ThemedText type="small" themeColor="textSecondary">
          Lade Lernprofil …
        </ThemedText>
      </ScreenScaffold>
    );
  }

  const explicit = isDirection(params.direction) ? params.direction : null;
  // `waehlen=1` setzt der Wechsel-Knopf: die Auswahl muss auch dann erreichbar
  // bleiben, wenn ein Stand gemerkt ist - sonst waere er eine Einbahnstrasse.
  // `profile.review` traegt nur einen Stand der AKTUELLEN Sprache; darum
  // kuemmert sich `loadProfile`.
  const direction = params.waehlen === '1' ? null : (explicit ?? profile.review?.direction ?? null);

  if (!direction) {
    return (
      <DirectionPicker
        profile={profile}
        onPick={(picked) => router.setParams({ direction: picked, waehlen: undefined })}
        onLanguage={chooseLanguage}
      />
    );
  }

  // Ohne `?mode=` in der Adresse gilt der gemerkte Stand - aber nur, wenn er
  // zu DIESER Richtung gehoert.
  const gemerkterModus =
    profile.review && profile.review.direction === direction ? profile.review.mode : undefined;
  const mode = parseMode(params.mode ?? gemerkterModus, direction);

  return (
    <ReviewBody
      direction={direction}
      mode={mode}
      onOpen={open}
      onSwitch={() => {
        remember(null);
        router.setParams({ direction: undefined, mode: undefined, waehlen: '1' });
      }}
      onRemember={remember}
      onExit={() => router.setParams({ direction, mode: undefined })}
    />
  );
}

/**
 * Der eigentliche Lernbereich — als eigene Komponente, damit der gemerkte
 * Stand in einem Effekt geschrieben werden kann.
 *
 * WARUM EIN EFFEKT UND NICHT DER KNOPFDRUCK: Man kommt auf drei Wegen hierher
 * — über die Übungsleiste, über eine Richtungskarte auf der Übersicht und über
 * eine Adresse mit `?direction=`. Am Knopf zu merken hätte nur den ersten Weg
 * erwischt; im Web-Build fiel genau das auf. Der Effekt hängt an dem, was
 * wirklich offen ist, und trifft damit alle drei.
 */
function ReviewBody({
  direction,
  mode,
  onOpen,
  onSwitch,
  onRemember,
  onExit,
}: {
  direction: Direction;
  mode: Mode;
  onOpen: (direction: Direction, mode: Mode) => void;
  onSwitch: () => void;
  onRemember: (direction: Direction | null, mode?: Mode) => void;
  onExit: () => void;
}) {
  useEffect(() => {
    onRemember(direction, mode);
    // `onRemember` ist bewusst nicht in der Liste: Es schreibt das Profil und
    // erzeugt dadurch eine neue Identitaet - mit ihm liefe der Effekt endlos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, mode]);

  return (
    <ScreenScaffold title="Lernen" subtitle={directionLabel(direction)}>
      <ModeBar direction={direction} mode={mode} onPick={(picked) => onOpen(direction, picked)} />

      <DirectionBar onSwitch={onSwitch} />

      {mode === 'cards' ? (
        <CardSession direction={direction} key={direction} />
      ) : mode === 'writing' ? (
        <WritingRunner
          key={`${direction}:writing`}
          direction={direction}
          onExit={onExit}
        />
      ) : mode === 'shadowing' || mode === 'sentenceRepeat' || mode === 'sentenceListening' ? (
        <SentenceRunner
          key={`${direction}:${mode}`}
          mode={mode}
          language={languageOfDirection(direction)}
          onExit={onExit}
        />
      ) : mode === 'speaking' ? (
        <SpeakingRunner
          key={`${direction}:speaking`}
          onExit={onExit}
        />
      ) : (
        <DrillRunner
          drill={mode}
          language={languageOfDirection(direction)}
          key={`${direction}:${mode}`}
          onExit={onExit}
        />
      )}

      {/* Je Sprache ihr eigenes Merkmal: Toene bei Thai, Betonungsregel bei
          Spanisch, Schriftstueck-Gruppen bei Englisch (Phase 18). */}
      <FeatureLegend language={languageOfDirection(direction)} compact />
    </ScreenScaffold>
  );
}

/**
 * Ohne gewählte Richtung wird nicht gelernt. Die beiden Richtungen sind
 * unterschiedliche Aufgaben und werden nie in einer Sitzung vermischt.
 */
function DirectionPicker({
  profile,
  onPick,
  onLanguage,
}: {
  profile: LearnerProfile;
  onPick: (direction: Direction) => void;
  onLanguage: (language: LanguageCode) => void;
}) {
  return (
    <ScreenScaffold
      title="Lernen"
      subtitle={`${languageOf(profile.language).label} — welche Richtung möchtest du üben?`}>
      <LanguageSwitch selected={profile.language} onSelect={onLanguage} />
      {directionsFor(profile.language).map((direction) => (
        <Pressable
          key={direction}
          onPress={() => onPick(direction)}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.pickerCard}>
            <ThemedText type="smallBold">{directionLabel(direction)}</ThemedText>
            {/* Statt eines generischen Satzes („Deutsch lesen, das Wort auf
                Thai abrufen") steht hier, was diese Richtung an Fertigkeiten
                anbietet - das ist die Angabe, nach der man auswaehlt. */}
            {groupsForDirection(direction).map((group) => {
              const modes = group.modes.map(modeLabel).join(' · ');
              return (
                <ThemedText key={group.label} type="small" themeColor="textSecondary">
                  {/* „Sprechen: Sprechen" waere doppelt gemoppelt - bei einer
                      Gruppe, die genauso heisst wie ihre einzige Uebung,
                      steht nur der Name. */}
                  {modes === group.label ? modes : `${group.label}: ${modes}`}
                </ThemedText>
              );
            })}
          </ThemedView>
        </Pressable>
      ))}
      <FeatureLegend language={profile.language} />
    </ScreenScaffold>
  );
}

/** Umschalter zwischen Karteikarten und den Übungen dieser Richtung. */
function ModeBar({
  direction,
  mode,
  onPick,
}: {
  direction: Direction;
  mode: Mode;
  onPick: (mode: Mode) => void;
}) {
  const toneColor = useToneColor();

  return (
    <View style={styles.modeBar}>
      {groupsForDirection(direction).map((group) => {
        // Eine Gruppe, die genauso heisst wie ihre einzige Uebung, braucht
        // keine Beschriftung - „Sprechen Sprechen" waere doppelt.
        const caption =
          group.modes.length === 1 && modeLabel(group.modes[0]) === group.label
            ? null
            : group.label;
        return (
          <View key={group.label} style={styles.modeGroup}>
            {caption ? (
              <ThemedText type="small" themeColor="textSecondary">
                {caption}
              </ThemedText>
            ) : null}
            {group.modes.map((candidate) => {
              const label = modeLabel(candidate);
              const selected = candidate === mode;
              return (
                <Pressable
                  key={candidate}
                  onPress={() => onPick(candidate)}
                  accessibilityRole="button"
                  accessibilityLabel={`${group.label}: ${label}`}
                  accessibilityState={{ selected }}
                  // `flexShrink` am Pressable (dem Flex-Kind der Gruppe) UND
                  // an der Fläche: nur so gibt „Satz wiederholen“ auf schmalen
                  // Screens seinen Platz ab, statt abgeschnitten zu werden.
                  style={({ pressed }) => [
                    styles.modeWrap,
                    pressed && styles.pressed,
                  ]}>
                  <ThemedView
                    type={selected ? 'backgroundSelected' : 'backgroundElement'}
                    style={[styles.modeButton, selected && { borderColor: toneColor('mid') }]}>
                    <ThemedText type="small">{label}</ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Zurück zur Sprach- und Richtungsauswahl.
 *
 * SEIT PHASE 18 NUR NOCH EIN KNOPF. Daneben stand „☆ Als Standard merken" —
 * das Gegenstück zur Standard-Lernrichtung aus AE-17. Seit der Reiter sich
 * ohnehin merkt, wo man war, gibt es nichts mehr zu setzen; geblieben ist der
 * Weg zurück, damit der gemerkte Stand keine Einbahnstraße wird.
 */
function DirectionBar({ onSwitch }: { onSwitch: () => void }) {
  return (
    <View style={styles.directionBar}>
      <Pressable
        onPress={onSwitch}
        accessibilityRole="button"
        accessibilityLabel="Sprache oder Lernrichtung wechseln"
        style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
        <ThemedText type="small" themeColor="textSecondary">
          ← Sprache oder Richtung wechseln
        </ThemedText>
      </Pressable>
    </View>
  );
}

function CardSession({ direction }: { direction: Direction }) {
  const [queue, setQueue] = useState<ReviewItem[] | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rated, setRated] = useState(0);
  const [again, setAgain] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setQueueError(null);
    buildReviewQueue(direction)
      .then((items) => {
        if (!cancelled) setQueue(items);
      })
      .catch((e) => {
        if (!cancelled) setQueueError(messageOf(e));
      });
    return () => {
      cancelled = true;
    };
  }, [direction]);

  const rate = useCallback(
    async (rating: Rating) => {
      if (busy || !queue) return;
      const item = queue[index];
      if (!item) return;

      setBusy(true);
      await rateCard(item.card, rating);
      setRated((value) => value + 1);
      if (rating === 1) setAgain((value) => value + 1);
      setIndex((value) => value + 1);
      setRevealed(false);
      setBusy(false);
    },
    [busy, queue, index]
  );

  const restart = useCallback(() => {
    setQueue(null);
    setQueueError(null);
    setIndex(0);
    setRevealed(false);
    buildReviewQueue(direction)
      .then(setQueue)
      .catch((e) => setQueueError(messageOf(e)));
  }, [direction]);

  if (queueError) {
    return (
      <ThemedView type="backgroundElement" style={styles.summary}>
        <ThemedText type="smallBold">Sitzung konnte nicht geladen werden</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Konnte nicht zusammengestellt werden: {queueError}
        </ThemedText>
        <View style={styles.actions}>
          <ThemedButton label="Erneut versuchen" onPress={restart} />
        </View>
      </ThemedView>
    );
  }

  if (!queue) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Sitzung wird zusammengestellt …
      </ThemedText>
    );
  }

  const item = queue[index];

  if (!item) {
    return (
      <ThemedView type="backgroundElement" style={styles.summary}>
        <ThemedText type="smallBold">{rated > 0 ? 'Sitzung beendet' : 'Nichts fällig'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {rated > 0
            ? `${rated} Karten bewertet, davon ${again}× „Nochmal".`
            : 'In dieser Richtung ist gerade keine Karte fällig. Die Übungen oben gehen trotzdem — sie brauchen keine Fälligkeit.'}
        </ThemedText>
        <View style={styles.actions}>
          <ThemedButton label="Erneut prüfen" onPress={restart} />
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <ThemedText type="small" themeColor="textSecondary">
        Karte {index + 1} von {queue.length}
      </ThemedText>

      <Flashcard entry={item.entry} direction={direction} revealed={revealed} />

      {revealed ? (
        <View style={styles.ratings}>
          {RATINGS.map((rating) => (
            <Pressable
              key={rating}
              onPress={() => rate(rating)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Bewertung ${RATING_LABELS[rating]}`}
              style={({ pressed }) => [styles.ratingWrap, pressed && styles.pressed]}>
              <ThemedView type="backgroundSelected" style={styles.ratingButton}>
                <ThemedText type="small">{RATING_LABELS[rating]}</ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </View>
      ) : (
        <ThemedButton
          label="Aufdecken"
          accessibilityLabel="Antwort aufdecken"
          onPress={() => setRevealed(true)}
          variant="primary"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  /**
   * Mindestgroesse eines Tippziels. WCAG 2.2 verlangt in 2.5.8 (AA) 24x24
   * CSS-Pixel; Apple und Google empfehlen 44 bzw. 48. Gemessen wurde im
   * Web-Build, dass reine Textknoepfe nur 20 Pixel hoch waren - also unter der
   * Norm. 44 ist der bequeme Wert und kostet hier nichts.
   */
  tapTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  pickerCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  /**
   * Die Fertigkeit steht VOR ihren Knoepfen, nicht darueber.
   *
   * Zuerst lag die Beschriftung ueber jeder Gruppe; damit stand jeder Knopf in
   * einer eigenen Zeile und die Leiste war fuenf Zeilen hoch. Jetzt laeuft
   * alles in EINER umbrechenden Reihe wie vor Phase 18 - die Fertigkeit ist
   * nur der kleine Text davor.
   *
   * SEIT DEM UI-REVIEW 2026-09-07 BRICHT DIE GRUPPE SELBST AUCH UM: Ohne
   * `flexWrap` wurde „Satz wiederholen“ auf schmalen Screens abgeschnitten,
   * weil kein Knopf seinen Platz abgab. Eine Beschriftung kann dadurch einmal
   * allein am Zeilenende stehen - das kleinere Übel gegenüber einem
   * unerreichbaren Modus.
   */
  modeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  modeBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  /** Macht den Knopf zum flexiblen Kind seiner Gruppe (siehe oben). */
  modeWrap: {
    flexShrink: 1,
  },
  modeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  directionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  ratings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  ratingWrap: {
    flexGrow: 1,
    flexBasis: 110,
  },
  ratingButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  summary: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
