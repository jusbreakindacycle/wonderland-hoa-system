import { StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppText } from './AppText';
import { colors, iconSize, radius, spacing, type ColorToken } from '@/theme';

/**
 * Restricted to the five fixed semantic variants of Guide §9.2. Stage 1
 * exercises only `warning` and `danger`; the other three are specified so
 * later stages do not invent a sixth (UX Foundation §6, §9).
 */
export type InlineAlertVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type AppIconName = React.ComponentProps<typeof MaterialIcons>['name'];

const VARIANTS: Record<
  InlineAlertVariant,
  { color: ColorToken; icon: AppIconName; live: 'assertive' | 'polite' }
> = {
  success: { color: 'success', icon: 'check-circle', live: 'polite' },
  warning: { color: 'warning', icon: 'error-outline', live: 'polite' },
  danger: { color: 'danger', icon: 'cancel', live: 'assertive' },
  info: { color: 'info', icon: 'info-outline', live: 'polite' },
  neutral: { color: 'textSecondary', icon: 'notes', live: 'polite' },
};

type InlineAlertProps = {
  variant: InlineAlertVariant;
  message: string;
  testID?: string;
};

/**
 * Colour is always paired with an icon and text, never the sole carrier of
 * meaning (UX Foundation §7).
 */
export function InlineAlert({ variant, message, testID }: InlineAlertProps) {
  const tokens = VARIANTS[variant];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion={tokens.live}
      style={[styles.container, { borderColor: colors[tokens.color] }]}
      testID={testID}
    >
      <MaterialIcons
        name={tokens.icon}
        size={iconSize.lg}
        color={colors[tokens.color]}
        // The icon repeats what the text says; announcing it would be noise.
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <AppText variant="body" color="textPrimary" style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space12,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.space12,
  },
  message: {
    flex: 1,
  },
});
