import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isContentDeveloper } from '@/lib/content/developer';
import { useLocale } from '@/lib/i18n';

/**
 * Das Entwicklerstudio als eigener Bereich (UI-Review 10.09.) — vorher stand
 * sein ganzer Verwaltungsapparat auf der Einstellungsseite.
 *
 * REIHENFOLGE DER GATES: Erst `__DEV__`, dann der Studio-Port. Beide
 * Prüfungen laufen, BEVOR irgendetwas aus `dev/content-studio` geladen wird —
 * das Modul zieht Anbieter-Clients und Schlüssel-UI in den Modulgraphen, und
 * genau das darf ein Release nie tun. Darum auch `require` im Zweig statt
 * eines statischen Imports.
 */
export default function StudioScreen() {
  const { t } = useLocale();

  // Metro entfernt Abhängigkeiten innerhalb dieses expliziten DEV-Zweigs.
  // Ein vorheriges `if (!__DEV__) return` entfernt spätere requires nicht.
  if (__DEV__ && isContentDeveloper()) {
    const Studio = require('@/dev/content-studio').default;
    return (
      <ScreenScaffold title={t('settings.studio')}>
        <ZurueckZeile />
        <Studio />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title={t('settings.studio')}>
      <ZurueckZeile />
      <ThemedText type="small" themeColor="textSecondary">
        {__DEV__ ? t('settings.studioOrigin') : t('settings.studioDevOnly')}
      </ThemedText>
    </ScreenScaffold>
  );
}

function ZurueckZeile() {
  const { t } = useLocale();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.dismissTo('/settings')}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
      <Ionicons name="chevron-back" size={16} color={theme.textSecondary} accessible={false} />
      <ThemedText type="small" themeColor="textSecondary">
        {t('settings.back')}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
});
