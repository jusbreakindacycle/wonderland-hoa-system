# Wonderland HOA System
## Phase 3 Architecture and Repository Strategy Decision

## 1. Document Control

| Field | Value |
|---|---|
| Document status | **Approved — Controlling Phase 3 Decision** |
| Version | **1.0** |
| Date | **2026-08-04** |
| Project | Wonderland Homeowners Association Management System |
| Association | Wonderland Homeowners Association, Inc. |
| Phase | Phase 3 — Architecture and Repository Strategy |
| Approved by | Project Owner / Project Steward |
| Decision | **Option C — Controlled Foundation Rebuild in the Existing Repository** |
| Next authorized work | Phase 4, Wave 0 — Engineering and Security Foundation |
| Coding status | **Authorized only within approved Phase 4 Wave 0 boundaries** |
| Documentation workflow | Documentation is completed in ChatGPT. Claude Code is reserved for bounded technical implementation. |

## 2. Purpose

This document records the controlling Phase 3 decisions for the target technology stack, system architecture, repository strategy, Supabase environment strategy, security foundations, and Phase 4 implementation sequence.

It converts the approved Phase 2 Domain and Service Blueprint into an implementation direction without changing the approved business rules.

## 3. Authoritative Inputs

1. `README.md`
2. `docs/reconciliation/2026-07-28_WONDERLAND_LEGACY_REPOSITORY_RECONCILIATION_AND_STACK_REVIEW.md`
3. `docs/phase-1/2026-08-04_WONDERLAND_PHASE_1_POLICY_GOVERNANCE_CONTROLS_REGISTER_v1.0.md`
4. `docs/phase-1/2026-08-04_WONDERLAND_FORMAL_ADOPTION_ACTION_LIST_v0.1.md`
5. `docs/phase-2/2026-08-04_WONDERLAND_PHASE_2_DOMAIN_AND_SERVICE_BLUEPRINT_v1.0.md`
6. `docs/phase-2/formalization/2026-08-04_WONDERLAND_FORMALIZATION_DRAFT_PACK_v0.3.md`
7. Phase 3 Technical Reconnaissance Report dated 2026-08-04
8. Product Owner decisions recorded during Phase 3 review

Source hierarchy:

1. valid law, registered bylaws and formally adopted HOA decisions;
2. approved Phase 1 controls and confirmed operating facts;
3. approved Phase 2 Blueprint v1.0;
4. this approved Phase 3 decision;
5. legacy repository behavior.

The legacy application is evidence and a visual/reference prototype. It is not the authoritative specification.

## 4. Verified Technical Findings

The technical reconnaissance established that:

1. privileged financial operations are exposed through browser-called `SECURITY DEFINER` functions;
2. important functions lack authorization checks;
3. actor identity is accepted from caller-supplied parameters rather than derived from the authenticated session;
4. explicit function execution revocation is absent;
5. no persistent sequential receipt entity or receipt lifecycle exists;
6. receipt numbers are derived in the browser from truncated UUID values;
7. dues and property-credit balances are mutable fields rather than ledger-derived records;
8. the address model conflicts with the approved property-and-street rules;
9. one static profile role is used instead of dated assignments and capabilities;
10. the application does not currently pass TypeScript build checks;
11. linting is not operational;
12. no test suite or CI workflow exists;
13. approved Phase 2 domains are absent or structurally incompatible with the legacy schema.

The security-critical and finance-critical foundations are not suitable for in-place preservation.

## 5. Hosted Supabase Verification Limitation

The hosted Supabase project was not independently inspected during reconnaissance because the Supabase MCP was unavailable in that Claude Code session.

The following remain independently unverified:

- deployed database objects and migration state;
- hosted RLS policies and grants;
- deployed Edge Functions and JWT settings;
- Auth-user count and table row counts;
- storage;
- backups and point-in-time recovery;
- organization owners, billing payer and administrators.

The Product Owner confirms that the personal Supabase project contains no useful production data and no real HOA, resident, property, authentication, receipt or financial information requiring migration.

The project is treated as disposable development/prototype infrastructure. Independent hosted verification remains advisable before deletion.

## 6. Repository Strategy Decision

### Approved option

**Option C — Controlled Foundation Rebuild in the Existing Repository**

Repository:

```text
jusbreakindacycle/wonderland-hoa-system
```

A second repository will not be created.

### Preserve or reuse

- all controlling documentation under `docs/`;
- Git history;
- project README;
- safe Tailwind configuration and presentation styles;
- reusable UI primitives after accessibility review;
- layout and information-architecture ideas;
- receipt visual-design ideas only;
- FIFO allocation as an approved business specification;
- `.gitignore` and placeholder-only environment examples;
- React/Vite/TypeScript familiarity and static hosting.

### Replace

- legacy property and homeowner schema;
- static profile-role authorization;
- all privileged financial RPC functions;
- current RLS policies;
- mutable dues and credit balance model;
- audit-log model;
- receipt generation and numbering;
- Edge Function implementation;
- frontend pages tightly coupled to the rejected domain;
- hand-maintained database types;
- direct browser trust for privileged actions.

### Remove

- client-supplied actor IDs;
- UUID-derived receipt numbers;
- mutable financial balance overwrites;
- unsupported payment methods;
- unattended monthly dues generation;
- stale role predicates used as authority;
- legacy visitor scope from the initial MVP;
- code that contradicts the approved Phase 2 blueprint.

## 7. Target Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- TanStack Table with server-side pagination, filtering and sorting
- Zustand only for limited session/UI state, never authorization
- Zod for validation

Not approved for the initial implementation:

- Next.js or another SSR framework;
- separate always-on Node API;
- microservices;
- native mobile application.

### Backend

- Supabase PostgreSQL
- Supabase Auth
- PostgreSQL RLS
- SQL migrations managed through Supabase CLI
- PL/pgSQL for atomic financial operations
- Supabase Edge Functions only for approved orchestration
- generated Supabase TypeScript types

### Testing and delivery

- Vitest
- pgTAP
- ESLint 9 flat configuration
- `tsc --noEmit`
- GitHub Actions CI
- static frontend hosting
- separate development/test and production Supabase projects

## 8. Supabase Environment Strategy

### Personal prototype

The current personal Supabase project:

- is not production;
- is not authoritative;
- contains no real HOA data according to the Product Owner;
- is not selected for project transfer;
- may be retained temporarily for reference;
- may be exported or snapshotted before retirement;
- must not supply unverified prototype records to production.

### Development/test

Use a disposable hosted Supabase development/test project for:

- migrations;
- pgTAP;
- generated types;
- CI;
- integration testing;
- development without Docker.

### Production

Before operational adoption:

- create an Association-controlled Supabase organization;
- create a clean production project;
- assign at least two Board-designated Association owners using individual accounts;
- place billing and renewals under Association control;
- retain the Project Steward/developer only through authorized technical access;
- enable MFA for privileged accounts;
- keep production credentials, backups and billing records under Association control.

## 9. Approved Technical Decisions

### D1 — Business-rule location

**Approved:** PL/pgSQL for atomic money operations; application services for orchestration, presentation and reporting.

Receipt issuance, cash collection, allocations, credits and related audit events must succeed or fail as one database transaction.

### D2 — Development without Docker

**Approved:** use a dedicated hosted Supabase development/test project.

Use linked forward-only migrations and run pgTAP against controlled hosted test infrastructure.

### D3 — Monthly billing

**Approved:** officer-triggered `prepare → review → post`.

No unattended cron job may create enforceable monthly charges.

### D4 — Receipt rendering

**Approved:** persist the authoritative receipt and receipt lines, then reconstruct printable output from that immutable record.

Generated receipt PDF/image storage is deferred unless later compliance review requires it.

### D5 — Capability model

**Approved:** table-driven capabilities derived from dated assignments and approved delegations.

System records reflect authority; they do not create authority by themselves.

### D6 — Resident and officer application

**Approved:** one application with server-enforced capability-based access and route protection.

### D7 — Personal Supabase prototype

**Approved:** retain temporarily as a non-authoritative reference, then retire after an optional snapshot and final dashboard inspection.

No prototype records are migrated as production facts.

### D8 — Stale remote `development` branch

**Approved:** retire the stale remote `development` branch after this Phase 3 decision is merged and the current reference state is preserved.

## 10. Mandatory Security Architecture

From the first database migration:

1. actor identity comes from `auth.uid()` or an equivalently trusted session identity;
2. financial functions do not accept caller-supplied actor IDs;
3. functions use `SECURITY INVOKER` by default;
4. every required `SECURITY DEFINER` function uses a safe fixed `search_path`, fully qualified objects, explicit `REVOKE`, explicit `GRANT`, and a capability check;
5. sensitive tables use RLS and, where appropriate, `FORCE ROW LEVEL SECURITY`;
6. frontend UI state is never the only authorization boundary;
7. money and sequence operations use row locking;
8. receipt numbers come from a database-controlled sequence inside the issuing transaction;
9. financial balances derive from append-only ledger entries;
10. corrections use reversals or adjustments;
11. audit events are append-only and have non-null authenticated actors;
12. material actions record authority, reason and approval linkage where required;
13. Edge Functions declare JWT behavior in version-controlled configuration and repeat required authorization in code;
14. service-role credentials never reach the frontend;
15. foreign keys and RLS predicate columns receive appropriate indexes.

## 11. Mandatory Engineering Foundations

Before financial or operational features:

1. successful build;
2. passing `tsc --noEmit`;
3. ESLint with zero warnings;
4. passing Vitest;
5. pgTAP database tests;
6. CI on every pull request;
7. forward-only ordered Supabase migrations;
8. generated database types;
9. committed Supabase configuration;
10. server-backed route authorization;
11. escaped rendering sinks;
12. schema validation;
13. root error boundary;
14. server-side pagination;
15. responsive layout;
16. accessible UI primitives;
17. secrets outside Git.

## 12. Repository Transition Controls

Before replacing legacy code:

1. merge this Phase 3 decision into `main`;
2. create an immutable Git reference for the approved prototype state;
3. preserve all `docs/`;
4. begin Wave 0 on a dedicated implementation branch;
5. establish CI before domain implementation;
6. never leave `main` without a preserved prototype reference or a passing replacement foundation;
7. retire the stale `development` branch after the reference state is preserved.

Recommended tag:

```text
legacy-prototype-phase-3-approved
```

## 13. Phase 4 Implementation Sequence

### Wave 0 — Engineering and security foundation

- buildable React/Vite/TypeScript foundation;
- corrected dependencies;
- ESLint 9 flat configuration;
- type-check script;
- Vitest;
- Supabase CLI structure;
- committed Supabase configuration;
- migration discipline;
- GitHub Actions CI;
- generated database types;
- secure database-function template;
- capability-resolution foundation;
- append-only audit-event foundation;
- pgTAP security tests.

### Wave 1 — Property and identity foundation

Controlled streets, properties, people, dated relationships, households, occupancy, invitations, access revocation, assignments and capabilities.

### Wave 2 — Finance and receipt core

Property accounts, effective-dated fees, vacancy cases, reviewed billing batches, cash collections, receipt lifecycle, FIFO allocation, credit ledger, adjustments and reports.

### Wave 3 — Information and governance records

Documents, resolutions, memoranda, forms, announcements, Knowledge Base, officer terms and Board decisions.

### Wave 4 — Eligibility and community operations

Good standing, vehicles, stickers, sports permits, rosters, violations, fines, sanctions and appeals.

### Wave 5 — Service expansion

Complaints, visitor domain after privacy decisions, additional approved services, analytics and exports.

## 14. Wave 0 Entry Gate

Wave 0 may start only after:

- this document is committed and merged;
- local `main` matches `origin/main`;
- the working tree is clean;
- the prototype reference tag is created;
- an implementation branch is created from synchronized `main`;
- Claude Code receives a bounded Wave 0 task.

No Wave 1–5 domain implementation is authorized during the first Wave 0 task.

## 15. Phase Status

| Phase | Status |
|---|---|
| Phase 0 — Legacy reconciliation | Completed |
| Phase 1 — Discovery and governance controls | Substantially complete; adoption items tracked |
| Phase 2 — Domain and service blueprint | Completed — v1.0 approved |
| Phase 3 — Architecture and repository strategy | **Completed — v1.0 approved** |
| Phase 4 — Implementation | **Wave 0 authorized after entry gate** |
| Production deployment | Not authorized |

## 16. Approval Record

| Field | Value |
|---|---|
| Decision | Controlled foundation rebuild |
| Repository | Existing `wonderland-hoa-system` repository |
| Technology direction | React/Vite/TypeScript + Supabase PostgreSQL/Auth/RLS |
| Business-rule boundary | Atomic financial rules in PostgreSQL; orchestration/reporting in application services |
| Development strategy | Hosted Supabase development/test project; no Docker dependency |
| Production ownership | Clean Association-controlled Supabase organization and project |
| Open decisions resolved | D1–D8 approved |
| Approval date | **2026-08-04** |
| Approved by | Project Owner / Project Steward |
| Next work | Phase 4 Wave 0 |

This document is the controlling Phase 3 decision for all later implementation planning and bounded Claude Code tasks.
