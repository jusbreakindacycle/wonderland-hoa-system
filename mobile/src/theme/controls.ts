/**
 * Control heights (§5.6) and icon sizes (§5.7) of
 * docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md.
 *
 * These are the two remaining token categories required by Stage 1
 * Implementation Guide §9.2 beyond colour, typography, spacing, radius and
 * elevation.
 */

export const controlHeight = {
  /** Compact. Unused in Stage 1. */
  sm: 40,
  /** Default. Meets Android's 48dp minimum touch target. */
  md: 48,
  /** Primary CTA emphasis ("Log In"). */
  lg: 56,
} as const;

export type ControlHeightToken = keyof typeof controlHeight;

export const iconSize = {
  /** Inline with caption text. */
  xs: 16,
  /** Inline with body text (e.g. the password-visibility toggle). */
  sm: 20,
  /** Standard control icons. */
  md: 24,
  /** InlineAlert leading icon. */
  lg: 32,
  /** Account-unavailable / recoverable-error state mark. */
  xl: 48,
} as const;

export type IconSizeToken = keyof typeof iconSize;

/**
 * Minimum touch target, per §7. Any control whose visual box is smaller than
 * this must claim the difference back with `hitSlop`.
 */
export const MIN_TOUCH_TARGET = 48;
