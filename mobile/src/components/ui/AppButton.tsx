import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { AppText } from './AppText';
import { colors, controlHeight, radius, spacing, type ColorToken } from '@/theme';

/**
 * `destructive` exists in the type for future use. No Stage 1 screen exercises
 * it, because Stage 1 has no destructive action — signing out is reversible
 * (UX Foundation §4, §6).
 */
export type AppButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  /** `lg` is reserved for the one primary CTA on a screen. */
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle;
};

type VariantStyle = {
  background: ColorToken | 'transparent';
  border: ColorToken | 'transparent';
  label: ColorToken;
};

const VARIANTS: Record<AppButtonVariant, VariantStyle> = {
  primary: { background: 'brandPrimary', border: 'brandPrimary', label: 'onBrand' },
  secondary: { background: 'transparent', border: 'brandSecondary', label: 'brandSecondary' },
  tertiary: { background: 'transparent', border: 'transparent', label: 'brandSecondary' },
  destructive: { background: 'danger', border: 'danger', label: 'onBrand' },
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  accessibilityHint,
  testID,
  style,
}: AppButtonProps) {
  // Loading disables re-submission, so a double tap cannot fire two sign-in
  // attempts (Guide §13.1, UX Foundation §6).
  const isInactive = disabled || loading;
  const tokens = VARIANTS[variant];

  const backgroundColor = isInactive
    ? variant === 'primary' || variant === 'destructive'
      ? colors.disabled
      : 'transparent'
    : tokens.background === 'transparent'
      ? 'transparent'
      : colors[tokens.background];

  const borderColor = isInactive
    ? tokens.border === 'transparent'
      ? 'transparent'
      : colors.disabled
    : tokens.border === 'transparent'
      ? 'transparent'
      : colors[tokens.border];

  const labelColor: ColorToken = isInactive && variant !== 'primary' && variant !== 'destructive'
    ? 'disabled'
    : tokens.label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { height: controlHeight[size], backgroundColor, borderColor },
        // Visible press feedback, per UX Foundation §7.
        pressed && !isInactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator
            accessibilityLabel="Working"
            color={variant === 'primary' || variant === 'destructive' ? colors.onBrand : colors.brandSecondary}
          />
        </View>
      ) : (
        <AppText variant="label" color={labelColor} style={styles.label}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.space16,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    textAlign: 'center',
  },
  loadingRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
