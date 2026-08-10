import { Image, StyleSheet, View } from 'react-native';

import { radius } from '@/theme';

type BrandMarkProps = {
  size?: number;
  testID?: string;
};

/**
 * The association logo mark.
 *
 * Deliberately *not* in `components/ui/`: Guide §9.3 fixes the Stage 1
 * primitive set at exactly seven, and this is not an eighth primitive. It is a
 * single shared placement of the brand asset, so the native splash, the
 * LoadingScreen, the login header and the dashboard header all render the mark
 * identically — the transition between the native splash and the JS
 * LoadingScreen must be invisible (UX Foundation §4 states 1–2, §6).
 *
 * Asset provenance: see mobile/assets/brand/README.md.
 */
export function BrandMark({ size = 96, testID }: BrandMarkProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Image
        source={require('../../../assets/brand/wonderland-logo.png')}
        style={{ width: size, height: size, borderRadius: radius.full }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Wonderland Townhomes Homeowners Association logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
