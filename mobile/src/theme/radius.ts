/**
 * Corner radius scale, per docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md §5.4.
 */
export const radius = {
  /** Reserved for future chips/badges. Unused in Stage 1. */
  sm: 8,
  /** Buttons, text fields, InlineAlert. */
  md: 10,
  /** Cards. */
  lg: 16,
  /** Circular logo/avatar container. */
  full: 999,
} as const;

export type RadiusToken = keyof typeof radius;
