/**
 * Semantic colour tokens.
 *
 * Token *names* are fixed by Stage 1 Implementation Guide §9.2.
 * Token *values* are fixed by docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md §5.1,
 * which DEC-19 makes the single owner of brand-colour values.
 *
 * This file is the only place in the mobile application permitted to contain a
 * raw hex value (Guide §9.2: "Do not scatter raw hex values throughout screens").
 *
 * Stage 1 ships a single light palette. The UX Foundation defines no dark-mode
 * values, so `app.json` pins `userInterfaceStyle: "light"` rather than letting
 * the system pick an undefined palette.
 */
export const colors = {
  /** Warm off-white canvas, not clinical white. */
  background: '#FAF9F7',
  /** Card/content default. Definition comes from `border`, not from contrast with `background`. */
  surface: '#FFFFFF',
  /** Reserved for future modal/sheet surfaces. Unused by any Stage 1 screen. */
  surfaceElevated: '#F5F2EE',
  /** Warm near-black. 16.9:1 on `surface`, 16.1:1 on `background`. */
  textPrimary: '#221B1A',
  /** AAA-level rather than AA-minimum, per the "usable by older residents" requirement. */
  textSecondary: '#5B5450',
  /** 3.30:1 vs white — meets WCAG 1.4.11 for essential non-text UI boundaries. */
  border: '#968C80',
  /** Measured from the logo file (DEC-19). 10.41:1 on white. */
  brandPrimary: '#752229',
  /** Measured from the logo file (DEC-19). 12.30:1 on white. */
  brandSecondary: '#15365A',
  success: '#15803D',
  warning: '#B45309',
  /** Chosen over #DC2626 for contrast margin and hue separation from `brandPrimary`. */
  danger: '#B91C1C',
  info: '#0369A1',
  /** Control chrome only; never used to carry text meaning. */
  disabled: '#A39C95',
  /** Label colour on a filled `brandPrimary` surface. */
  onBrand: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;
