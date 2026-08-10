import { forwardRef, useId, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppText } from './AppText';
import {
  colors,
  controlHeight,
  iconSize,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  typography,
} from '@/theme';

type AppTextFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  /** Always visible. Never placeholder-only (UX Foundation §6). */
  label: string;
  helperText?: string;
  errorText?: string;
  /** Renders the field as a password input with an accessible visibility toggle. */
  secure?: boolean;
};

export const AppTextField = forwardRef<TextInput, AppTextFieldProps>(function AppTextField(
  { label, helperText, errorText, secure = false, testID, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const messageId = useId();

  const hasError = Boolean(errorText);
  const message = errorText ?? helperText;

  const borderColor = hasError
    ? colors.danger
    : focused
      ? colors.brandPrimary
      : colors.border;

  return (
    <View>
      <AppText variant="label" color="textPrimary" style={styles.label} nativeID={`${messageId}-label`}>
        {label}
      </AppText>

      <View style={[styles.field, { borderColor }, focused && styles.fieldFocused]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${messageId}-label`}
          accessibilityHint={helperText}
          aria-invalid={hasError}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.brandPrimary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
          testID={testID}
          {...rest}
        />

        {secure ? (
          <Pressable
            accessibilityRole="button"
            // The label states the action, not the state, so a screen reader
            // announces what will happen rather than what already is.
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            accessibilityState={{ selected: revealed }}
            onPress={() => setRevealed((current) => !current)}
            // The icon's visual box is smaller than the 48dp minimum, so it
            // claims the difference back with hitSlop (UX Foundation §7).
            hitSlop={(MIN_TOUCH_TARGET - iconSize.sm) / 2}
            style={styles.toggle}
            testID={testID ? `${testID}-visibility-toggle` : undefined}
          >
            <MaterialIcons
              name={revealed ? 'visibility-off' : 'visibility'}
              size={iconSize.sm}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      {message ? (
        <AppText
          variant="caption"
          color={hasError ? 'danger' : 'textSecondary'}
          style={styles.message}
          nativeID={messageId}
          accessibilityLiveRegion={hasError ? 'assertive' : 'polite'}
        >
          {message}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.space4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: controlHeight.md,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.space12,
  },
  fieldFocused: {
    borderWidth: 2,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.space12,
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.space8,
  },
  message: {
    marginTop: spacing.space4,
  },
});
