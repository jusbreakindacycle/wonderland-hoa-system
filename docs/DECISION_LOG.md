# Wonderland HOA — Decision Log

This is the repository's authoritative record of closed decisions.

`docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` is the sole source of product and technical
authority. Per its §11.3, that document is amended **through this log**, not by silent edits
to the requirements text. Where an entry supersedes a clause elsewhere in the repository, the
superseded clause is named explicitly.

`docs/PROJECT_PRODUCT_AND_SOFTWARE_GUIDE.md` was a prior audit. It has been deleted and is no
longer a valid citation; entries below that cite "the Guide" refer to the section numbering
carried forward into `WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md`.

**Recording a decision is not authorisation to implement it.** DEC-04 through DEC-15 describe
future product behaviour belonging to Stage 2, Stage 3 or Stage 4. They are recorded here so
nothing is re-derived, guessed, or softened later. None of them authorised any code change in
the task that created this file.

| ID | Date | Summary | Stage |
|---|---|---|---|
| [DEC-01](#dec-01) | 2026-08-07 | Mobile-only platform re-founding | Stage 1 |
| [DEC-02](#dec-02) | 2026-08-07 | Mobile stack: React Native + Expo | Stage 1 |
| [DEC-03](#dec-03) | 2026-08-07 | iOS posture: Android-first | Stage 1 |
| [DEC-04](#dec-04) | 2026-08-07 | Payor-designated payment allocation | Stage 3 |
| [DEC-05](#dec-05) | 2026-08-07 | Overpayment-to-next-month credit is approved policy | Stage 3 |
| [DEC-06](#dec-06) | 2026-08-07 | Dues rate change approval chain | Stage 3 |
| [DEC-07](#dec-07) | 2026-08-07 | Property-relationship financial visibility | Stage 2 |
| [DEC-08](#dec-08) | 2026-08-07 | Performance budgets MOB-030…MOB-039 approved | Stage 1 |
| [DEC-09](#dec-09) | 2026-08-07 | Success measures BUS-021…BUS-026 approved | All |
| [DEC-10](#dec-10) | 2026-08-07 | Financial posting is online-only for MVP | Stage 3 |
| [DEC-11](#dec-11) | 2026-08-07 | Prototype Supabase project snapshotted before retirement | Stage 1 |
| [DEC-12](#dec-12) | 2026-08-07 | Push notifications in scope for Stage 4 | Stage 4 |
| [DEC-13](#dec-13) | 2026-08-07 | Emergency access is break-glass | Stage 2 |
| [DEC-14](#dec-14) | 2026-08-07 | Recovery objectives RPO ≤ 24h, RTO ≤ 48h | Stage 1 |
| [DEC-15](#dec-15) | 2026-08-07 | Working association name for receipts | Stage 3 |
| [DEC-16](#dec-16) | 2026-08-07 | Stage 0 containment remediation | Stage 0 |
| [DEC-17](#dec-17) | 2026-08-08 | Automatic dues generation reinstated, on a tracked schedule | Stage 0 |
| [DEC-18](#dec-18) | 2026-08-09 | Property-derived login handle, separated from immutable identity | Stage 1 |
| [DEC-19](#dec-19) | 2026-08-09 | Measured brand colour values authorised as canonical; supersedes Requirements §6.4's estimated value | Stage 1 |
| [DEC-20](#dec-20) | 2026-08-09 | Transitional legacy web operations bridge (S1-D4); no resident self-registration | Stage 1 |
| [DEC-21](#dec-21) | 2026-08-10 | Android application id `ph.wonderlandtownhomes.hoa` (S1-D2) | Stage 1 |

---

## DEC-01

- **Date:** 2026-08-07
- **Decision:** Mobile-only platform re-founding confirmed. The platform clauses of Phase 2 §27.4 and Phase 3 §7 are `SUPERSEDED`; the rest of both documents stands — per the header and §2.1 of `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md`, which is now the authoritative record of this decision.
- **Context / citation:** `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` header and §2.1.
- **Effect:** The product is re-founded as a mobile application. Existing web artefacts are not deleted by this decision.
- **Supersedes:** Phase 2 §27.4 (platform clauses); Phase 3 §7 (platform clauses). The remainder of both documents stands.

## DEC-02

- **Date:** 2026-08-07
- **Decision:** Mobile stack: React Native with Expo, for language continuity with the existing TypeScript codebase and Windows-based EAS Build for iOS.
- **Context / citation:** Follows from DEC-01.
- **Effect:** The stack is decided. Building it is Stage 1 work, not Stage 0.
- **Supersedes:** None.

## DEC-03

- **Date:** 2026-08-07
- **Decision:** iOS posture: Android-first. iOS is deferred, not descoped.
- **Context / citation:** Follows from DEC-02.
- **Effect:** iOS remains in scope for a later stage; no iOS artefact is required now.
- **Supersedes:** None.

## DEC-04

- **Date:** 2026-08-07
- **Decision:** Payment allocation is payor-designated, not automatic oldest-unpaid-first. The payor states which month(s) a payment covers. If they designate a newer month while an older month remains unpaid, the older month stays open and remains delinquent-eligible — skipping ahead is not blocked. The assigned officer's reconciliation role is to verify the payment actually occurred (cash count or reference number matches) and **may override** the payor's stated month if verification reveals a discrepancy. The payor's declared covered month(s) print on the issued receipt. This supersedes the FIFO default in `002_billing_engine.sql:55-72` and requires a target-month parameter in the eventual replacement of `process_payment` — a Stage 3 change, not a Stage 0 one.
- **Context / citation:** `supabase/migrations/002_billing_engine.sql:55-72`.
- **Effect:** `process_payment` must eventually take a target-month parameter. **Not implemented in Stage 0.** The FIFO loop in `002_billing_engine.sql` is untouched by the Stage 0 migration.
- **Supersedes:** The FIFO allocation default at `002_billing_engine.sql:55-72`.

## DEC-05

- **Date:** 2026-08-07
- **Decision:** Overpayment-to-next-month credit is approved association policy, not merely a working practice pending adoption.
- **Context / citation:** Existing behaviour of the credit wallet in `002_billing_engine.sql`.
- **Effect:** The credit-wallet behaviour is ratified policy and may be relied on in later design.
- **Supersedes:** Any earlier characterisation of this as provisional.

## DEC-06

- **Date:** 2026-08-07
- **Decision:** Dues rate change approval chain: Board proposes → membership approval/ratification as required by governing law and bylaws → Secretary records → Treasurer implements → Auditor verifies, per `docs/phase-1/...REGISTER_v1.0.md:241` and `§8.3`. A fee-version may not be activated in the system without evidence attached for each step. Exact procedural mechanics — quorum, notice period, vote threshold — remain `RESEARCH_REQUIRED` pending the actual bylaws (RES-02, RES-03) and are not numerically enforced until then.
- **Context / citation:** `docs/phase-1/...REGISTER_v1.0.md:241`; §8.3.
- **Effect:** Fee-version activation requires attached evidence per step. Quorum/notice/threshold remain `RESEARCH_REQUIRED` (RES-02, RES-03).
- **Supersedes:** None.

## DEC-07

- **Date:** 2026-08-07
- **Decision:** Property-relationship financial visibility: the owner sees the full statement, ledger, and receipts at all times, regardless of occupancy history. A tenant sees the full statement and receipt history, but scoped only to the dates of their own active dated relationship to the property — not the period before their tenancy began. Other household members (non-owner, non-tenant) have no financial visibility by default. Confirmed basis: tenants in Wonderland do sometimes pay dues directly.
- **Context / citation:** Owner confirmation that tenants sometimes pay dues directly.
- **Effect:** Requires dated property-relationship modelling in Stage 2. The current schema has no tenant relationship model; this is **not** implemented in Stage 0.
- **Supersedes:** None.

## DEC-08

- **Date:** 2026-08-07
- **Decision:** Performance budgets `MOB-030` to `MOB-039` approved as proposed in the Guide §3.15, unchanged.
- **Context / citation:** Guide §3.15.
- **Effect:** `MOB-030`…`MOB-039` are binding as written.
- **Supersedes:** None.

## DEC-09

- **Date:** 2026-08-07
- **Decision:** Success measures `BUS-021` to `BUS-026` approved as proposed in the Guide §1.7, unchanged. `BUS-026` (100% of material financial actions carry a complete audit event) is treated as a non-negotiable invariant, not a target to be missed occasionally.
- **Context / citation:** Guide §1.7.
- **Effect:** `BUS-026` is an invariant. Every material financial action must emit a complete audit event.
- **Supersedes:** None.

## DEC-10

- **Date:** 2026-08-07
- **Decision:** Financial posting — payment recording, receipt issuance — is online-only for the MVP. No offline queueing of financial writes. Non-financial reads may still be cached for offline viewing.
- **Context / citation:** MVP scope.
- **Effect:** No offline write queue for financial actions. Read caching remains permitted.
- **Supersedes:** None.

## DEC-11

- **Date:** 2026-08-07
- **Decision:** The personal prototype Supabase project (`fgsehrblzpheeghplice`) will be snapshotted — schema and test data exported — before it is retired.
- **Context / citation:** Prototype project `fgsehrblzpheeghplice`.
- **Effect:** A snapshot is required before retirement. The project is still live and is the project this Stage 0 migration targets.
- **Supersedes:** None.

## DEC-12

- **Date:** 2026-08-07
- **Decision:** Push notifications are approved as a future in-scope capability (Stage 4), pending provider review. Not part of the MVP.
- **Context / citation:** Stage 4 scope.
- **Effect:** In scope for Stage 4, pending provider review. Excluded from MVP.
- **Supersedes:** None.

## DEC-13

- **Date:** 2026-08-07
- **Decision:** Emergency access is a defined break-glass capability: explicitly activated by a named action, never always-on; auto-expires within 24–72 hours; forces a mandatory audit-log entry; notifies the other officers when triggered.
- **Context / citation:** Security posture.
- **Effect:** Break-glass access must be explicit, time-boxed, audited, and notified. Not implemented in Stage 0.
- **Supersedes:** Any always-on emergency-access assumption.

## DEC-14

- **Date:** 2026-08-07
- **Decision:** Recovery objectives: RPO ≤ 24 hours, RTO ≤ 48 hours. Note for the record: achieving this RPO likely requires a paid Supabase tier with point-in-time recovery — a separate cost decision, not resolved here.
- **Context / citation:** Business continuity.
- **Effect:** RPO ≤ 24h, RTO ≤ 48h are binding. The tier/cost decision remains **open**.
- **Supersedes:** None.

## DEC-15

- **Date:** 2026-08-07
- **Decision:** Working association name for receipts pending the registration certificate: **Wonderland Townhomes Homeowners Association, Inc.**, J.P. Rizal St., Wonderland Townhomes, Brgy. Namayan, Mandaluyong City.
- **Context / citation:** Pending the registration certificate.
- **Effect:** This name and address are used on receipts until the registration certificate is obtained.
- **Supersedes:** None.

## DEC-16

- **Date:** 2026-08-07
- **Decision:** Stage 0 — Containment. The eight `SECURITY DEFINER` functions in schema `public` are hardened by a single forward-only migration,
  `supabase/migrations/20260807050836_stage0_containment_secure_definer_functions.sql`:
  1. `EXECUTE` revoked from `PUBLIC` on all eight, and from `anon` on six.
  2. `search_path` pinned to `public, pg_temp` on all eight.
  3. `EXECUTE` granted to `authenticated` on seven; **nothing** granted to `handle_new_user`.
  4. Authorisation guards added to `process_payment`, `generate_monthly_dues`, and `preview_payment_allocation`.
  5. The existing guards on `void_or_waive_due` and `approve_credit_refund` repaired from `IF NOT has_any_role(...)` to `IF has_any_role(...) IS NOT TRUE`.
- **Context / citation:** Hosted security advisor findings `anon_security_definer_function_executable` (8) and `function_search_path_mutable` (7), verified against project `fgsehrblzpheeghplice`. Guard pattern from `002_billing_engine.sql:148` and `:254`.
- **Effect:**
  - **Functions affected:** `get_my_role`, `has_any_role`, `handle_new_user`, `process_payment`, `generate_monthly_dues`, `void_or_waive_due`, `approve_credit_refund`, `preview_payment_allocation`.
  - **Closed:** anonymous execution of the six non-helper functions; mutable `search_path` on all eight; the complete absence of an authorisation check on `process_payment` and `generate_monthly_dues`; the unauthenticated financial-data leak through `preview_payment_allocation`; and a **fail-open defect** in the two guards that did exist — `has_any_role()` returns `NULL` (not `false`) for a caller with no resolvable role, so `IF NOT has_any_role(...)` never fired and anonymous callers passed.
  - **Deliberate exception:** `get_my_role` and `has_any_role` keep their `anon` `EXECUTE` grant. All 30 RLS policies in `001_initial_schema.sql` were created without a `TO` clause, so they are `TO public` and are evaluated in `anon` sessions; revoking would turn anonymous reads into hard permission errors rather than empty results. Neither helper discloses anything to `anon` (both return `NULL`). This knowingly leaves 2 of 8 `anon_security_definer_function_executable` advisor findings open.
  - **Precondition on application:** an **active** `pg_cron` job (`generate-monthly-dues`, `0 0 1 * *`, last run 2026-08-01 00:00:00 UTC, succeeded) invoked `generate_monthly_dues` as `postgres` with no JWT and cannot satisfy the new guard. Per Stage 0 §6.1 this was escalated rather than removed; the owner unschedules it before the migration is applied. Dues generation then runs from the officer-triggered control in `src/pages/dashboard/DashboardPage.tsx`.
- **What was explicitly NOT decided:**
  - **The guard role lists are a restatement of existing policy, not a new authorisation decision.** `['admin','president','vice_president','treasurer']` restates the `payments: finance insert` and `dues: system insert` policies in `001_initial_schema.sql` and `canRecordPayments()` in `src/lib/auth.ts`. `['admin','president','vice_president']` is the pre-existing list at `002_billing_engine.sql:148` and `:254`, carried over unchanged.
  - No table, column, constraint, index, or RLS policy was altered; no row was deleted; no financial record was created; no financial logic was changed.
  - DEC-04 (payor-designated allocation) is **not** implemented. The FIFO loop remains as written; that replacement is Stage 3.
- **Supersedes:** Stage 0 §3.0's stated premise that no `pg_cron` job exists — it does, it is active, and it has run. The repository's commented-out schedule block at `002_billing_engine.sql:442-463` does not reflect the hosted database.
- **Still open after this entry:**
  - `auth_leaked_password_protection` is **disabled**. It is a dashboard/API auth setting, not SQL, and was not changed by this migration.
  - `supabase/functions/generate-monthly-dues/index.ts` accepts unauthenticated `POST` from any origin and calls `generate_monthly_dues` with the service-role key. Its calls will now be rejected by the new guard, which is correct; fixing the Edge Function itself needs its own task.

## DEC-17

- **Date:** 2026-08-08
- **Decision:** Automatic monthly dues generation is **reinstated**, on the same schedule it ran on before
  DEC-16 removed it — job `generate-monthly-dues`, cron expression `0 0 1 * *`. Neither the name nor the
  schedule is changed; there was never anything wrong with either. What was wrong was **where the schedule
  lived**. It is therefore recreated **inside tracked migration history**, by
  `supabase/migrations/20260807160901_reinstate_automatic_monthly_dues_generation.sql`, as live SQL with no
  commented-out alternatives. `supabase db push` is now the only thing that creates it and `git log` is now
  its history.

  The schedule is made viable by a **postgres-identity carve-out**, not by relaxing the guard:

  ```sql
  IF session_user <> 'postgres' AND (
    auth.uid() IS NULL
    OR has_any_role(ARRAY['admin','president','vice_president','treasurer']) IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'Permission denied: only admin, president, vice president, or treasurer can generate monthly dues.';
  END IF;
  ```

  This is an *added path*, not a weakened check. The `IS NOT TRUE` form from DEC-16 is retained verbatim,
  so the fail-open that DEC-16 closed stays closed. It is explicitly **not** a fail-open NULL check: a
  JWT-less REST caller is still rejected.
- **Context / citation:** Owner approval to reverse requirements §5.1 from "officer-triggered only" to
  "automatic, with mandatory officer notification". DEC-16's `Precondition on application`, which recorded
  the removal this entry reverses.
- **Effect:**
  - **`session_user`, not `current_user`.** The identity test **must** be `session_user`. `current_user`
    was considered and rejected as a **fail-open**: `generate_monthly_dues` is `SECURITY DEFINER` owned by
    `postgres` (verified live: `pg_get_userbyid(proowner)` = `postgres`, `prosecdef` = true), and inside a
    `SECURITY DEFINER` body `current_user` *is the owner*. `current_user <> 'postgres'` would therefore be
    `FALSE` on every call, short-circuiting the `AND` and making the `RAISE` unreachable — every
    `authenticated` caller could generate dues. `session_user` is unaffected by both `SET ROLE` and
    `SECURITY DEFINER`. Verified live: the pre-removal run is still recorded in `cron.job_run_details` with
    `username = postgres`, and `anon`/`authenticated`/`service_role` are all `rolcanlogin = false`, reachable
    only by `SET ROLE` from `authenticator` — so **no REST caller can ever present as `postgres`**.
  - **Credit auto-apply is deferred on scheduled runs.** `generate_monthly_dues` calls `process_payment` to
    auto-apply unit credits. `process_payment` keeps its strict DEC-16 guard and is deliberately **not**
    modified, so on a JWT-less scheduled run that nested call raises and would roll the entire transaction
    back — generating **no dues at all** for the month. The loop is therefore skipped when the run is
    scheduled, and the run records `credits_applied: 0` with `credits_deferred: true`. No credit is lost:
    `process_payment` reads and applies unit credit at the start of every payment, so a deferred credit is
    applied at that unit's next payment or the next officer-triggered generation. If a later task gives
    `process_payment` its own reviewed carve-out, this deferral should be removed.
  - **The audit row now distinguishes the two paths.** `actor_id` was hardcoded `NULL` for every run. It now
    carries `auth.uid()` — `NULL` on a scheduled run, the acting officer's id on a manual one — plus
    `triggered_by` (`'scheduled'` / `'officer'`) in `new_value` and a human-readable `remarks` string on
    scheduled runs. This also closes the defect requirements §5.1 item 4 records against
    `002_billing_engine.sql:357`. **No new column and no new table.** A sentinel UUID was rejected because
    `audit_logs.actor_id` is `uuid REFERENCES profiles` (`001_initial_schema.sql:159`) and would have
    required inventing a fake "System" profile row.
  - **Officer notification is a read-only dashboard indicator.** `src/pages/dashboard/DashboardPage.tsx`
    surfaced no dues-generation status of any kind before this change. It now reads the most recent
    `dues.generated` audit row and displays its date, billing month, count, and whether the run was
    `Scheduled` or by a named officer. It sits under the page header, not inside `SystemConfigPanel` — that
    panel is gated on `isAdminLevel()`, whereas the header position reaches every role that can open the
    dashboard (`canViewFinancials()`: additionally treasurer, auditor, board_member), matching the
    `audit_logs: finance/admin read` policy in `001_initial_schema.sql:462`. This is **not** a notification
    system; DEC-12 (push notifications) remains Stage 4 and untouched.
  - **Functions affected:** `generate_monthly_dues` only. `process_payment`, `void_or_waive_due`,
    `approve_credit_refund` and `preview_payment_allocation` are **not** touched — the carve-out applies to
    `generate_monthly_dues` alone, and none of those four should ever accept an unauthenticated caller. No
    table, column, constraint, index or RLS policy is altered. The dues amount, the due-date rule and all
    allocation logic are unchanged. No `GRANT` or `REVOKE` is issued: privileges survive
    `CREATE OR REPLACE FUNCTION` and DEC-16 already left this function granted to exactly `authenticated`,
    `postgres` and `service_role`.
- **What was explicitly NOT decided:**
  - The open questions requirements §5.1 raises against dues generation — whether vacant units accrue dues,
    and whether the 5th-of-following-month due date is adopted policy — are **not** resolved here. Both
    behaviours are carried over unchanged.
  - DEC-04 (payor-designated allocation) remains unimplemented. The FIFO loop is untouched; that is Stage 3.
- **Supersedes:**
  - The **"officer-triggered, not automatic"** framing in `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md`
    §5.1. The owner amends that section separately; per §11.3 this log is the amending instrument.
  - DEC-16's `Precondition on application` clause, insofar as it states that dues generation "then runs from
    the officer-triggered control in `src/pages/dashboard/DashboardPage.tsx`". That control remains and is
    unchanged, but it is no longer the only path. The rest of DEC-16 stands in full — in particular its
    guard repairs, its `search_path` pinning, and its `anon` revocations are all preserved by this entry.
  - Requirements §3.6's statement that "There is no scheduled dues generation as of 7 August 2026", and the
    §10 open item it created.
- **Still open after this entry:**
  - The migration is authored **UNAPPLIED**. Status is `IMPLEMENTED_UNVERIFIED` until the owner runs
    `supabase db push` and independently re-verifies — the authoring session had read-only database access,
    exactly as in DEC-16. Post-apply checks: `cron.job` must show one active `generate-monthly-dues` row with
    `username = postgres`, and an anon-key REST call to `generate_monthly_dues` must still be rejected.
  - `supabase/functions/generate-monthly-dues/index.ts` is still an unauthenticated internet-reachable
    endpoint. It remains correctly rejected — it reaches the database through PostgREST, so its `session_user`
    is `authenticator`, never `postgres`, and this carve-out does not reopen it. Deleting or gating it is
    still its own task (requirements §3.7).
  - `auth_leaked_password_protection` is still **disabled**.

## DEC-18

- **Date:** 2026-08-09
- **Decision:** The resident-facing login credential is a **login handle** — HOA-issued, and for homeowners, derived from one currently owned property — not a legal-name-derived username. Canonical normalization: lowercase, remove "St." and spaces, remove the hyphen between the house number and any alphabetic suffix, format `house_no.street_name`. Examples: `115 Sampaguita St.` → `115.sampaguita`; `117-A Sampaguita St.` → `117a.sampaguita`; `111-B Sunflower St.` → `111b.sunflower`.

  The login handle is explicitly **not**:
  - the person's database identity;
  - the property's primary key;
  - an ownership relationship.

  The person's immutable identity is the Supabase Auth user UUID. Historical audit, payment, and receipt records must reference that immutable ID, never the mutable login handle.

  The login handle is mutable by design — an officer may reassign it (e.g. after a property sale) without affecting the person's underlying identity, active sessions, or historical records, because Supabase sessions resolve against the immutable user ID, not the login string.

- **Context / citation:** Owner decision, 9 August 2026, following architectural review of two alternatives (legal-name-derived vs. property-derived) and one refinement (separating immutable identity from mutable handle) before Stage 1 implementation.

- **Effect:**
  - Stage 1 implements only: accepting and normalizing an already HOA-issued canonical handle for a manually provisioned test account; translating it to the internal Supabase Auth email transport; authenticating; preserving the session; loading the verified profile; displaying the person's actual name post-authentication.
  - Stage 1 does **not** implement: deriving a handle from a live property record (the `house_no + street` schema is Stage 2 work; `street` does not yet exist as a column), ownership transfer, multi-property switching, handle reassignment, or tenant handle conventions.

- **What was explicitly NOT decided, recorded now as forward constraints:**
  - **Handle-change mechanism:** changing a login handle means updating the underlying Supabase Auth email field. This must happen through trusted server-side Admin API tooling that sets the field directly — **never** through the resident-facing `supabase.auth.updateUser({ email })` flow, which requires confirmation at both the old and new addresses. Since the underlying address is a synthetic, non-routable `@auth.wonderland.invalid` alias, that confirmation can never arrive — the standard client-facing method will hang indefinitely if used for this purpose. This is a Stage 2+ implementation concern, recorded now so it isn't rediscovered as a bug.
  - **Vacated-handle reassignment cooldown:** when a handle is vacated (e.g. after a sale), it must not be immediately reassignable to a new owner without a defined cooldown period — otherwise a stale cached credential on an old device could resolve to a different person's account. The specific cooldown duration and reassignment procedure are undecided and belong to Stage 2's ownership-transfer workflow.
  - Tenant login-handle convention remains fully deferred to Stage 2, since an owner and a tenant cannot share the same property-derived string, and the resolution isn't invented here.

- **Supersedes:** `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` §4.1's statement that "the owner username [is] derived from the owner's legal full name" and that the username "identifies a person." The property/person separation principle in §4.1 is retained; only the derivation source and the identity-vs-credential framing change. Also supersedes the legal-name-derived collision convention (`luz.garcia`, `maria.santos`, `maria.santos2`) originally proposed in the Stage 1 Implementation Guide draft, which has been corrected to match this entry.

## DEC-19

- **Date:** 2026-08-09
- **Decision:** The brand colour values measured directly from the official
  logo file are authorised as canonical:

  - `brandPrimary` (maroon) = `#752229`
  - `brandSecondary` (navy) = `#15365A`

  `docs/ux/WONDERLAND_MOBILE_UX_FOUNDATION.md` §5.1 is the single owner of
  these values going forward. Both were derived by pixel-level analysis of
  the logo file (median of the solid maroon and navy regions), not
  estimated by eye.

- **Context / citation:** Requirements §6.4 previously stated `#8B3A3A` for
  maroon, estimated by eye during earlier drafting. The UX Foundation
  document's design-token audit flagged the conflict rather than silently
  introducing a third value.

- **Effect:** Requirements §6.4 is corrected to reference the measured
  value and mark the old estimate `SUPERSEDED`. This correction has been
  applied directly to `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md`
  outside this task.

- **Supersedes:** Requirements §6.4's `#8B3A3A` estimate.

## DEC-20

- **Date:** 2026-08-09
- **Decision:** Two Stage 1 rules, recorded before implementation per Stage 1 Implementation
  Guide §15.2.

  **1. The existing React/Vite application is retained as a transitional internal HOA officer
  operations bridge (S1-D4).** It is *not* a second target product and does not reverse DEC-01's
  mobile-only re-founding. It exists to prevent an operational gap while the mobile replacement
  is built.

  Rules for the duration of the transition:

  - the root Vite application remains runnable — `src/`, `index.html`, `vite.config.ts`, the root
    `package.json` and `package-lock.json`, the web test setup, and the web dependencies all stay;
  - Stage 1 must not intentionally remove or break an existing officer operational workflow
    (dashboard, units, dues, payments, complaints, visitors, announcements, audit);
  - no new product functionality targets the legacy web client — it receives only security,
    compatibility, or operational fixes required to keep the bridge safe and usable;
  - the mobile application is built separately under `mobile/`, with no relative imports between
    the two clients;
  - no npm workspace, Turborepo, or Nx layout is introduced merely because two clients
    temporarily coexist.

  **Completion of Stage 1 is not authorisation to retire the web bridge.** Retirement requires
  all five of:

  1. every still-required officer workflow has a verified mobile replacement;
  2. those mobile workflows pass acceptance testing;
  3. a cutover audit finds no operational gap;
  4. required financial operations can continue safely after removal;
  5. the owner explicitly approves retirement and records the decision here.

  **2. Residents do not self-register.** The HOA verifies the person, provisions the account,
  assigns the login handle, and issues the credentials; the resident then signs in. The resident
  mobile UI exposes **Log In** only — no `Sign Up`, `Register`, or `Create Account` surface, and
  no reachable call to `supabase.auth.signUp` from resident-facing code. Production provisioning
  must run through a trusted server-side/admin path; a service-role or secret key is never
  embedded in the mobile client.

- **Context / citation:** Stage 1 Implementation Guide §3.3, §10.4, §10.7, §15.2 and §24 (S1-D1,
  S1-D4). DEC-18 established that the login handle is HOA-issued but did not state the
  no-self-registration rule as a closed decision; this entry states it.

- **Effect:**
  - The Stage 1 branch adds `mobile/` alongside the existing web application rather than
    replacing it. Root web CI verification is retained and runs as its own job.
  - The only root-level changes Stage 1 makes are the ones required to keep the bridge's own
    checks green alongside a second client (an ESLint ignore for `mobile/**`, `.gitignore`
    entries, the CI job split) plus README documentation. No file under `src/` or `supabase/` is
    modified.
  - The resident mobile application ships sign-in only.

- **What was explicitly NOT decided:**
  - The cutover date, the parity checklist contents, and which officer workflows are
    "still required" at cutover time. Those belong to the cutover audit, not here.
  - Whether any officer capability eventually lands in the mobile app as an officer surface or in
    a separate officer client. Stage 1 builds neither.

- **Supersedes:** Nothing. DEC-01 stands in full — this entry constrains the *timing* of web
  removal, not the mobile-only direction.

- **Still open after this entry:**
  - S1-D3, the officer-assisted account-recovery procedure, required before resident pilot or
    production rollout (Guide §10.9). Stage 1 ships only a "Contact the HOA" message.

## DEC-21

- **Date:** 2026-08-10
- **Decision:** The Android application id is **`ph.wonderlandtownhomes.hoa`**, recorded in
  `mobile/app.json` under `android.package`. This closes S1-D2.

  The form is deliberate:

  - `ph` — the association's country, and a namespace the association legitimately sits in;
  - `wonderlandtownhomes` — the organisation segment, matching the working association name in
    [DEC-15](#dec-15) (*Wonderland Townhomes Homeowners Association, Inc.*);
  - `hoa` — the application.

  A `com.`-prefixed alternative was rejected: reverse-DNS under `com.` asserts control of a
  matching domain, and the association does not hold `wonderlandhoa.com`.

- **Context / citation:** Stage 1 Implementation Guide §14.4 requires the application id to be
  approved before the first EAS build intended to carry the long-term application identity, and
  §24 (S1-D2) leaves it open. Owner decision, 10 August 2026.

- **Effect:**
  - `mobile/app.json` sets `android.package` to this value, with `versionCode` 1.
  - The value is treated as permanent. Changing an application id after store distribution
    forces a new Play listing and orphans every existing install, so it is not edited casually.
  - iOS bundle identifier is **not** decided here. iOS is deferred, not descoped
    ([DEC-03](#dec-03)), and no iOS artefact exists to name.

- **What was explicitly NOT decided:**
  - The Play Store listing name, the developer account that will own it, or any release track.
    Stage 1 performs no Play Store submission.
  - The production Supabase project the released app will point at. Stage 1 builds target the
    existing development project `fgsehrblzpheeghplice`, whose retirement is governed by
    [DEC-11](#dec-11).

- **Supersedes:** None. S1-D2 was open, not previously answered.