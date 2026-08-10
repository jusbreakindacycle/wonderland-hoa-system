import type { TextStyle } from 'react-native';

/**
 * Type scale, per docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md §5.2.
 *
 * System font throughout — Lexend was considered and declined by the owner.
 * Sizes are in sp and scale with the system font-size setting; nothing here is
 * capped, per §7 ("a cap is applied only with an explicit, stated reason —
 * none identified for Stage 1").
 */
export const typography = {
  display: { fontSize: 28, fontWeight: '600', lineHeight: 34 },
  title: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  label: { fontSize: 15, fontWeight: '500', lineHeight: 20 },
  /** Helper and error text. A floor — never rendered smaller than this. */
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
