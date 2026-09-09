import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DrillRunner } from '@/components/drill-runner';
import { DictationRunner } from '@/components/dictation-runner';
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
import { Spacing, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DRILL_META, DrillId, drillsForDirection } from '@/lib/drills/types';
import { Direction, Rating } from '@/lib/fsrs/types';
import { TranslationKey, useLocale } from '@/lib/i18n';
import { languageOf } from '@/lib/languages/registry';
import { directionsFor, isLanguageCode, languageOfDirection } from '@/lib/languages/types';
import { LearnerProfile, loadProfile, setLanguage, setReviewSpot } from '@/lib/profile';
import { LanguageCode } from '@/lib/languages/types';
import { rateCard } from '@/lib/repository';
import { buildReviewQueue, directionLabel, ReviewItem } from '@/lib/review-session';

const RATINGS: Rating[] = [1, 2, 3, 4];

/** Bewertungsstufen als Übersetzungsschlüssel statt als deutsche Konstante. */
const RATING_KEYS: Record<Rating, TranslationKey> = {
  1: 'rating.again',
  2: 'rating.hard',
  3: 'rating.good',
  4: 'rating.easy',
};

/**
 * Fläche und Schriftfarbe je Bewertungsstufe als Theme-Token-Paar.
 *
 * WARUML ALS PAAR AUS DEM THEME: Die vier Farben sind als Paar auf AA
 * gerechnet (`rating-colors.test.ts`) — Fläche und Schrift allein eingesetzt
 * gelten die Kontraste nicht. Und WARUM ÜBERHAUPT FARBE: Alle vier Knöpfe in
 * einem Grau machten die häufigste Handlung der App unlesbar langsam zu
 * erfassen (UI-Review 2026-09-07); die Stufenfarbe ist die zweite, neben dem
 * Wort, Lesespur.
 */
const RATING_COLORS: Record<Rating, { bg: ThemeColor; text: ThemeColor }> = {
  1: { bg: 'rateAgainBg', text: 'rateAgainText' },
  2: { bg: 'rateHardBg', text: 'rateHardText' },
  3: { bg: 'rateGoodBg', text: 'rateGoodText' },
  4: { bg: 'rateEasyBg', text: 'rateEasyText' },
};

/** Die Wort-Sprechübung und die Auswahlübungen als Übersetzungsschlüssel. */
const DRILL_KEYS: Record<DrillId, TranslationKey> = {
  tone: 'drill.tone',
  toneRule: 'drill.toneRule',
  article: 'drill.article',
  verbForms: 'drill.verbForms',
  stressRule: 'drill.stressRule',
  spelling: 'drill.spelling',
  stressHear: 'drill.stressHear',
  soundSpelling: 'drill.soundSpelling',
};

/** Fehlertext eines gescheiterten Ladevorgangs — wie im Fortschritts-Reiter. */
function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Karteikarten oder eine der richtungseigenen Übungen. */
type Mode = 'cards' | DrillId | 'speaking' | 'writing' | 'dictation' | SentenceMode;

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
    // Das Diktat (Roadmap v2, Phase 1) gehört zu jeder Richtung: Der Runner
    // holt sich Stoff, Bewertung und Karte selbst und zeigt für Sprachen
    // ohne Diktatstoff einen ehrlichen Leerzustand.
    'dictation',
    // Freies Schreiben gibt es in BEIDEN Richtungen - anders als die
    // Auswahluebungen, die je Richtung verschieden sind (Phase 14).
    'writing',
  ];
}

function modeKey(mode: Mode): TranslationKey {
  if (mode === 'cards') return 'mode.cards';
  if (mode === 'speaking') return 'mode.speaking';
  if (mode === 'writing') return 'mode.writing';
  if (mode === 'shadowing') return 'mode.shadowing';
  if (mode === 'sentenceRepeat') return 'mode.sentenceRepeat';
  if (mode === 'sentenceListening') return 'mode.sentenceListening';
  if (mode === 'dictation') return 'mode.dictation';
  return DRILL_KEYS[mode];
}

/** Beschriftung eines Übungsmodus in der aktuellen UI-Sprache. */
function modeLabel(mode: Mode, t: (key: TranslationKey) => string): string {
  return t(modeKey(mode));
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
type Group = { label: TranslationKey; modes: Mode[] };

function groupsForDirection(direction: Direction): Group[] {
  const modes = modesForDirection(direction);
  const drills = modes.filter((mode): mode is DrillId => mode in DRILL_META);
  const bySkill = (skill: 'hoeren' | 'lesen' | 'grammatik') =>
    drills.filter((drill) => DRILL_META[drill].skill === skill);

  const groups: Group[] = [{ label: 'skill.wortschatz', modes: ['cards'] }];
  const hoeren: Mode[] = bySkill('hoeren');
  hoeren.push('sentenceListening', 'dictation');
  groups.push({ label: 'skill.hoeren', modes: hoeren });
  const lesen = bySkill('lesen');
  if (lesen.length > 0) groups.push({ label: 'skill.lesen', modes: lesen });
  // „Sprechen" enthält die Wort-Übung nur bei Thai (AE-48); die Satzübungen
  // gehören seit AE-66 zu jeder Sprache — mit oder ohne Wort-Übung davor.
  const sprechen: Mode[] = [];
  if (modes.includes('speaking')) sprechen.push('speaking');
  sprechen.push('shadowing', 'sentenceRepeat');
  groups.push({ label: 'skill.sprechen', modes: sprechen });
  if (modes.includes('writing')) groups.push({ label: 'skill.schreiben', modes: ['writing'] });
  const grammatik = bySkill('grammatik');
  if (grammatik.length > 0) groups.push({ label: 'skill.grammatik', modes: grammatik });
  return groups;
}

export default function ReviewScreen() {
  const { t } = useLocale();
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
      <ScreenScaffold title={t('tabs.learn')} subtitle={t('review.subtitle')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('common.loadFailed', { message: profileError })}
        </ThemedText>
      </ScreenScaffold>
    );
  }

  if (!profile) {
    return (
      <ScreenScaffold title={t('tabs.learn')} subtitle={t('review.subtitle')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('review.loadingProfile')}
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
      onExit={() => {
        // Explizit 'cards' statt `mode: undefined`: Ohne `?mode=` greift der
        // gemerkte Profilstand, und der Merk-Effekt unten haette die Sitzung
        // sofort wieder geoeffnet - "Verlassen" waere eine No-op.
        router.setParams({ direction, mode: 'cards' });
      }}
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
  const { t, uiLanguage } = useLocale();
  useEffect(() => {
    onRemember(direction, mode);
    // `onRemember` ist bewusst nicht in der Liste: Es schreibt das Profil und
    // erzeugt dadurch eine neue Identitaet - mit ihm liefe der Effekt endlos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, mode]);

  return (
    <ScreenScaffold title={t('tabs.learn')} subtitle={directionLabel(direction, uiLanguage)}>
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
      ) : mode === 'dictation' ? (
        <DictationRunner
          key={`${direction}:dictation`}
          language={languageOfDirection(direction)}
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
  const { t, languageName, uiLanguage } = useLocale();
  return (
    <ScreenScaffold
      title={t('tabs.learn')}
      subtitle={t('review.pickSubtitle', { language: languageName(profile.language) })}>
      <LanguageSwitch selected={profile.language} onSelect={onLanguage} />
      {directionsFor(profile.language).map((direction) => (
        <Pressable
          key={direction}
          onPress={() => onPick(direction)}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.pickerCard}>
            <ThemedText type="smallBold">{directionLabel(direction, uiLanguage)}</ThemedText>
            {/* Statt eines generischen Satzes („Deutsch lesen, das Wort auf
                Thai abrufen") steht hier, was diese Richtung an Fertigkeiten
                anbietet - das ist die Angabe, nach der man auswaehlt. */}
            {groupsForDirection(direction).map((group) => {
              const caption = t(group.label);
              const modes = group.modes.map((mode) => modeLabel(mode, t)).join(' · ');
              return (
                <ThemedText key={group.label} type="small" themeColor="textSecondary">
                  {/* „Sprechen: Sprechen" waere doppelt gemoppelt - bei einer
                      Gruppe, die genauso heisst wie ihre einzige Uebung,
                      steht nur der Name. */}
                  {modes === caption ? modes : `${caption}: ${modes}`}
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
  const { t } = useLocale();

  return (
    <View style={styles.modeBar}>
      {groupsForDirection(direction).map((group) => {
        // Eine Gruppe, die genauso heisst wie ihre einzige Uebung, braucht
        // keine Beschriftung - „Sprechen Sprechen" waere doppelt.
        const groupLabel = t(group.label);
        const caption =
          group.modes.length === 1 && modeLabel(group.modes[0], t) === groupLabel
            ? null
            : groupLabel;
        return (
          <View key={group.label} style={styles.modeGroup}>
            {caption ? (
              <ThemedText type="small" themeColor="textSecondary">
                {caption}
              </ThemedText>
            ) : null}
            {group.modes.map((candidate) => {
              const label = modeLabel(candidate, t);
              const selected = candidate === mode;
              return (
                <Pressable
                  key={candidate}
                  onPress={() => onPick(candidate)}
                  accessibilityRole="button"
                  accessibilityLabel={`${groupLabel}: ${label}`}
                  accessibilityState={{ selected }}
                  // `flexShrink` am Pressable (dem Flex-Kind der Gruppe) UND
                  // an der Fläche: nur so gibt „Satz wiederholen“ auf schmalen
                  // Screens seinen Platz ab, statt abgeschnitten zu werden.
                  style={({ pressed }) => [
                    styles.modeWrap,
                    pressed && styles.pressed,
                  ]}>
                  {/* Gewaehlt = gefuellt mit Akzentfarbe, nicht grau mit
                      Tonfarben-Rahmen: Die Tonfarben sind Lerninhalt (die fünf
                      Thai-Toene); sie zusaetzlich als Auswahlzustand zu
                      verwenden haette zwei Bedeutungen in ein Farbalphabet
                      gelegt (gleiche Entscheidung wie in drill-runner). */}
                  <ThemedView
                    type={selected ? 'accent' : 'backgroundElement'}
                    style={styles.modeButton}>
                    <ThemedText
                      type="small"
                      themeColor={selected ? 'accentText' : 'text'}>
                      {label}
                    </ThemedText>
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
  const { t } = useLocale();
  return (
    <View style={styles.directionBar}>
      <Pressable
        onPress={onSwitch}
        accessibilityRole="button"
        accessibilityLabel={t('review.switchA11y')}
        style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('review.switch')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function CardSession({ direction }: { direction: Direction }) {
  const { t } = useLocale();
  const colors = useTheme();
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
        <ThemedText type="smallBold">{t('cards.loadFailedTitle')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('cards.assembleFailed', { message: queueError })}
        </ThemedText>
        <View style={styles.actions}>
          <ThemedButton label={t('common.retry')} onPress={restart} />
        </View>
      </ThemedView>
    );
  }

  if (!queue) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        {t('cards.assembling')}
      </ThemedText>
    );
  }

  const item = queue[index];

  if (!item) {
    return (
      <ThemedView type="backgroundElement" style={styles.summary}>
        <ThemedText type="smallBold">{rated > 0 ? t('cards.done') : t('cards.nothingDue')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {rated > 0
            ? t('cards.summaryRated', { rated, again })
            : t('cards.summaryIdle')}
        </ThemedText>
        <View style={styles.actions}>
          <ThemedButton label={t('common.recheck')} onPress={restart} />
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <View style={styles.progressBlock}>
        {/* Schiene vor Text (UI-Review 2026-09-07): Fortschritt ist eine
            Fläche, die man im Augenblick erfasst, kein Satz, den man liest.
            Füllstand VOR der Bewertung — `index` Karten sind geschafft, die
            aktuelle zählt erst, wenn sie bewertet ist. */}
        <ThemedView type="backgroundSelected" style={styles.progressTrack}>
          <ThemedView
            type="accent"
            style={[styles.progressFill, { width: `${(index / queue.length) * 100}%` }]}
          />
        </ThemedView>
        <ThemedText type="small" themeColor="textSecondary">
          {t('cards.progress', { index: index + 1, total: queue.length })}
        </ThemedText>
      </View>

      <Flashcard entry={item.entry} direction={direction} revealed={revealed} />

      {revealed ? (
        <View style={styles.ratings}>
          {RATINGS.map((rating) => (
            <Pressable
              key={rating}
              onPress={() => rate(rating)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('rating.a11y', { label: t(RATING_KEYS[rating]) })}
              style={({ pressed }) => [styles.ratingWrap, pressed && styles.pressed]}>
              {/* Fläche und Schrift als Token-PAAR aus dem Theme — die
                  Kontraste gelten nur als Paar (siehe RATING_COLORS). */}
              <View
                style={[
                  styles.ratingButton,
                  { backgroundColor: colors[RATING_COLORS[rating].bg] },
                ]}>
                <ThemedText type="small" style={{ color: colors[RATING_COLORS[rating].text] }}>
                  {t(RATING_KEYS[rating])}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <ThemedButton
          label={t('card.reveal')}
          accessibilityLabel={t('card.revealA11y')}
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
   *
   * SEIT DEM UI-REVIEW 2026-09-09 UMBRICHT SIE AUCH WIRKLICH: RN-Web-Erben
   * haben `flexShrink: 0` und messen max-content — die Gruppe war also immer
   * so breit wie alle ihre Chips zusammen, ihr eigenes `flexWrap` hatte nie
   * eine enge Zeile und sprang daher nie an; „Satz wiederholen“ lief rechts
   * aus dem 390-px-Screen hinaus und war unerreichbar. `flexShrink: 1` plus
   * `minWidth: 0` erlauben erst das Schrumpfen unter die Inhaltsbreite, und
   * NUR dadurch bekommt das innere Umbrechen seine Grenze. `alignSelf:
   * 'stretch'` ist in dieser Reihe zwar schon der Default, steht aber
   * ausdruecklich hier, damit eine spaetere Zentrierung der Leiste die
   * Vollbreite der Gruppe nicht wieder aufhebt.
   */
  modeGroup: {
    alignSelf: 'stretch',
    flexShrink: 1,
    minWidth: 0,
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
  /**
   * Schiene und Kartezaehler eng beieinander (8 statt der Spaltenluecke von
   * 24): Sie sind zusammen die Fortschrittszeile des Mockups — erst die
   * Fläche, darunter die kleine Zahl.
   */
  progressBlock: {
    gap: Spacing.two,
  },
  /**
   * Hauchduenne Schiene mit pillfoermiger Fuellung (Mockup „Lernen /
   * Karteikarten“): `overflow` + Radius schneiden die Fuellung an den
   * Rundungen sauber ab, auch bei fuellendem oder leerem Stand.
   */
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 999,
  },
  ratings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  ratingWrap: {
    // Vier gleiche Viertel statt flexBasis 110: auf einem 360-dp-Telefon
    // brachen 4×110 + Lücken die Zeile in ein 2×2-Raster um.
    flexGrow: 1,
    flexBasis: 0,
  },
  ratingButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
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
