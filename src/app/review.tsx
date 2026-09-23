import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DrillRunner } from '@/components/drill-runner';
import { DictationRunner } from '@/components/dictation-runner';
import { Flashcard } from '@/components/flashcard';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { SpeakingRunner } from '@/components/speaking-runner';
import { SentenceRunner } from '@/components/sentence-runner';
import type { SentenceMode } from '@/lib/speaking/sentence-session';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WritingRunner } from '@/components/writing-runner';
import { Spacing, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Rating } from '@/lib/fsrs/types';
import { TranslationKey, useLocale } from '@/lib/i18n';
import {
  directionForBridge,
  goalEndonym,
  goalLanguage,
  zielFuerDirection,
  zieleFuerBruecke,
  type Lernziel,
} from '@/lib/languages/goals';
import { learningLanguage } from '@/lib/languages/definitions';
import {
  anchorOf,
  isDeAnchored,
  isPairDirection,
  targetLanguageOf,
  type PairDirection,
} from '@/lib/languages/types';
import { LearnerProfile, loadProfile, setLanguage, setReviewSpot } from '@/lib/profile';
import { rateCard } from '@/lib/repository';
import { buildReviewQueue, directionLabel, ReviewItem } from '@/lib/review-session';
import {
  groupsForDirection,
  modeKey,
  modeLabel,
  modesForDirection,
  type Mode,
} from '@/lib/exercise-catalog';
import { WordSpeakingRunner } from '@/components/word-speaking-runner';
import { TodayRoundRunner } from '@/components/today-round-runner';
import { ProductionRunner } from '@/components/production-runner';
import { RoleplayRunner } from '@/components/roleplay-runner';
import { ReadingTextsRunner } from '@/components/reading-texts-runner';
import { ROUND_MINUTES } from '@/lib/today-round';

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

/**
 * Ist das eine Richtung, die es wirklich gibt?
 *
 * SEIT STUFE 1 ÜBER `isPairDirection`: Der Lern-Reiter validiert alle zwölf
 * Paare — Kreuzziele (etwa „Spanisch“ hinter `en_to_es`) sind über Adressen
 * und gemerkte Wahlen genauso erreichbar wie die de-geankerten Bestands-
 * richtungen. Die Laufzeitprüfung sitzt im Sprachmodell (`lib/languages/
 * types`), damit Profil, Auswahl und Screens dieselbe Schranke lesen.
 */

/** Fehlertext eines gescheiterten Ladevorgangs — wie im Fortschritts-Reiter. */
function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function parseMode(value: unknown, direction: PairDirection): Mode {
  // SEIT AE-66 ÜBER DIE MODESLISTE STATT EINZELNER LITERALE: `?mode=shadowing`
  // ist für jede Richtung gültig oder fällt auf Karteikarten zurück — auch ein
  // gemerkter Modus einer alten Richtung kann nie einen ungültigen Zustand
  // ergeben. 'heute' (Heutige Runde, Schritt 2) ist kein richtungseigener
  // Modus, sondern als Sammelmodus überall gültig.
  const modes: string[] = [...modesForDirection(direction), 'heute'];
  return typeof value === 'string' && modes.includes(value) ? (value as Mode) : 'cards';
}

function ZurueckZurUebersicht() {
  const { t } = useLocale();
  const theme = useTheme();
  return (
    <Link href="/" asChild>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [styles.backLink, pressed && styles.backPressed]}>
        <Ionicons name="arrow-back" size={15} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('review.backToOverview')}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

export default function ReviewScreen() {
  const { t, uiLanguage } = useLocale();
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
   * wird es nur durch eine Zielwahl — die Geste „von vorn".
   *
   * Seit dem Sprach-Umbau JEDE Richtung — auch auf nicht-deutschen
   * Oberflächen bleibt der Stand über einen Neustart erhalten.
   */
  const remember = useCallback(async (direction: PairDirection | null, mode?: Mode) => {
    setProfile(await setReviewSpot(direction ? { direction, mode: mode ?? 'cards' } : null));
  }, []);

  const open = useCallback(
    (direction: PairDirection, mode: Mode) => {
      router.setParams({
        direction,
        mode,
        waehlen: undefined,
      });
    },
    [router]
  );

  if (profileError) {
    return (
      <ScreenScaffold title={t('tabs.learn')} subtitle={t('review.subtitle')} headerAction={<ZurueckZurUebersicht />}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('common.loadFailed', { message: profileError })}
        </ThemedText>
      </ScreenScaffold>
    );
  }

  if (!profile) {
    return (
      <ScreenScaffold title={t('tabs.learn')} subtitle={t('review.subtitle')} headerAction={<ZurueckZurUebersicht />}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('review.loadingProfile')}
        </ThemedText>
      </ScreenScaffold>
    );
  }

  const explicit = isPairDirection(params.direction) ? params.direction : null;
  // `waehlen=1` setzt der Wechsel-Knopf: die Auswahl muss auch dann erreichbar
  // bleiben, wenn ein Stand gemerkt ist - sonst waere er eine Einbahnstrasse.
  // `profile.review` traegt nur einen Stand der AKTUELLEN Sprache; darum
  // kuemmert sich `loadProfile`.
  const requested = explicit ?? profile.review?.direction ?? null;
  const direction = params.waehlen === '1' || !requested ? null : directionForBridge(uiLanguage, requested);

  if (!direction) {
    return (
      <DirectionPicker
        profile={profile}
        onPick={(picked) => {
          // Lernziel gewählt: Die Paarsprache gehört zum Ziel — `setLanguage`
          // wirft den alten gemerkten Stand weg, und der ReviewBody-Effekt
          // schreibt die neue Richtung sofort als Lesezeichen zurück (bei
          // Kreuzzielen verzichtet `remember` bewusst auf das Schreiben).
          // Ein Speicherfehler ändert nichts an der Adresse, die schon stimmt.
          void setLanguage(targetLanguageOf(picked))
            .then(setProfile)
            .catch(() => {});
          router.setParams({ direction: picked, waehlen: undefined, mode: undefined });
        }}
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
 * — über die Übungsleiste, über eine Zielwahl in der Auswahl (auch die
 * Übersicht wählt Sprache und Richtung; der „Lernen"-Knopf ihrer Zeilen
 * navigiert mit der Richtung als Adresse direkt hierher) und über
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
  direction: PairDirection;
  mode: Mode;
  onOpen: (direction: PairDirection, mode: Mode) => void;
  onSwitch: () => void;
  onRemember: (direction: PairDirection | null, mode?: Mode) => void;
  onExit: () => void;
}) {
  const { t, languageName, uiLanguage } = useLocale();
  useEffect(() => {
    // Die Heutige Runde ist ein Sammelmodus ohne gemerkten Stand — als
    // Lesezeichen bleibt die Karteikarten-Sitzung, sonst stünde man beim
    // nächsten Öffnen mitten in einer abgebrochenen Runde.
    onRemember(direction, mode === 'heute' ? 'cards' : mode);
    // `onRemember` ist bewusst nicht in der Liste: Es schreibt das Profil und
    // erzeugt dadurch eine neue Identitaet - mit ihm liefe der Effekt endlos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, mode]);

  // Zielname statt Richtungslabel (Nutzerentscheidung 2026-09-10). Für
  // Richtungen ohne Lernziel — en_to_de/es_to_de aus gemerkten Profilen oder
  // alten Adressen — fällt der ehrliche Richtungstext zurück.
  const ziel = zielFuerDirection(direction);

  return (
    <ScreenScaffold
      title={t('tabs.learn')}
      headerAction={<ZurueckZurUebersicht />}
      subtitle={
        ziel
          ? languageName(goalLanguage(ziel))
          : isDeAnchored(direction)
            ? directionLabel(direction, uiLanguage)
            : direction
      }>
      {mode === 'heute' ? (
        <TodayRoundRunner key={direction} direction={direction} onExit={onExit} />
      ) : (
        <>
          {/* Der Hauptknopf der Runde bleibt unter den Übungen sichtbar —
              nur nicht, während die Runde selbst läuft. */}
          <HeutigeRundeKnopf onPress={() => onOpen(direction, 'heute')} />
          <ModeBar
            direction={direction}
            mode={mode}
            onPick={(picked) => onOpen(direction, picked)}
          />

          {/* Eigenständiger Punkt „Prüfung“ — NUR beim Lernziel Deutsch
              (Nutzerplan 14.09.: erst Deutsch zum Laufen bringen, die
              Erweiterung auf die anderen Ziele folgt von Hand). */}
          {ziel && goalLanguage(ziel) === 'de' ? (
            <PruefungsEinstieg direction={direction} />
          ) : null}

          <DirectionBar onSwitch={onSwitch} />

          {mode === 'cards' ? (
        <CardSession direction={direction} onExit={onExit} key={direction} />
      ) : mode === 'writing' ? (
        <WritingRunner key={`${direction}:writing`} direction={direction} onExit={onExit} />
      ) : mode === 'dictation' ? (
        <DictationRunner
          key={`${direction}:dictation`}
          language={targetLanguageOf(direction)}
          direction={direction}
          onExit={onExit}
        />
      ) : mode === 'shadowing' || mode === 'sentenceRepeat' || mode === 'sentenceListening' ? (
        <SentenceRunner
          key={`${direction}:${mode}`}
          mode={mode}
          language={targetLanguageOf(direction)}
          anchor={anchorOf(direction)}
          onExit={onExit}
        />
      ) : mode === 'lesestoffe' ? (
        <ReadingTextsRunner key={direction} direction={direction} onExit={onExit} />
      ) : mode === 'sagen' ? (
        <ProductionRunner key={direction} direction={direction} onExit={onExit} />
      ) : mode === 'rollenspiel' ? (
        <RoleplayRunner key={direction} direction={direction} onExit={onExit} />
      ) : mode === 'speaking' ? (
        // Thai: die gemessene Tonkontur-Übung (AE-48). Englisch/Spanisch:
        // Nachsprechen mit Musterlösung und ehrlicher Selbst-Einschätzung —
        // eine Kontur-Messung gibt es dort nicht, und behauptet wird keine.
        learningLanguage(targetLanguageOf(direction)).wordSpeaking === 'tone-contour' ? (
          <SpeakingRunner key={`${direction}:speaking`} direction={direction} onExit={onExit} />
        ) : (
          <WordSpeakingRunner key={`${direction}:speaking`} direction={direction} onExit={onExit} />
        )
      ) : (
        <DrillRunner
          drill={mode}
          direction={direction}
          language={targetLanguageOf(direction)}
          key={`${direction}:${mode}`}
          onExit={onExit}
        />
      )}
          </>
      )}

      {/* Die Merkmal-Legende (Tonfarben etc.) ist hier bewusst ENTFERNT
          (Nutzerentscheidung 10.09.): Die Töne stehen bereits farbig an der
          Umschrift jeder Karte — der Extra-Kasten wiederholte sie nur. */}
    </ScreenScaffold>
  );
}

/**
 * Der Hauptknopf der Heutigen Runde (Schritt 2, 13.09.): gemischtes Üben —
 * fällige Karten, Hören, Satz bilden, Diktat, Shadowing in ~10 Minuten. Er
 * steht ÜBER der Übungsleiste, weil die Mischung der empfohlene Weg ist;
 * die Einzelübungen bleiben darunter voll erreichbar.
 */
function HeutigeRundeKnopf({ onPress }: { onPress: () => void }) {
  const { t } = useLocale();
  return (
    <ThemedButton
      label={t('round.cta', { minutes: ROUND_MINUTES })}
      accessibilityLabel={t('round.ctaA11y', { minutes: ROUND_MINUTES })}
      onPress={onPress}
      variant="primary"
    />
  );
}

/**
 * Ohne gewähltes Ziel wird nicht gelernt. Die Lernziele folgen seit Stufe 1
 * der BRÜCKE (Nutzerentscheidung 2026-09-10): Die App-/Oberflächensprache
 * bestimmt, welche Ziele hier stehen — Brücke Deutsch sieht die vier
 * Bestandsziele, Brücken th/en/es ihre jeweiligen Paare. Jede Wahl setzt
 * Sprache UND Richtung in einem (`lib/languages/goals`); die internen Abläufe
 * bleiben richtungsbasiert — nur die Beschriftung zeigt das Ziel.
 */
function DirectionPicker({
  profile,
  onPick,
}: {
  profile: LearnerProfile;
  onPick: (direction: PairDirection) => void;
}) {
  const { t, languageName, uiLanguage } = useLocale();
  // Hervorheben, wo man gerade war — der gemerkte Stand, nicht der (hier
  // leere) Adressparameter. Gehört die gemerkte Richtung zu keinem Ziel
  // (en_to_de/es_to_de), bleibt keine Zeile hervorgehoben.
  const aktuell = profile.review?.direction ?? null;
  return (
    <ScreenScaffold title={t('tabs.learn')} subtitle={t('review.pickSubtitle')} headerAction={<ZurueckZurUebersicht />}>
      <View role="radiogroup" accessibilityLabel={t('picker.chooseA11y')}>
        {zieleFuerBruecke(uiLanguage).map((ziel: Lernziel) => {
          const name = languageName(goalLanguage(ziel));
          const endonym = goalEndonym(ziel);
          const active = ziel.direction === aktuell;
          return (
            <Pressable
              key={ziel.direction}
              onPress={() => onPick(ziel.direction)}
              accessibilityRole="radio"
              accessibilityLabel={t('dashboard.cta', { direction: name })}
              aria-checked={active}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView
                type={active ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.goalRow}>
                <ThemedText type="default" style={styles.goalName}>
                  {name}
                </ThemedText>
                {/* Brücken-Lernziel: die Quellsprache nennen — „Thai (von
                    Deutsch)“ unterscheidet sich als Ziel nur durch ihre
                    Herkunft. Sonst gilt wie bisher: Bei Deutsch fallen Name
                    und Endonym zusammen. */}
                {ziel.vonSprache ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('goal.fromSource', { language: languageName(ziel.vonSprache) })}
                  </ThemedText>
                ) : endonym !== name ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {endonym}
                  </ThemedText>
                ) : null}
              </ThemedView>
            </Pressable>
          );
        })}
      </View>
      {/* Merkmal-Legende ebenfalls entfernt (Nutzerentscheidung 10.09.) —
          sie erscheint weiterhin auf der Übersicht. */}
    </ScreenScaffold>
  );
}

/** Umschalter zwischen Karteikarten und den Übungen dieser Richtung. */
function ModeBar({
  direction,
  mode,
  onPick,
}: {
  direction: PairDirection;
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
 * Eigenständiger Punkt „Prüfung“ im Lern-Reiter (14.09.): Der frühere
 * Haupt-Tab ist beim Deutsch-Lernziel hierher gewandert — die mitgelieferten
 * Aufgaben folgen dem Goethe-Format. Die Richtung reist als Parameter mit,
 * damit der Prüfungs-Screen nur die Aufgaben DIESER Lernrichtung zeigt.
 */
function PruefungsEinstieg({ direction }: { direction: PairDirection }) {
  const { t } = useLocale();
  const colors = useTheme();
  return (
    <Link href={{ pathname: '/exam', params: { direction } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tabs.exam')}
        style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.examRow}>
          <Ionicons name="ribbon-outline" size={20} color={colors.textSecondary} />
          <View style={styles.examTexte}>
            <ThemedText type="default">{t('tabs.exam')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('exam.subtitle')}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </ThemedView>
      </Pressable>
    </Link>
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

function CardSession({ direction, onExit }: { direction: PairDirection; onExit: () => void }) {
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
        {/* Verlassen mitten in der Runde — der Karten-Runner war der einzige
            Übungsfluss ohne Rückweg zur Übungsliste (Nutzerbefund 21.09.). */}
        <ThemedButton label={t('common.back')} onPress={onExit} />
      </View>

      <Flashcard
        entry={item.entry}
        direction={direction}
        revealed={revealed}
        bridgeEntry={item.bridgeEntry}
      />

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
  /** Rückweg zur Übersicht — dezente Zeile über dem Titel, volle Tipphöhe. */
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  backPressed: {
    opacity: 0.7,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  goalName: {
    fontWeight: '700',
    flexShrink: 1,
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
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  examTexte: {
    flex: 1,
    gap: Spacing.half,
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
