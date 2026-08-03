# Wonderland HOA System — Legacy Repository Reconciliation & Technology-Stack Review

## 1. Document Control

| Field | Value |
|---|---|
| Document status | **Working Draft** |
| Version | **0.3** |
| Date created | 2026-07-28 |
| Date last revised | 2026-07-29 |
| Author role | Independent AI Repository Auditor / Business & Systems Analyst / Enterprise, Solution & Data Architect / Privacy Engineer / Cybersecurity Architect / Full-Stack Engineer / Data Analytics Architect / QA Engineer / DevSecOps Architect / Technical Writer (single combined review) |
| Repository (local) | `D:\ALL PROJECTS - 20260725\wonderland-hoa-system` |
| Repository (public) | https://github.com/jusbreakindacycle/wonderland-hoa-system |
| Branch reviewed | `docs/wonderland-legacy-reconciliation` |
| Commit reviewed | `ad104b0` — "feat: initial commit — WHOA System HOA operating platform" (sole commit at time of review) |
| Remotes | `origin` → `https://github.com/jusbreakindacycle/wonderland-hoa-system.git` |
| Review type | Documentation-only legacy-repository reconciliation and technology-stack review |
| Authority of this document | This document is an **audit and recommendation artifact**. It does not itself constitute an approved architecture, an approved policy, or an approved stack decision. Nothing in this document authorizes implementation. |

### Revision History

| Version | Date | Change summary |
|---|---|---|
| 0.1 | 2026-07-28 | Initial working draft. |
| 0.2 | 2026-07-28 | Independent review found v0.1 stated unverifiable platform behavior as fact, misdescribed the address field's actual storage capability, missed an existing `units.status` vacancy flag, treated a fixable schema constraint as proof that in-place migration was categorically non-viable, omitted a SECURITY DEFINER `search_path`/grants hardening review, and scored the stack options unevenly (penalizing "harden in place" for vulnerabilities that option explicitly proposes to fix). v0.2 corrected these factual, methodological, security-wording, and architecture-comparison issues; added four previously missing analyses (`database.types.ts` provenance, dashboard-metric reliability, MVP scope, and SECURITY DEFINER search-path hardening); and revised the stack decision matrix, migration-strategy comparison, and reuse classifications. Relevant repository evidence was re-inspected through read-only operations against the same reviewed commit. No source, schema, or configuration was modified. |
| 0.3 | 2026-07-29 | Final technical-precision and internal-consistency pass. Corrected the distinction between three scored technical options and the unscored Option D decision strategy; aligned Phase 2–4 sequencing; clarified `SECURITY DEFINER` privilege, RLS, ownership, default `EXECUTE`, and `search_path` implications; corrected the function/trigger inventory; bounded the `database.types.ts` provenance and drift claims; added the documented default-versus-deployed-state nuance for Edge Function JWT verification; and replaced categorical accessibility claims with evidence-bounded findings. No matrix score or overall recommendation changed. |

---

## 2. Executive Summary

The Wonderland HOA System repository is a working, single-commit prototype built on React 18 + Vite + TypeScript + Tailwind CSS on the frontend, and Supabase (managed Postgres, Auth, Row Level Security, one Edge Function) on the backend. It already implements a materially complete first pass at HOA operations — unit/homeowner records, monthly dues generation, FIFO payment allocation with partial-payment support, a per-unit credit wallet, void/waive/refund workflows, complaints, visitor logging, announcements, and a role-gated audit log — with no automated tests, no CI/CD, and no project documentation.

Reconciled against the authoritative updated Wonderland baseline supplied for this review, the repository diverges in one **structurally significant** way and contains several **security-significant** implementation gaps:

- The property/address model does not match the baseline, though not in the way early drafts of this review overstated. The `units` table stores a single free-text `house_no` column with **no separate street name field**, and `house_no` is enforced **globally unique** across the entire community. `house_no` is unconstrained text, so it **can** already store opaque strings like `"113"` or `"113-A"` today — the defect is not that the field is incapable of holding such values. The verified gaps are: no `street_name` column; a global (not per-street) uniqueness constraint that would reject legitimate same-numbered houses on different streets under the baseline's 5-street model; no normalization of house-number/street values; no support for a controlled street list; and no explicit structural representation of corner, merged, divided, duplicate-numbered, or multi-household properties. This is a **significant structural gap relative to the baseline**, not a blocking data-capacity defect.
- Several business rules the updated baseline explicitly marks as **unverified HOA policy** are already hardcoded as if they were settled: a ₱2,000 monthly due amount, a due date fixed to "the 5th of the following month," and FIFO as the only payment-allocation strategy. None of these may be treated as approved policy going forward.
- Three Postgres `SECURITY DEFINER` functions (`process_payment`, `generate_monthly_dues`, `preview_payment_allocation`) contain no internal role check, and none of the repository's eight `SECURITY DEFINER` functions sets a safe, explicit `search_path` or consistently schema-qualifies its object references (Section 12A). A `SECURITY DEFINER` function executes with its owner's privileges; whether that results in RLS being bypassed depends on live ownership, role privileges, `BYPASSRLS`, table ownership, and `FORCE ROW LEVEL SECURITY` settings that were not inspected. The repository also contains no explicit function ownership declarations or selective `EXECUTE` grants. The community's sole Edge Function (`generate-monthly-dues`) performs **no caller or HOA-role authorization in its own code** before using a service-role client that bypasses RLS. Supabase documents JWT verification as the platform default for Edge Functions, but that default can be changed during deployment; because the repository contains no `supabase/config.toml` or deployment record, the deployed setting remains **unresolved from source**. Regardless of that setting, the function contains no HOA-role authorization. Separately, the billing-engine functions accept client-supplied `actor_id`/`received_by` values that are written into the audit log without verification against the authenticated session, so audit attribution is not reliably bound to the actual caller.
- The repository has no automated tests, no CI/CD pipeline, no README or docs, no accessibility (ARIA) attributes, and no PWA/offline support for a low-bandwidth resident-facing use case. (No automated tests were found; no coverage percentage was measured, because no test run was executed.)

None of this is a criticism of the prototype's value: the domain modeling for payment allocation, partial payments, the credit wallet, and the RLS-based authorization pattern are genuinely reusable **concepts** — not necessarily reusable as currently implemented — and much of the SQL and UI structure is a reasonable starting point. But per the instructions governing this review, existing code is evidence of a prior attempt, not proof of approved architecture or approved HOA policy.

This document's Section 24 develops a weighted comparison of **three scored technical options** — (A) harden the existing React/Vite/Supabase stack, (B) Next.js App Router on Supabase with a server-side application-service layer, and (C) Next.js/Postgres with a different database/auth architecture where operationally justified — plus **one unscored, framework-neutral decision strategy (Option D)** that defers the React-vs-Next.js choice until Phase 3. The scored results are **close enough that the A-versus-B point spread alone is not decisive** (Section 24). At moderate confidence, a **server-mediated architecture that derives actor identity from the verified session rather than trusting client input** scores best, whether delivered via Next.js server handlers (Option B) or via properly authorized Supabase Edge Functions/RPCs within the existing stack (Option A) — this document does not give Next.js exclusive credit for that property. Given the evidence gaps that remain (Phase 1 HOA policy answers, live-deployment `verify_jwt`/grants facts, and whether production data already exists), this document treats **deferring final stack approval to Phase 3 (Option D)** as an equally legitimate outcome and does not force a premature framework decision. Section 26 finds that a simple in-place migration of the address model is **technically possible** (financial and related tables reference the immutable `units.id` UUID, not the address text), so the address defect alone does not prove in-place migration is non-viable; a controlled foundation rebuild may still be justified, but only on the **combined** weight of domain-model correctness, security posture, auditability, absent testing/CI, and maintainability — with selective reuse of the payment-allocation design, the credit-wallet ledger concept, the RLS role model, and the report/receipt layouts, none of which are endorsed as directly reusable in their current implementation without further hardening or HOA validation.

No code, schema, or configuration in this repository was modified to produce this document.

---

## 3. Scope, Evidence and Limitations

**Scope.** This review covers the repository as committed at `ad104b0` on branch `docs/wonderland-legacy-reconciliation`. It inspects tracked source files, SQL migrations, Edge Function code, package manifests, and configuration. It evaluates the repository against the updated Wonderland baseline supplied in the task instructions, not against the repository's own internal assumptions.

**Evidence-gathering method.** Three parallel read-only research passes were conducted:
1. Technology stack, project structure, module inventory, testing, CI/CD, accessibility, and documentation.
2. Database/domain model: address/property schema, ownership/occupancy, financial-account model, dues/billing, payments/allocations/receipts, credits/refunds/waivers/voids, Row Level Security policies, `SECURITY DEFINER` functions, the Edge Function, and client-supplied-actor-ID patterns.
3. Authentication, session handling, frontend authorization, and audit-attribution patterns.

Only `Read`, `Grep`, and `Glob`-equivalent operations and read-only `git` commands (`status`, `log`, `remote -v`) were used. No file was written to, modified, or deleted in the repository other than this new document and its parent directory.

**Limitations.**
- No remote Supabase project was accessed. Postgres `GRANT`/`EXECUTE` permissions on functions are **not defined in the tracked migrations**, so this review cannot confirm which database roles can actually invoke `process_payment`, `generate_monthly_dues`, or `preview_payment_allocation` in the live environment — only that the migrations, as tracked, do not themselves restrict this. This is flagged as an Unresolved Question (Section 22) and a risk (Section 28), not asserted as a confirmed exploit.
- No `supabase/config.toml` or deployment record exists in the repository, so the deployed Edge Function's `verify_jwt` setting cannot be confirmed from source. Supabase documents JWT verification as the default, but deployment configuration can change that behavior. The function's own code performs no HOA-role authorization regardless of the platform setting.
- `.env`/`.env.local` files were not opened; only `.env.example` (placeholder key names, no real values) was read. No secret values are quoted anywhere in this document.
- No `npm install`, `npm ci`, build, lint, or test command was executed. Findings about tooling (e.g., the missing ESLint config) are based on static inspection, not a live run.
- This document reflects the state of the single commit reviewed. It will need to be re-validated if the repository changes before Phase 1 work begins.
- For the v0.3 precision pass, generic PostgreSQL and Supabase platform behavior was cross-checked against official product documentation. Those references clarify platform semantics and defaults; they do not establish the ownership, grants, RLS state, or deployment configuration of any live Wonderland environment.

---

## 4. Updated Wonderland Baseline

*(Restated from the task instructions. Label: User-Confirmed Domain Fact — supplied directly by the user as the authoritative baseline for this review, not derived from the repository.)*

- **Project**: Wonderland Homeowners Association Management System.
- **Community**: Wonderland Townhomes, Barangay Namayan, Mandaluyong City, Philippines — explicitly distinct from a separate, similarly named Wonderland community in Barangay Mauway.
- **Covered streets**: Wonderland Avenue, Sampaguita, Yellowbell, Orchids, Sunflower. **Circle is explicitly excluded.**
- **Property model**: no subdivision phase, block, or lot. A property is identified operationally by house number + street name (e.g., "113 Sampaguita St.", "117 Wonderland Avenue"). House number and street name must be **separate structured values**. House number alone must **not** be globally unique. The design must use an immutable internal property identifier; address uniqueness should normally combine normalized house number + street name, while still accommodating "113" vs "113-A", front/rear residences, multiple households at one address, merged/divided properties, corner properties, and informal/duplicate numbering.
- **Financial account model**: balances attach to the **property**, not to the current homeowner, resident, tenant, household, or application account. Ownership/occupancy may change while financial history persists.
- **Confirmed payment behavior**: receipt date is recorded; billing coverage period is recorded separately; one payment may cover multiple billing months; partial payments are allowed; payments and allocations must remain traceable; financial history must never be silently overwritten.
- **Unverified HOA rules** (must not be approved or preserved as policy from the legacy code): exact monthly dues, due dates, penalty amount/formula, grace periods, penalty frequency, penalty-waiver authority, charge-voiding authority, allocation priority (FIFO or otherwise), overpayment-credit treatment, refund authority, receipt numbering, cancelled/voided/replacement-receipt handling, unused-receipt handling, GCash reconciliation, bank-transfer reconciliation, vacant-property billing, write-off authority, automatic recurring dues generation.

This baseline supersedes anything the repository currently implements or assumes about any of the above.

---

## 5. Existing Repository and Stack

*(Label: Verified Repository Fact for all rows below.)*

| Technology | In use? | Evidence |
|---|---|---|
| React 18.3.1 | Yes | `package.json` deps; `src/main.tsx`, `src/App.tsx` |
| Vite 5.4.21 | Yes | `vite.config.ts` (react plugin, `@` → `./src` alias); `dev`/`build`/`preview` scripts |
| TypeScript 5.9.3 (strict) | Yes | `tsconfig.json` (strict, `noUnusedLocals`); all source is `.ts`/`.tsx` |
| Tailwind CSS 3.4.19 | Yes | `tailwind.config.ts` (custom `brand` palette); `postcss.config.js`; `src/index.css` |
| Supabase JS 2.106.1 | Yes | `src/lib/supabase.ts`; `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |
| PostgreSQL | Yes, via Supabase only | No direct `pg`/`postgres` driver dependency; all access is through Supabase's REST/RPC layer. Postgres is evidenced by raw DDL/PL-pgSQL in `supabase/migrations/*.sql` |
| Other real dependencies | — | `@tanstack/react-query` 5.x (data fetching/caching), `@tanstack/react-table` 8.x, `zustand` 5.x (state), `react-router-dom` 6.x, `react-hot-toast`, `lucide-react` |
| Dev tooling declared but non-functional | — | ESLint 9 + `@typescript-eslint` are dependencies and a `lint` script exists (`package.json`), but **no ESLint config file exists anywhere in the repo** (no `eslint.config.js`, no `.eslintrc*`) — the `lint` script cannot currently run correctly against ESLint 9's flat-config requirement. |

**Deployment/CI/CD**: none present. No `.github/` workflows, no Dockerfile, no `vercel.json`/`netlify.toml`, no `supabase/config.toml`. Migrations are intended to be pasted manually into the Supabase SQL Editor (per comments inside each migration file), not run via Supabase CLI or a pipeline.

**Testing**: none present. No test framework dependency, no `*.test.*`/`*.spec.*` files, no `test` script.

**Documentation**: none present. No README at any level, no `docs/` folder (prior to this document), no architecture notes or ADRs. The branch name (`docs/wonderland-legacy-reconciliation`) does not correspond to any pre-existing documentation content in the working tree.

**Accessibility / low-bandwidth**: no `aria-*` attributes were found repository-wide. Significant accessibility gaps were verified in the shared `Modal`: no explicit dialog semantics, no focus trap or documented focus restoration, and no Escape-key close behavior. Some native HTML semantics remain, and a complete accessibility-conformance assessment was not performed. No PWA manifest, service worker, or `vite-plugin-pwa` was found. `index.html` references `/favicon.svg`, but no `public/` directory exists, so this asset reference is currently broken.

---

## 5A. `database.types.ts` Provenance and Drift Risk

*(Labels: Verified Repository Fact where stated; Technical Inference or Unverified where provenance/completeness cannot be established.)*

- `src/lib/database.types.ts` contains no code-generation banner, `DO NOT EDIT` notice, or repository automation showing how it was produced. It **appears manually maintained**, but its original provenance cannot be established conclusively from the file alone; it could have been generated and later edited.
- The review compared the table-column shapes represented in the file against the tracked migrations, including the post-`003_house_no.sql` `units` shape. No confirmed table-column mismatch was identified in the portions compared; specifically, `units` declares `id`, `house_no`, generated `unit_code`, `status`, and `created_at`, consistent with the tracked migration state.
- The file also contains relationship metadata and RPC signatures, while declaring `Views`, `Enums`, and `CompositeTypes` as empty records. This review did **not** establish that every relationship annotation, function signature, return shape, view, enum, or other generated API surface is complete and synchronized with a live database. Those surfaces remain unverified rather than defect-free.
- **Standing drift risk**: no script, CI job, or documented process regenerates or compares this file against the tracked or deployed schema. A modernization pass should establish provenance and either generate the types reproducibly or add a version-controlled schema/type drift check.

---

## 6. Feature and Module Inventory

*(Label: Verified Repository Fact.)*

| Module | Route | Key files | Summary |
|---|---|---|---|
| Auth / Login | unauthenticated gate | `src/components/auth/LoginPage.tsx`, `src/stores/authStore.ts` | Email/password sign-in only; no signup, OAuth, magic link, or password reset UI |
| Layout / Navigation | wraps all routes | `src/components/layout/Layout.tsx`, `Sidebar.tsx` | Role-filtered nav links, sign-out |
| Dashboard | `/dashboard` | `src/pages/dashboard/DashboardPage.tsx` | Finance-role-gated summary cards, recent payments, delinquency table + PDF export, complaints/visitor overview, admin-only System Config panel (edit dues amount, manually trigger monthly dues generation) |
| Units & Homeowners | `/units` | `src/pages/units/UnitsPage.tsx`, `useUnits.ts`, `useHomeowners.ts` | Unit list/search/detail, add unit, assign/edit homeowner, mark-moved-out flow |
| Dues | `/dues` | `src/pages/dues/DuesPage.tsx`, `useDues.ts` | Filterable dues table; void/waive with mandatory reason |
| Payments | `/payments` | `src/pages/payments/PaymentsPage.tsx`, `usePayments.ts` | Record payment, live FIFO allocation preview, printable receipt |
| Receipts | modal (sub-feature of Payments) | `src/lib/printPDF.ts` | Generates an HTML "Official Payment Receipt" via `window.print()` |
| Delinquency report | modal (sub-feature of Dashboard) | `src/lib/printPDF.ts` | Printable A4-landscape delinquency report |
| Complaints | `/complaints` | `src/pages/complaints/ComplaintsPage.tsx`, `useComplaints.ts` | Submit/track complaints; officer view of all vs. resident view of own |
| Visitors | `/visitors` | `src/pages/visitors/VisitorsPage.tsx`, `useVisitors.ts` | Security-role visitor log-in/out |
| Announcements | `/announcements` | `src/pages/announcements/AnnouncementsPage.tsx`, `useAnnouncements.ts` | Post/read announcements, nominal targeting (all/block/unit) |
| Audit Log | `/audit` | `src/pages/audit/AuditLogPage.tsx`, `useAuditLogs.ts` | Read-only log of the 5 billing-engine actions |
| Reports/Analytics | — | not a distinct module | Reporting is limited to the Delinquency Report and Payment Receipt; no standalone Reports route |
| Admin/Settings | embedded in Dashboard | `SystemConfigPanel` in `DashboardPage.tsx` | No separate `/admin` or `/settings` route |
| RBAC helpers (cross-cutting) | — | `src/lib/auth.ts` | 10-role enum (`admin, president, vice_president, treasurer, secretary, auditor, pro, board_member, security, resident`) with permission-check functions |
| Shared UI kit | — | `src/components/ui/*` | `Badge`, `Button`, `DataTable` (TanStack Table), `Input`, `Modal`, `Select` |

---

## 7. Address-Model Reconciliation

| Baseline requirement | Repository reality | Gap | Severity | Evidence label |
|---|---|---|---|---|
| House number and street name are separate structured values | `units.house_no` is a single free-text column with **no street name column at all** | Full non-conformance | **Blocker** | Verified Repository Fact — `supabase/migrations/003_house_no.sql` (renames `block`→`house_no`); no `street_name`/`street` column in `001_initial_schema.sql` or `003_house_no.sql` |
| House number alone must not be globally unique | `house_no` carries `UNIQUE (house_no)` — a global constraint | Direct contradiction; would reject legitimate same-numbered houses on different streets, and cannot exist once street-name is added without breaking the constraint | **Blocker** | Verified Repository Fact — `003_house_no.sql`: `ALTER TABLE units ADD CONSTRAINT units_house_no_key UNIQUE (house_no);` |
| No subdivision phase, block, or lot terminology | Original schema used `block`/`lot` columns (migrated away by `003_house_no.sql`), but the literal string `'block'` survives as an `announcements.target` CHECK value and as `uiStore.activeBlock` client state, disconnected from any real column | Partial non-conformance — dead/misleading terminology remains in a different module | Moderate | Verified Repository Fact — `001_initial_schema.sql` (`target CHECK (target IN ('all','block','unit'))`); `src/stores/uiStore.ts` |
| Immutable internal property identifier | `units.id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, referenced by all FKs (dues, payments, homeowners, etc.), independent of the address text | Conforms | — | Verified Repository Fact — `001_initial_schema.sql` |
| Support for "113" vs "113-A" | `house_no` is unconstrained free text (`text` type, no format/length CHECK; UI placeholder literally suggests `"12, 12A, 14B"`) | **`house_no` can already store both `"113"` and `"113-A"` as distinct opaque strings today — this is not a data-capacity limitation.** The actual gaps are: no separate `street_name` column to pair with the house-number string; a `UNIQUE(house_no)` constraint that is global rather than scoped per street, which would reject the baseline's legitimate same-numbered-different-street scenario; no normalization of the string (e.g., case/whitespace/suffix handling); no controlled/validated street-name values; and no explicit structural model for corner, merged, divided, or multi-household properties | Major (structural gap) — not a data-capacity blocker | Verified Repository Fact — `src/pages/units/UnitsPage.tsx` placeholder text; `003_house_no.sql` (column type, `UNIQUE(house_no)`) |
| Front/rear residences, multiple households at one address | Not modeled. `homeowners.unit_id` has no uniqueness constraint (so DB permits multiple rows), but the schema comment says "Homeowners (one per unit)" and application code enforces single-active-owner-per-unit, i.e. the *intent* is one owner lineage per unit, not concurrent multi-household residency | Non-conformance | Major | Verified Repository Fact — `001_initial_schema.sql` comment; `src/hooks/useHomeowners.ts` |
| Merged/divided properties, corner properties, informal/duplicate numbering | No structural support anywhere in the schema | Non-conformance | Major | Verified Repository Fact — absence confirmed across all three migrations |

**Conclusion**: the address/property model is the single most consequential reconciliation gap in this repository, but the gap is structural, not a matter of the field being unable to hold the right strings. `house_no` can already store values like `"113-A"`; what it cannot do is pair a house number with a separate street value, enforce uniqueness per street rather than globally, or represent corner/merged/divided/multi-household properties. The global `UNIQUE (house_no)` constraint is structurally incompatible with the baseline's five-street, non-globally-unique house-number model and should change before real occupancy/financial data is populated at scale — but, as detailed in Section 26, this does not by itself require abandoning the existing `units` table or an in-place migration path, since the immutable `units.id` UUID (not the address text) is what every other table references. This is not an unverified *policy* question, it is a **verified structural gap** relative to a fact the user has already confirmed (the community's real street layout). Classified **REIMPLEMENT** for the address/property schema specifically (Section 23); this does not mandate REIMPLEMENT for the surrounding repository as a whole (see Section 26).

---

## 8. Property, Ownership and Occupancy Reconciliation

| Baseline expectation | Repository reality | Gap | Severity |
|---|---|---|---|
| Ownership/occupancy may change while property financial history persists | Financial tables (`dues`, `payments`, `unit_credits`, `payment_allocations`) key off `unit_id`, never `homeowner_id` — history is already property-anchored, which matches the baseline's intent | Conforms | — |
| Not strictly one-to-one between homeowner and property | `homeowners` has no `UNIQUE(unit_id)` constraint, and carries `is_active`, `move_in_date`, `move_out_date` — a history-capable shape in principle | Partial conformance: the *shape* allows history, but "only one active owner at a time" is enforced **only in application code** (`useHomeowners.ts`), not by a DB constraint or trigger — a direct `insert` bypassing the app (or a future second client) could create two simultaneously-active homeowner rows for one unit | Major | Verified Repository Fact |
| Tenant / occupant distinction from owner | No such distinction exists — `homeowners` conflates owner and occupant, with no `occupancy_type` or separate tenant table | Non-conformance (the baseline text refers to "homeowner," "resident," and "tenant" as distinct concepts whose balances must not follow any of them individually) | Major | Verified Repository Fact |
| Explicit ownership/occupancy history table | Does not exist; `homeowners` doubles as both current-occupant record and informal history log via `is_active`/`move_out_date` | Partial non-conformance — workable as a starting shape, not a purpose-built history model | Moderate | Verified Repository Fact |

---

## 9. Billing and Financial-Account Reconciliation

| Baseline expectation | Repository reality | Reconciliation note |
|---|---|---|
| Balances attach to the property | `dues.unit_id`, `payments.unit_id`, `unit_credits.unit_id` (unique per unit) — no `homeowner_id`/`profile_id` FK on any financial table | **Conforms.** This is the one financial-model area where the prototype already matches the baseline's core principle. |
| Billing coverage period recorded separately from due date | `dues.billing_month` (coverage) is a distinct column from `dues.due_date`, with `UNIQUE(unit_id, billing_month)` | **Conforms structurally.** |
| Exact monthly dues amount is unverified HOA policy | Hardcoded seed value `2000` in `system_config` (`monthly_dues_amount`), read by `generate_monthly_dues()` but with no in-repo mechanism to change it except direct SQL/admin-role table write | **Legacy Assumption — must not be approved.** See Section 21. |
| Due date, penalty rules, grace periods are unverified HOA policy | Due date hardcoded as "5th of the month following the billing month" **inside the PL/pgSQL function body** (`002_billing_engine.sql`), not configurable via `system_config`; no penalty, grace-period, or penalty-frequency logic exists anywhere in the schema at all | **Legacy Assumption (due date) — must not be approved.** Penalty/grace-period logic is simply **absent**, not merely unverified — flagged as Unresolved Question, not a gap to "fix" until HOA policy is known. |
| Automatic recurring dues generation is unverified HOA policy | `generate_monthly_dues()` exists and is both admin-UI-triggerable and reachable via an Edge Function whose own code performs no authentication/authorization check (platform-level enforcement unresolved — Section 13); a commented-out `pg_cron` schedule exists in the migration but is not active | **Legacy Assumption — must not be approved as automatic/recurring policy.** Currently manual-trigger only in the live code path, which is actually closer to "safe until confirmed" than the commented cron would have been. |
| Vacant-property billing is unverified HOA policy | The `units` table **does** carry a `status` column, CHECK-constrained to `'occupied'`/`'vacant'` (`001_initial_schema.sql`), and it is actively used in the UI (unit badges, add/edit-unit form, move-out flow). However, `generate_monthly_dues()` selects `SELECT id FROM units` with **no `WHERE status = ...` filter** — its own inline comment reads "occupied AND vacant" — so the legacy implementation appears to intentionally bill every unit regardless of occupancy status | **Legacy Assumption — must not be approved.** The flag exists; whether it *should* gate billing is an unresolved HOA policy question (Section 22). |

---

## 10. Payment, Allocation and Receipt Findings

| Area | Repository reality | Evidence | Severity / label |
|---|---|---|---|
| Partial payments & multi-month coverage | Fully supported via `payment_allocations` (`payment_id`, `due_id`, `amount_allocated`); `process_payment()` loops over unpaid/partial dues, allocating across as many months as the payment covers | `002_billing_engine.sql` | Conforms — reusable design |
| Allocation priority (FIFO) | **Hardcoded** — `ORDER BY due_date ASC` in both `process_payment()` and `preview_payment_allocation()`; no alternative strategy or configuration exists | `002_billing_engine.sql` | **Legacy Assumption — FREEZE PENDING HOA VALIDATION** (Section 21) |
| Overpayment / credit treatment | Overpayment automatically becomes a per-unit credit balance (`unit_credits`, upserted via `ON CONFLICT (unit_id) DO UPDATE`); consumed automatically on the next `process_payment()` call | `002_billing_engine.sql` | **Legacy Assumption — FREEZE PENDING HOA VALIDATION** |
| Receipt numbering | **Not a real numbering scheme.** The "OR No." printed on receipts is the first 10 hex characters of the payment's UUID, computed client-side at print time (`printPDF.ts`); no `receipt_number` column exists on `payments`, nothing is stored, nothing is guaranteed sequential or globally consistent with any physical receipt book | `src/lib/printPDF.ts` | **Critical / Legacy Assumption** — this cannot be treated as the HOA's receipt-numbering policy; if the HOA uses a physical/sequential OR booklet, this scheme is actively incompatible with it |
| Cancelled / voided / replacement receipts | No concept exists for *payments* — only *dues* can be voided/waived. Voiding a due reverses its `payment_allocations` back into `unit_credits`, but the original `payments` row is never flagged, cancelled, or replaced | `002_billing_engine.sql` | **Legacy Assumption — Unresolved Question** |
| Waivers / write-offs | `void_or_waive_due(p_due_id, p_action, p_reason, p_actor_id)` — mandatory reason enforced; `'waive'` is the de facto write-off mechanism (no separate write-off table); `'void'` reverses allocations to credit | `002_billing_engine.sql` | **Legacy Assumption — FREEZE PENDING HOA VALIDATION** for waiver/void authority |
| Refunds | `approve_credit_refund()` only **zeroes the credit balance** and logs a `credit_transactions` row — it performs no external payout/reconciliation; presumably intended as a bookkeeping record of a manual/offline refund | `002_billing_engine.sql` | **Legacy Assumption — Unresolved Question** (refund authority, actual disbursement mechanism unconfirmed) |
| GCash / bank-transfer reconciliation | `payments.payment_method` and `reference_number` fields exist, but there is no reconciliation workflow, no bank/GCash statement import, no matching logic | `001_initial_schema.sql` | **Unresolved Question** — likely fully manual today |
| Vacant-property billing | `units.status` (CHECK-constrained to `'occupied'`/`'vacant'`) exists and is used elsewhere in the app, but `generate_monthly_dues()` selects every unit with no status filter — the legacy implementation appears to bill occupied and vacant properties alike | `001_initial_schema.sql` (`status` column); `002_billing_engine.sql` (unfiltered `SELECT id FROM units`, comment: "occupied AND vacant") | **Legacy Assumption — Unresolved Question** (whether excluding vacant units is correct HOA policy is unconfirmed) |
| Traceability | Every payment→due relationship is captured in `payment_allocations`; financial history is not overwritten by normal flows (void reverses via new rows/updates, not deletion) | `001_initial_schema.sql`, `002_billing_engine.sql` | Conforms to the "must remain traceable, must not be silently overwritten" baseline requirement, **except** for the audit-attribution integrity issue in Section 11 |

---

## 11. Security and Authorization Findings

*(Severity-ordered.)*

1. **[Critical] Client-supplied, unvalidated actor identity in three privileged RPCs.** `process_payment(..., p_received_by ...)`, `void_or_waive_due(..., p_actor_id)`, and `approve_credit_refund(..., p_actor_id)` all accept the acting user's ID as a plain parameter and write it directly into `payments.received_by`, `dues.voided_waived_by`, `credit_transactions.created_by`, and `audit_logs.actor_id` — **none of them assert `p_actor_id = auth.uid()`**. Frontend calls (`src/hooks/usePayments.ts`, `src/hooks/useDues.ts`) always send the current user's own ID, but because the check lives nowhere server-side, any caller who can invoke these RPCs directly (e.g., a scripted call using a valid session token) can attribute a financial action to a different user, defeating non-repudiation of the audit trail. Notably, `complaints.submitted_by` is enforced correctly elsewhere in the same schema via an RLS `WITH CHECK (submitted_by = auth.uid())` clause — the project demonstrates it knows the correct pattern but did not apply it to the billing engine.
2. **[Critical] Three `SECURITY DEFINER` functions have no internal role check, while ownership and execution privileges are undeclared in version control.** `process_payment`, `generate_monthly_dues`, and `preview_payment_allocation` perform no `has_any_role(...)` check inside the function body. `SECURITY DEFINER` executes with the function owner's privileges; whether table RLS is bypassed in practice depends on the live function owner, table ownership, `BYPASSRLS`, and `FORCE ROW LEVEL SECURITY` state, none of which was inspected. The tracked migrations also contain no explicit ownership declarations, `REVOKE`, or selective `GRANT EXECUTE` statements. PostgreSQL normally grants function execution to `PUBLIC` by default unless it is revoked, but the actual live grants remain unresolved. `preview_payment_allocation` is therefore a potential information-disclosure surface because its body does not verify that the caller is a permitted finance role or is linked to the requested property.
3. **[Critical] The `generate-monthly-dues` Edge Function's own code performs no caller or HOA-role authorization before privileged execution.** Verified: it creates a Supabase client with the service-role key, which bypasses RLS, and gates only on HTTP method (`POST`). It does not parse or validate the caller's `Authorization` header, resolve the authenticated user, or check an HOA role before invoking dues generation. CORS is fully open (`Access-Control-Allow-Origin: *`). Supabase documents platform JWT verification as the default for Edge Functions, but that setting can be changed at deployment. Because this repository contains no `supabase/config.toml` or deployment record, anonymous reachability remains unresolved. If JWT verification is enabled, a valid JWT alone still does not establish the necessary HOA role because the function body contains no role check; if it is disabled, anonymous invocation may also be possible. Confirming the deployed setting is a live-environment task outside this review's scope.
4. **[Major] `profiles.is_active` is never enforced anywhere in the database layer.** Neither `get_my_role()`, `has_any_role()`, nor any RLS policy checks it. Flipping a departed officer's `is_active` to false in the app does not revoke their actual Supabase Auth session or RLS-derived privileges; true de-provisioning requires disabling/deleting the underlying `auth.users` row, which is outside this repository's code.
5. **[Moderate] No route-level authorization guards in the SPA.** `src/App.tsx` gates only on "authenticated vs. not" — any authenticated user, including a plain `resident`, can navigate directly to `/dues`, `/payments`, `/audit`, `/visitors`, etc. by URL. In practice RLS backs almost every table so this does not currently leak data (see Section 12), but it means the frontend provides no defense-in-depth layer of its own.
6. **[Moderate] Unescaped HTML interpolation into `document.write`.** `src/lib/printPDF.ts` builds full receipt/report HTML via raw template-literal interpolation of database-sourced free-text fields (payment notes, reference numbers, homeowner names) with no escaping, then injects it via `win.document.write(html)`. This is a plausible stored-XSS vector if any of those free-text fields is ever populated with markup by a user with write access to them.
7. **[Minor] Session tokens are stored via Supabase's default `localStorage` persistence**, with no CSP configured (`index.html` has no CSP meta tag, and this is a static SPA with no server to add response headers). This is standard for a Supabase-JS SPA but increases the blast radius of finding #6 if it were ever exploited (token theft via XSS).
8. **[Minor] Frontend surfaces raw Postgres/PostgREST error messages directly to end users via toast** (e.g. `onError: (e) => toast.error(e.message)` across nearly every hook). Not currently leaking secrets, but surfaces backend error text (potentially table/column/constraint names) that would be better generalized before display.

**What is done correctly and should be preserved as a pattern:** role authorization for `void_or_waive_due` and `approve_credit_refund` is correctly derived from the session (`has_any_role()` → `get_my_role()` → `auth.uid()`), not from client input; the anon/service-role key separation is correctly maintained (service-role key only appears in server-side Edge Function code, never client-bundled); `complaints.submitted_by` is correctly self-enforced via RLS `WITH CHECK`.

---

## 12. RLS and SECURITY DEFINER Findings

**RLS coverage**: all 13 application tables (`profiles, units, homeowners, system_config, dues, payments, payment_allocations, unit_credits, credit_transactions, complaints, visitors, announcements, audit_logs`) have RLS **enabled**, with role-scoped policies driven by `has_any_role(text[])` / `get_my_role()`, both of which derive identity from `auth.uid()` (session-bound), not client input — the correct pattern.

**Notable policy-level gaps**:
- **`announcements`**: SELECT policy is unconditional on `auth.uid() IS NOT NULL` — **every authenticated user can read every announcement regardless of `target`/`target_value`.** The `target: 'unit'` targeting feature is decorative only; a unit-scoped announcement is actually visible to the entire resident base. (Moderate — Section 14/15.)
- **`unit_credits`**: finance roles get full `ALL` (read/write) access directly on the table, meaning a treasurer could manually edit `balance` outside of the `process_payment()`/`approve_credit_refund()` business logic, bypassing the audit trail those functions write.
- **`credit_transactions`**: has a second INSERT policy letting residents insert their own `refund_requested` rows directly — a reasonable "self-service request" pattern, but worth confirming is intentional.
- **`dues`**: the INSERT policy still checks caller role even though dues insertion is meant to go through `generate_monthly_dues()` — a treasurer with direct table access could insert dues rows manually, bypassing the function's idempotency (`ON CONFLICT (unit_id, billing_month) DO NOTHING`) and FIFO/credit-application side effects.
- **`audit_logs`**: the INSERT policy's own code comment says inserts are "allowed only from `SECURITY DEFINER` functions," but the `WITH CHECK` clause only restricts by *role*, not by *call origin* — any client authenticated as one of the five permitted roles could INSERT arbitrary rows directly into `audit_logs` (including a forged `actor_id`), separate from the RPC-parameter issue in Section 11.

**SECURITY DEFINER function inventory**:

| Function | Internal role check? | Internal identity check (`= auth.uid()`)? | Notes |
|---|---|---|---|
| `get_my_role()` | n/a (identity helper) | derives from `auth.uid()` | Safe |
| `has_any_role(roles)` | n/a (role helper) | derives from `auth.uid()` | Safe |
| `handle_new_user()` | n/a (trigger, not client-callable) | n/a | Hardcodes new users to `role = 'resident'` |
| `process_payment(...)` | **No** | **No** (`p_received_by` unchecked) | Critical — see Section 11 #1, #2 |
| `void_or_waive_due(...)` | Yes (`has_any_role`) | **No** (`p_actor_id` unchecked) | Role gate present; identity gate missing |
| `approve_credit_refund(...)` | Yes (`has_any_role`) | **No** (`p_actor_id` unchecked) | Role gate present; identity gate missing; not currently called from any frontend hook found, but is a live, callable RPC |
| `generate_monthly_dues(p_billing_month)` | **No** | n/a | Also invocable through an Edge Function that uses a service-role client; the function owner's live privileges and RLS interaction were not inspected |
| `preview_payment_allocation(...)` | **No** | n/a | Read-only body, but executes with the function owner's privileges; the live owner/RLS effect is unverified and the body contains no caller-scope check |

---

## 12A. SECURITY DEFINER Search-Path, Ownership, RLS, and Execution Assessment

*(Label: Verified Repository Fact unless marked Live-Database Unknown or Technical Inference.)*

The tracked migrations define **eight `SECURITY DEFINER` functions**: `get_my_role`, `has_any_role`, `handle_new_user`, `process_payment`, `void_or_waive_due`, `approve_credit_refund`, `generate_monthly_dues`, and `preview_payment_allocation`. `on_auth_user_created` is a trigger that invokes the `SECURITY DEFINER` trigger function `handle_new_user()`; the trigger itself is not a ninth `SECURITY DEFINER` function or object.

| Dimension | Finding |
|---|---|
| `SET search_path` on the function definition | **Absent on all eight functions.** No tracked function definition pins a trusted `search_path`. |
| Schema-qualified object references | Internal table and function references are generally unqualified (for example, `profiles`, `dues`, `unit_credits`, `get_my_role()`, and `process_payment(...)`). The migrations therefore do not establish deterministic resolution through explicit qualification. |
| Object-shadowing risk | Without a safe function-level `search_path` or fully qualified references, unqualified names can resolve through the active path. Exploitability depends on whether an untrusted role can create objects in any schema searched before the intended objects. The repository does not declare or verify those schema privileges, so the live risk is unresolved; the code contains no version-controlled hardening against it. |
| Function-owner and RLS implications | `SECURITY DEFINER` executes with the function owner's privileges. It does **not** by wording alone prove that RLS is bypassed in every environment. The effect depends on the actual owner, table ownership, `BYPASSRLS`, and `FORCE ROW LEVEL SECURITY`. No `ALTER FUNCTION ... OWNER TO ...` statement appears in the tracked migrations, and none of those live facts was inspected. |
| `EXECUTE` privileges | No tracked `REVOKE` or selective `GRANT EXECUTE` statement was found for these functions. PostgreSQL normally makes newly created functions executable by `PUBLIC` unless that default privilege is revoked. The actual live grants may differ because of out-of-band changes, but they are not reproducible from this repository. |
| Recommended hardening direction | Fully schema-qualify internal table/function references wherever practical. Otherwise pin `search_path` to trusted, non-user-writable schemas only, with `pg_temp` last. Include `public` only after verifying that untrusted roles cannot `CREATE` objects there, or revoke inappropriate `CREATE` privileges first. Declare a minimally privileged function owner as a proposed design decision, explicitly revoke broad/default execution access, and selectively grant `EXECUTE` only to approved roles. Keep ownership, schema privileges, and function grants in version-controlled migrations. |

**Assessment boundary:** the repository evidence is sufficient to identify missing hardening and undeclared privileges, but not to prove the live owner, grants, RLS-bypass behavior, or a confirmed exploit. Those facts require controlled live-environment inspection.

---

## 13. Edge Function Findings

Only one Edge Function exists: `supabase/functions/generate-monthly-dues/index.ts` (56 lines).

**Verified from the function code:**
- It creates a server-side client with `SUPABASE_SERVICE_ROLE_KEY`; that client bypasses RLS.
- It performs no caller authentication or HOA-role authorization in its own handler: no `Authorization` header validation, authenticated-user resolution, or role check is present before the privileged RPC call.
- It accepts an optional `billing_month` from the request body without an explicit handler-level format check.
- CORS is fully open (`Access-Control-Allow-Origin: '*'`). Wildcard CORS is not itself authorization, but it removes an origin restriction that might otherwise reduce accidental browser exposure.
- A `pg_cron` schedule appears only as commented-out SQL and is not active in the tracked migration state.
- Server-side errors are logged, while responses avoid returning stack traces; that specific pattern is reasonable.

**Platform default and unresolved deployment state:**
- Supabase documents `verify_jwt = true` as the default for Edge Functions, so a newly deployed function ordinarily requires a valid JWT before its handler runs.
- That default can be changed in function/deployment configuration. The repository contains no `supabase/config.toml` or deployment record proving what setting was used for the Wonderland deployment, if any.
- Anonymous reachability is therefore a **Live-Database/Deployment Unknown**, not a verified repository fact.

**Risk independent of the platform setting:**
- With JWT verification enabled, possession of a valid JWT still does not prove that the caller has an approved HOA officer role; the handler performs no role authorization before using the service-role client.
- With JWT verification disabled, anonymous invocation may also be possible.
- The durable correction is explicit, role-aware authorization in the trusted handler before any service-role operation, plus version-controlled deployment configuration.

**Classification**: FREEZE PENDING HOA VALIDATION (automatic dues generation is unverified policy) combined with **REIMPLEMENT** (the trusted execution path and authorization must be redesigned regardless of the deployed `verify_jwt` setting or whether automation is ultimately approved).

---

## 14. Privacy and Data-Protection Findings

- Financial data (dues, payments, credit balances) is correctly scoped by RLS to finance/board roles plus the owning resident — no policy-level leak found here.
- **Announcements are not privacy-scoped as designed** (Section 12) — a unit-targeted announcement, which could plausibly reference unit-specific/sensitive matters (e.g., a specific delinquency notice), is visible to every authenticated user, not just the intended recipient.
- No data-retention policy, anonymization, or deletion workflow exists anywhere in the schema — all records appear to be retained indefinitely by default (which may or may not align with eventual HOA/DPA-of-the-Philippines compliance obligations; this is an Unresolved Question, not assessed further here as it is a legal/policy matter outside this review's technical scope).
- No explicit consent-tracking or data-subject-request handling exists (also an Unresolved Question, likely appropriate to raise with the HOA board given resident personal data — names, complaint contents, visitor logs — is stored).

---

## 15. Complaints and Visitor-Data Findings

- **Complaints**: correctly scoped via RLS — privileged roles see all complaints; other users see only `submitted_by = auth.uid()` rows. A redundant client-side filter in `ComplaintsPage.tsx` matches by `full_name` **string** rather than user ID — fragile (would over- or under-show results for duplicate names) but not currently an information-disclosure bug since RLS already scopes the underlying query. Should be fixed for correctness during any modernization pass regardless.
- **Visitors**: RLS restricts SELECT to `admin/president/vice_president/security` only — there is **no policy granting residents visibility into visitor logs for their own unit**. This is a functionality gap (over-restrictive) rather than a leak; residents hitting `/visitors` directly (no route guard prevents this) simply see an empty table.
- **Announcements**: see Sections 12/14 — the one confirmed under-restrictive gap in this area.

---

## 16. Auditability and Records Findings

- `audit_logs` captures exactly 5 action types, all from the billing engine (`payment.created`, `due.void`, `due.waive`, `credit.refund_approved`, `dues.generated`). **General CRUD on units, homeowners, complaints, visitors, and announcements generates no audit trail at all** — only direct table INSERT/UPDATE, not routed through any `SECURITY DEFINER` function, so nothing writes to `audit_logs` for those changes.
- As established in Sections 11–12, the `actor_id` recorded for all 5 tracked action types is a client-supplied, unvalidated parameter — the audit trail's core purpose (attributing financial actions to a specific accountable person) is currently **not reliably guaranteed** by the system itself.
- Voided payments are never flagged/marked in the `payments` table itself — only the associated `dues` row and `payment_allocations` reversal record the void; reconstructing "was this payment ever voided" requires joining through `dues.status`, which is workable but not a direct, obvious audit path.

---

## 17. Analytics and Reporting Findings

- No standalone Reports/Analytics module exists. Reporting is limited to: (1) the Delinquency Report (printable, embedded in Dashboard), and (2) the Payment Receipt (printable, embedded in Payments). Both are generated as HTML strings rendered in a popup window and printed via `window.print()` — not exported as PDF files, not stored, not downloadable as structured data (CSV/Excel).
- No historical trend reporting (collections over time, delinquency trend, occupancy trend) exists.
- No data-export capability exists anywhere in the app.

---

## 17A. Dashboard Metrics Reliability

*(Label: Verified Repository Fact. All logic below lives directly in `src/pages/dashboard/DashboardPage.tsx` — the `useDashboard`/`usePayments`/`useDues`/`useUnits` hook files exist but are not imported by the dashboard.)*

| Metric | Query/logic | Classification | Data-quality dependency |
|---|---|---|---|
| Collected This Month | `payments` filtered by `payment_date` range, client-reduced sum | Reliable (for what it measures) | Correct only if `payment_date` is entered accurately; does not reconcile against bank/GCash statements (Section 10) |
| Total Outstanding | `dues` where `status IN ('unpaid','partial')`, client-reduced `balance` sum | Policy-dependent | Assumes the hardcoded due-date/amount/FIFO policy is correct (Section 21); never consults `units.status`, so balances for vacant units are included |
| Delinquent Units count | `dues` where `status IN ('unpaid','partial')` and `due_date` past, deduplicated by `unit_id` | Potentially misleading | Same vacancy caveat as above — a vacant unit with an unpaid due counts as "delinquent" even if vacant-property billing is not confirmed HOA policy (Section 9) |
| Active Credits | `unit_credits`, client-reduced `balance` sum | Policy-dependent | Reflects the current, unconfirmed FIFO/auto-credit design (Section 21), not necessarily the HOA's intended credit policy |
| Recent Payments (list) | `payments` joined to `units`, ordered, `.limit(10)` | Reliable (display-only) | Explicitly bounded to 10 rows; not used in any total, so the limit does not distort other metrics |
| Delinquency Report (printable) | Same filter as Delinquent Units, but unbounded (no `.limit()`) | Prototype-only | Same vacancy/policy caveats as Delinquent Units; printable output has no stored/versioned record (Section 17) |
| Complaints Overview | Unbounded `complaints` fetch, counts/`openList` computed client-side via `.filter()`/`.slice()` | Prototype-only | Reliable only as long as the underlying query stays unbounded — if a `.limit()` is ever added upstream, the client-side counts would silently start under-reporting since they are derived from the same fetched array, not a separate count query |
| Visitor Activity (today) | `visitors` filtered to today's `time_in` window, client-computed `todayCount`/`inside` | Reliable (for today's window) | Depends on manual, accurate `time_in`/`time_out` logging by security staff; no cross-day trend data |

**Summary**: none of the dashboard's financial metrics are currently gated by occupancy status, and several (Total Outstanding, Delinquent Units, Delinquency Report) are policy-dependent on unverified HOA rules (dues amount, due date, FIFO, vacant-property billing) rather than confirmed business logic. This does not mean the numbers are "wrong" — it means they should not be presented to the HOA board as settled figures until Phase 1 policy questions are resolved.

---

## 18. Accessibility and UX Findings

- No `aria-*` attributes were found in the repository-wide search. This is evidence of missing explicit ARIA annotations, not proof that the application has no accessibility support at all; native HTML elements still provide some semantics.
- The shared `Modal` lacks verified dialog semantics, focus trapping, focus restoration, and Escape-key dismissal, so every modal-based interaction inherits significant keyboard and assistive-technology gaps.
- Form labels are inconsistently associated: shared `Input`/`Select` components pair labels and controls, while several ad-hoc textareas and login controls lack verified `id`/`htmlFor` associations.
- No PWA manifest, service worker, or offline caching was found. The app is online-only, which is a potential UX risk for low-bandwidth or intermittent-connectivity use, but no field performance or accessibility conformance test was performed.
- A complete WCAG or assistive-technology assessment was outside this static review. The evidence supports a finding of **significant accessibility gaps**, not a categorical conclusion that the entire application is unusable with assistive technology.

---

## 19. Testing and Quality Findings

- **No automated tests were found anywhere in the repository**: no test framework dependency, no `*.test.*`/`*.spec.*` files, no `__tests__` directories, no test runner configuration (no `vitest.config.*`/`jest.config.*`), and no coverage artifacts (no `coverage/` or `.nyc_output/` directory) — confirmed by repository-wide search, not by executing a test run. No coverage percentage is reported here because no test run was executed; "0% coverage" would imply a measurement that was never taken.
- `lint` script exists but references a non-existent ESLint config, so it cannot currently run as configured.
- No type-checking step is enforced outside of `npm run build` (`tsc && vite build`) — reasonable as far as it goes, but there is no fast standalone `typecheck` script for iterative use.
- No CI pipeline exists to enforce any of the above automatically on every change.

---

## 20. Documentation and Operations Gaps

- No README, no `docs/` folder prior to this document, no architecture notes, no runbook, no deployment guide.
- No CI/CD, no containerization, no Infrastructure-as-Code.
- No documented backup/recovery procedure (Supabase's managed backup tier, if any, is a project-level setting not reflected in this repository).
- No documented environment-setup or onboarding instructions beyond the two variable names in `.env.example`.
- No documented incident-response or access-revocation procedure (relevant given Section 11 Finding #4 — `is_active` is not actually enforced).

---

## 21. Legacy Assumption Register

*(Every item below must be treated as a Legacy Assumption per the task instructions — **not** approved HOA policy — until confirmed with the HOA board. Classification: FREEZE PENDING HOA VALIDATION.)*

| # | Unverified rule | Current legacy implementation | Where |
|---|---|---|---|
| 1 | Exact monthly dues | Hardcoded seed value `2000` | `system_config` seed, `001_initial_schema.sql` |
| 2 | Due date | Hardcoded "5th of month following billing month," not configurable | `generate_monthly_dues()`, `002_billing_engine.sql` |
| 3 | Penalty amount / formula | **Not implemented at all** | — |
| 4 | Grace periods | **Not implemented at all** | — |
| 5 | Penalty frequency | **Not implemented at all** | — |
| 6 | Penalty-waiver authority | `void_or_waive_due()` restricted to `admin/president/vice_president` (no penalty concept exists to waive yet) | `002_billing_engine.sql` |
| 7 | Charge-voiding authority | Same function, same role set, applies to dues generally | `002_billing_engine.sql` |
| 8 | Allocation priority (FIFO or other) | Hardcoded FIFO (`ORDER BY due_date ASC`) | `process_payment()`, `preview_payment_allocation()` |
| 9 | Overpayment-credit treatment | Automatic per-unit credit wallet, automatically re-applied to next payment | `unit_credits`, `process_payment()` |
| 10 | Refund authority | `approve_credit_refund()` restricted to same role set; zeroes credit balance only, no payout integration | `002_billing_engine.sql` |
| 11 | Receipt numbering | Not a real scheme — derived client-side from payment UUID substring, never stored | `src/lib/printPDF.ts` |
| 12 | Cancelled/voided/replacement-receipt handling | No concept for payments; only dues can be voided | `002_billing_engine.sql` |
| 13 | Unused receipt handling | Not applicable — no physical/sequential receipt concept exists in code | — |
| 14 | GCash reconciliation | Free-text `payment_method`/`reference_number` fields only; no reconciliation workflow | `001_initial_schema.sql` |
| 15 | Bank-transfer reconciliation | Same as above | `001_initial_schema.sql` |
| 16 | Vacant-property billing | `units.status` (occupied/vacant) exists but `generate_monthly_dues()` runs for every unit unconditionally, ignoring it | `001_initial_schema.sql` (status column); `002_billing_engine.sql` (unfiltered generation) |
| 17 | Write-off authority | `'waive'` action is the de facto write-off mechanism, same role set as void | `002_billing_engine.sql` |
| 18 | Automatic recurring dues generation | Function exists; live trigger is manual only (cron is commented out) | `002_billing_engine.sql` |

---

## 22. Unresolved HOA Discovery Questions

1. What is the current, board-approved monthly dues amount, and does it vary by property or is it uniform?
2. What is the actual due date policy, and is it uniform or does it vary by billing cycle?
3. Does the HOA currently apply late-payment penalties? If so, what is the formula, frequency, and any grace period?
4. Who currently has authority to waive a penalty, void a charge, or write off a balance — and is that authority formal (board resolution) or informal (officer discretion)?
5. When a resident overpays, does current practice apply the excess to future months automatically, hold it as a credit only on request, or refund it? Is refund typically cash, GCash, or check, and who approves it?
6. Does the HOA use a physical/sequential Official Receipt booklet today? If so, what is its numbering scheme, and how must the system's records reconcile with it?
7. How are voided, cancelled, or reissued receipts currently handled on paper, and what does that imply for the digital record?
8. How are GCash and bank-transfer payments currently reconciled against statements — manually, via a specific app, or not at all today?
9. The `units` table already has an occupied/vacant status flag, but `generate_monthly_dues()` currently ignores it and bills every unit. Should vacant properties be excluded from billing, and if so, under what conditions do they stop/resume?
10. Is automatic recurring dues generation desired, or should generation always be a deliberate, reviewed officer action?
11. Are there properties with the informal/duplicate-numbering, merged/divided, or front-rear situations described in the baseline that need to be enumerated now, before any migration?
12. What is the HOA's expectation for resident-facing visibility into visitor logs for their own unit (currently not supported at all)?
13. Is there a data-retention or disposal expectation for complaints, visitor logs, or financial records (e.g., statutory retention period)?
14. Who should be authorized to deactivate/reactivate an officer's system access, and what is the expected effect (should it revoke an active session, not just hide UI)?

---

## 23. Preserve / Modernize / Reimplement / Remove / Defer Matrix

| Module / decision | Classification | Rationale |
|---|---|---|
| Address/property model (`units.house_no`, uniqueness) | **REIMPLEMENT** (schema-level; can be executed in place — Section 26) | Global uniqueness and missing street-name field directly contradict the confirmed baseline (Section 7); the correction is required regardless of stack, but does not by itself require discarding the `units` table or the repository as a whole |
| Ownership/occupancy model (`homeowners`) | **MODERNIZE** | Right general shape (history-capable via `is_active`/dates); needs DB-level constraints and possibly a dedicated occupancy/tenant distinction |
| Financial-account model (property-anchored balances **as a technique**) | **PRESERVE** (concept only — not the current table implementation verbatim) | Already matches the baseline's core principle — balances follow the property, not the person. Preserved as a design principle to re-express in a validated schema, not as a guarantee the current `dues`/`payments` tables ship unchanged |
| Dues/billing period modeling (`billing_month` vs `due_date` **as a technique**) | **PRESERVE** (concept) | Structurally sound separation; the *values* (amount, date rule) are FREEZE PENDING HOA VALIDATION |
| Payment allocation engine — partial-payment / multi-month traceability (`payment_allocations`) | **PRESERVE** (concept — transactional processing and traceability pattern) | The traceability design (one payment, many allocations, none silently overwritten) is reusable as a technique |
| Payment allocation **priority — FIFO specifically** | **FREEZE PENDING HOA VALIDATION** — **REIMPLEMENT if approved** | FIFO is hardcoded, not confirmed HOA policy (Section 21 #8); must not be carried forward as settled behavior even if the surrounding allocation *mechanism* is reused |
| Credit wallet — ledger/traceability structure (`credit_transactions`) | **PRESERVE** (concept — a traceable ledger is a reusable technique) | The idea of a logged, traceable transaction history is sound |
| Credit wallet — **automatic credit application, current refund behavior** (`unit_credits` auto-upsert, `approve_credit_refund`) | **FREEZE PENDING HOA VALIDATION** — **REIMPLEMENT if approved** | Automatic re-application of credit and the current no-payout refund bookkeeping are unconfirmed HOA policy (Section 21 #9–10), not settled product behavior |
| Receipt numbering scheme | **REMOVE / REIMPLEMENT** | Current scheme (UUID substring, unstored) is not a real numbering system and cannot be treated as policy |
| Database-level authorization/RLS **as a technique** | **MODERNIZE** (technique reused; current policy set not endorsed as-is) | Session-derived, `auth.uid()`-based authorization is a sound approach to carry forward; the *specific current role list, the 8 policy gaps in Section 12, and the current officer-role permission mapping* are not endorsed verbatim — see next two rows |
| Current officer-role list and authority assignments (`admin/president/vice_president/...` and what each may do) | **FREEZE PENDING HOA VALIDATION** | Who holds waiver/void/refund authority today is a legacy assumption (Section 21 #6, #7, #10), not a confirmed governance decision |
| Centralized permission mapping **as a technique** (single source of role→permission truth) | **PRESERVE** (concept) | Having one place that maps roles to permissions is a sound pattern regardless of which specific roles/permissions are ultimately approved |
| Current `SECURITY DEFINER` billing-function implementations (`process_payment`, `void_or_waive_due`, `approve_credit_refund`, `generate_monthly_dues`, `preview_payment_allocation`) | **FREEZE PENDING HOA VALIDATION** (the policy embedded in them — FIFO, waiver/void/refund authority) **+ REIMPLEMENT** (the functions' own code — missing actor-identity checks, missing `search_path`/grants hardening per Section 12A) | Not a simple "add checks and keep" — both the embedded policy and the function hardening need to be redone against confirmed requirements |
| Edge Function (`generate-monthly-dues`) | **REIMPLEMENT** | The trusted execution path must establish an authenticated caller through platform or handler validation and must enforce an approved HOA role before using privileged credentials; the deployed `verify_jwt` setting remains unresolved (Section 13) |
| Frontend RBAC helpers (`src/lib/auth.ts`) | **PRESERVE** (concept) | Clean, centralized permission-check functions; reusable regardless of framework — but see the role-list caveat above |
| Route-level authorization | **REIMPLEMENT** | Currently absent; needs to exist as defense-in-depth regardless of stack choice |
| Complaints / Visitors / Announcements / Audit-Log modules | **MODERNIZE** | Core functionality and RLS scoping are largely sound; fix the announcements scoping gap and the complaints name-matching filter |
| UI component kit (`Badge`, `Button`, `DataTable`, `Input`, `Modal`, `Select`) | **MODERNIZE** | Reasonable Tailwind-based primitives; add accessibility (dialog semantics, focus trap, aria-labels) |
| Testing infrastructure | **REIMPLEMENT** (i.e., build from scratch) | None exists today |
| CI/CD, deployment tooling | **REIMPLEMENT** (i.e., build from scratch) | None exists today |
| Documentation | **REIMPLEMENT** (i.e., build from scratch) | None exists today (this document is the first) |
| Print/report templates (receipt, delinquency report) | **PRESERVE** (layout concept) / MODERNIZE (escaping, storage) | Visual design reusable; must fix unescaped interpolation and add durable storage instead of print-only |
| PWA / offline support | **DEFER** | Not present today; worth targeting for a resident-facing low-bandwidth portal, but not a Phase 0–4 concern |

---

## 23A. MVP Scope Assessment — Complaints, Visitor Logs, Announcements

*(Label: Verified Repository Fact for data collected/RLS; classification is this review's recommendation, not a settled decision.)*

| Module | Data collected | Privacy / retention posture | RLS today | Classification |
|---|---|---|---|---|
| Complaints | `unit_id`, `submitted_by`, free-text `subject`/`description`, `status`, `assigned_to`, `resolved_at` | Free-text descriptions may contain sensitive resident matters; no delete/retention logic exists anywhere in `useComplaints.ts` | Correctly scoped — residents see only `submitted_by = auth.uid()` rows; privileged roles see all (Section 15) | **MODERNIZE** — core RLS scoping is sound; fix the client-side name-matching filter (Section 15) and add a retention/disposal policy once the board confirms one is needed (Section 22 Q13) |
| Visitor logs | `visitor_name` (a **non-resident's** real name, no ID field), `purpose`, `time_in`/`time_out`, `unit_id`, `logged_by` | Contains personal data of people who are not app users and never consented to a login; no retention/disposal logic exists; no resident-facing read access exists for their own unit (Section 15) | Read restricted to `admin/president/vice_president/security` only — no resident-scoped policy | **RESEARCH FURTHER** — before treating this as MVP-ready, the board should confirm retention duration, who may see a resident's own visitor history, and whether recording a non-resident's name without their consent needs a stated policy (privacy/DPA consideration, Section 14) |
| Announcements | `title`, `body`, `target` (`all`/`block`/`unit`), `target_value`, `posted_by` | RLS currently allows **every authenticated user to read every announcement**, regardless of `target` — the per-unit targeting is enforced nowhere (Section 12, Section 14) | `USING (auth.uid() IS NOT NULL)` — unconditional | **MODERNIZE** — the feature concept (board-wide vs. targeted announcements) is reasonable for MVP, but the RLS scoping gap must be fixed before "unit-targeted" announcements can be trusted to stay private |

**Overall MVP judgment**: Complaints and Announcements are reasonable to keep in a first MVP once their respective RLS/filtering issues are fixed (MODERNIZE). Visitor logs raise privacy and retention questions specific to non-resident, non-consenting data subjects that this review cannot resolve unilaterally — recommend RESEARCH FURTHER with the HOA board (retention period, resident visibility into their own unit's log, any statutory basis for keeping visitor names) before committing to the current shape as MVP scope, per Section 22 Qs 12–13.

---

## 23B. Reuse Classification Legend (Cross-Reference)

To avoid ambiguity between "this behavior is approved" and "this behavior is only a candidate concept," this document uses the following classifications consistently from Section 23 onward:

- **PRESERVE (concept)** — the underlying technique or design pattern is sound and worth carrying forward; this is *not* a statement that the current table/function/component ships unchanged.
- **MODERNIZE** — the general approach is sound but the current implementation has specific, named gaps that must be fixed.
- **FREEZE PENDING HOA VALIDATION** — the current behavior encodes a business rule the HOA board has not confirmed (Section 21); it must not be relied upon or presented as settled until confirmed.
- **REIMPLEMENT (if approved)** — even once HOA-confirmed, the current code implementing the rule should be rewritten rather than reused as-is (e.g., because it also carries a security or hardening gap).
- **REMOVE / REIMPLEMENT** — the current implementation is not a real, durable mechanism at all (e.g., receipt numbering) and should be replaced outright.
- **RESEARCH FURTHER** — neither a technical fix nor a simple policy confirmation is sufficient; open questions (privacy, retention, consent, statutory basis) need board/legal input before a classification can be finalized.
- **DEFER** — out of scope for the near-term roadmap, not rejected.

---

## 24. Stack Options and Weighted Decision Matrix

*(Revised in v0.2 and precision-checked in v0.3. The v0.1 matrix scored a "retain the stack" option as though its evidenced vulnerabilities remained unfixed, while crediting a Next.js option with server-derived identity as if that property were exclusive to Next.js. Every scored option below is evaluated as its intended hardened end state. v0.3 does not change the scores.)*

Three technical options (A, B, and C) are evaluated across 20 criteria on a 1–5 scale (5 = best), weighted by importance to this project (solo developer, small-HOA financial system, security- and auditability-sensitive). Option D is an unscored decision strategy, not a fourth architecture: it defers the framework choice until the prerequisite domain, policy, and live-environment evidence exists.

- **Weight 3 (highest priority)**: security, privacy, financial integrity, auditability, maintainability, solo-developer sustainability
- **Weight 2 (important)**: implementation complexity (higher score = simpler), migration effort (higher score = less effort), reusable legacy work, hosting/operating cost, backup and recovery, local development, deployment simplicity, testing, client handover, long-term support
- **Weight 1 (secondary)**: vendor dependency (higher score = less locked in), PWA/low-bandwidth capability, resident portal potential, portfolio value

**Options evaluated:**
- **A — Harden and modernize the existing stack.** React + Vite + TypeScript + Tailwind, retained, with: properly authorized RPCs and/or Supabase Edge Functions that validate the caller's JWT and role before acting; actor identity derived server-side from the verified session (via an Edge Function or a trusted RPC path) rather than accepted as a client parameter; and the Section 12A `SECURITY DEFINER` hardening (trusted name resolution, explicit ownership, and selective execution grants) applied. This is scored as the option's *intended hardened end state*, not as today's unfixed prototype.
- **B — Next.js App Router on Supabase, with a dedicated server-side application-service layer.** Next.js Route Handlers/Server Actions become the single point through which every privileged mutation passes, deriving actor identity from a verified session server-side; RLS is retained underneath as defense-in-depth; privileged credentials are confined to server-only code that establishes the caller and enforces the approved HOA role.
- **C — Next.js + PostgreSQL with a different database/auth architecture** (e.g., a self-hosted or alternative-managed Postgres plus a separate, non-Supabase auth system), pursued only where operationally justified — e.g., a confirmed requirement to leave the Supabase platform. Scored honestly for the added cost and complexity this implies for a solo developer.
- **D — Framework-neutral staged decision.** Develop and validate the domain and security architecture (address/property model, financial-account model, server-derived-identity requirement, `SECURITY DEFINER` hardening) before choosing between React/Vite and Next.js, then formally approve both the framework and repository strategy in Phase 3 based on the Phase 2 blueprint, delivery evidence, deployment needs, and handover constraints. D is not a fourth technical architecture to score criterion-by-criterion — it is a decision to defer that choice; see the qualitative discussion below the table.

| Criterion | Wt | A | B | C | Rationale (brief) |
|---|---|---|---|---|---|
| Security | 3 | 4 | 4 | 3 | Both A (hardened Edge Functions/RPCs) and B (server-side handlers) can equally close Section 11's client-supplied-actor-ID and unchecked-function gaps at the architecture level — neither gets exclusive credit. C requires a solo developer to rebuild every authorization check without RLS's defense-in-depth, a higher risk of introducing *new* gaps |
| Privacy | 3 | 3 | 4 | 3 | A deliberate Next.js server-data design may keep more sensitive data out of client-side flows, but that benefit is architectural rather than automatic; a hardened React/Vite design can also minimize client exposure. The scored difference is modest and unvalidated by a deployed prototype |
| Financial integrity | 3 | 4 | 4 | 3 | Both A and B achieve a server-derived actor ID and a single enforcement chokepoint for the billing engine once hardened |
| Auditability | 3 | 4 | 4 | 3 | Same reasoning — a single, trusted server boundary is achievable under either A or B |
| Maintainability | 3 | 4 | 4 | 3 | Fewer moving parts favors A/B over C's added ORM + separate-auth surface |
| Solo-developer sustainability | 3 | 5 | 4 | 2 | A adds no new framework to learn; B adds one new framework but keeps Supabase's managed services; C is the most new surface area (new ORM, new auth system, new Postgres host) |
| Implementation complexity | 2 | 4 | 3 | 2 | A's hardening work (auth checks, search_path, grants) is real but bounded and does not require a frontend rewrite; B requires a full frontend-framework migration plus the service layer; C is the largest rewrite |
| Migration effort | 2 | 4 | 3 | 2 | Same reasoning |
| Reusable legacy work | 2 | 5 | 4 | 3 | SQL/RLS/domain concepts carry forward directly under A and B; C requires re-expressing schema and rebuilding RLS-equivalent logic in application code |
| Hosting / operating cost | 2 | 5 | 4 | 3 | A/B stay on Supabase's managed tier; C adds a separate Postgres host as a new cost/ops line item |
| Backup and recovery* | 2 | 4 | 4 | 3 | *Marked plan-/configuration-dependent: no remote Supabase project or subscription tier was inspected for this review, so A/B's backup posture assumes Supabase-managed backups are enabled at an adequate tier — this is unconfirmed, not verified. C's backup story depends entirely on whichever Postgres host is chosen |
| Local development | 2 | 4 | 4 | 3 | Supabase local dev tooling applies equally under A and B |
| Deployment simplicity | 2 | 5 | 4 | 3 | Static Vite build (A) remains simplest; Next.js needs a Node-capable host, still straightforward on common platforms |
| Testing | 2 | 3 | 4 | 4 | Next.js's ecosystem has a somewhat more standardized testing story than a bare Vite SPA, though none of the three currently has any tests (Section 19) |
| PWA / low-bandwidth capability | 1 | 3 | 4 | 4 | Next.js may improve some initial-render paths when deliberately cached and server-rendered, but bundle size, data access, hosting, and route design determine the actual result. PWA tooling is available under any option; no field measurement was performed |
| Resident portal potential | 1 | 3 | 4 | 4 | Next.js provides additional server-rendering and routing patterns that may help a resident portal, but the benefit depends on implementation and is not proven by this audit |
| Client handover | 2 | 4 | 4 | 3 | Fewer custom/bespoke pieces (vs. C's custom auth) is easier to hand off to another developer later |
| Long-term support | 2 | 4 | 4 | 3 | Both React/Vite and Next.js are well-supported; C's bespoke auth layer is an ongoing maintenance burden specific to this project |
| Vendor dependency | 1 | 3 | 3 | 4 | C is least locked to Supabase specifically, but trades it for dependency on whichever Postgres/auth vendors are chosen instead |
| Portfolio value | 1 | 3 | 4 | 5 | C demonstrates the broadest range of skills (ORM + custom auth), which has standalone value even though it scores lower operationally here |
| **Weighted total (of 210 max)** | | **176** | **163** | **126** | |

**Reading the result**: Option A (harden in place) scores highest once it is credited with the same server-derived-identity and function-hardening fixes as Option B, because it achieves comparable security/auditability/financial-integrity scores while avoiding a frontend-framework migration entirely. Option B is a close second — **13 points out of 210 (about 6%) separates them**, which this document treats as **not decisive on its own**: a gap this small can be outweighed by a single non-scored factor (e.g., a confirmed future hand-off to a team more comfortable with Next.js, or a decision that the resident portal's perceived performance matters more than this review weighted it). Option C scores lowest primarily on solo-developer sustainability and migration effort — it asks one person to simultaneously replace the ORM, the auth system, and the authorization model, the highest-risk path for the smallest team, and is recommended only if a specific operational reason to leave Supabase emerges.

**Sensitivity analysis**:
- If security/auditability weights were raised from 3 to 4, the A–B gap would not change (both score identically, 4/4, on those criteria) but the gap over C would widen — the *A-vs-B* decision is insensitive to how much extra weight security receives.
- If solo-developer sustainability were weighted more heavily (reflecting a firm no-additional-hires assumption), A's lead over B widens further (A scores 5 vs. B's 4 on that single criterion).
- If long-term collaborative handover to a future team were weighted more heavily than solo sustainability, B's more conventional, widely-documented framework ecosystem could close or reverse the gap.
- If Phase 1 confirms a live, populated production instance already exists (Section 27, unresolved), migration-effort and reusable-legacy-work weights would likely increase, favoring A further.

**Confidence**: Moderate. This ranking is defensible given the evidence gathered, but it rests on assumptions not yet confirmed — HOA policy answers (Section 22), the live Supabase project's actual `verify_jwt`/grants/backup configuration (Sections 3, 12A, 13), and whether production data already exists (Section 27). None of these unknowns are expected to flip the *A/B-over-C* conclusion, but any of them could shift the smaller A-vs-B gap.

**Conditions that would change this recommendation**:
- A confirmed near-term plan to hand the system to a different developer or a team — shifts weight toward B (or C, if that team has an existing non-Supabase stack).
- Confirmation that a production instance with real resident/financial data already exists — increases the cost of any option requiring a schema rebuild disconnected from live data, favoring in-place approaches (A, or B retaining the same database).
- A hosting, budget, or data-residency constraint that rules out Supabase specifically — would justify Option C despite its lower score here.
- Evidence that the resident-facing portal's low-bandwidth performance is a stated board priority, not a nice-to-have — narrows or reverses the A-vs-B gap.

**This document treats deferring final stack approval to Phase 3 (Option D) as an equally legitimate output of this review.** Given that the A-vs-B gap is small and several open unknowns are Phase-1/live-environment questions, a defensible path is to carry the framework-independent domain and security principles into the Phase 2 blueprint, then formally approve both the stack and repository strategy in Phase 3. This Working Draft recommends those principles for consideration; it does not itself approve them or force a premature framework commitment.

This matrix reflects the reviewer's weighting judgment as of this v0.3 draft and should be revisited once Phase 1 (HOA discovery) and live-environment inspection clarify the unknowns listed above.

---

## 25. Recommended Target Architecture

**Proposed Direction** (not approved — subject to the Phase 2 blueprint and formal Phase 3 approval). Consistent with Section 24, the elements below are split into what does **not** depend on the React-vs-Next.js decision and what **does**. Framework-independent principles may be carried forward as provisional blueprint requirements, but this Working Draft does not approve them.

**Framework-independent — provisionally recommended for the Phase 2 blueprint and Phase 3 approval consideration:**
- **Address/property model**: rebuilt with a normalized `street_name` reference table/enum (limited to the five confirmed streets, explicitly excluding "Circle"), a free-text-but-structured house-number field, and a uniqueness constraint on the (normalized house number, street name) pair rather than house number alone — with explicit accommodation for suffix variants, front/rear, and multi-household cases per Section 7. As established in Section 26, this can be executed as an in-place schema change against the existing `units` table; it does not require discarding it.
- **Authorization**: RLS retained as the database-level defense-in-depth layer; **all privileged writes additionally pass through a server-derived-identity boundary** — whether that boundary is a hardened Supabase Edge Function/RPC (Option A) or a Next.js server-side handler (Option B) — that derives the actor's identity from the verified session, never from a client-supplied parameter, directly closing Section 11 Finding #1.
- **Privileged background operations** (e.g., monthly dues generation): moved to a trusted server-only execution path that establishes the caller through platform or handler validation and enforces the approved HOA role before invoking any `SECURITY DEFINER` function or using a service-role key, with the Section 12A trusted-name-resolution, ownership, and execution-grant hardening applied to every `SECURITY DEFINER` function — closing Section 11 Finding #3 and Section 13, independent of frontend framework.
- **Testing/CI/CD**: introduced from scratch as part of whichever path is chosen, not deferred — the current absence of any automated tests is itself flagged as a Major finding (Section 19).

**Framework-dependent — recommended to defer to Phase 3 (Option D), pending stronger delivery/deployment/handover evidence:**
- **Frontend**: either (a) the existing React/Vite/Tailwind stack, hardened per Option A, reusing all current Tailwind design tokens and UI-kit patterns unchanged, or (b) a Next.js App Router migration per Option B, reusing the same design tokens and component patterns as a starting point. Section 24 found these two options close enough in weighted score (176 vs. 163 of 210) that this document does not treat the choice as settled by the evidence gathered so far.
- **Backend/data**: Supabase-managed Postgres, retained under either framework choice — reusing the RLS role model as a technique and the payment-allocation/credit-wallet SQL structure as a reference design, rebuilt against a corrected schema (Section 7) and against confirmed HOA policy (Section 21/22), not carried forward verbatim (Section 23).

This is a **Proposed Direction**, presented here for review; it is not authorized for implementation under this document's restrictions.

---

## 26. Reuse versus Controlled-Rebuild Recommendation

*(Revised in v0.2 and sequencing-clarified in v0.3. Because every financial and related table references the immutable `units.id` UUID rather than the address text, an in-place address-model fix is technically possible. This section compares three repository strategies separately from Section 24's technology-stack options; formal selection occurs in Phase 3, not in this Working Draft.)*

**Why an in-place migration is technically possible.** `dues.unit_id`, `payments.unit_id`, `unit_credits.unit_id`, `homeowners.unit_id`, and every other foreign key into `units` reference `units.id` (an immutable `uuid`), never `house_no` or any other address text. This means it is technically possible to: add a `street_name` (or `street_id`) column; populate and validate it against real address records; drop `UNIQUE(house_no)`; add the baseline-required uniqueness rule on the normalized (house number, street name) pair; and retain every existing unit UUID and its foreign-key relationships throughout. The address defect, on its own, does **not** prove that migrating in place is non-viable.

**Three strategies, compared fairly:**

| Strategy | What it means | Strengths | Weaknesses |
|---|---|---|---|
| **(A) Harden and migrate the existing repository in place** | Keep the current `units`/`dues`/`payments`/etc. tables and UUIDs; apply the address-model fix, the Section 12A trusted-name-resolution/ownership/execution-grant hardening, server-derived actor identity, and RLS policy fixes directly to the existing schema and codebase | Lowest migration effort; no data re-keying; preserves all existing UUIDs/FKs; fastest path to a corrected system; consistent with Option A's stack scoring (Section 24) | Still requires touching nearly every table's RLS/function layer for the security fixes; carries forward the current officer-role list and billing-function structure as a starting point, which must be re-validated against Phase 1 policy answers regardless |
| **(B) Partial foundation replacement, retaining selected frontend/backend assets** | Rebuild the address/property schema and the actor-identity/authorization layer as new, purpose-built pieces, while keeping selected existing frontend components (UI kit, RBAC helper functions, print/report layouts) and selected backend SQL structure (dues/payments/allocations shape) largely as-is | Focuses rebuild effort on exactly the two areas with the most significant evidenced gaps (address model, security architecture) without discarding sound, working UI/domain-structure investment | Requires careful boundary-drawing between "replace" and "retain" pieces; some integration work to reconnect retained components to a changed schema |
| **(C) Controlled foundation rebuild with selective reuse** | Design a new, small domain/service blueprint (Phase 2) validated against confirmed HOA policy (Phase 1) before writing any schema, using the legacy repository's workflows, interface patterns, and SQL concepts as a **reference implementation** rather than a branch to patch in place | Cleanest separation between "what the legacy prototype assumed" and "what is HOA-confirmed"; lowest risk of quietly carrying forward an unconfirmed legacy assumption (Section 21) as if it were settled; best fit if Phase 1 reveals the current domain model needs more than schema patches (e.g., a genuinely different ownership/occupancy or financial-account shape) | Highest up-front documentation/design effort of the three; slowest to a working system if Phase 1 turns out to confirm most of the legacy assumptions unchanged |

**Recommendation.** Given the evidence in this report, Strategy (C) — a controlled foundation rebuild with selective reuse — is still the recommended default, but the justification is now the **combined weight** of several factors, not the address constraint in isolation:
1. Domain-model correctness: the address/property model, and potentially the ownership/occupancy model (Section 8), need re-validation against Phase 1 answers, not just a schema patch.
2. Security posture: the actor-identity, `SECURITY DEFINER` name-resolution/ownership/execution-grant gaps (Section 12A), Edge Function, and RLS-policy gaps (Sections 11–13) span most of the billing engine and several other tables.
3. Auditability: the audit trail's core guarantee (reliable actor attribution) is not currently met (Section 16) and needs a redesigned enforcement boundary, not a patch.
4. Testing/CI/CD absence: there is no existing safety net (Section 19) to validate that an in-place migration preserved correct behavior — a rebuild with tests from day one reduces this risk.
5. Maintainability: several officer-role/authority assumptions (Section 21, Section 23) are unconfirmed and likely to change once Phase 1 completes, which favors a design that treats them as configurable rather than hardcoded from the start.
6. The live-data-status unknown (Section 27): if no production data exists yet, the cost of Strategy (C) relative to (A) is lower than it would be against a live, populated system.

This recommendation is **not** as strong as "migration-in-place is not viable" — Strategy (A) remains a legitimate, lower-effort alternative if Phase 1 confirms most legacy assumptions largely unchanged and/or a live production instance already exists with data that would be costly to re-key (Section 27). Phase 1 should establish HOA policy and live-data facts; Phase 2 should produce the validated domain and service blueprint that informs the choice; **Phase 3 should formally approve both the technology stack and the repository strategy** (A, B, or C); and Phase 4 should execute the approved strategy. Option A in Section 24 and Strategy C here are different decision dimensions — technology stack versus repository treatment — so they are not inherently contradictory, and neither is final in this Working Draft.

---

## 27. Data-Migration Considerations

*(Forward-looking considerations only — no migration is authorized or performed by this document.)*

- As established in Section 26, an in-place address-model fix is technically possible because every financial/related table keys off the immutable `units.id` UUID, not the address text — the notes below are practical migration considerations for whichever strategy (A/B/C from Section 26) is ultimately chosen, not evidence that in-place migration is categorically ruled out.
- Any existing `units.house_no` values would need to be split into (house_no, street_name) pairs — this cannot be done automatically with high confidence from the current single-field data and will likely require a manual/assisted reconciliation pass against real address records.
- The current global-uniqueness constraint means any pre-existing data is, by definition, free of same-numbered-different-street collisions today — but that guarantee will not hold once real multi-street data is entered, so the constraint should be corrected **before** any real production data population is relied upon, as one factor among several favoring earlier correction (Section 26), not as standalone proof that in-place migration is unsafe.
- `homeowners` history (`is_active`/`move_in_date`/`move_out_date`) can likely be carried forward largely as-is into a corrected occupancy model, provided a DB-level constraint is added to guarantee single-active-owner-per-property going forward.
- Financial history (`dues`, `payments`, `payment_allocations`, `unit_credits`, `credit_transactions`) is already property-anchored and should migrate cleanly once `units` records are stable, since none of it depends on the address text itself (only on `unit_id`).
- Given the repository is a single-commit prototype with (to this review's knowledge) no live production data, the lowest-risk path is likely to correct the schema **before** any real resident/financial data is entered, avoiding a true data migration altogether — but this is a risk-reduction preference, not a statement that migrating live data would be infeasible if it turns out to already exist. This should be confirmed as an Unresolved Question in Phase 1: is there already live data in a deployed instance of this repository, or is it still pre-launch? (This answer also directly feeds the Section 26 strategy choice and the Section 24 sensitivity analysis.)

---

## 28. Risk Register

| # | Risk | Area | Severity | Notes |
|---|---|---|---|---|
| 1 | Global house-number uniqueness would reject legitimate same-numbered houses on different streets; no street-name/normalization/corner-merged-multi-household support | Address model | Major (fixable in place — not a rebuild blocker) | Confirmed structural gap (Section 7); technically correctable via in-place schema change since dependents key off `units.id`, not the address text (Section 26) |
| 2 | Financial audit trail (`actor_id`) is forgeable by any caller who can reach the billing RPCs | Security / Auditability | Critical | Section 11 #1 |
| 3 | Edge Function's own code has no authentication/authorization check; whether it is reachable without a valid session depends on an unconfirmed platform `verify_jwt` setting | Security | Critical (verified code gap) / Unresolved (platform reachability) | Section 13 — conditional risk either way `verify_jwt` is set |
| 4 | `process_payment`/`generate_monthly_dues`/`preview_payment_allocation` have no in-function role check; all eight definer functions lack declared trusted name resolution, explicit ownership, and version-controlled selective `EXECUTE` grants; live owner/RLS/grant behavior is unresolved | Security | Critical (missing hardening and authorization) / Unresolved (live exploitability) | Section 11 #2, Section 12, Section 12A |
| 5 | Hardcoded FIFO, dues amount, and due date may not match actual HOA policy once confirmed | Financial policy | Major | Section 21 |
| 6 | Receipt numbering scheme is not a real, durable numbering system | Financial integrity | Major | Section 10 |
| 7 | Deactivating a user (`is_active=false`) does not revoke actual system access | Security | Major | Section 11 #4 |
| 8 | Announcements are not scoped by target, contrary to their own UI design | Privacy | Moderate | Section 14 |
| 9 | No automated tests were found on a financial system (coverage not measured, since no test run was executed) | Quality | Major | Section 19 |
| 10 | Unescaped HTML interpolation into `document.write` in receipt/report generation | Security | Moderate | Section 11 #6 |
| 11 | No CI/CD; backup/recovery posture is plan-/configuration-dependent and unconfirmed (no remote Supabase project or subscription tier inspected) | Operations | Moderate | Section 20, Section 24 |
| 12 | Significant accessibility gaps were verified, including missing dialog semantics, focus management, keyboard dismissal, and some label associations; no full conformance assessment was performed | Accessibility | Moderate | Section 18 |
| 13 | No PWA/offline support for a plausible low-bandwidth resident context | UX | Minor–Moderate | Section 18 |
| 14 | Unknown live-data status (whether a deployed instance already holds real resident data) | Migration planning | Unresolved | Section 27 — must be confirmed in Phase 1; also feeds the Section 26 strategy choice |
| 15 | `generate_monthly_dues()` bills every unit regardless of `units.status` (occupied/vacant); whether vacant units should be excluded is unconfirmed HOA policy | Financial policy | Major | Section 9, Section 21 #16, Section 22 Q9 |

---

## 29. Phased Reconciliation Roadmap

*(Descriptive only. No phase is authorized or executed by this document.)*

- **Phase 0 — Legacy reconciliation and updated baseline.** *(This document.)* Produce this reconciliation report; no code changes.
- **Phase 1 — HOA discovery and policy validation.** Resolve the Unresolved HOA Discovery Questions (Section 22) and the Legacy Assumption Register (Section 21) directly with the Wonderland HOA board; confirm live-data status (Section 27).
- **Phase 2 — Approved domain and service blueprint.** Produce a validated domain model (address/property, ownership/occupancy, financial account, billing, payment/allocation, receipt) reflecting Phase 1's answers — still documentation, no code.
- **Phase 3 — Architecture, stack, and repository-strategy approval.** Formally approve the frontend/backend stack and choose the repository treatment from Section 26 (in-place hardening, partial replacement, or controlled foundation rebuild), using the Phase 2 blueprint and a revised matrix if needed.
- **Phase 4 — Execute the approved repository strategy.** Implement only the Phase 3 decision: migrate/harden in place, perform a partial foundation replacement, or create a controlled new foundation with selective reuse.
- **Phase 5 — Property and membership foundation.** Implement the corrected address/property schema and ownership/occupancy model.
- **Phase 6 — Property financial account and billing.** Implement the property-anchored financial account and billing-period model, using Phase 1-confirmed policy values (not the legacy hardcoded ones).
- **Phase 7 — Payments, receipts, allocations and reconciliation.** Implement payment recording, allocation strategy (per confirmed policy), a real receipt-numbering scheme, and reconciliation workflows.
- **Phase 8 — Resident and officer service modules.** Complaints, visitors, announcements (with corrected scoping), and any resident-portal features.
- **Phase 9 — Security, privacy, testing and operational readiness.** Server-derived actor identity everywhere, Edge Function/RPC authorization hardening, RLS policy remediation, automated test suite, CI/CD, accessibility, backup/recovery documentation.
- **Phase 10 — Controlled pilot.** Limited real-world pilot with a subset of properties/officers before full cutover.

---

## 30. First Bounded Next Task

**Phase 1, Step 1 — HOA Discovery Session #1: Address and Financial Policy Confirmation.**

A single, bounded discovery conversation (or written questionnaire) with the HOA board/treasurer covering exactly the items in Section 22, questions 1–9 (dues amount, due date, penalties, grace periods, waiver/void/refund authority, receipt numbering, GCash/bank reconciliation, vacant-property billing) plus question 11 (known address edge cases: duplicate/informal numbering, merged/divided properties, front/rear units). Output: a short, dated addendum to the Legacy Assumption Register (Section 21) recording confirmed answers, still documentation-only. This task is **not** executed by this document.

---

## 31. Commands Executed

All commands below were read-only. No install, build, migration, or write command was run against this repository.

```
git -C "d:\ALL PROJECTS - 20260725\wonderland-hoa-system" status --porcelain=v1 -b
git -C "d:\ALL PROJECTS - 20260725\wonderland-hoa-system" log --oneline -n 20
git -C "d:\ALL PROJECTS - 20260725\wonderland-hoa-system" remote -v
ls "d:\ALL PROJECTS - 20260725\wonderland-hoa-system"
ls "d:\ALL PROJECTS - 20260725\wonderland-hoa-system\docs"   # confirmed docs/ did not exist prior to this document
```

In addition, three parallel read-only research passes (via file-search agents restricted to `Read`/`Grep`/`Glob`-equivalent operations) inspected: `package.json`, `package-lock.json` (version resolution only), `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, all files under `src/**`, all files under `supabase/migrations/**` and `supabase/functions/**`, and `.env.example` (placeholder names only — no secret values were opened or printed). No `.env`/`.env.local` files were read.

**v0.2 correction pass (2026-07-28)**: an additional three parallel read-only research passes (same tool restrictions) re-verified specific claims prior to correction — the `units.status` column and its use in `generate_monthly_dues()`; the apparent provenance and compared table shape of `database.types.ts`; the presence/absence of `supabase/config.toml` and other platform config; `SET search_path`, schema qualification, ownership, and `EXECUTE` statements across the eight `SECURITY DEFINER` functions; the `on_auth_user_created` trigger that invokes `handle_new_user()`; the exact dashboard-metric queries in `DashboardPage.tsx`; and the fields/RLS policies for complaints, visitors, and announcements. Relevant repository evidence was re-inspected through read-only operations. No source, schema, configuration, package, or lockfile was modified.

**v0.3 precision pass (2026-07-29)**: the report text was edited for technical precision and internal consistency only. Official PostgreSQL and Supabase documentation was consulted for generic `SECURITY DEFINER`, default function privilege, `search_path`, and Edge Function JWT-default semantics. No repository source, schema, configuration, package, lockfile, or live environment was modified or inspected through privileged access.

---

## 32. Files Created

| File | Purpose |
|---|---|
| `docs/reconciliation/2026-07-28_WONDERLAND_LEGACY_REPOSITORY_RECONCILIATION_AND_STACK_REVIEW.md` | This document (created for v0.1 and edited in place for the v0.2 and v0.3 correction passes; no additional repository report file was authorized) |

Parent directory `docs/reconciliation/` was created as part of writing this file for v0.1; it did not exist previously (confirmed via directory listing, Section 31).

---

## 33. Confirmation That No Existing File Was Modified

No existing tracked application file in this repository was created, modified, or deleted in the production of v0.1 or the v0.2/v0.3 correction passes. No SQL migration, source file, configuration file, package manifest, or lockfile was added or changed. No remote Supabase project was accessed. No secret or ignored environment file was read. No package was installed, removed, or updated. No commit was made and nothing was pushed. The only authorized repository filesystem change across v0.1–v0.3 is the single reconciliation report listed in Section 32, under the `docs/reconciliation/` directory created for v0.1.
