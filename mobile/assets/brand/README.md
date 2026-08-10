# Wonderland brand assets (mobile)

**Status:** `DERIVED` / `PROPOSED` — the *values* are authorised, the *derivation* is not yet
eye-checked on hardware.

## What is authorised

The brand **colour values** are settled and are not open for reinterpretation here:

- `brandPrimary` (maroon) `#752229`
- `brandSecondary` (navy) `#15365A`

Both were measured by pixel-level analysis of the master logo file and authorised by
[DEC-19](../../../docs/DECISION_LOG.md#dec-19). `docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md` §5.1
is their single owner; `mobile/src/theme/colors.ts` transcribes them and is the only file in the
mobile application permitted to hold a raw hex value.

## What is derived, and therefore proposed

The image files in this directory and in `mobile/assets/` were generated from the master, not
drawn or approved as artwork:

| File | Size | Purpose |
|---|---|---|
| `brand/wonderland-logo.png` | 512×512, transparent | runtime mark — `BrandMark`, `LoadingScreen`, login and dashboard headers |
| `../splash-icon.png` | 512×512, transparent | native splash image; the splash background comes from `app.json` (`#FAF9F7`) so the handoff to `LoadingScreen` is invisible |
| `../android-icon-foreground.png` | 1024×1024, transparent | Android adaptive-icon foreground; the mark is inset to 62% so a circular or squircle launcher mask cannot clip it |
| `../icon.png` | 1024×1024, opaque | square app icon, mark at 82% on the `background` token |

**Master:** `docs/ux/brand/wonderland-logo-master.png` (1024×1536 RGBA, 2.2 MB).

The master lives under `docs/`, deliberately **not** under `mobile/assets/`, so it can never be
pulled into the application bundle and counted against the ≤ 60 MB app-size budget
(Requirements §9.3, DEC-08). The four derived files together are ~1.5 MB.

## How they were derived

The master already carried a clean alpha channel; the dark surround visible in some image viewers
is transparency, not baked-in background. No background was reconstructed and no colour was
re-sampled or re-declared. The steps were:

1. locate the mark by its alpha channel — opaque bounding box `(72,307)–(959,1186)`, centre
   `(515.5, 746.5)`, radius `443.5`;
2. crop to a 895×895 square centred on the mark;
3. zero the alpha beyond `radius + 1.5` px, removing the master's faint render glow so the mark
   composites cleanly on the warm off-white canvas;
4. area-average downscale in premultiplied alpha, so transparent pixels cannot bleed colour into
   the antialiased edge;
5. compose onto the per-target canvas above and encode as 8-bit RGBA PNG with adaptive filtering.

The derivation script was a throwaway run from a scratch directory and is intentionally not
committed — it has no second use, and Stage 1 should not carry a build step for four static files.
The recipe above is the reproducible record. Regenerating requires only the master and the five
steps.

## What still needs a human

`docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md` §11 item 3 leaves one visual check open, and this
directory adds a second:

1. `danger` (`#B91C1C`) versus `brandPrimary` (`#752229`) side by side on a real Android panel —
   computed as distinguishable (ΔE 36.8), pending confirmation by eye.
2. These derived assets rendered on a real device at launcher, splash and in-app sizes.

Neither blocks the Stage 1 build. Both should be confirmed during the Gate 12 device test.
