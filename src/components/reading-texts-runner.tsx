import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedButton } from './themed-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  hasPronunciationClip,
  isLanguageAvailable,
  playPronunciationWithStatus,
  stopPronunciation,
} from '@/lib/audio';
import { localizedSituation, type ConversationSituation, type ConversationTurn } from '@/lib/conversation/types';
import { zielSprache } from '@/lib/production/tasks';
import { useLocale } from '@/lib/i18n';
import { type PairDirection } from '@/lib/languages/types';
import { loadCardStatesForDirection, loadSituations } from '@/lib/repository';
import {
  lesestoffeFuerRichtung,
  tokenisiereFuerAntippen,
  verstaendnisFragen,
  type LeseStoff,
  type TextToken,
  type VerstaendnisFrage,
} from '@/lib/reading-texts';
import { activeVocabulary } from '@/data/active-vocabulary';

/**
 * Längere Hör- und Lesetexte (Schritt 4, Lern-Reiter-Ausbau): Die
 * vorhandenen Situationen als ganze Dialoge — Lesen mit Wörter-Antippen
 * (Bestandswörter zeigen beim Antippen ihre Bedeutung) und zeilenweisem
 * Vorlesen, am Ende Verständnisfragen, die mechanisch aus der Szene
 * abgeleitet sind.
 *
 * FREISCHALTUNG am Wortschatzstand (`lib/reading-texts`): Eine Szene öffnet,
 * wenn ihr eigener Bestands-Wortschatz im Kartenstand der Richtung begonnen
 * ist — gesperrte Szenen nennen ihren Stand, statt still zu fehlen. Kein
 * FSRS-Schreiben: Der Text übt das Lesen und Hören, die Karten laufen in
 * Karteikarte, Diktat und „Sag es auf …“.
 */
export function ReadingTextsRunner({
  direction,
  onExit,
}: {
  direction: PairDirection;
  onExit: () => void;
}) {
  const { t, uiLanguage } = useLocale();
  const [stoff, setStoff] = useState<LeseStoff[] | null>(null);
  const [gewaehlt, setGewaehlt] = useState<ConversationSituation | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [situationen, cards] = await Promise.all([
          loadSituations(),
          loadCardStatesForDirection(direction),
        ]);
        if (cancelled) return;
        setStoff(
          lesestoffeFuerRichtung({
            direction,
            situationen: situationen.map(s => localizedSituation(s, uiLanguage)),
            pool: activeVocabulary(),
            cards,
            latin: zielSprache(direction) !== 'th',
          })
        );
      } catch {
        if (!cancelled) setStoff([]);
      }
    })();
    return () => {
      cancelled = true;
      void stopPronunciation();
    };
  }, [direction, uiLanguage]);

  if (stoff === null) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        {t('round.assembling')}
      </ThemedText>
    );
  }

  if (gewaehlt) {
    return (
      <TextAnsicht
        situation={gewaehlt}
        onExit={() => {
          void stopPronunciation();
          setGewaehlt(null);
        }}
        onBeenden={onExit}
      />
    );
  }

  if (stoff.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{t('mode.lesestoffe')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('conversation.noneForDirection')}
        </ThemedText>
        <View style={styles.actions}>
          <ThemedButton label={t('common.back')} onPress={onExit} />
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <View style={styles.headerRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('texts.pick')}
        </ThemedText>
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel={t('drill.exit')}
          style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('drill.exit')}
          </ThemedText>
        </Pressable>
      </View>
      <View style={styles.szeneListe}>
        {stoff.slice(0, 40).map((eintrag) => (
          <Pressable
            key={eintrag.situation.id}
            disabled={!eintrag.offen}
            onPress={() => setGewaehlt(eintrag.situation)}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.cta', { direction: eintrag.situation.title })}
            style={({ pressed }) => [pressed && eintrag.offen && styles.pressed]}>
            <ThemedView
              type={eintrag.offen ? 'backgroundElement' : 'backgroundSelected'}
              style={styles.szeneZeile}>
              <ThemedText
                type="smallBold"
                style={eintrag.offen ? undefined : { opacity: 0.6 }}>
                {eintrag.situation.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {eintrag.offen
                  ? `${eintrag.situation.level} · ${t('texts.knownOf', {
                      known: eintrag.bekannt,
                      total: eintrag.poolWoerter,
                    })}`
                  : t('texts.lockedBody', {
                      known: eintrag.bekannt,
                      total: eintrag.poolWoerter,
                      needed: Math.min(eintrag.schwellwert, eintrag.poolWoerter),
                    })}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </View>
    </>
  );
}

/** Eine geöffnete Szene: Zeilen mit Antipp-Wörtern, Vorlesen, Fragen. */
function TextAnsicht({
  situation,
  onExit,
  onBeenden,
}: {
  situation: ConversationSituation;
  onExit: () => void;
  onBeenden: () => void;
}) {
  const { t } = useLocale();
  const colors = useTheme();
  const sprache = zielSprache(situation.direction);
  const [woerter, setWoerter] = useState<{ text: string; german: string }[]>([]);
  const [uebersetzt, setUebersetzt] = useState<Set<number>>(new Set());
  const [fragenStufe, setFragenStufe] = useState<number | null>(null);

  const fragen = useMemo(() => verstaendnisFragen(situation, situation.title.length + 5), [situation]);

  const spiele = useCallback((zeile: ConversationTurn) => {
    void (async () => {
      try {
        const request = { text: zeile.thai, language: sprache, purpose: 'sentence' as const };
        if (!await hasPronunciationClip(request) && await isLanguageAvailable(sprache) === false) return;
        await playPronunciationWithStatus(request);
      } catch {
        // Ohne Ton bleibt der Text — Lesen funktioniert unabhängig.
      }
    })();
  }, [sprache]);

  const antippen = (token: TextToken) => {
    if (!token.entry) return;
    setWoerter((liste) => {
      const ohne = liste.filter((w) => w.text !== token.text);
      return [{ text: token.text, german: token.entry!.german }, ...ohne].slice(0, 3);
    });
  };

  const zeileUebersetzen = (i: number) => {
    setUebersetzt((alt) => {
      const neu = new Set(alt);
      if (neu.has(i)) neu.delete(i);
      else neu.add(i);
      return neu;
    });
  };

  // Fragen-Phase?
  if (fragenStufe !== null) {
    const frage = fragen[fragenStufe];
    if (!frage) {
      return (
        <>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{t('texts.done')}</ThemedText>
            <View style={styles.actions}>
              <ThemedButton label={t('roleplay.otherScene')} onPress={onExit} />
              <ThemedButton label={t('common.back')} onPress={onBeenden} />
            </View>
          </ThemedView>
        </>
      );
    }
    return <FrageAnsicht frage={frage} weiter={() => setFragenStufe((v) => (v ?? 0) + 1)} />;
  }

  return (
    <>
      <View style={styles.headerRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {situation.title}
        </ThemedText>
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('common.back')}
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {situation.setting}
      </ThemedText>

      {situation.scriptTurns.map((zeile, i) => {
        const tokens = tokenisiereFuerAntippen(zeile.thai, activeVocabulary(), sprache !== 'th');
        return (
          <ThemedView
            key={`${i}`}
            type={zeile.speaker === 'learner' ? 'backgroundSelected' : 'backgroundElement'}
            style={styles.zeile}>
            <View style={styles.zeileKopf}>
              <ThemedText type="small" themeColor="textSecondary">
                {zeile.speaker === 'learner' ? t('conversation.you') : t('conversation.partner')}
              </ThemedText>
              <Pressable
                onPress={() => spiele(zeile)}
                accessibilityRole="button"
                accessibilityLabel={t('conversation.listenA11y', { text: zeile.thai })}
                style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
                <ThemedText type="small" style={{ color: colors.accent }}>
                  {t('drill.playAgain')}
                </ThemedText>
              </Pressable>
            </View>
            {/* Der Text: tippbare Bestandswörter hervorgehoben. */}
            <View style={styles.textZeile}>
              {tokens.map((token, j) =>
                token.entry ? (
                  <Pressable
                    key={`${j}`}
                    onPress={() => antippen(token)}
                    accessibilityRole="button"
                    accessibilityLabel={`${token.text}: ${token.entry.german}`}
                    style={({ pressed }) => [pressed && styles.pressed]}>
                    <ThemedText
                      type="default"
                      style={[styles.tippbar, { color: colors.accent, borderColor: colors.accent }]}>
                      {token.text}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText key={`${j}`} type="default">
                    {token.text}
                  </ThemedText>
                )
              )}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {zeile.roman}
            </ThemedText>

            {woerter.filter((w) => zeile.thai.includes(w.text)).length > 0 ? (
              <View style={styles.wortKasten}>
                {woerter
                  .filter((w) => zeile.thai.includes(w.text))
                  .map((w) => (
                    <ThemedText key={w.text} type="small">
                      {w.text} — {w.german}
                    </ThemedText>
                  ))}
              </View>
            ) : null}

            {uebersetzt.has(i) ? (
              <ThemedText type="small" themeColor="textSecondary">
                {zeile.german}
              </ThemedText>
            ) : (
              <Pressable
                onPress={() => zeileUebersetzen(i)}
                accessibilityRole="button"
                accessibilityLabel={t('texts.showTranslation')}
                style={({ pressed }) => [styles.tapTarget, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('texts.showTranslation')}
                </ThemedText>
              </Pressable>
            )}
          </ThemedView>
        );
      })}

      {fragen.length > 0 ? (
        <ThemedButton
          label={t('texts.questionsTitle')}
          onPress={() => {
            void stopPronunciation();
            setFragenStufe(0);
          }}
          variant="primary"
        />
      ) : null}
    </>
  );
}

function FrageAnsicht({ frage, weiter }: { frage: VerstaendnisFrage; weiter: () => void }) {
  const { t } = useLocale();
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);

  const optionenMitLabels: { label: string }[] =
    frage.art === 'sprecher'
      ? [{ label: t('conversation.you') }, { label: t('conversation.partner') }]
      : frage.optionen.map((label) => ({ label }));

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">
        {frage.art === 'bedeutung' ? t('texts.questionMeaning') : t('texts.questionSpeaker')}
      </ThemedText>
      <ThemedText type="subtitle" maxFontSizeMultiplier={2}>
        {frage.frage}
      </ThemedText>
      <View style={styles.options}>
        {optionenMitLabels.map((option, i) => (
          <Pressable
            key={`${option.label}:${i}`}
            onPress={() => {
              if (gewaehlt !== null) return;
              setGewaehlt(i);
            }}
            disabled={gewaehlt !== null}
            accessibilityRole="button"
            style={({ pressed }) => [pressed && styles.pressed]}>
            <ThemedView
              type={
                gewaehlt === null
                  ? 'backgroundSelected'
                  : i === frage.correctIndex
                    ? 'accent'
                    : 'backgroundSelected'
              }
              style={styles.optionButton}>
              <ThemedText
                type="small"
                themeColor={gewaehlt !== null && i === frage.correctIndex ? 'accentText' : 'text'}
                numberOfLines={2}>
                {option.label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </View>
      {gewaehlt !== null ? (
        <>
          <ThemedText type="smallBold">
            {gewaehlt === frage.correctIndex ? t('sentence.correct') : t('drill.wrong')}
          </ThemedText>
          <ThemedButton label={t('common.next')} onPress={weiter} />
        </>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tapTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  szeneListe: {
    gap: Spacing.two,
  },
  szeneZeile: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    minHeight: 44,
    justifyContent: 'center',
  },
  zeile: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  zeileKopf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textZeile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  tippbar: {
    textDecorationLine: 'underline',
    borderWidth: 0,
    borderBottomWidth: 1,
  },
  wortKasten: {
    gap: Spacing.one,
    opacity: 0.9,
  },
  options: {
    gap: Spacing.two,
  },
  optionButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
