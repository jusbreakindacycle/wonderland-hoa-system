/**
 * The Wonderland mobile design system.
 *
 * Structure fixed by Stage 1 Implementation Guide §9.2; values fixed by
 * docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md §5, which is subordinate to §9 of
 * the guide and, per DEC-19, owns the brand-colour values.
 *
 * Screens and primitives import from here, never from a raw hex.
 */
export { colors, type ColorToken } from './colors';
export { typography, type TypographyVariant } from './typography';
export { spacing, type SpacingToken } from './spacing';
export { radius, type RadiusToken } from './radius';
export { shadows, type ShadowToken } from './shadows';
export {
  controlHeight,
  type ControlHeightToken,
  iconSize,
  type IconSizeToken,
  MIN_TOUCH_TARGET,
} from './controls';
