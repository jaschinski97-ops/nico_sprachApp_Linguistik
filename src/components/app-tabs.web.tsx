import { Tabs, TabList, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';

const LINKS = [
  { name: 'home', href: '/', label: 'Übersicht' },
  { name: 'review', href: '/review', label: 'Lernen' },
  { name: 'conversation', href: '/conversation', label: 'Gespräch' },
  { name: 'progress', href: '/progress', label: 'Fortschritt' },
  { name: 'settings', href: '/settings', label: 'Einstellungen' },
] as const;

/**
 * Web navigation: a top nav bar rather than the native bottom tab bar, so a
 * wide browser window does not get a phone layout (Phase 0 requirement).
 * The bar wraps on narrow viewports.
 */
export default function AppTabs() {
  return (
    <Tabs>
      <TabList asChild>
        <NavBar>
          {LINKS.map((link) => (
            <TabTrigger key={link.name} name={link.name} href={link.href} asChild>
              <NavButton>{link.label}</NavButton>
            </TabTrigger>
          ))}
        </NavBar>
      </TabList>
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

function NavBar(props: { children?: React.ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.bar}>
      <View style={styles.barInner}>
        <ThemedText type="smallBold" style={styles.brand}>
          Thai ↔ Deutsch
        </ThemedText>
        <View style={styles.links}>{props.children}</View>
      </View>
    </ThemedView>
  );
}

function NavButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
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
