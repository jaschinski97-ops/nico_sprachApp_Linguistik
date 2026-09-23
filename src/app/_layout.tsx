import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { restorePlaybackAudioMode } from '@/lib/audio-mode';
import { installClipLookup } from '@/lib/clips/lookup';
import { I18nProvider } from '@/lib/i18n';

// Lehnt ab, wenn der Splash schon versteckt oder bereits jemand anders an
// der Steuerung ist — der Start darf daran nicht als unhandled rejection
// scheitern.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Hoerclips (Phase 11): der Aufloeser aus Phase 3 wird hier einmal
// eingehaengt. Die Screens rufen weiter nur playPronunciation().
installClipLookup();

// iOS: Wiedergabe auch bei Stumm-Schalter (Sprachlern-App — sonst wirkt
// jeder Anhören-Knopf kaputt). Siehe lib/audio-mode.ts.
void restorePlaybackAudioMode();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* auto statt der Systemvorgabe: ohne diese Angabe blieben die
          Statusbar-Icons weiss und waren im Hellmodus unlesbar. */}
      <StatusBar style="auto" />
      <AnimatedSplashOverlay />
      {/* App-Sprache (Roadmap v2): Systemsprache erkennen, Einstellung aus
          dem Speicher lesen — für alle Screens und Komponenten darunter. */}
      <I18nProvider>
        <AppTabs />
      </I18nProvider>
    </ThemeProvider>
  );
}
