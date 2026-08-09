# Wonderland HOA System — Stage 1 Implementation Guide

**File:** `docs/WONDERLAND_STAGE_1_IMPLEMENTATION_GUIDE.md`  
**Stage:** Stage 1 — Mobile Foundation  
**Status:** REVISED DRAFT FOR OWNER APPROVAL — supersedes the earlier Stage 1 draft that would have removed the Vite web application  
**Target platform:** Android-first mobile application  
**Primary stack:** React Native + Expo + TypeScript + Expo Router + Supabase  
**Repository:** `jusbreakindacycle/wonderland-hoa-system`  
**Supabase development project:** `fgsehrblzpheeghplice`  
**Authoritative requirements:** `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md`  
**Decision authority:** `docs/DECISION_LOG.md`

---

## 1. Purpose

Stage 1 re-founds Wonderland HOA System as a real mobile application without changing the HOA domain model.

The existing repository currently contains a React + Vite web application that already provides internal HOA operating screens. Stage 1 adds a new Android-first React Native + Expo mobile application **alongside** that web application while preserving repository history, documentation, Supabase migrations, and already-completed Stage 0 database/security work.

The existing web application is retained temporarily as an **internal officer operations bridge**. It is not a second target product and does not reverse the mobile-only product decision. It remains runnable until the mobile application has verified operational parity for the officer workflows still needed to run the HOA and an explicit cutover decision authorises retirement.

Stage 1 is deliberately narrow.

It establishes:

1. the Expo/React Native application foundation;
2. Android-first local development and EAS build configuration;
3. Expo Router navigation;
4. a small mobile design system based on the Wonderland brand;
5. username-based resident login;
6. secure mobile session persistence and route protection;
7. a correct authenticated dashboard shell;
8. mobile-appropriate tests and continuous integration.

It does **not** implement the Stage 2 property/person/occupancy model, financial workflows, payments, receipts, announcements, permits, bookings, or other later-stage capabilities.

### 1.1 Stage 1 exit condition

Stage 1 is complete when all of the following are true:

- the mobile application under `mobile/` boots as an Expo React Native application;
- the Android app can be installed and opened on a real Android device or Android emulator;
- an authorised test homeowner can enter a **username and password** rather than an email address;
- the app authenticates that user through Supabase;
- the session survives app restart;
- an unauthenticated user cannot open protected routes;
- signing out clears the local session and returns to the login screen;
- the signed-in homeowner sees a branded but intentionally minimal dashboard;
- the dashboard does not expose invented Stage 2/3/4 data;
- the mobile CI pipeline passes;
- at least one Android EAS development or preview build succeeds;
- the existing Vite officer web application still installs, typechecks, lints, tests, builds, and remains runnable;
- no existing officer operational workflow is intentionally removed by Stage 1;
- no Stage 2 schema migration or domain-model change is included.

The target is the requirements document's Stage 1 completion statement:

> A homeowner can log in with a username and see an empty, correct dashboard.

“Empty” means no fake dues balance, no fake property data, no placeholder ledger, and no prematurely ported web modules.

---

## 2. Verified starting point

Stage 1 must begin from the current `main` branch, not from an old local copy.

At the time this guide was written, the inspected baseline was:

- PR #8 merged the authoritative comprehensive requirements document.
- `main` still contains a React 18 + Vite application with officer-facing routes including dashboard, units, dues, payments, complaints, visitors, announcements, and audit.
- the existing login page asks for email and password;
- the existing Zustand auth store calls `supabase.auth.signInWithPassword({ email, password })`;
- the current Supabase client uses Vite environment variables and browser-style session persistence;
- `.env.example` still uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`;
- root CI runs `npm ci`, TypeScript, ESLint, Vitest, and a Vite production build using Node 24;
- the hosted Supabase project is healthy;
- `public.profiles` currently has no `username` column;
- the existing data model is therefore not to be modified merely to make Stage 1 login work;
- the repository still contains the old `supabase/functions/generate-monthly-dues` source artifact, while Stage 1 has no reason to deploy or modify it.

Before implementing anything, re-run the baseline checks in §15.1 because `main` may have moved after this document was written.

---

## 3. Binding Stage 1 boundaries

The following boundaries are non-negotiable for this stage.

### 3.1 Mobile-only application foundation

Use React Native with Expo.

Android is the implementation target for Stage 1.

iOS remains a future supported platform but no iOS build, TestFlight configuration, Apple credential work, or iOS-specific feature is required to pass Stage 1.

### 3.2 Keep the existing repository

Do not create a second production repository.

The current repository remains the canonical Wonderland HOA System repository so that:

- Git history remains continuous;
- Stage 0 security work remains traceable;
- the Supabase migration history remains alongside the app;
- controlling documentation remains in one place.

### 3.3 Preserve the existing web application as a transitional officer operations bridge

The React/Vite application must remain intact and runnable throughout Stage 1.

This is a **temporary operational bridge**, not a reversal of the approved mobile-only product direction.

During Stage 1:

- keep the current root Vite application, its `src/`, `index.html`, Vite configuration, root `package.json`, root `package-lock.json`, web test setup, and web dependencies;
- keep existing officer operational routes available;
- do not intentionally remove or break units, dues, payments, dashboard, audit, or other currently usable officer workflows;
- do not redesign, expand, or modernise the legacy web application as part of Stage 1;
- permit only narrowly scoped web changes that are required to keep the bridge secure, compatible, or operational;
- build the new mobile application separately under `mobile/`;
- treat the web application as legacy/internal tooling and the Expo application as the target product.

Do not mechanically port old DOM components into React Native. The mobile UI remains a new implementation using React Native primitives and Expo conventions.

#### S1-D4 operational rule

The legacy web application may be retired only after:

1. the corresponding mobile officer workflows exist;
2. they pass acceptance testing;
3. a cutover audit confirms no required operational capability would be lost; and
4. an explicit owner-approved cutover decision is recorded.

Completion of Stage 1 alone is **not** permission to remove the web application.

This boundary exists to prevent an operational gap while the automatic monthly dues schedule and existing officer workflows continue to matter.

### 3.4 No Stage 2 schema work

Stage 1 must not change the HOA domain data model.

Specifically, do not modify:

- `units.house_no`;
- the global `house_no` uniqueness issue;
- the missing `street` field;
- owner/tenant/family relationships;
- multi-unit ownership modelling;
- dated tenancy;
- household relationships;
- officer assignment redesign;
- role schema;
- any diagnostic recommendation reserved for Stage 2.

The existing house number/street diagnostic remains input to Stage 2.

### 3.5 Do not modify financial behaviour

Stage 0 and the automatic dues work are already separate completed workstreams.

Stage 1 must not:

- change `generate_monthly_dues`;
- change its pg_cron schedule;
- change payment allocation;
- change credit behaviour;
- change dues amounts;
- change due dates;
- call financial RPCs from the mobile dashboard;
- port the old web financial dashboard into React Native;
- create “temporary” financial mobile APIs.

### 3.6 No service-role credential in the app

The mobile application may contain only the Supabase project URL and a publishable client key.

Never put any of the following in Expo public environment variables, source code, EAS public variables, or bundled application assets:

- service-role key;
- secret API key;
- database password;
- Supabase access token belonging to an administrator;
- Expo personal access token.

A public mobile client must rely on authenticated sessions, RLS, and reviewed server/database functions.

---

## 4. Stage 1 architecture

The intended Stage 1 flow is:

```text
React Native UI
    |
    v
LoginScreen
    |
    v
AuthService.signInWithUsername(username, password)
    |
    v
normalizeUsername()
    |
    v
usernameToInternalAuthEmail()
    |
    v
Supabase Auth signInWithPassword()
    |
    v
Persisted Supabase session
    |
    +--> secure mobile storage adapter
    |
    v
AuthProvider / session state machine
    |
    +--> load existing public.profiles row
    |
    v
Expo Router protected route group
    |
    v
DashboardScreen
```

The mobile app must not know how to perform privileged user provisioning, domain migrations, billing, or payment posting during Stage 1.

---

## 5. Repository strategy

Use one Stage 1 feature branch:

```bash
git switch main
git pull --ff-only
git status --short
git switch -c feat/stage-1-mobile-foundation
```

Do not begin Stage 1 work if `git status --short` is not clean.

The repository temporarily contains two client application roots:

```text
repository root  -> existing React/Vite internal officer bridge
mobile/          -> new React Native + Expo target product
```

This is a **transitional dual-client repository layout**, not a permanent product architecture.

Do not introduce npm workspaces, Turborepo, Nx, or a shared-package architecture merely because two clients temporarily coexist.

Recommended commit sequence:

1. `build(mobile): add expo foundation alongside legacy web`
2. `build(ci): verify legacy web and mobile independently`
3. `feat(ui): add wonderland mobile design system and route shell`
4. `feat(auth): add hoa-provisioned username login and secure session handling`
5. `test(auth): cover login, session restoration and route protection`
6. `docs(stage1): record bridge and mobile-foundation evidence`

Do not merge partial Stage 1 work to `main` merely because the Expo starter launches. The complete Stage 1 exit gate must be met first.

Do not modify the root web application merely to make its folder layout resemble the mobile app.

## 6. Expo project setup

### 6.1 Package manager

Keep **npm**.

The repository already uses `package-lock.json`, `npm ci`, and npm-based GitHub Actions.

Do not switch package managers in Stage 1.

### 6.2 Expo SDK selection

At implementation time, verify the current Expo documentation before scaffolding.

As of this guide's authoring date, the current Expo documentation recommends the SDK 57 default template:

```bash
npx create-expo-app@latest .stage1-expo-seed --template default@sdk-57 --no-agents-md
```

Scaffold into a temporary directory rather than directly over the existing repository.

Reasons:

- the repository already contains controlling documentation and Supabase files;
- generator output can be reviewed before replacement;
- existing files must not be silently overwritten;
- the generated package versions and config should be treated as one coherent Expo baseline.

After the seed app is created:

1. inspect the generated `package.json`;
2. inspect its Expo Router configuration;
3. inspect `app.json` or `app.config.*`;
4. inspect TypeScript and ESLint configuration;
5. copy the required mobile scaffold into `mobile/`;
6. preserve `docs/`, `supabase/`, `.github/`, `.gitignore`, and other repository governance files unless the guide explicitly changes them;
7. delete `.stage1-expo-seed` before committing.

Do not manually guess Expo/React/React Native package versions when the scaffold can generate a compatible set.

### 6.3 Add the Expo application under `mobile/`; do not remove web artifacts

Once the Expo seed has been validated, copy the reviewed Expo scaffold into:

```text
mobile/
```

Do **not** remove or replace the existing root web application during Stage 1.

The following root artifacts remain in place:

- `index.html`;
- existing Vite entry files;
- `vite.config.*`;
- root `src/`;
- root web test setup;
- root `package.json`;
- root `package-lock.json`;
- `react-dom`;
- `react-router-dom`;
- Vite plugins;
- current web Tailwind/PostCSS configuration;
- other dependencies currently required by the officer bridge.

The mobile application gets its own:

```text
mobile/package.json
mobile/package-lock.json
mobile/app.json or mobile/app.config.*
mobile/eas.json
mobile/app/
mobile/src/
mobile/assets/
```

Do not make the mobile app depend on web source files through relative imports.

Shared domain code may be deliberately extracted in a later stage only after there is a concrete need and an approved boundary.

### 6.4 Keep the transitional layout simple

The temporary coexistence of `root web + mobile/` is intentionally simple.

Do not introduce:

```text
apps/mobile
apps/web
packages/*
npm workspaces
Turborepo
Nx
```

during Stage 1.

The purpose of the `mobile/` directory is operational continuity, not architecture expansion.

After verified mobile operational parity and an approved cutover, a later migration may promote the Expo application to the repository root and remove the retired Vite bridge. That is **not Stage 1 work**.

## 7. Target project structure

The root web application remains where it is.

The new mobile application uses Expo Router for route composition and keeps application logic under `mobile/src/`.

Recommended transitional structure:

```text
.
├─ src/                         # existing React/Vite officer bridge — preserve
├─ index.html                   # existing web entry — preserve
├─ vite.config.*                # existing web config — preserve
├─ package.json                 # existing web package — preserve
├─ package-lock.json            # existing web lockfile — preserve
│
├─ mobile/
│  ├─ app/
│  │  ├─ _layout.tsx
│  │  ├─ (auth)/
│  │  │  ├─ _layout.tsx
│  │  │  └─ login.tsx
│  │  └─ (app)/
│  │     ├─ _layout.tsx
│  │     └─ index.tsx
│  ├─ assets/
│  │  └─ brand/
│  │     ├─ wonderland-logo.png
│  │     └─ README.md
│  ├─ src/
│  │  ├─ components/
│  │  │  └─ ui/
│  │  │     ├─ AppButton.tsx
│  │  │     ├─ AppTextField.tsx
│  │  │     ├─ AppText.tsx
│  │  │     ├─ AppCard.tsx
│  │  │     ├─ AppScreen.tsx
│  │  │     ├─ InlineAlert.tsx
│  │  │     └─ LoadingScreen.tsx
│  │  ├─ features/
│  │  │  ├─ auth/
│  │  │  │  ├─ auth-service.ts
│  │  │  │  ├─ auth-types.ts
│  │  │  │  ├─ username.ts
│  │  │  │  └─ components/
│  │  │  │     └─ LoginForm.tsx
│  │  │  └─ dashboard/
│  │  │     └─ DashboardScreen.tsx
│  │  ├─ lib/
│  │  │  └─ supabase/
│  │  │     ├─ client.ts
│  │  │     └─ secure-storage.ts
│  │  ├─ providers/
│  │  │  └─ AuthProvider.tsx
│  │  ├─ theme/
│  │  │  ├─ colors.ts
│  │  │  ├─ spacing.ts
│  │  │  ├─ radius.ts
│  │  │  ├─ typography.ts
│  │  │  ├─ shadows.ts
│  │  │  └─ index.ts
│  │  └─ types/
│  ├─ __tests__/
│  │  ├─ auth/
│  │  ├─ navigation/
│  │  └─ ui/
│  ├─ .env.example
│  ├─ app.json or app.config.ts
│  ├─ eas.json
│  ├─ package.json
│  ├─ package-lock.json
│  └─ tsconfig.json
├─ docs/
├─ supabase/
└─ .github/
   └─ workflows/
```

### 7.1 Mobile route files must stay thin

Files under `mobile/app/` should decide which mobile screen/layout to render.

Do not place authentication business logic, Supabase queries, or design-token definitions directly in route files.

Example:

```text
mobile/app/(auth)/login.tsx
    -> renders LoginForm / LoginScreen

mobile/app/(app)/index.tsx
    -> renders DashboardScreen
```

### 7.2 Do not create mobile tabs yet

Stage 1 does not need a bottom tab bar.

A tab bar would force premature decisions about Stage 2/3/4 information architecture.

Use a simple authenticated mobile stack and one dashboard route.

The existing web navigation is unaffected by this rule.

## 8. Navigation

Use **Expo Router**.

Do not install a second application-level navigation system.

The default Expo project already includes Expo Router, and Stage 1 should use its route groups to separate public and authenticated routes.

### 8.1 Route groups

Use:

```text
(auth)   -> routes that do not require a session
(app)    -> routes that require a valid active session
```

Minimum routes:

```text
/(auth)/login
/(app)/
```

### 8.2 Root navigation behaviour

The root layout must remain in a loading state until authentication bootstrap is complete.

Do not briefly show the login screen to an already authenticated user.

Do not briefly show the protected dashboard to an unauthenticated user.

Use a splash/loading gate while the application:

1. reads the stored Supabase session;
2. validates or refreshes it;
3. resolves the current profile;
4. determines the final route state.

### 8.3 Redirect rules

Expected behaviour:

```text
booting
    -> loading/splash

signed_out
    -> /(auth)/login

signed_in + active profile
    -> /(app)

signed_in + missing/inactive profile
    -> account unavailable state
    -> sign out or contact HOA guidance
```

Do not infer Stage 2 access from `resident`.

At Stage 1, `resident` is only enough to prove the authenticated mobile shell works.

---

## 9. Mobile design system

Stage 1 must create a small design system before building product screens.

The design system should be derived from approved Wonderland brand assets, not from arbitrary Tailwind defaults and not from a generic admin dashboard template.

### 9.1 Brand assets

Use only approved/clean brand assets.

Preferred asset set:

- transparent PNG logo for runtime display;
- SVG source retained for design/reference if the chosen React Native pipeline supports it safely;
- app icon source at a large square master size;
- splash-screen source artwork.

Do not extract final colours from a low-quality screenshot and silently declare them official.

If the brand palette is not formally approved, record the palette as `PROPOSED` until approved.

### 9.2 Token categories

Create typed tokens for:

```text
colors
typography
spacing
radius
shadows/elevation
icon sizes
control heights
```

Semantic colours should be named by purpose:

```text
background
surface
surfaceElevated
textPrimary
textSecondary
border
brandPrimary
brandSecondary
success
warning
danger
info
disabled
```

Do not scatter raw hex values throughout screens.

### 9.3 Stage 1 UI primitives

Build only the primitives needed by login and the empty dashboard:

- `AppScreen`
- `AppText`
- `AppButton`
- `AppTextField`
- `AppCard`
- `InlineAlert`
- `LoadingScreen`

Possible later components such as data tables, transaction rows, receipt cards, charts, badges, payment controls, date pickers, attachment pickers, and booking calendars are explicitly deferred.

### 9.4 Styling approach

Use React Native `StyleSheet` plus the typed theme tokens for Stage 1.

Do not install NativeWind, Tamagui, NativeBase, Paper, or another large component framework simply to imitate the old web stack.

A third-party UI framework may be considered later only if there is a concrete problem it solves better than the small in-house design system.

### 9.5 Accessibility

The login and dashboard shell must support:

- readable text scaling;
- screen-reader labels for interactive controls;
- visible validation/error states;
- keyboard-safe form layout;
- password visibility toggle with an accessible label;
- sufficient touch target sizing;
- safe-area handling;
- loading states that do not trap the user;
- errors that are understandable without exposing technical internals.

---

## 10. Username-based authentication

### 10.1 Important Supabase constraint

Supabase password authentication natively signs in with an email address or phone number.

Wonderland requires the **resident-facing credential to be a username**.

Because Stage 1 is schema-neutral and `public.profiles` has no username column, the mobile client must use a Stage 1 authentication adapter rather than adding a premature username table/column.

### 10.2 Stage 1 username transport strategy

`OWNER-DECIDED` (DEC-18) The resident-facing credential is a **login handle**, not the person's database identity and not the property's primary key. It is HOA-issued and, for homeowners, derived from one currently owned property.

Use a deterministic internal auth email alias.

The resident sees:

```text
Username: 115.sampaguita
Password: ********
```

Canonical normalization examples:

```text
"115 Sampaguita St."     -> "115.sampaguita"
"117-A Sampaguita St."   -> "117a.sampaguita"
"111-B Sunflower St."    -> "111b.sunflower"
```

The person's actual verified name appears only after authentication (e.g. on the dashboard), never as the login identifier.

For **Stage 1 specifically**, the application does not derive this handle from a live property record — the `house_no + street` schema is Stage 2 work and `street` does not yet exist as a column. Stage 1 only accepts and normalizes an already HOA-issued canonical handle for a manually provisioned test account (e.g. `115.sampaguita`). Actual handle generation from property records, ownership transfer, and handle reassignment are Stage 2+ work.

The mobile auth service converts that login handle to an internal Supabase Auth email form, for example:

```text
115.sampaguita@auth.wonderland.invalid
```

Then it calls:

```ts
supabase.auth.signInWithPassword({
  email: internalEmail,
  password,
})
```

The internal email is an implementation transport only.

It must not appear as the resident-facing login identifier.

### 10.3 Why this approach is acceptable for Stage 1

It:

- satisfies the username-first mobile UX;
- works with Supabase's existing password authentication;
- requires no Stage 2 public schema migration;
- avoids a public username lookup table;
- keeps `profiles` unchanged;
- preserves email as a future optional profile/contact field rather than a login credential.

This is a bridge between the product requirement and Supabase's credential model.

It does **not** settle the final Stage 2 identity model.

### 10.4 HOA-provisioned homeowner accounts

`OWNER-DECIDED` Residents do **not** self-register.

The HOA creates homeowner/resident accounts and gives the user their credentials.

The intended resident experience is:

```text
HOA verifies the person
    -> HOA provisions account
    -> HOA assigns username
    -> HOA issues initial credentials
    -> resident opens mobile app
    -> resident logs in
```

The mobile application must therefore expose **Log In**, not public `Sign Up`, `Register`, or `Create Account`.

Stage 1 does not need to build the final officer account-management screen. A clearly non-production test account may be provisioned through trusted administrative tooling to prove the authentication foundation.

Production account provisioning must eventually use a trusted server-side/admin path. A Supabase service-role or secret key must never be embedded in the mobile client.

`OWNER-DECIDED` (DEC-18) The login handle is separate from the person's immutable identity. The Supabase Auth user UUID identifies the authenticated account internally; historical audit, payment, and receipt records must reference that immutable ID, never the mutable login handle.

Handle normalization, for Stage 1's manually provisioned test account:

- lowercase;
- remove "St." and spaces;
- remove the hyphen between the house number and any alphabetic suffix;
- format: `house_no.street_name` (e.g. `117a.sampaguita`).

Two constraints apply to *later* stages, not to Stage 1's implementation, but are recorded now so they aren't rediscovered the hard way:

- **Handle changes** (e.g. after a property sale) must happen through trusted server-side Supabase Admin tooling that updates the internal auth email directly — never through the resident-facing email-change flow, which requires confirmation at an address that can never receive mail.
- **Vacated handles** need an explicit cooldown before reassignment to a new owner, to avoid a stale cached credential on an old device resolving to a different person's account.

Stage 1 does not implement handle changes, reassignment, ownership transfer, multi-property switching, or tenant handle conventions — all Stage 2+.

### 10.5 Username normalisation

`normalizeUsername()` must be pure and tested.

At minimum:

1. trim outer whitespace;
2. lowercase;
3. reject blank values;
4. reject characters outside the approved username character set;
5. never append the internal auth domain twice.

Do not log the password.

Do not log Supabase access or refresh tokens.

The internal alias may be logged only in local development if absolutely necessary, but the preferred implementation is not to log it at all.

### 10.6 Login error behaviour

Do not reveal whether a username exists.

Use one resident-facing error such as:

> Invalid username or password.

Log technical details only through a development-safe logger that redacts credentials and tokens.

### 10.7 No resident self-registration

Stage 1 mobile authentication is **sign-in only for residents**.

Do not expose:

```ts
supabase.auth.signUp(...)
```

from the resident-facing mobile UI.

This does not mean Wonderland has no account-creation process.

It means account creation is controlled by the HOA:

- authorised HOA staff/officers provision the account;
- the resident receives assigned credentials;
- the resident logs in with those credentials;
- unrestricted public account creation is unavailable.

Do not implement the privileged provisioning backend inside Stage 1 unless a separately approved Stage 1 requirement makes it necessary.

### 10.8 Stage 1 test identity

Use a clearly non-production test homeowner identity.

The test identity may be provisioned manually through approved Supabase administrative tooling using the same internal username alias convention.

Do not migrate all existing auth users to username aliases in Stage 1.

That would mix foundation work with identity migration.

### 10.9 Password recovery

Because the proposed internal auth address is non-routable, normal email-based password reset is not the Stage 1 recovery mechanism.

For Stage 1:

- show a simple “Contact the HOA to reset your account password” path;
- do not build a privileged reset API into the mobile client;
- do not put a service-role key in the app;
- record the final officer-assisted recovery workflow before pilot/production rollout.

A complete production account-recovery process is a launch requirement, but it is not needed to prove the Stage 1 login foundation.

---

## 11. Supabase client and session handling

The current web client must not be copied unchanged.

Mobile session storage and application lifecycle handling are different.

### 11.1 Mobile environment variables

Do not replace or rename the root Vite environment variables while the web bridge remains operational.

Create a separate:

```text
mobile/.env.example
```

similar to:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
EXPO_PUBLIC_AUTH_EMAIL_DOMAIN=auth.wonderland.invalid
```

Do not commit a real `mobile/.env`.

Prefer the modern Supabase publishable key for new mobile code.

Do not expose a secret/service-role key.

The root web `.env.example` remains unchanged in Stage 1 unless a separate operational/security fix requires it.

### 11.2 Required client packages

Install only current Expo-compatible versions.

The implementation is expected to need:

```text
@supabase/supabase-js
react-native-url-polyfill
@react-native-async-storage/async-storage
expo-secure-store
expo-splash-screen
```

If the secure-storage adapter follows Supabase's large secure-store example, it may also require:

```text
aes-js
react-native-get-random-values
```

Use `npx expo install` for Expo/React Native packages where applicable so compatible versions are selected, and commit the resulting lockfile.

### 11.3 Secure session storage

Do not use unencrypted AsyncStorage as the final Stage 1 session store.

Use the current Supabase/Expo secure-storage pattern:

- encrypted session value stored in AsyncStorage;
- encryption key stored in Expo SecureStore;
- or another reviewed SecureStore-compatible adapter that handles session payload size correctly.

This avoids relying on plain AsyncStorage for bearer credentials while also avoiding SecureStore's large-value limitations.

Do not store the resident's password after login.

### 11.4 Supabase client configuration

The mobile client should use the current React Native-safe settings:

```text
persistSession: true
autoRefreshToken: true
detectSessionInUrl: false
```

Use the current Supabase locking pattern supported by the installed client version.

Register app lifecycle handling once so session auto-refresh runs while the app is active and stops while backgrounded.

Do not register duplicate `AppState` listeners on every render.

### 11.5 Authentication state machine

Use explicit states.

Recommended model:

```ts
type AuthStatus =
  | 'booting'
  | 'signedOut'
  | 'signingIn'
  | 'signedIn'
  | 'accountUnavailable'
  | 'recoverableError'
```

Avoid representing the entire auth lifecycle with several unrelated booleans.

### 11.6 Boot sequence

On cold start:

1. keep the splash/loading gate visible;
2. initialise the Supabase client;
3. restore the persisted session;
4. validate the current claims/session using the supported Supabase API;
5. load the current `public.profiles` row by authenticated user id;
6. verify the profile exists;
7. verify `is_active` is true;
8. enter the authenticated route group;
9. release the splash/loading gate.

If there is no valid session, go to login.

If a network failure prevents verification, show a recoverable retry state rather than blindly deleting a possibly valid session.

### 11.7 Auth event subscription

Subscribe once to Supabase auth state changes.

React to at least:

- sign in;
- token refresh;
- sign out.

Clean up the subscription when the provider unmounts.

### 11.8 Profile handling

Stage 1 may read only the existing fields already required by the mobile shell, for example:

```text
id
full_name
role
position_label
is_active
```

Do not add username, street, occupancy, household, ownership, or tenant fields in Stage 1.

If the authenticated user has no profile or an inactive profile:

- do not render the protected dashboard;
- do not infer access from Auth alone;
- show an account-unavailable state;
- provide sign-out/contact guidance.

### 11.9 Sign out

Sign out must:

1. call Supabase Auth sign out;
2. clear in-memory auth state;
3. remove persisted session material through the storage adapter;
4. navigate to the login route;
5. prevent back-navigation into the protected route group.

---

## 12. Stage 1 dashboard

The dashboard is a shell, not a product-feature dashboard.

It may contain:

- Wonderland logo/brand header;
- resident display name if available;
- concise signed-in confirmation;
- an intentionally empty foundation state;
- sign-out action;
- app/build version in a non-prominent settings/debug area if useful.

It must not contain invented numbers or fake data.

Do not show:

- total balance;
- unpaid dues;
- payment history;
- properties;
- unit cards;
- announcements;
- permits;
- bookings;
- receipts;
- charts;
- officer controls;
- monthly dues generation controls.

A good Stage 1 empty state is explicit:

> Mobile foundation ready. Property, dues, payment and community modules will be connected in later stages.

Do not label deferred features as “coming soon” if that creates an implied release promise.

---

## 13. Testing strategy

The existing root Vitest/jsdom setup belongs to the transitional web bridge and remains in place.

For the new Expo application under `mobile/`, use the current Expo-supported Jest stack.

Expected development dependencies:

```text
jest
jest-expo
@types/jest
@testing-library/react-native
```

Use Expo Router testing utilities where route integration tests require them.

### 13.1 Required Stage 1 tests

At minimum, cover:

#### Username utility

- trims input;
- lowercases input;
- accepts a valid username;
- rejects blank username;
- rejects disallowed characters;
- generates the expected internal auth alias;
- does not double-append the domain.

#### Auth service

- passes the internal alias, not the visible username, to Supabase password auth;
- returns a generic invalid-credential UI error;
- never stores the password;
- exposes sign-out.

#### Session bootstrap

- no session -> login route;
- valid session + active profile -> protected dashboard;
- valid session + missing profile -> account unavailable;
- valid session + inactive profile -> account unavailable;
- sign-out -> login;
- token/session restoration does not flash a protected screen before validation.

#### Navigation

- unauthenticated protected-route access redirects to login;
- authenticated user cannot remain on the login route after successful sign-in;
- sign-out prevents navigation back into protected routes.

#### UI

- login fields have accessible labels;
- password field uses secure text entry;
- loading disables duplicate login submission;
- error state is rendered accessibly;
- dashboard renders without domain data.

### 13.2 Do not chase meaningless coverage

Stage 1 needs confidence in authentication and navigation, not a vanity percentage.

Do not snapshot every primitive component merely to raise coverage.

---

## 14. Continuous integration and EAS

Stage 1 needs three verification layers:

1. existing root web verification on every push/PR;
2. new mobile verification on every push/PR;
3. an actual Android EAS build checkpoint.

The first two prevent the mobile rebuild from breaking the internal officer bridge.

Do not trigger a paid/queued EAS cloud build for every small commit unless the project intentionally chooses that cost/latency.

### 14.1 Package scripts

Keep the current root web scripts.

Add mobile scripts in `mobile/package.json` equivalent to:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "test": "jest --watch",
    "test:ci": "jest --ci --runInBand"
  }
}
```

Add an Expo health/dependency check according to the installed SDK's current documented command.

### 14.2 GitHub CI

Do not replace the existing web verification with mobile verification.

CI must verify **both clients independently**.

Expected shape:

```text
legacy-web
    checkout
    setup Node 24
    npm ci
    root typecheck
    root lint
    root Vitest
    root Vite build

mobile
    checkout
    setup Node 24
    cd mobile
    npm ci
    Expo dependency/doctor check
    mobile TypeScript
    mobile ESLint
    mobile Jest
    Expo Android JS bundle/export verification
```

Keep:

```yaml
permissions:
  contents: read
```

and concurrency cancellation.

A representative workflow shape is:

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  legacy-web:
    name: Legacy web bridge
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:run
      - run: npm run build

  mobile:
    name: Mobile foundation
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: mobile/package-lock.json
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:ci
      - run: npx expo export --platform android --output-dir dist-ci
```

If the current Expo SDK documents an additional doctor/dependency consistency command, add it before mobile typecheck.

Do not commit `mobile/dist-ci`.

### 14.3 EAS setup

Stage 1 requires a real Android development or preview build.

Run EAS commands from `mobile/`.

Install the development client only if the chosen workflow requires it:

```bash
cd mobile
npx expo install expo-dev-client
```

Then a human-authenticated Expo account must initialise EAS:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Do not make an AI agent guess Expo account credentials.

Do not commit Expo tokens.

### 14.4 Android application id decision gate

Before the first serious EAS build intended to become the long-term application identity, approve the Android application id/package name.

Do not casually invent it because changing application identity after store distribution is consequential.

Record the approved value in the Decision Log if it is intended to be permanent.

### 14.5 EAS build profiles

At minimum configure:

```text
development
preview
production
```

Stage 1 only needs Android `development` or `preview` to pass.

Do not perform a Play Store release in Stage 1.

### 14.6 GitHub-triggered EAS build

After a successful manually configured EAS build, an optional EAS workflow or GitHub Action may trigger Android builds non-interactively.

Prefer one of:

- manual `workflow_dispatch`; or
- path-filtered build when `mobile/**` changes on merge to `main`.

Do not require an EAS build on every branch push unless the owner intentionally accepts the quota/time cost.

The GitHub secret should be:

```text
EXPO_TOKEN
```

It belongs only in GitHub Actions secrets.

Never put it in `.env`, source code, or `EXPO_PUBLIC_*`.

## 15. Implementation procedure

### 15.1 Gate 0 — inspect before changing

Run:

```bash
git switch main
git pull --ff-only
git status --short
git log -5 --oneline
```

Verify:

- PR #8 requirements are present;
- `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` exists;
- `docs/DECISION_LOG.md` exists;
- Stage 0 migration files exist;
- automatic dues work is already merged;
- the existing web officer routes are present;
- root web CI is green or has no unresolved failure;
- there is no uncommitted local work.

Then inspect:

```bash
cat package.json
cat .github/workflows/ci.yml
cat .env.example
```

On Windows PowerShell, use the equivalent `Get-Content` commands if preferred.

Do not alter hosted Supabase state as part of this inspection.

### 15.2 Gate 1 — record transitional decisions and create Stage 1 branch

Before implementation, ensure the Decision Log records:

- HOA-provisioned resident accounts / no resident self-registration;
- S1-D4 transitional legacy web operations bridge;
- legacy web retirement requires explicit cutover approval.

Then:

```bash
git switch -c feat/stage-1-mobile-foundation
```

### 15.3 Gate 2 — scaffold Expo in a temporary directory

Use the current official Expo default template.

At guide authoring time:

```bash
npx create-expo-app@latest .stage1-expo-seed --template default@sdk-57 --no-agents-md
```

Run the seed once before moving it:

```bash
cd .stage1-expo-seed
npm run start
```

Return to the repository root after validating it.

### 15.4 Gate 3 — add the mobile application without touching the web bridge

Create `mobile/` and copy the reviewed Expo scaffold into it.

Preserve the existing root application:

```text
src/
index.html
vite.config.*
package.json
package-lock.json
tailwind/postcss config
root test setup
```

Also preserve:

```text
.git/
.github/
docs/
supabase/
README.md
```

Delete `.stage1-expo-seed` after the mobile scaffold has been copied and validated.

Run the existing root web verification immediately after the structural change.

If the web checks fail because of the mobile addition, fix the repository/CI isolation before continuing.

### 15.5 Gate 4 — clean mobile dependencies only

Review `mobile/package.json`.

Remove unnecessary packages from the **mobile app only**.

Do not remove root web dependencies such as:

```text
react-dom
react-router-dom
vite
@vitejs/plugin-react
react-hot-toast
```

while the officer bridge still uses them.

Do not add TanStack Query or Zustand to mobile merely because the legacy web app uses them.

Stage 1 mobile auth state is small enough for a focused React context/provider.

Stage 2 may introduce data-query/state libraries when real mobile data flows exist.

### 15.6 Gate 5 — install Supabase/mobile dependencies

Install versions compatible with the generated Expo SDK inside `mobile/`.

Then configure:

- URL polyfill;
- secure storage adapter;
- mobile Supabase client;
- mobile environment variables;
- AppState refresh handling.

Do not test with a service-role key.

### 15.7 Gate 6 — create theme primitives

Add approved brand assets under `mobile/assets/`.

Implement typed design tokens.

Build only the Stage 1 UI primitives.

### 15.8 Gate 7 — add Expo Router auth shell

Create:

```text
mobile/app/(auth)/login
mobile/app/(app)/index
```

Add auth bootstrap and route protection.

Do not add feature tabs.

### 15.9 Gate 8 — implement username auth adapter

Implement and test:

```text
normalizeUsername
usernameToInternalAuthEmail
signInWithUsername
signOut
```

No resident self-registration.

No production-wide user migration.

### 15.10 Gate 9 — implement secure session provider

Implement:

- boot state;
- persisted session restoration;
- claims/session validation;
- profile load;
- active-profile check;
- auth-state subscription;
- lifecycle refresh handling;
- sign-out cleanup.

### 15.11 Gate 10 — build empty mobile dashboard

Create the branded authenticated shell only.

Do not connect finance/property modules.

Do not replace the existing web dashboard.

### 15.12 Gate 11 — add mobile tests and dual-client CI

Keep the root Vitest/jsdom web tests and existing web build verification.

Add Expo/Jest/React Native Testing Library under `mobile/`.

Update GitHub Actions so root web verification and mobile verification run as separate jobs.

Both must be green.

### 15.13 Gate 12 — configure and verify EAS

Human-authenticated step:

1. configure EAS from `mobile/`;
2. approve application id;
3. make one Android development/preview build;
4. install it;
5. test login/session/sign-out on a real device or emulator.

### 15.14 Gate 13 — operational bridge verification

Before the Stage 1 PR is considered ready:

1. start/build the existing web app;
2. verify its key officer routes still load;
3. confirm Stage 1 did not intentionally remove an existing operational control;
4. run all root web CI checks;
5. run all mobile CI checks.

Stage 1 fails this gate if mobile work makes the existing officer bridge unusable.

### 15.15 Gate 14 — documentation reconciliation

Before opening the PR:

- update README to explain the transitional layout: root web bridge + `mobile/` target application;
- keep existing web development instructions while adding separate mobile instructions;
- document `mobile/.env.example`;
- document Android start/build commands;
- record any newly approved Stage 1 decisions;
- state clearly that web retirement is deferred to a future cutover gate;
- do not edit the comprehensive requirements silently to resolve a new decision.

If a decision changes requirements, add it to `docs/DECISION_LOG.md` according to the repository's amendment rule.

## 16. What NOT to build in Stage 1

The following work is explicitly prohibited from this stage.

### 16.1 Stage 2 domain/data model

Do not build:

- `street` migration;
- `house_no + street` uniqueness;
- unit address redesign;
- owner relationship;
- tenant relationship;
- family-member relationship;
- room-renter rules;
- dated occupancy;
- multi-property ownership schema;
- property/person join model;
- new role/capability model;
- emergency/break-glass implementation;
- tenant onboarding verification.

### 16.2 Stage 3 financial product

Do not build:

- homeowner ledger;
- dues cards;
- arrears dashboard;
- payment submission;
- payment month selection;
- proof-of-payment upload;
- reconciliation queue;
- receipt generation;
- receipt numbering redesign;
- payment allocation redesign;
- opening balances;
- credit UI;
- officer payment posting;
- financial offline queue.

### 16.3 Stage 4 community modules

Do not build:

- announcements feed;
- sports-court permits;
- guest permit QR flow;
- facility booking;
- searchable knowledge base;
- push notifications;
- Facebook posting/integration.

### 16.4 Platform extras

Do not build:

- iOS release pipeline;
- TestFlight;
- biometric login;
- passkeys;
- social login;
- SMS login;
- self-service registration;
- full admin user-management UI;
- analytics platform;
- crash-reporting platform unless separately approved;
- OTA production update policy;
- Play Store submission.

### 16.5 Do not port the web product merely to claim parity

Keeping the web bridge runnable does **not** mean Stage 1 should reproduce its screens in mobile.

Do not port:

- payments;
- dues management;
- units management;
- audit screens;
- announcements;
- complaints;
- visitors;

into Stage 1 merely because the legacy web application already has them.

The web bridge remains the temporary operational tool.

The Stage 1 mobile product remains intentionally limited to its approved foundation scope.

Do not expand the legacy web app with new product functionality either. It should receive only security, compatibility, or operational fixes required to keep the bridge safe and usable.

## 17. Security requirements

Stage 1 must satisfy all of these:

- publishable Supabase key only in the client;
- no service-role key;
- no password persistence;
- no token logging;
- no public sign-up;
- generic login failure message;
- secure persisted session storage;
- active profile required;
- protected routes inaccessible when signed out;
- sign-out clears local auth state;
- existing RLS remains the source of row-level authorisation;
- mobile UI role checks are not treated as database security;
- no new `SECURITY DEFINER` function;
- no new schema function purely to make username login convenient;
- do not deploy the legacy dues Edge Function as part of Stage 1;
- do not weaken existing web security/RLS merely to make dual-client coexistence easier;
- do not move privileged credentials into shared root/mobile files.

Any new database or auth-security requirement discovered during Stage 1 must be escalated rather than hidden inside mobile code.

---

## 18. Performance requirements

Stage 1 should already respect the approved mobile performance budgets:

- cold launch: target no more than 4.0 seconds;
- warm launch: target no more than 1.5 seconds;
- cached screen transition: target no more than 1.0 second;
- memory: target no more than 250 MB on a 3 GB device;
- application size: target no more than 60 MB;
- long-term crash-free sessions target: at least 99%.

Not every metric can be meaningfully proven before real users exist.

Stage 1 must at least avoid obvious violations:

- no unnecessary UI framework;
- no giant image assets;
- no blocking network calls before rendering that are not required for auth;
- no duplicate Supabase clients;
- no duplicate auth subscriptions;
- no unnecessary navigation layers;
- no unnecessary state-management library.

Record device/build conditions when measuring launch or APK size.

---

## 19. Stage 1 acceptance test

Use one approved test homeowner account.

### Scenario A — fresh install

1. Install the Android development/preview build.
2. Open the app.
3. Login screen appears.
4. UI asks for **Username**, not Email.
5. Enter valid username and password.
6. Login succeeds.
7. App opens the empty dashboard.
8. No fake dues/property/payment data is shown.

**Pass:** all steps work.

### Scenario B — persistence

1. Sign in successfully.
2. Fully close the app.
3. Reopen it.

**Pass:** authenticated session is restored without asking for credentials again and without flashing the login screen first.

### Scenario C — invalid credentials

1. Sign out.
2. Enter a valid-looking but incorrect username/password combination.

**Pass:** app shows one generic invalid-credentials message and reveals no account-existence information.

### Scenario D — inactive/unavailable profile

1. Use a test condition where Auth exists but the corresponding usable active profile is unavailable.

**Pass:** protected dashboard is not rendered; account-unavailable guidance is shown.

### Scenario E — sign out

1. Sign in.
2. Tap Sign out.
3. Attempt Android back navigation.

**Pass:** login remains the public destination; protected dashboard is not reopened.

### Scenario F — offline/recoverable boot

1. Begin from a previously valid local session.
2. Temporarily remove network access during a boot condition that requires remote verification.

**Pass:** app exposes a recoverable state and does not corrupt local auth state merely because connectivity is temporarily unavailable.

### Scenario G — dual-client CI and bridge continuity

Push the Stage 1 branch.

**Pass:**

- root web `npm ci`, typecheck, lint, Vitest, and Vite build are green;
- mobile `npm ci`, typecheck, lint, Jest, and Expo Android export/bundle verification are green;
- the mobile addition does not require deleting or disabling the root web app.

### Scenario H — EAS

Trigger Android development/preview EAS build.

**Pass:** build completes and can be installed on the intended Android test device.

---

## 20. Stage 1 Definition of Done

Stage 1 is DONE only when every checked item below is true.

### Repository / transition

- [ ] Branch started from current clean `main`
- [ ] Existing root React/Vite application preserved
- [ ] Existing officer operational routes remain runnable
- [ ] `mobile/` contains the new Expo application
- [ ] `docs/` preserved
- [ ] `supabase/` preserved
- [ ] root web `package-lock.json` preserved/updated only when genuinely required
- [ ] mobile `package-lock.json` generated and committed
- [ ] no npm workspace/monorepo framework introduced
- [ ] README documents the temporary dual-client layout
- [ ] S1-D4 is recorded before merge

### Mobile foundation

- [ ] Expo app launches
- [ ] Expo Router configured
- [ ] Android-first configuration present
- [ ] no premature mobile tabs
- [ ] approved brand asset included
- [ ] typed design tokens implemented
- [ ] required Stage 1 mobile UI primitives implemented

### Authentication

- [ ] login UI says Username
- [ ] account model is HOA-provisioned
- [ ] no resident self-registration
- [ ] internal auth alias is hidden from resident
- [ ] password never persisted
- [ ] generic invalid-credential message
- [ ] only publishable Supabase key in client
- [ ] secure mobile session storage implemented
- [ ] session persists across restart
- [ ] auth subscription cleaned up
- [ ] inactive/missing profile blocked
- [ ] sign-out clears access
- [ ] mobile route protection tested

### CI/build

- [ ] root web install passes
- [ ] root web typecheck passes
- [ ] root web lint passes
- [ ] root web tests pass
- [ ] root web Vite build passes
- [ ] mobile install passes
- [ ] mobile TypeScript passes
- [ ] mobile ESLint passes
- [ ] mobile Jest passes
- [ ] mobile Expo Android export/bundle check passes
- [ ] one Android EAS development/preview build succeeds
- [ ] build installs on real Android device or emulator
- [ ] no iOS release work required

### Scope integrity

- [ ] zero Stage 2 domain-model migrations
- [ ] house/street diagnostic untouched
- [ ] zero Stage 3 mobile financial workflow implementation
- [ ] automatic dues logic untouched
- [ ] no push notifications
- [ ] no mobile announcements/permits/bookings/knowledge-base module
- [ ] no service-role key in mobile
- [ ] legacy dues Edge Function not deployed by Stage 1
- [ ] no intentional removal of existing officer web capabilities
- [ ] no legacy-web retirement/cutover performed

### Documentation

- [ ] HOA-provisioned account decision recorded
- [ ] S1-D4 transitional web bridge decision recorded
- [ ] Android application-id decision recorded if finalised
- [ ] account-recovery decision recorded if finalised
- [ ] implementation evidence recorded
- [ ] no silent requirement changes
- [ ] Stage 1 completion evidence included in PR description

## 21. Recommended Stage 1 PR title

```text
feat(mobile): add Stage 1 Expo foundation alongside officer web bridge
```

## 22. Recommended PR description

```markdown
## Stage

Stage 1 — Mobile Foundation

## What

Add the Android-first React Native + Expo application **alongside** the existing React/Vite officer operations bridge.

This PR:
- preserves the existing web application and its officer workflows;
- adds the new Expo application under `mobile/`;
- introduces Expo Router for mobile;
- adds the Wonderland mobile design-system foundation;
- implements HOA-provisioned, username-first resident login over Supabase Auth;
- adds secure mobile session persistence;
- protects authenticated mobile routes;
- provides the intentionally empty Stage 1 homeowner dashboard;
- adds Expo/React Native tests and mobile CI while retaining root web CI;
- establishes an Android EAS development/preview build path.

## Authority

- docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md
- docs/DECISION_LOG.md
- docs/WONDERLAND_STAGE_1_IMPLEMENTATION_GUIDE.md

## Transitional operations boundary

The existing React/Vite application remains a temporary internal HOA officer operations bridge.

This PR does not authorise its retirement.

Legacy web retirement requires:
1. verified mobile operational parity for required officer workflows;
2. a cutover audit; and
3. an explicit owner-approved cutover decision.

## Explicitly not included

- no removal of the existing web application;
- no Stage 2 data-model changes;
- no house_no/street fix;
- no ownership/tenancy schema;
- no Stage 3 mobile financial workflows;
- no payment/receipt mobile features;
- no announcements, permits, bookings or knowledge base in mobile;
- no iOS release;
- no push notifications;
- no changes to automatic dues generation.

## Verification

### Legacy web bridge
- [ ] npm ci
- [ ] typecheck
- [ ] lint
- [ ] Vitest
- [ ] Vite build
- [ ] key officer routes still load

### Mobile
- [ ] npm ci
- [ ] typecheck
- [ ] lint
- [ ] Jest
- [ ] Expo Android bundle/export verification
- [ ] Android EAS development/preview build
- [ ] real-device/emulator login
- [ ] session restart test
- [ ] sign-out/back-navigation test
- [ ] inactive/missing-profile test

## Stage 1 exit statement

A homeowner can log in to the new mobile application with an HOA-issued username and see an empty, correct dashboard, while the existing officer web operations bridge remains available.
```

## 23. Rollback

Stage 1 is intentionally designed so the mobile foundation can be rolled back without taking the officer web bridge with it.

If the Stage 1 application foundation is rejected before merge:

- delete/reset the Stage 1 feature branch;
- the existing root web application remains the operational baseline;
- no production database rollback should be required.

If Stage 1 is merged and the mobile addition must later be reverted:

- revert the Stage 1 mobile PR;
- preserve the root web bridge;
- preserve Decision Log entries as historical records unless a later decision explicitly supersedes them;
- separately review any test auth identities created during Stage 1 before deleting them.

Never “roll back” by deleting the legacy web bridge first.

Never manually edit hosted database objects outside tracked history as a substitute for reverting application code.

## 24. Decision gates and decisions created by this guide

The guide intentionally does not disguise unresolved decisions as implementation details.

### S1-D1 — HOA-provisioned resident accounts and property-derived login handle

**Owner decision (DEC-18):** residents do not self-register. The HOA provisions the account, assigns the login handle, and gives the resident the credentials.

The login handle is property-derived, not legal-name-derived — see §10.2 for the canonical normalization and §10.4 for the immutable-ID separation. This supersedes the earlier legal-name-derived convention.

Two implementation policies remain to be recorded before production-scale provisioning, both Stage 2+:

- handle-change procedure (trusted server-side Admin API, bypassing resident-facing email confirmation);
- vacated-handle reassignment cooldown, to prevent a stale credential resolving to a different person.

### S1-D2 — Android application id

Approve the permanent Android package/application identifier before treating EAS/Play configuration as final.

### S1-D3 — Account recovery

Define the officer-assisted password-reset/recovery procedure before resident pilot or production rollout.

### S1-D4 — Transitional legacy web operations bridge

**Owner decision for Stage 1:** preserve the existing React/Vite application as temporary internal HOA officer tooling while the mobile application is built.

This does not make Wonderland a permanent web + mobile product.

Rules:

- root web remains runnable during Stage 1;
- Stage 1 must not intentionally remove existing officer operational workflows;
- no new product expansion should target the legacy web client;
- security/compatibility/operational fixes are allowed when necessary;
- the mobile application is built under `mobile/`;
- Stage 1 completion does not authorise web retirement.

#### S1-D4 retirement gate

The legacy web bridge may be removed only after all of the following:

1. every still-required officer workflow has a verified mobile replacement;
2. those mobile workflows pass acceptance testing;
3. the cutover audit finds no operational gap;
4. required financial operations can continue safely after removal;
5. the owner explicitly approves retirement and records the decision.

Until then, the bridge remains part of the operational safety boundary.

These decisions may be documented during Stage 1 without importing Stage 2 domain schema work.

## 25. Final implementation principle

Stage 1 succeeds by creating the **smallest trustworthy mobile foundation without disabling the tool officers still depend on**.

The correct sequence is:

```text
existing web officer bridge stays operational
        +
mobile/
    -> Expo shell
    -> navigation
    -> design primitives
    -> HOA-provisioned username login
    -> secure session
    -> protected empty dashboard
    -> mobile tests
    -> dual-client CI
    -> Android build
    -> Stage 1 close

THEN Stage 2 data model
THEN Stage 3 mobile financial core
THEN operational-parity audit
THEN explicit cutover decision
THEN legacy web retirement
```

Do not cross Stage 2/3 product boundaries early.

Do not delete the operational bridge early.

The house-number/street constraint, ownership/tenancy model, and property-relationship work remain Stage 2 by design.

The financial mobile replacement remains Stage 3 by design.

The web bridge exists only to prevent an operational gap while those replacements are still being built.
