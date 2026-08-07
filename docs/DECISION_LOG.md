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
