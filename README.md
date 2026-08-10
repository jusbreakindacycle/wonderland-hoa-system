# Wonderland HOA System

A documentation-led modernization of the management system for **Wonderland Homeowners Association, Inc.**, serving Wonderland Townhomes in Barangay Namayan, Mandaluyong City.

> **Project status:** Phase 0 reconciliation, Phase 1 policy discovery, and the Phase 2 Domain and Service Blueprint are complete. Phase 3 architecture and repository-strategy work is authorized. Coding, migration, deployment, and production use remain **unauthorized until Phase 3 is approved**.

## Community Scope

The system is intended for Wonderland Townhomes in **Barangay Namayan, Mandaluyong City**, distinct from the similarly named community associated with Barangay Mauway.

Covered internal streets:

- Wonderland Avenue
- Sampaguita
- Yellowbell
- Orchids
- Sunflower

`Circle` is excluded from the project scope.

The operational address model uses separate **house number** and **official street** values. It does not use phase, block, or lot.

## Repository Layout — Transitional Dual Client

As of Stage 1 the repository holds **two client applications at once**. This is a temporary
transitional layout, not a permanent product architecture, and not a reversal of the mobile-only
direction in [DEC-01](docs/DECISION_LOG.md#dec-01).

```text
.                      React + Vite officer operations bridge  (legacy, transitional)
├─ src/                its application code
├─ index.html          its entry point
├─ vite.config.ts      its build config
├─ package.json        its dependencies and scripts
│
└─ mobile/             React Native + Expo application  (the target product)
   ├─ app/             Expo Router routes
   ├─ src/             screens, features, theme, Supabase client
   ├─ assets/          brand assets
   ├─ package.json     its own dependencies, scripts and lockfile
   └─ .env.example     its own environment contract
```

Each client installs, typechecks, lints, tests and builds independently, and CI runs them as two
separate jobs. Neither imports source from the other. There is deliberately **no** npm workspace,
Turborepo or Nx layout — the second directory exists for operational continuity, not architecture
expansion.

### The web application is a temporary operations bridge

Per [DEC-20](docs/DECISION_LOG.md#dec-20) (S1-D4), the React/Vite application is retained as
internal HOA officer tooling while the mobile replacement is built. Officers still depend on it,
and automatic monthly dues generation ([DEC-17](docs/DECISION_LOG.md#dec-17)) still runs against
the workflows it exposes.

While the bridge stands:

- it must remain runnable, and Stage 1 must not remove an existing officer workflow;
- it receives **only** security, compatibility, or operational fixes — no new product work;
- new product functionality goes to `mobile/`.

**Completing Stage 1 does not authorise retiring it.** Retirement requires a verified mobile
replacement for every still-required officer workflow, acceptance testing of those workflows, a
cutover audit finding no operational gap, confirmation that financial operations can continue
safely, and an explicit owner-approved decision recorded in the Decision Log. Until all five hold,
the bridge is part of the operational safety boundary.

## Current Repository — legacy officer bridge

The root codebase is a legacy operating prototype built with:

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase-managed PostgreSQL
- Row Level Security
- Supabase Edge Functions
- TanStack Query and Table
- Zustand

Existing prototype modules include:

- authentication and role-based navigation;
- dashboard summaries;
- property and homeowner records;
- monthly dues generation;
- partial and multi-month payments;
- payment allocations and property credits;
- printable receipts and delinquency reports;
- complaints;
- visitor logs;
- announcements; and
- financial audit logs.

These modules are evidence of prior implementation work. They are **not automatically approved product requirements or production-ready implementations**.

## Confirmed Phase 1 Design Inputs

The approved Phase 1 register establishes these core design inputs:

- Monthly dues are **₱400 per property per month**.
- One owner may own multiple properties; each property is billed separately.
- Multiple families sharing one property still have one combined property-level due.
- There is no formal monthly due date and no monetary late-payment penalty.
- Outstanding balances carry forward.
- Payments are applied to the **oldest unpaid balance first**.
- Cash is the only payment method in the initial approved scope.
- Overpayments become property credit applied to the next month.
- Valid vacant properties are not billed while approved vacant status is active.
- Payment date and billing coverage are separate facts.
- Partial and multi-month payments must remain traceable.
- Receipts use one sequential association-wide number series.
- Receipt numbers must never be deleted or reused.
- Dues and sports fines must be accounted for under separate financial categories.
- Accounts belong to people; properties must not use fake, shared, or default login accounts.
- One personal account may be linked to multiple authorized properties.
- Material actions require traceable actor, reason, approval, date, and audit history.

Some operating practices still require formal HOA documentation, Board resolution, member ratification, or additional evidence before the future system may enforce them as formal association policy.

## Approved Phase 2 Blueprint

The controlling Phase 2 blueprint defines:

1. Structured property and address records.
2. Multi-property ownership.
3. Separate owner, resident, tenant, household, and user-account relationships.
4. Property-level financial accounts.
5. Monthly charges, partial payments, and allocation ledgers.
6. Property credits and next-month application.
7. Vacant-status approval and billing suspension.
8. Sequential receipt control and receipt lifecycle.
9. Separate categories for dues, sports fines, and future charges.
10. Separation of duties and approval records.
11. Delinquency and good-standing workflows with due process.
12. Vehicle-sticker eligibility and issuance records.
13. Officer, Board, and committee assignments with terms.
14. Sports permits, guest rosters, violations, fines, sanctions, and appeals.
15. Announcements, a permanent Knowledge Base, and a policy/document archive.
16. Secure personal-account invitations and access revocation.
17. Complete audit history for material changes.
18. Configurable effective dates and policy versions.
19. Effective-dated ₱400 monthly-dues and ₱200 vehicle-sticker fee rules.
20. A clean Association-controlled Supabase production project, with no legacy personal-project data migration required.

## Documentation

### Controlling Phase 2 blueprint

- [Phase 2 Domain and Service Blueprint v1.0](docs/phase-2/2026-08-04_WONDERLAND_PHASE_2_DOMAIN_AND_SERVICE_BLUEPRINT_v1.0.md)

### Supporting Phase 2 formalization drafts

- [Governance and Operations Formalization Draft Pack v0.3](docs/phase-2/formalization/2026-08-04_WONDERLAND_FORMALIZATION_DRAFT_PACK_v0.3.md)

### Controlling Phase 1 design input

- [Phase 1 Policy, Governance and Controls Register v1.0](docs/phase-1/2026-08-04_WONDERLAND_PHASE_1_POLICY_GOVERNANCE_CONTROLS_REGISTER_v1.0.md)

### Formal HOA follow-up

- [Formal Adoption Action List v0.1](docs/phase-1/2026-08-04_WONDERLAND_FORMAL_ADOPTION_ACTION_LIST_v0.1.md)

### Legacy repository review

- [Legacy Repository Reconciliation and Technology-Stack Review v0.3](docs/reconciliation/2026-07-28_WONDERLAND_LEGACY_REPOSITORY_RECONCILIATION_AND_STACK_REVIEW.md)

Document authority differs by file:

- The Phase 2 blueprint v1.0 is the **controlling product-domain and service design**.
- The Phase 2 formalization pack contains draft resolutions, policies, registers, and procedures that require the stated HOA approval before becoming effective.
- The Phase 1 register remains the controlling discovery and governance input.
- The formal adoption list identifies items still requiring authoritative HOA action or evidence.
- The reconciliation report remains an audit and recommendation artifact; it does not itself approve architecture or implementation.

## Roadmap

| Phase | Status |
|---|---|
| Phase 0 — Legacy reconciliation | Completed |
| Phase 1 — Core discovery and controls | Substantially complete |
| Phase 1 — Formal evidence and HOA adoption | Open and tracked |
| Phase 2 — Domain and service blueprint | **Completed — v1.0 approved** |
| Phase 3 — Architecture and repository strategy | **Authorized to begin in ChatGPT** |
| Phase 4 — Technical implementation | Blocked until Phase 3 approval |

## Development Workflow

Documentation and implementation are intentionally separated:

- **ChatGPT:** requirements, research, analysis, document drafting, review, approval, finalization, and downloadable document production.
- **User:** manually places finalized documents into the repository and performs simple Git commits in the terminal.
- **Claude Code:** reserved for bounded coding, migrations, testing, builds, debugging, and hands-on technical implementation after authorization.

This avoids spending implementation-tool tokens on documentation work and prevents unapproved assumptions from entering the codebase.

## Local Setup — Legacy Prototype Only

The following steps run the existing prototype for inspection. They do not authorize production deployment or use of the legacy migrations against a live project.

### Prerequisites

- Node.js
- npm
- A Supabase project configured for development

### Install

```bash
npm install
```

### Environment variables

Copy the example file to a local ignored file:

```powershell
Copy-Item .env.example .env.local
```

Set these values in `.env.local`:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Never commit real credentials. Do not place a Supabase service-role key in frontend environment files.

### Run

```bash
npm run dev
```

### Available scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

The legacy audit found no automated tests or CI/CD pipeline, and the lint configuration is incomplete. A successful command should not be assumed until it is executed and verified in the current environment.

## Local Setup — Mobile Application (Stage 1)

The Expo application under `mobile/` is the target product. It is **Android-first**
([DEC-03](docs/DECISION_LOG.md#dec-03)); iOS is deferred, not descoped, and no iOS artefact is
required.

### Prerequisites

- Node.js 24
- npm
- An Android device with Expo Go or a development build, or an Android emulator
- An Expo account, for EAS builds only

### Install

```bash
cd mobile
npm ci
```

The mobile application has its own `package.json` and `package-lock.json`. Do **not** run `npm`
for it from the repository root, and do not add mobile packages to the root manifest.

### Environment variables

```bash
cd mobile
cp .env.example .env
```

`mobile/.env` is git-ignored. Fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
EXPO_PUBLIC_AUTH_EMAIL_DOMAIN=auth.wonderland.invalid
```

Every variable here is `EXPO_PUBLIC_*` and is therefore embedded in the shipped bundle. Only the
project URL and a **publishable** key belong in it. A service-role key, secret API key, database
password, admin access token, or Expo personal access token must never appear in `mobile/.env`, in
source, in EAS public variables, or in a bundled asset.

The root web bridge keeps its own separate `VITE_*` variables. The two environment files stay
separate — privileged credentials must not move into a shared root/mobile file.

### Run on Android

```bash
cd mobile
npm run android      # start Metro and open on a connected device or emulator
npm start            # start Metro only
```

### Available mobile scripts

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
npm run test         # jest --watch
npm run test:ci      # jest --ci --runInBand
npm run doctor       # expo-doctor dependency check
```

### Android builds (EAS)

EAS requires an interactive login and is not run by CI. From `mobile/`:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Profiles `development`, `preview` and `production` are configured in `mobile/eas.json`. The
`development` profile expects a development client — run `npx expo install expo-dev-client`
before using it. Stage 1 only requires an Android `development` or `preview` build; no Play Store
release is performed.

The approved Android application id is `ph.wonderlandtownhomes.hoa`
([DEC-21](docs/DECISION_LOG.md#dec-21)). Changing it after store distribution is consequential, so
it is not to be edited casually.

### Resident accounts

Residents do not self-register ([DEC-20](docs/DECISION_LOG.md#dec-20)). The HOA verifies the
person, provisions the account, assigns the login handle and issues the credentials; the resident
then signs in. The mobile application exposes **Log In** only.

The login credential is a property-derived **login handle**
([DEC-18](docs/DECISION_LOG.md#dec-18)) — for example `115.sampaguita` — not an email address and
not the person's legal name. The application converts it to an internal, non-routable Supabase Auth
email alias purely as a transport; residents never see that alias.

## Security and Production Warning

The current implementation has known schema, authorization, auditability, receipt-control, and policy-alignment gaps. In particular:

- the property model does not yet store a separate official street;
- house number is globally unique in the legacy schema;
- privileged database functions require role, ownership, grant, identity, and `search_path` hardening;
- the dues-generation Edge Function lacks HOA-role authorization in its own code;
- financial actor attribution is not reliably bound to the authenticated caller;
- the current printed receipt number is not a valid physical receipt-control mechanism;
- existing migrations encode legacy rules that do not match the approved Phase 1 register.

**Do not deploy the current prototype as a production financial system and do not apply its migrations to a production database without the approved Phase 3 technical decision, reviewed migration plan, and verified tests.**

## Supabase Environment Direction

The current Supabase project under the developer's personal account is a disposable development/prototype environment. It contains no useful production data and no real resident, property, authentication, or financial information requiring migration.

Before production adoption:

- create a clean Association-controlled Supabase organization and project;
- make the Association responsible for billing;
- use individual privileged accounts rather than shared credentials;
- assign at least two Association-designated owners;
- retain developer access only through an authorized technical-support role;
- apply only the Phase 3-approved schema, security controls, migrations, tests, backup, and recovery plan.

## Repository Safety

Environment files containing real values are ignored:

```text
.env
.env.local
.env.*.local
```

Keep `.env.example` limited to placeholders. Never commit service-role keys, database passwords, personal account credentials, or resident data.

## License

No license has been declared yet. Until a license is added, the repository remains under the copyright holder's default rights.
