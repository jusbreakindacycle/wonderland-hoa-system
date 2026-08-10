import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type AppScreenProps = {
  children: ReactNode;
  /**
   * `static` fills the screen and does not scroll.
   * `scroll` adds scrolling plus keyboard avoidance, so form fields are never
   * hidden behind the on-screen keyboard (UX Foundation §6, Guide §9.5).
   */
  variant?: 'static' | 'scroll';
  /** Vertically centre the content. Used by the login and status screens. */
  centerContent?: boolean;
  edges?: readonly Edge[];
  contentStyle?: ViewStyle;
  testID?: string;
};

const DEFAULT_EDGES: readonly Edge[] = ['top', 'bottom', 'left', 'right'];

export function AppScreen({
  children,
  variant = 'static',
  centerContent = false,
  edges = DEFAULT_EDGES,
  contentStyle,
  testID,
}: AppScreenProps) {
  const padding = [styles.content, centerContent && styles.centered, contentStyle];

  if (variant === 'scroll') {
    return (
      <SafeAreaView style={styles.safeArea} edges={edges} testID={testID}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, padding]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            alwaysBounceVertical={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={edges} testID={testID}>
      <View style={[styles.flex, padding]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: spacing.space24,
    paddingVertical: spacing.space24,
  },
  centered: {
    justifyContent: 'center',
  },
});
