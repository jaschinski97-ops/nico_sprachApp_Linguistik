import { Tabs, TabList, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { TranslationKey, useLocale } from '@/lib/i18n';

const LINKS = [
  { name: 'home', href: '/' },
  { name: 'review', href: '/review' },
  { name: 'conversation', href: '/conversation' },
  { name: 'exam', href: '/exam' },
  { name: 'progress', href: '/progress' },
  { name: 'settings', href: '/settings' },
] as const;

/** Reitername je Link — der Schlüsselraum kommt aus dem i18n-Wörterbuch. */
const LINK_LABELS: Record<(typeof LINKS)[number]['name'], TranslationKey> = {
  home: 'tabs.overview',
  review: 'tabs.learn',
  conversation: 'tabs.conversation',
  exam: 'tabs.exam',
  progress: 'tabs.progress',
  settings: 'tabs.settings',
};

/**
 * Web navigation: a top nav bar rather than the native bottom tab bar, so a
 * wide browser window does not get a phone layout (Phase 0 requirement).
 * The bar wraps on narrow viewports. Labels come from the app language.
 */
export default function AppTabs() {
  const { t } = useLocale();
  return (
    <Tabs>
      <TabList asChild>
        <NavBar>
          {LINKS.map((link) => (
            <TabTrigger key={link.name} name={link.name} href={link.href} asChild>
              <NavButton>{t(LINK_LABELS[link.name])}</NavButton>
            </TabTrigger>
          ))}
        </NavBar>
      </TabList>
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

function NavBar(props: { children?: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <ThemedView type="backgroundElement" style={styles.bar}>
      <View style={styles.barInner}>
        <ThemedText type="smallBold" style={styles.brand}>
          {t('tabs.brand')}
        </ThemedText>
        <View
          style={styles.links}
          accessibilityRole="tablist"
          accessibilityLabel={t('tabs.mainNavA11y')}>
          {props.children}
        </View>
      </View>
    </ThemedView>
  );
}

function NavButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      // Web-Tabs von Hand, was die native Tab-Leiste von expo-router mitbringt:
      // Rolle und Auswahlzustand, sonst sagt der Screenreader nur „Link“ ohne
      // die aktuelle Position (UI-Review 2026-09-07).
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isFocused) }}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.navButton}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  barInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  brand: {
    marginRight: 'auto',
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.one,
    // React Native defaults flex items to `flexShrink: 0`. Without this the
    // link row keeps its full width on a narrow viewport and the last tab is
    // clipped instead of wrapping onto a second line.
    flexShrink: 1,
  },
  navButton: {
    // Wie überall: 44 Punkte Mindesthöhe für ein Tippziel (UI-Review
    // 2026-09-07) — die Leiste wächst dafür minimal, nimmt dafür jeden Treffer.
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  slot: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
