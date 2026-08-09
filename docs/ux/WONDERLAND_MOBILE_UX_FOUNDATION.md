> Subordinate to §9 of the Stage 1 Implementation Guide.
> Where they conflict, §9 wins.

# Wonderland Mobile UX Foundation

**File:** `docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md`
**Stage:** Stage 1 — Mobile Foundation
**Status:** APPROVED — audit and design proposal, approved by the owner; see §11 for the resolution of each item previously marked `PROPOSED_OWNER_DECISION`
**Scope:** design values and UX behavior for the Stage 1 login flow, empty dashboard, and the seven fixed UI primitives. It does **not** define, imply, or prepare any Stage 2/3/4 product surface.
**Governs:** `mobile/src/theme/*`, `mobile/src/components/ui/*` (not yet created)
**Does not govern:** the legacy React/Vite officer web bridge, which is out of scope per Stage 1 Guide §3.3 (S1-D4)

This document defines *what the fixed structure equals*. It does not redefine *what exists* — the primitive set, the semantic colour token names, and the token categories are fixed by §9 of `docs/WONDERLAND_STAGE_1_IMPLEMENTATION_GUIDE.md` and are referenced here by section number, not restated.

---

## Classification key

Every recommendation below carries one tag:

| Tag | Meaning |
|---|---|
| `REQUIRED_BY_STAGE_1` | Necessary to meet the Stage 1 Guide's exit condition; not optional |
| `SAFE_FOUNDATION_RECOMMENDATION` | A derived value or convention within the fixed structure, low-risk, computed rather than eyeballed |
| `PROPOSED_OWNER_DECISION` | A genuine choice point the owner should confirm before this document's status changes from PROPOSED to APPROVED |
| `DEFER_TO_STAGE_2` / `_3` / `_4` | Recorded as a principle now so it isn't rediscovered later; not built in Stage 1 |

---

## 1. Audit of current Stage 1 UX requirements

The Stage 1 Guide's §9 fixes the primitive set (§9.3), the semantic colour token names (§9.2), and the token categories (§9.2). What it leaves open, and what this document exists to close:

- No concrete values for any token category.
- No UX state model tying the auth state machine (Guide §11.5) to actual screen composition.
- No accessibility baseline beyond a goal list (Guide §9.5).
- No content/terminology rule for the login-handle field — label, placeholder, keyboard type, autocapitalisation, error copy — left open by DEC-18 even though DEC-18 settled the underlying identity model.
- No icon library decision — the Guide is silent.
- No typography decision beyond "typed tokens" (Guide §9.2).
- `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` §6.4 states a brand hex (`#8B3A3A`) that was estimated by eye and already conflicts with the measured value used throughout this document (§5.1). This document does not add a third copy of that value — see §10.

---

## 2. Conflicts between UI/UX Pro Max output and Stage 1

UI/UX Pro Max was queried as design intelligence (a "Community/Forum Landing" pattern search, a civic/trustworthy typography search, a React Native stack search, and a civic-government colour search). Its output was treated as input, not authority — repository truth overrides it in every case per the owner's brief.

| Pro Max suggestion | Conflict with Stage 1 | Resolution |
|---|---|---|
| "Community/Forum Landing" pattern — member showcase, join CTA, activity feed | Stage 1 has no feed, no self-registration, no community content of any kind | Rejected outright, not adapted |
| "Accessible & Ethical" style's suggested colour set (`#7C3AED` purple primary) | The fixed measured brand colours override any suggested palette | Palette rejected. Only the *structural* accessibility guidance from that style entry (contrast targets, focus rings, touch target sizing) was kept |
| Material Design 3 Roboto/Roboto pairing | Not wrong, but generic — carries a stock-Android-admin-template feel rather than the "civic trust, not a government portal" personality specified | Adapted, not adopted as-is: system font retained for body text (zero load cost, guaranteed correct rendering of Filipino names), a distinct accessibility-oriented display face proposed for headings only — see §5.2 |
| Government-portal colour palettes (`#1E40AF`, `#0F172A` navy/blue families) | Not a conflict — these validate that a navy-led secondary reads as civic/trustworthy | Used only as validation that the direction is sound; the actual hex values are the fixed measured ones (§5.1), not Pro Max's suggestions |
| Default icon library recommendation (Phosphor) | Phosphor would be a new dependency; Expo already ships `@expo/vector-icons` at zero marginal install cost | Deviated from the tool's default: `@expo/vector-icons` recommended instead — still vector/SVG, still no emoji, smaller footprint |

---

## 3. Proposed Stage 1 design direction

**"Quiet civic trust."**

Maroon (`brandPrimary`) is the single dominant brand accent — used sparingly, for primary actions, the brand header, and focus indication. It is not painted across large surfaces. Navy (`brandSecondary`) is the secondary/informational accent — secondary actions, links, the `info` state. Structure comes from a warm-neutral canvas and a visible-but-not-heavy border system, not from colour-blocking or drop shadow. No gradients, no glass, no stacked-shadow "card soup." Restraint is the personality, not starkness: a warm off-white background rather than clinical pure white, and a rounding language (8/10/16dp) that reads as approachable without being playful.

`SAFE_FOUNDATION_RECOMMENDATION`

---

## 4. Proposed UX state model

The Stage 1 Guide's `AuthStatus` type (§11.5: `booting | signedOut | signingIn | signedIn | accountUnavailable | recoverableError`) maps to the nine states in Stage 1's UX scope as follows:

| # | State | `AuthStatus` | Composition (primitives, §9.3 of the Guide) | Primary action | Copy |
|---|---|---|---|---|---|
| 1 | Branded launch | `booting` (native splash, pre-JS) | Native splash screen: `background` token + centered logo mark only | none | — |
| 2 | Auth bootstrap loading | `booting` (JS-rendered) | `LoadingScreen` — same background/logo position as the native splash, so bootstrap never flashes (Guide §8.2) | none | — |
| 3 | Login + validation/error/submitting | `signedOut` / `signingIn` | `AppScreen` (scroll + keyboard-avoiding) → brand header → `AppText` title → `AppTextField` × 2 → `InlineAlert` (danger, only on failure) → `AppButton` (primary, loading state while submitting) → `AppText`/tertiary link | Log In | "Invalid username or password." (generic, per Guide §10.6) |
| 4 | Account-unavailable | `accountUnavailable` | `AppScreen` → `InlineAlert` (warning) → explanation → `AppButton` (secondary, Sign Out) | Sign Out | "Your account isn't active yet. Contact the HOA office to activate it." |
| 5 | Recoverable network/verification error | `recoverableError` | `AppScreen` → `InlineAlert` (warning) → `AppButton` (primary, Retry) | Retry | "Can't reach the HOA server right now. Check your connection and try again." |
| 6 | Empty authenticated dashboard | `signedIn` | `AppScreen` → brand header → `AppText` (greeting with display name) → `AppCard` (empty-state message) → `AppButton` (secondary, Sign Out) | — | "Mobile foundation ready. Property, dues, payment and community modules will be connected in later stages." (verbatim, Guide §12) |
| 7 | Sign-out | `signedIn` → `signedOut` | No confirmation dialog | — | — |

**Semantic convention (content rule, not a new token):** `warning` communicates something transient or not the resident's fault (a network hiccup, an account not yet activated). `danger` communicates a definitive failure (wrong credentials). This distinction governs which of the five fixed `InlineAlert` variants applies to each state — it does not add a sixth.

**Sign-out has no confirmation dialog.** Signing out is not a destructive, data-losing action — it is reversible by logging back in — so it does not need the confirmation pattern reserved for irreversible actions.

`REQUIRED_BY_STAGE_1` (the state-to-screen mapping) / `SAFE_FOUNDATION_RECOMMENDATION` (the warning-vs-danger convention; the no-confirmation call on sign-out)

---

## 5. Proposed concrete token values

Every contrast ratio below was computed using the WCAG relative-luminance formula, not estimated by eye — consistent with how the brand colours themselves were derived.

### 5.1 Colors

| Token (name fixed by Guide §9.2) | Value | Verified contrast | Note |
|---|---|---|---|
| `background` | `#FAF9F7` | — | Warm off-white, not clinical white |
| `surface` | `#FFFFFF` | 1.05:1 vs `background` | Card/content default. The near-identical value to `background` is deliberate — card definition comes from `border` and minimal elevation, not from background contrast, to avoid a "card soup" look |
| `surfaceElevated` | `#F5F2EE` | 1.12:1 vs `surface` | Reserved for future modal/sheet surfaces; not used by any Stage 1 screen |
| `textPrimary` | `#221B1A` | 16.9:1 on `surface`, 16.1:1 on `background` | Warm near-black; far exceeds AAA |
| `textSecondary` | `#5B5450` | 7.4:1 on `surface`, 7.1:1 on `background` | Deliberately AAA-level rather than the usual AA-minimum for secondary text, given the "usable by older residents" requirement |
| `border` | `#968C80` | 3.30:1 vs white | Meets the WCAG 1.4.11 non-text 3:1 requirement for essential UI boundaries (e.g. `AppTextField` outlines). One token value only — decorative dividers that don't need to meet 1.4.11 may render this same token at reduced opacity at the component level rather than introducing a second border token |
| `brandPrimary` | `#752229` | 10.41:1 on white | Owner-measured from the logo file, not proposed |
| `brandSecondary` | `#15365A` | 12.30:1 on white | Owner-measured from the logo file, not proposed |
| `success` | `#15803D` | 5.02:1 on white | |
| `warning` | `#B45309` | 5.02:1 on white | |
| `danger` | `#B91C1C` | 6.47:1 on white | Chosen over the more common `#DC2626` (4.83:1) for contrast margin and for greater luminance/hue separation from `brandPrimary` — see the flag below |
| `info` | `#0369A1` | 5.93:1 on white | |
| `disabled` | `#A39C95` | non-text (control chrome only) | |

**Open flag, `PROPOSED_OWNER_DECISION`:** `brandPrimary` (#752229) and `danger` (#B91C1C) are both in the red family. They are computed as distinguishable — different luminance, `danger` more saturated and brighter, `brandPrimary` a muted brick tone — but this should be confirmed by eye, side by side, on an actual Android panel before this document's status moves from PROPOSED to APPROVED. This is independently mitigated by the accessibility rule in §7 that danger is never conveyed by colour alone.

### 5.2 Typography — `DECIDED`: system font throughout

**Owner decision:** system font throughout. Lexend is **declined**. The discussion below is retained as a record of why Lexend was considered, not as a live proposal.

Considered: headings/display in **Lexend** (a Google Font engineered around reading-proficiency research — a deliberate fit for "usable by older residents" and "civic trust"); body, labels, and UI text in the **system default** (Roboto on Android) — zero load cost, zero bundle-size risk, guaranteed correct rendering of Filipino names including `ñ`, and consistent with the cold-launch ≤ 4.0s budget already fixed in Requirements §9.3.

**Resolution:** system font everywhere, per the document's own stated fallback in this section. Nothing else in this document depends on Lexend being adopted.

Type scale (sp; all sizes scale with the system font-size setting and are never capped without a stated, specific reason):

| Role | Size / weight | Used for |
|---|---|---|
| Display | 28 / 600 (system) | Brand header, splash wordmark |
| Title | 20 / 600 | Screen titles ("Log In"), dashboard greeting |
| Body | 16 / 400 (system) | Default text, field values — meets the 16px mobile-readability minimum |
| Label | 15 / 500 (system) | Field labels, button text |
| Caption | 13 / 400 (system) | Helper/error text — a floor, never smaller |

### 5.3 Spacing — `SAFE_FOUNDATION_RECOMMENDATION`

Base-4 scale, named by its own value so it self-documents and never collides with the radius scale's naming:

`space-4 · space-8 · space-12 · space-16 · space-24 · space-32 · space-48 · space-64`

Default screen padding: `space-16`–`space-24`. Field-to-field gap: `space-16`. Section gap: `space-32` or larger.

### 5.4 Radius — `SAFE_FOUNDATION_RECOMMENDATION`

`radius-sm` (8) — reserved for future chips/badges, unused in Stage 1
`radius-md` (10) — buttons, text fields, `InlineAlert`
`radius-lg` (16) — cards
`radius-full` (999) — circular logo/avatar container

### 5.5 Elevation / shadow — `SAFE_FOUNDATION_RECOMMENDATION`

Deliberately minimal, in keeping with "no glassmorphism" and "modern but not luxurious":

`elevation-none` — flat + border; the default for every Stage 1 surface, including cards
`elevation-low` — Android `elevation` 2, very subtle; defined but unused by any Stage 1 screen
`elevation-medium` — reserved for future modal/sheet surfaces; not used in Stage 1

### 5.6 Control heights — `SAFE_FOUNDATION_RECOMMENDATION`

`control-sm` (40dp) — compact, unused in Stage 1
`control-md` (48dp) — default; meets Android's 48dp minimum touch target; buttons and text fields
`control-lg` (56dp) — primary CTA emphasis ("Log In")

### 5.7 Icon sizes — `SAFE_FOUNDATION_RECOMMENDATION`

`icon-16` — inline with caption text
`icon-20` — inline with body text (e.g. the password-visibility toggle)
`icon-24` — standard control icons
`icon-32` — `InlineAlert` leading icon
`icon-48` — account-unavailable / recoverable-error state mark

---

## 6. Proposed specifications for the seven fixed primitives

The primitive names below are fixed by Guide §9.3 and are not restated as a list here beyond what's needed to specify each one.

- **AppScreen** — safe-area wrapper (`react-native-safe-area-context`, included in the Expo default template) over the `background` token. Two variants: static, and scroll-plus-keyboard-avoiding (used by the login screen so fields are never obscured by the on-screen keyboard).
- **AppText** — a `variant` prop (`display / title / body / label / caption`, mapped to §5.2) and a `color` prop restricted to the fixed semantic tokens only — never a raw hex passed at the call site. `allowFontScaling` on by default and uncapped, so long Filipino names and large system font sizes wrap onto a second line rather than clip or truncate.
- **AppButton** — variants `primary` (filled `brandPrimary`, white label — the one primary action per screen), `secondary` (outlined `brandSecondary` — used for Sign Out and Retry), `tertiary` (text-only, low-emphasis — e.g. "Contact the HOA..."). A `destructive` variant exists in the type for future use but is not exercised by any Stage 1 screen, since no destructive action exists yet. Heights per §5.6. Disabled state uses the `disabled` token. Loading state replaces the label with a spinner and disables re-submission.
- **AppTextField** — an always-visible label (never placeholder-only), a helper/error text slot wired to an accessibility live region, and a password-visibility toggle with an accessible label. Border uses the `border` token by default, `danger` on a validation error, `brandPrimary` on focus. For the login-handle field specifically: default text keyboard (not the email keyboard type — a login handle has no `@`); `autoCapitalize="none"` (handles are always lowercase per DEC-18); `autoCorrect={false}`; an `autoComplete`/`textContentType` hint of `username` (enables password-manager autofill without implying email semantics); a placeholder showing a real handle shape (`e.g. 115.sampaguita`), not a name or email shape; helper text reading "This is the login ID issued by the HOA — not your name."
- **AppCard** — `surface` background, `border`, `radius-lg`, `elevation-none` by default. Used minimally in Stage 1 (the dashboard's empty-state block).
- **InlineAlert** — a `variant` prop restricted to exactly the five fixed semantic tokens (`success / warning / danger / info / neutral`, per Guide §9.2). Colour is always paired with an icon and text — never the sole carrier of meaning. `accessibilityLiveRegion="assertive"` for `danger`, `"polite"` for `warning`/`info`. Stage 1 exercises only `warning` and `danger`; `success`, `info`, and `neutral` are specified but unused this stage.
- **LoadingScreen** — full-bleed `background`, centered logo mark, spinner. Its background colour and logo placement are identical to the native Expo splash screen so the transition between them is invisible.

`REQUIRED_BY_STAGE_1` for the shape/props needed to build the nine states in §4; the visual values feeding each are per §5.

---

## 7. Proposed accessibility baseline

- A screen-reader label on every interactive control.
- Focus order matches visual order; after a failed form submission, focus moves to the first invalid field.
- Colour never carries meaning alone — every `success`/`warning`/`danger`/`info` use pairs an icon and text with the colour.
- 48dp minimum touch target with 8dp minimum spacing between targets; `hitSlop` applied to any icon whose visual size is smaller than 48dp.
- Visible press/focus feedback within roughly 100ms of a tap.
- Text scaling is uncapped by default; a cap is applied only with an explicit, stated reason — none identified for Stage 1.
- Reduced-motion is respected (`AccessibilityInfo.isReduceMotionEnabled`) — Stage 1's motion is already minimal by design (§3), so this mainly means not adding any.
- Safe areas are respected on every screen.
- Errors are stated in plain language with a recovery path (Retry, or Contact the HOA) — never raw technical detail.

`REQUIRED_BY_STAGE_1`

---

## 8. Proposed content-language conventions

**English-only for Stage 1 UI copy** — `DECIDED`: confirmed by the owner. The Requirements document's own receipt and announcement examples are all in English. Filipino/Taglish localisation is revisited at Stage 3, not decided now either way.

- "the HOA" is the consistent resident-facing term for the association — shorter and warmer than "the association," and matches how the organisation refers to itself on its own Facebook presence.
- Errors are plain, non-technical, carry no blame, and always state a next step.
- Never say "Welcome" alone — state the actual condition instead ("You're signed in."), per Guide §12.
- No emoji as functional icons (already fixed by the personality brief) — copy stays plain text throughout.

---

## 9. Future-readiness principles (documented, not built)

- **Numeric/peso formatting** — `DEFER_TO_STAGE_3`. ₱-prefixed, thousands-separated, two decimals, tabular/monospaced figures for any amount column, `en-PH` locale. A principle only; no component exists to apply it to yet.
- **Status communication** — `DEFER_TO_STAGE_3` / `DEFER_TO_STAGE_4`. Distinctions such as submitted≠verified or pending≠paid must be expressed through the five fixed semantic tokens plus label text — never through new domain-specific tokens (e.g. `paymentVerified`, `duesOverdue`) and never through a new component invented ahead of the domain it would represent. No status badge/chip/pill component is specified in this document.

---

## 10. Resolving the §6.4 brand-colour duplication

`docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` §6.4 currently states `#8B3A3A` for maroon, estimated by eye. This document's §5.1 states the measured `#752229`. Two live values for the same fact is itself a defect, and this document does not add a third.

**Recommendation, not yet actioned:** this document (`docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md`, §5.1) becomes the single owner of brand-colour *values*. Requirements §6.4 should be amended to strike the `#8B3A3A` clause, mark it `SUPERSEDED`, and cross-reference a new Decision Log entry — following the exact pattern already used for the DEC-18 correction to Requirements §4.1. That amendment is **not made by this document**; per Requirements §11.3, amendments happen through `docs/DECISION_LOG.md`, and the owner authorises that entry separately (see §11 below).

This recommendation is now authorised as [DEC-19](../DECISION_LOG.md#dec-19). The corresponding Requirements §6.4 correction has been applied separately, outside this task.

---

## 11. Decisions requiring owner approval

1. **Resolved:** system font throughout. Lexend declined (§5.2).
2. **Resolved:** English-only Stage 1 copy, confirmed. Filipino/Taglish localisation is revisited at Stage 3, not decided now either way (§8).
3. **Computed and independently verified; physical device confirmation pending post-Stage-1-build, non-blocking.** `danger` vs `brandPrimary` are computed as distinguishable (deltaE 36.8, independently verified) — different luminance, `danger` more saturated and brighter, `brandPrimary` a muted brick tone. The owner confirms this by eye on an actual Android device once Stage 1 is built and running; this is not a blocker to this document's approval (§5.1 flag).
4. **Resolved:** authorised as [DEC-19](../DECISION_LOG.md#dec-19), recording the measured brand values and naming this document as the owner of brand-colour values. The corresponding Requirements §6.4 correction has been applied outside this task (§10).

## 12. Deliberately undecided until Stage 2/3/4

Bottom-tab/information-architecture structure; status badge/chip component; ledger/dues row layout; receipt visual template; peso-amount component treatment; any domain-specific colour token; push-notification visual treatment; the real-world usage of the `destructive` button variant (no destructive action exists yet to design it against).

---

*End of document.*
