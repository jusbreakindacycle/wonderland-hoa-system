import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type ColorToken, type TypographyVariant } from '@/theme';

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  /**
   * Restricted to the semantic colour tokens. A raw hex can never be passed at
   * a call site (UX Foundation §6).
   */
  color?: ColorToken;
  style?: TextStyle | TextStyle[];
};

/**
 * `allowFontScaling` is on and uncapped, so long Filipino names and large
 * system font sizes wrap onto a second line rather than clip or truncate
 * (UX Foundation §6, §7).
 */
export function AppText({
  variant = 'body',
  color = 'textPrimary',
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      allowFontScaling
      style={[styles[variant], { color: colors[color] }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  display: typography.display,
  title: typography.title,
  body: typography.body,
  label: typography.label,
  caption: typography.caption,
});
