import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LanguageSwitch } from '@/components/language-switch';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme, useToneColor } from '@/hooks/use-theme';
import { PlaybackKind, playPronunciation } from '@/lib/audio';
import { ConversationSituation, TopicId } from '@/lib/conversation/types';
import { Direction } from '@/lib/fsrs/types';
import { loadSituations } from '@/lib/repository';
import { useLearnerLanguage } from '@/hooks/use-learner-language';
import { setConversationDirection } from '@/lib/profile';
import { TranslationKey, useLocale } from '@/lib/i18n';
import { directionsFor } from '@/lib/languages/types';
import { directionLabel } from '@/lib/review-session';

/** Gesprächsthemen als Übersetzungsschlüssel statt als deutsche Konstante. */
const TOPIC_KEYS: Record<ConversationSituation['topic'], TranslationKey> = {
  greeting: 'topic.greeting',
  market: 'topic.market',
  restaurant: 'topic.restaurant',
  travel: 'topic.travel',
};

export default function ConversationScreen() {
  const { t, languageName } = useLocale();
  const [situations, setSituations] = useState<ConversationSituation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Die Richtung haengt an der Sprache (Phase 17): gewaehlt wird eine der
  // zwei Richtungen der gerade gelernten Sprache, sonst die erste davon.
  const { language, profile, chooseLanguage } = useLearnerLanguage();
  const [chosen, setChosen] = useState<Direction | null>(null);
  const directions = directionsFor(language);
  // Wie im Lernen-Reiter (Phase 18): Die zuletzt geoeffnete Richtung bleibt
  // offen, bis auf der Uebersicht eine Sprache gewaehlt wird. `profile`
  // liefert nur einen Stand der aktuellen Sprache.
  const gemerkt = profile?.conversation ?? null;
  const aktuell = chosen ?? gemerkt;
  const direction = aktuell && directions.includes(aktuell) ? aktuell : directions[0];
  const [openId, setOpenId] = useState<string | null>(null);
  // WHY einklappbar: Je Richtung liegen ~243 Situationen an — die volle Liste
  // war eine Scrollwüste. Standard ist deshalb JEDES Thema zugeklappt; der
  // Kopf öffnet nur die Liste seines Themas. `openId` bleibt vom Zuklappen
  // unberührt: Eine offene Karte steht beim Wiederöffnen noch offen.
  const [offeneThemen, setOffeneThemen] = useState<ReadonlySet<TopicId>>(new Set());
  const toggleThema = (topic: TopicId) =>
    setOffeneThemen((vorher) => {
      const folge = new Set(vorher);
      if (folge.has(topic)) folge.delete(topic);
      else folge.add(topic);
      return folge;
    });

  useEffect(() => {
    let cancelled = false;
    loadSituations()
      .then((all) => {
        if (!cancelled) setSituations(all);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () => (situations ?? []).filter((s) => s.direction === direction),
    [situations, direction]
  );

  // Gleiche Titel sind beabsichtigte Dialogvarianten (gleiche Situation,
  // andere Gesprächsführung) — ohne Kennzeichnung wirken sie wie Duplikate.
  // Anzeige-Reihenfolge entscheidet: der erste bleibt ohne Anhang.
  const variantSuffix = useMemo(() => {
    const counts = new Map<string, number>();
    const suffix = new Map<string, string>();
    for (const situation of visible) {
      const count = (counts.get(situation.title) ?? 0) + 1;
      counts.set(situation.title, count);
      suffix.set(situation.id, count === 1 ? '' : t('conversation.variant', { count }));
    }
    return suffix;
  }, [visible, t]);

  // WHY: Das Thema steht einmal am Abschnittslabel, nicht zehnmal in der
  // Liste. Zusammenziehen ohne Umsortieren — die Themen erscheinen in der
  // Reihenfolge ihres ersten Auftretens, innerhalb eines Themas bleibt die
  // Anzeige-Reihenfolge des Arrays unverändert.
  const groups = useMemo(() => {
    const nachThema = new Map<TopicId, ConversationSituation[]>();
    for (const situation of visible) {
      const liste = nachThema.get(situation.topic);
      if (liste) liste.push(situation);
      else nachThema.set(situation.topic, [situation]);
    }
    return [...nachThema.entries()];
  }, [visible]);

  if (error) {
    return (
      <ScreenScaffold title={t('tabs.conversation')} subtitle={t('conversation.subtitle')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('common.loadFailed', { message: error })}
        </ThemedText>
      </ScreenScaffold>
    );
  }

  if (!situations) {
    return (
      <ScreenScaffold title={t('tabs.conversation')} subtitle={t('conversation.subtitle')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('conversation.loading')}
        </ThemedText>
      </ScreenScaffold>
    );
  }

  const mine = situations.filter((s) => directions.includes(s.direction));

  if (mine.length === 0) {
    return (
      <ScreenScaffold
        title={t('tabs.conversation')}
        subtitle={t('conversation.subtitleLanguage', {
          language: languageName(language),
        })}>
        <LanguageSwitch selected={language} onSelect={chooseLanguage} />
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">
            {t('conversation.noneFor', { language: languageName(language) })}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('conversation.noneForBody', { language: languageName(language) })}
          </ThemedText>
        </ThemedView>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      title={t('tabs.conversation')}
      subtitle={t('conversation.subtitleCount', { count: mine.length })}>
      <LanguageSwitch selected={language} onSelect={chooseLanguage} />
      <View style={styles.row}>
        {directions.map((d) => (
          <Pressable
            key={d}
            onPress={() => {
              setChosen(d);
              // Feuer-und-vergessen ist hier gewollt, aber ein Speicherfehler
              // darf keine unbehandelte Promise-Rejection werden.
              void setConversationDirection(d).catch(() => {});
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: direction === d }}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView
              type={direction === d ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.chip}>
              <ThemedText type="small">{directionLabel(d)}</ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </View>

      {visible.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('conversation.noneForDirection')}
        </ThemedText>
      ) : (
        groups.map(([topic, gruppe]) => {
          const offen = offeneThemen.has(topic);
          return (
            <View key={topic} style={styles.topicGroup}>
              <Pressable
                onPress={() => toggleThema(topic)}
                accessibilityRole="button"
                accessibilityState={{ expanded: offen }}
                accessibilityLabel={`${t(TOPIC_KEYS[topic])}, ${t(
                  'conversation.topicCount',
                  { count: gruppe.length }
                )}`}
                style={({ pressed }) => [styles.topicHead, pressed && styles.pressed]}>
                <View style={styles.header}>
                  <ThemedText type="smallBold" style={styles.headerText}>
                    {t(TOPIC_KEYS[topic])}
                  </ThemedText>
                  <View style={styles.topicMeta}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('conversation.topicCount', { count: gruppe.length })}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {offen ? '▲' : '▼'}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
              {offen
                ? gruppe.map((situation) => (
                    <SituationCard
                      key={situation.id}
                      situation={situation}
                      variantSuffix={variantSuffix.get(situation.id) ?? ''}
                      open={openId === situation.id}
                      onToggle={() => setOpenId(openId === situation.id ? null : situation.id)}
                    />
                  ))
                : null}
            </View>
          );
        })
      )}
    </ScreenScaffold>
  );
}

function SituationCard({
  situation,
  variantSuffix,
  open,
  onToggle,
}: {
  situation: ConversationSituation;
  variantSuffix: string;
  open: boolean;
  onToggle: () => void;
}) {
  const toneColor = useToneColor();
  const { t } = useLocale();

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
            {/* WHY: Das Thema steht einmal am Abschnittslabel — die Karte
                trägt nur noch Stufe und Varianten-Anhang. */}
            <ThemedText type="small" themeColor="textSecondary">
              {situation.level}
              {variantSuffix}
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
                  {turn.speaker === 'learner' ? t('conversation.you') : t('conversation.partner')}
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
            <ThemedText type="smallBold">{t('conversation.mistakesTitle')}</ThemedText>
            {situation.corrections.map((hint, index) => (
              <View key={index}>
                <ThemedText type="small">{hint.issue}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {hint.explanation}
                </ThemedText>
              </View>
            ))}
          </ThemedView>

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
  const { t } = useLocale();
  // WHY Icon statt Emoji: Das 🔊-Schriftzeichen sieht je Plattform anders aus
  // und ließ sich nicht über das Theme tönen; das Icon folgt textSecondary.
  const theme = useTheme();
  return (
    <View style={styles.turnSpeak}>
      {played === 'asset' ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('conversation.aiVoice')}
        </ThemedText>
      ) : null}
      <Pressable
        onPress={() => {
          // purpose 'sentence': Gesprächszüge sind Satzmaterial — die
          // Auslieferungs-Politik gestattet ungeprüfte Thai-Clips für Vokabel-
          // und Satzzwecke (audio-policy). Ohne Purpose liefe hier fast jeder
          // Zug auf System-TTS statt auf den erzeugten Clip.
          playPronunciation({ text, language: 'th', purpose: 'sentence' })
            .then(setPlayed)
            .catch(() => {});
        }}
        accessibilityRole="button"
        accessibilityLabel={`${t('conversation.listenA11y', { text })}${
          played === 'asset' ? t('conversation.syntheticNote') : ''
        }`}
        style={({ pressed }) => pressed && styles.pressed}
        hitSlop={12}>
        <Ionicons
          name="volume-medium-outline"
          size={17}
          color={theme.textSecondary}
        />
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
  topicGroup: {
    // Kopf sitzt nah an seiner Gruppe; der Abstand nach oben liefert der
    // Spalten-Gap des Scaffolds — wie das Abschnittslabel im Mockup.
    gap: Spacing.two,
  },
  topicHead: {
    // Der Themenkopf ist ein Knopf wie jede Karte: volle 44 Punkte
    // Trefferfläche, der Inneninhalt sitzt zentriert darin.
    minHeight: 44,
    justifyContent: 'center',
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    // Richtungswahl wie überall: mindestens 44 Punkte Trefferfläche
    // (war ~36 und damit das kleinste Ziel im Gesprächs-Tab).
    minHeight: 44,
    justifyContent: 'center',
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
