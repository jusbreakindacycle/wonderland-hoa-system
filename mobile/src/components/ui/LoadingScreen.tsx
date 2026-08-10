import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand/BrandMark';
import { colors, spacing } from '@/theme';

type LoadingScreenProps = {
  /** Announced to a screen reader; not drawn, so the view stays identical to the splash. */
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Full-bleed `background`, centered logo mark, spinner.
 *
 * Its background colour and logo placement are identical to the native Expo
 * splash screen (`app.json` → expo-splash-screen: backgroundColor #FAF9F7,
 * imageWidth 160) so the transition between them is invisible
 * (UX Foundation §4 states 1–2, §6).
 */
export function LoadingScreen({
  accessibilityLabel = 'Loading',
  testID = 'loading-screen',
}: LoadingScreenProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <BrandMark size={160} />
      <ActivityIndicator
        color={colors.brandPrimary}
        style={styles.spinner}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  spinner: {
    marginTop: spacing.space32,
  },
});
