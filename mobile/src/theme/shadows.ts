import type { ViewStyle } from 'react-native';

/**
 * Elevation scale, per docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md §5.5.
 *
 * Deliberately minimal: "no glassmorphism", "no card soup". Every Stage 1
 * surface uses `none` — a flat surface with a visible border. The other two
 * steps are defined so later stages do not invent ad-hoc shadow values, and
 * are not exercised by any Stage 1 screen.
 */
export const shadows = {
  none: { elevation: 0 },
  low: { elevation: 2 },
  medium: { elevation: 6 },
} as const satisfies Record<string, ViewStyle>;

export type ShadowToken = keyof typeof shadows;
