import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { installClipLookup } from '@/lib/clips/lookup';

SplashScreen.preventAutoHideAsync();

// Hoerclips (Phase 11): der Aufloeser aus Phase 3 wird hier einmal
// eingehaengt. Die Screens rufen weiter nur playPronunciation().
installClipLookup();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
