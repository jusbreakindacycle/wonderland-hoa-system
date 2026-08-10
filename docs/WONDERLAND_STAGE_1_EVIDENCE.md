# Stage 1 — Mobile Foundation: Implementation Evidence

**File:** `docs/WONDERLAND_STAGE_1_EVIDENCE.md`
**Stage:** Stage 1 — Mobile Foundation
**Branch:** `feat/stage-1-mobile-foundation`
**Date:** 10 August 2026
**Governing documents:** `docs/DECISION_LOG.md` > `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` > `docs/WONDERLAND_STAGE_1_IMPLEMENTATION_GUIDE.md`
**Subordinate design authority:** `docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md` (subordinate to Guide §9)

This document records what was verified, how, and what remains human-gated. It states outcomes,
not intentions. Every unchecked item below is genuinely unmet, not merely undocumented.

---

## 1. Baseline (Gate 0)

Verified on `main` @ `c571d03` before any change:

| Check | Result |
|---|---|
| Working tree clean | Only two untracked files: `docs/WONDERLAND_TASK_AUTOMATIC_DUES.md`, `wonderland_logo.png` |
| `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` present | Yes (PR #8, `2fccc8a`) |
| `docs/DECISION_LOG.md` present | Yes, DEC-01…DEC-19 |
| Stage 0 migrations present | `20260807050836_stage0_containment_secure_definer_functions.sql`, `20260807160901_reinstate_automatic_monthly_dues_generation.sql` |
| Root web typecheck / lint / tests | Green — 9 tests passing |
| Node / npm | v24.18.0 / 11.14.1 |
| `public.profiles` columns | `id, full_name, role, position_label, is_active, created_at` — **no `username` column**, exactly as Guide §10.1 assumes |
| `profiles: read own` RLS policy | Already exists (`id = auth.uid()`) — the mobile profile read needs no schema or policy change |
| `role` CHECK constraint | Already permits `resident` |
| Expo SDK currency | `expo@57.0.11` and `expo-template-default@57.0.13` are npm `latest`, so Guide §6.2's `--template default@sdk-57` was current and used unchanged |

Local environment lacks Java and the Android SDK, which is why every native and device step is
human-gated (§5).

---

## 2. What was built

### Repository shape

The React/Vite officer bridge is untouched and the Expo application sits beside it. Diff against
`main`, excluding the new `mobile/` tree:

```
.github/workflows/ci.yml   two independent jobs replace one
README.md                  transitional dual-client layout + mobile setup
docs/DECISION_LOG.md       DEC-20, DEC-21
eslint.config.js           `mobile/**` added to ignores
.gitignore                 `.stage1-expo-seed/`, `mobile/dist-ci/`
```

**Zero files under `src/` or `supabase/` were modified.** The single root code change is one entry
in an ESLint `ignores` array, needed because root `eslint .` otherwise walks into `mobile/` and
reports on Expo's config files under rules written for the browser bundle. That is a compatibility
fix to keep the bridge's own checks green, permitted by Guide §3.3 and DEC-20.

### Mobile application

- Expo SDK 57 scaffolded into `.stage1-expo-seed`, reviewed, copied to `mobile/`, seed deleted.
- Expo Router with two groups: `(auth)/login` and `(app)/index`. No tabs (Guide §7.2).
- Typed design tokens in `mobile/src/theme/` — colours, typography, spacing, radius, elevation,
  control heights, icon sizes. Values transcribed from UX Foundation §5.1–5.7. `colors.ts` is the
  only file permitted to hold a raw hex.
- Exactly the seven fixed primitives in `mobile/src/components/ui/`. `BrandMark` is deliberately
  filed under `components/brand/`, not `components/ui/`, so the primitive set stays at seven.
- Username auth adapter: `normalizeUsername`, `usernameToInternalAuthEmail`, `signInWithUsername`,
  `signOut`. No `signUp` export exists anywhere in the mobile client.
- Encrypted session storage: AES key in `expo-secure-store`, ciphertext in AsyncStorage.
- One Supabase client, one auth subscription, one `AppState` listener.
- Empty dashboard with the verbatim Guide §12 empty-state sentence.

### Brand assets

The master `wonderland_logo.png` already carried a clean alpha channel — the dark surround visible
in some viewers is transparency, not a baked-in background. Four assets were derived from it by
alpha-bounded crop, circle-bounded alpha clear, and premultiplied area-average downscale. The
2.2 MB master was moved to `docs/ux/brand/wonderland-logo-master.png`, outside `mobile/assets/`, so
it can never enter the bundle. Provenance and the regeneration recipe are in
`mobile/assets/brand/README.md`.

Derived assets total ~1.5 MB. They are marked `DERIVED` / `PROPOSED` pending an eye-check on
hardware (§5.4).

---

## 3. Verification performed locally

All commands run on this machine on 10 August 2026.

### Legacy web bridge — all green

| Command | Result |
|---|---|
| `npm ci` / `npm install` | Passes |
| `npm run typecheck` | Passes |
| `npm run lint` | Passes, 0 problems |
| `npm run test:run` | 2 files, **9 tests passing** — identical to the pre-Stage-1 baseline |
| `npm run build` | Passes (`✓ built in 1m 20s`) |
| `npm run dev` | Serves; `/`, `/src/main.tsx`, `/src/App.tsx` all HTTP 200; `/dashboard`, `/units`, `/dues`, `/payments`, `/audit` all HTTP 200 through the SPA fallback |

No officer workflow was removed or altered. Since no file under `src/` changed, the route table is
provably the same one that shipped on `main`.

### Mobile — all green

| Command | Result |
|---|---|
| `npm install` | Passes; `mobile/package-lock.json` committed |
| `npx tsc --noEmit` | Passes, 0 errors |
| `npx expo lint` | Passes, 0 problems |
| `npx jest --ci --runInBand` | **5 suites, 70 tests passing** |
| `npx expo export --platform android` | Passes — Android Hermes bundle 3.5 MB |
| `npx expo-doctor@latest` | 19 of 20 checks pass. The one failure is the remote **Expo config schema** check, which needs a live connection to the Expo API and failed with `Client network socket disconnected before secure TLS connection was established` on two attempts. This is a network condition on this machine, not a project defect; it should pass in CI. |

### Test coverage against Guide §13.1

| Required area | Covered |
|---|---|
| Username utility — trims, lowercases, accepts valid, rejects blank, rejects disallowed characters, generates the alias, does not double-append | Yes, 20 cases including all three DEC-18 canonical examples |
| Auth service — alias not handle passed to Supabase, generic error, password never stored, sign-out exposed | Yes, 9 cases; the password-persistence test asserts nothing containing the password reached AsyncStorage or SecureStore |
| Session bootstrap — no session, active profile, missing profile, inactive profile, sign-out, no protected-screen flash | Yes, 13 cases; the flash test holds the profile read open and asserts the status is still `booting` |
| Navigation — unauthenticated redirect, no lingering on login after sign-in, no back-navigation after sign-out | Yes, 6 cases against the real `mobile/app` tree via `expo-router/testing-library` |
| UI — accessible labels, secure text entry, duplicate-submit prevention, accessible error, dashboard without domain data | Yes, 16 cases |

Recoverable-versus-terminal failure handling is tested explicitly: a transport failure during
session verification produces `recoverableError` and asserts `signOut` was **not** called, while a
401 produces `signedOut`.

### Security posture (Guide §17)

| Requirement | Status |
|---|---|
| Publishable key only in client | `sb_publishable_…`; the legacy anon JWT is not used |
| No service-role key anywhere | Verified — `mobile/.env` is git-ignored and holds only the three `EXPO_PUBLIC_*` values |
| No password persistence | Asserted by test |
| No token logging | No logging of credentials, tokens, or the internal alias anywhere in `mobile/src` |
| No public sign-up | No `signUp` export; asserted by test |
| Generic login failure message | Single string for every failure mode; asserted by test |
| Secure persisted session storage | AES-encrypted, key in SecureStore |
| Active profile required | Enforced in `AuthProvider`; asserted by test |
| Protected routes inaccessible when signed out | `Stack.Protected` removes the group from navigation state; asserted by test |
| No new `SECURITY DEFINER` function, no schema change | Zero changes under `supabase/` |
| Legacy dues Edge Function not deployed | Untouched |

---

## 4. Scope integrity

Confirmed absent from this branch: any `street` migration or `house_no` uniqueness change; any
change to `generate_monthly_dues`, its pg_cron schedule, payment allocation, credits, dues amounts
or due dates; any financial RPC call from mobile; any ported web screen; any npm workspace,
Turborepo or Nx layout; mobile tabs; iOS release work; push notifications; announcements, permits,
bookings or knowledge base; any removal of an officer web capability; any legacy-web cutover.

`docs/WONDERLAND_TASK_AUTOMATIC_DUES.md` was already untracked on `main` and was left untouched —
it is not Stage 1 work.

---

## 5. Human gates — NOT met by this branch

These cannot be completed from this machine and are not claimed as done.

### 5.1 Test account provisioning (Guide §10.8)

No account using the `@auth.wonderland.invalid` alias exists yet. The database currently holds
three auth users (`admin@wonderland.ph`, `pres@wonderland.ph`, `test.resident@wonderland.ph`), none
of which uses the login-handle convention. Creating one requires service-role or dashboard access;
this session had read-only database access.

Required, through trusted administrative tooling:

1. an auth user with email `115.sampaguita@auth.wonderland.invalid`, email confirmation forced, and
   a known password;
2. a `public.profiles` row with that user's id, a real `full_name`, `role = 'resident'`,
   `is_active = true`;
3. a second account with `is_active = false`, for acceptance Scenario D.

Neither account is production data and both should be reviewed before deletion, per Guide §23.

### 5.2 EAS build (Guide §15.13)

Not run. Requires an interactive Expo login, which an agent must not attempt (Guide §14.3).

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

`mobile/eas.json` already defines `development`, `preview` and `production`. The `development`
profile expects a development client — run `npx expo install expo-dev-client` first if using it.
The application id is settled (DEC-21), so this build may be treated as the long-term identity.

### 5.3 Device acceptance, Scenarios A–H (Guide §19)

Not run. No Java, no Android SDK, no device. Scenario G (dual-client CI) is the only one covered
locally, and only in the sense that every command CI runs has been run here and passes.

Scenarios A–F and H all require the test account from §5.1 and the build from §5.2.

### 5.4 Two visual confirmations

Both are non-blocking and both belong in the same device session:

1. `danger` (`#B91C1C`) beside `brandPrimary` (`#752229`) on a real Android panel — computed as
   distinguishable at ΔE 36.8, per UX Foundation §11 item 3.
2. The derived brand assets at launcher, splash and in-app sizes, per
   `mobile/assets/brand/README.md`.

### 5.5 `EXPO_TOKEN`

Not created. Only needed if the optional `workflow_dispatch` EAS trigger in Guide §14.6 is wanted
later. It belongs solely in GitHub Actions secrets — never in `.env`, source, or an `EXPO_PUBLIC_*`
variable.

---

## 6. Decisions recorded by this work

| ID | Decision |
|---|---|
| [DEC-20](DECISION_LOG.md#dec-20) | S1-D4 transitional legacy web operations bridge, with its five-part retirement gate; and no resident self-registration |
| [DEC-21](DECISION_LOG.md#dec-21) | Android application id `ph.wonderlandtownhomes.hoa`, closing S1-D2 |

**S1-D3 — officer-assisted account recovery — remains open.** Stage 1 ships only a "Contact the
HOA office" message on the login screen, which Guide §10.9 permits for this stage. A complete
recovery procedure is required before resident pilot or production rollout.

No requirement was silently amended. `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` and
`docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md` were not edited by this work.

---

## 7. Notes for the next implementer

Three things cost time here and are worth knowing:

- **`@testing-library/react-native` v14 made `render` asynchronous.** `expo-router`'s testing
  utilities are typed against the synchronous v13 API, and expo-router 57 declares
  `>= 13.2.0`. The suite is pinned to `13.3.3` with `react-test-renderer@19.2.3` — the latter is
  needed explicitly, because npm otherwise resolves `19.2.8`, which peer-requires a React newer
  than the `19.2.3` that React Native 0.86.2 pins.
- **Pruning `react-dom` and `react-native-web` from the mobile manifest breaks the install.**
  They are optional peers of `expo-router`, but `vaul` (a transitive web dependency of
  expo-router) hard-requires `react-dom`. They are retained as part of the coherent generated
  baseline, per Guide §6.2.
- **Import icons from `@expo/vector-icons/MaterialIcons`, not the package root.** The barrel pulls
  every icon font into the bundle; the direct import dropped roughly 2 MB of TTF from the Android
  export.
