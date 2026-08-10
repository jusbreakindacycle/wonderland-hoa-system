/**
 * Base-4 spacing scale, per docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md §5.3.
 *
 * Each step is named by its own value so it self-documents and never collides
 * with the radius scale's naming.
 */
export const spacing = {
  space4: 4,
  space8: 8,
  space12: 12,
  space16: 16,
  space24: 24,
  space32: 32,
  space48: 48,
  space64: 64,
} as const;

export type SpacingToken = keyof typeof spacing;
