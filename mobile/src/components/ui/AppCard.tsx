import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

type AppCardProps = {
  children: ReactNode;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Card definition comes from the border and the radius, not from elevation or
 * a background contrast step — `elevation-none` is the Stage 1 default for
 * every surface (UX Foundation §5.5, §6).
 */
export function AppCard({ children, style, testID }: AppCardProps) {
  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.space16,
    ...shadows.none,
  },
});
