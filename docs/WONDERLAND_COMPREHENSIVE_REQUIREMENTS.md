# Wonderland Townhomes HOA — Comprehensive Product & Technical Requirements

**Organisation:** Wonderland Townhomes Homeowners Association, Inc.
**Address:** J.P. Rizal St., Wonderland Townhomes, Brgy. Namayan, Mandaluyong City, 1550
**Document status:** APPROVED BY OWNER — supersedes conflicting clauses in prior phase documents
**Date:** 7 August 2026
**Repository:** https://github.com/jusbreakindacycle/wonderland-hoa-system
**Supersedes:** platform and scope clauses of Phase 2 §27.4, Phase 3 §7

---

## 0. HOW TO READ THIS DOCUMENT

### 0.1 Hierarchy

This document is ordered **foundations first**. Section 1 (Business Context) constrains Section 2 (Product), which constrains Section 3 (Requirements), and so on. Nothing lower may contradict something higher without an explicit recorded decision.

The MVP definition is in **§2.4 — near the top, not the bottom** — because everything below it is either in the MVP or explicitly deferred, and the reader needs to know which before reading further.

### 0.2 Evidence labels

Every factual claim about the current system carries a label:

| Label | Meaning |
|---|---|
| `VERIFIED` | Read directly from the repository at commit `79f8b69` during this session, with file and line cited |
| `OWNER-DECIDED` | Stated by the owner in the decision conversation of 7 August 2026 |
| `PROPOSED` | Recommendation by Claude, not yet approved and not yet built |
| `RESEARCH-BACKED` | Sourced from external regulation or published guidance, with source named |
| `OPEN` | Genuinely unresolved; requires a decision or investigation before it can be built |

Do not treat a `PROPOSED` item as approved. Do not treat an `OPEN` item as settled.

### 0.3 This document does not authorise implementation

It defines *what* to build. Each build stage requires its own Implementation Guide and its own approval. Code examples deliberately do not appear here — see §11.

---

## 1. BUSINESS CONTEXT

### 1.1 What Wonderland is

`RESEARCH-BACKED` Wonderland Townhomes Homeowners Association, Inc. is a registered homeowners' association operating under **Republic Act No. 9904** (Magna Carta for Homeowners and Homeowners' Associations), regulated by the **Department of Human Settlements and Urban Development (DHSUD)**.

`VERIFIED` It maintains a public Facebook presence at `/whainc`, described as "The Highest Governing Body of Wonderland Townhomes," which is currently used for announcements — including the Sports Court Permit Policy effective 7 June 2026.

### 1.2 What the association actually does

Derived from the owner's account and from published association announcements:

1. Collects monthly dues from homeowners
2. Issues receipts for payments received
3. Tracks delinquency and arrears
4. Manages a sports court, including guest permits and a resident-sponsorship rule
5. Manages facility bookings
6. Issues community announcements, policies, and rules
7. Coordinates gate security and guest entry
8. Holds periodic elections that rotate officers

### 1.3 The problem this system solves

The association currently runs on paper receipts (the specimen provided dates to 1984 in format), a Facebook page, and manual record-keeping. This produces:

- No verifiable ledger a homeowner can inspect — a right guaranteed under RA 9904
- No digital trail of where dues money goes, which the owner identifies as a corruption risk
- Officer knowledge lost at every election
- Announcements reaching only Facebook users
- Permit applications requiring a physical visit to the guardhouse

### 1.4 Primary business goal

`OWNER-DECIDED` Transparency. The system exists so that every peso collected and every peso spent is visible to the membership, and so that no officer transition loses the record.

### 1.5 Regulatory constraints

`RESEARCH-BACKED` Non-negotiable constraints under RA 9904 and DHSUD/HLURB guidance:

| Constraint | Implication for this system |
|---|---|
| Members have a right to inspect books and financial statements | The homeowner-facing ledger is a legal obligation, not a feature |
| The association **may not** disconnect water or electricity for unpaid dues | The system must never expose such an action, and must not model it |
| Penalties and interest require an express, validly adopted Bylaw provision | See §5.4 — Wonderland currently has none |
| Penalties may not be applied retroactively | Any future penalty rule must carry an effective date |
| Written notice of dues, deadlines, and grace periods is required | The system must generate and record such notices |
| Dues increases require the approval chain in the Bylaws | See §5.5 |

---

## 2. PRODUCT

### 2.1 Platform

`OWNER-DECIDED` **Mobile-only.** React Native with Expo. Android-first; iOS deferred (not descoped).

This supersedes the platform clauses of Phase 2 §27.4 and Phase 3 §7, which rejected native mobile. All other content of those documents stands.

`VERIFIED` The existing repository is a React 18.3.1 + Vite 5.4.10 **web** application. No mobile artefact of any kind exists in the tree. The mobile application is therefore a **new build**, not a conversion.

### 2.2 Users

| User type | Who they are | Access model |
|---|---|---|
| **Officer** | Elected or appointed association officers | Role-scoped; see §4.3 |
| **Owner** | Registered owner of one or more units | Full access to their own unit(s), all time periods |
| **Tenant (full-house)** | Renting an entire unit | Access to that unit, scoped to their tenancy dates only |
| **Family member** | Adult sharing an owner-occupied unit | Shares the unit account; same view as the owner |
| **Room renter** | Renting a room within an occupied unit | **No application access.** Dues remain the owner's responsibility |
| **Guest** | Non-resident sports court player | No account; appears only on a resident-sponsored permit |

### 2.3 Product principles

1. **Human verification is mandatory.** `OWNER-DECIDED` No payment is ever auto-confirmed. An officer must reconcile every payment against the actual receiving account.
2. **The app holds no money.** `OWNER-DECIDED` No payment gateway, no in-app payment processing. The app displays QR codes and account details; money moves through GCash, InstaPay, QRPH, or bank transfer entirely outside the system.
3. **Every financial action is auditable.** 100% audit coverage is an invariant, not a target.
4. **The app is the source of truth.** Facebook becomes a secondary channel.
5. **Officer identity is captured at the moment of action**, so elections never invalidate historical records.

### 2.4 MVP SCOPE

`OWNER-DECIDED` The owner has approved the following as MVP:

| # | Capability | In MVP |
|---|---|---|
| 1 | Username-based authentication | Yes |
| 2 | Owner / tenant / family access model | Yes |
| 3 | Multi-unit ownership | Yes |
| 4 | Officer-triggered dues generation | Yes |
| 5 | Homeowner dues dashboard and ledger | Yes |
| 6 | Payment receipt upload with month selection | Yes |
| 7 | Officer reconciliation queue | Yes |
| 8 | PDF receipt generation | Yes |
| 9 | Announcements feed | Yes |
| 10 | Sports court guest permits | Yes |
| 11 | Facility bookings | Yes |
| 12 | Searchable, offline knowledge base | Yes |
| | | |
| — | Facebook auto-posting | Deferred |
| — | Push notifications | Deferred (DEC-12) |
| — | Offline financial writes | Excluded (DEC-10) |
| — | In-app payment processing | Excluded permanently |
| — | iOS build | Deferred (DEC-03) |

#### 2.4.1 Scope risk — recorded, not resolved

`PROPOSED` This is a large MVP for a solo builder. Items 1–8 form a coherent, sequentially dependent financial core. Items 9–12 are four additional feature areas, each with its own data model, screens, and permission rules.

The honest assessment: **items 9–12 roughly double the MVP surface without changing whether the financial core works.** A homeowner who can see their ledger and pay their dues has the transparency benefit described in §1.4. One who can also book the sports court does not have it *more*.

The recommendation is not to cut them from the product — they are clearly wanted and clearly useful. It is to **sequence them after the financial core ships**, so that a working system reaches residents months earlier and the feature areas are built against a proven foundation rather than in parallel with it.

This is recorded as `OPEN` for the owner. Building all twelve as one MVP is a valid choice; it is simply a slower first release. The stage plan in §8 is written so that either answer works — §8 Stages 1–3 are the financial core, and Stage 4 is items 9–12. Whether Stage 4 is "MVP" or "immediately post-MVP" is a labelling decision, not a re-plan.

### 2.5 Out of scope, permanently

- Any in-app payment gateway or wallet
- Any action that restricts utilities (illegal under RA 9904)
- Automated penalty or interest calculation, unless and until a valid Bylaw provision exists (§5.4)

---

## 3. CURRENT SYSTEM — VERIFIED STATE

Everything in this section was read from the repository at commit `79f8b69` during this session. It exists to make the gap in §6 concrete.

### 3.1 What exists

`VERIFIED`

| Component | State |
|---|---|
| Frontend | React 18.3.1 + Vite 5.4.10 web application |
| Database | Supabase Postgres, project `fgsehrblzpheeghplice` |
| Migrations | Three files, `001_initial_schema.sql`, `002_billing_engine.sql`, `003_house_no.sql`, each headed with an instruction to paste into the SQL Editor |
| Hosted migration history | Empty — the CLI has never tracked this project |
| `supabase/config.toml` | Absent |
| Tests | 9 tests, covering one Button component and one ErrorBoundary. Zero coverage of finance, authorisation, or RLS |
| CI | `.github/workflows/ci.yml` present; typecheck, lint, and tests pass |

### 3.2 Authentication — as built

`VERIFIED` `src/components/auth/LoginPage.tsx:32-41` renders an `<input type="email">` with placeholder `you@example.com`. Authentication is Supabase email/password. **There is no username field and no username concept anywhere in the codebase.**

### 3.3 Roles — as built

`VERIFIED` `001_initial_schema.sql:16-22` defines `profiles.role` as a CHECK constraint over ten flat values:

`admin`, `president`, `vice_president`, `treasurer`, `secretary`, `auditor`, `pro`, `board_member`, `security`, `resident`

`VERIFIED` `src/lib/auth.ts:21-68` implements twelve capability predicates over these roles — `canRecordPayments`, `canVoidOrWaive`, `canManageHomeowners`, and so on.

Two structural observations:

1. `admin` is a permanent superuser sitting in the same list as elected positions. There is no time-bounded or break-glass concept.
2. `resident` is a single flat role. **There is no way to distinguish an owner from a tenant from a family member.**

### 3.4 Address model — as built

`VERIFIED` `003_house_no.sql` performs the following on the `units` table:

- Drops the `lot` column (`:19`)
- Renames `block` → `house_no` (`:22`)
- Re-adds `unit_code` as a generated alias of `house_no` (`:26-27`)
- Adds `UNIQUE (house_no)` (`:30-31`)

`VERIFIED` **No `street` column exists anywhere in the repository.** A repository-wide grep for `street` across `supabase/` and `src/` returns nothing.

Consequence: `house_no` is **globally unique**. `113 Sampaguita` and `113 Sunflower` cannot both exist in this database. This directly blocks the addressing scheme in §4.2 and is the single most important schema defect to correct.

### 3.5 Occupancy model — as built

`VERIFIED` The `homeowners` table (`001_initial_schema.sql:38-49`) carries `unit_id`, `profile_id`, `full_name`, `email`, `contact_number`, `move_in_date`, `is_active`, plus `move_out_date` added by `003:35-36`.

`VERIFIED` A repository-wide grep for `relationship`, `is_owner`, `tenant`, and `occupant_type` across all migrations returns nothing.

Consequence: the schema cannot express "Maria is a tenant of Unit 113 from 1 June to 31 August" as distinct from "Luz owns Unit 113." Both are simply rows in `homeowners`. **The entire owner/tenant/family model in §4.3 has no schema support today.**

### 3.6 Dues generation — as built

`VERIFIED` `generate_monthly_dues()` at `002_billing_engine.sql:296-375`:

- Takes an optional `p_billing_month`, defaulting to the current month
- Reads the amount from `system_config` where `key = 'monthly_dues_amount'`
- Sets `due_date` to the 5th of the following month (`:318-320`)
- Inserts one due per unit, for **all units including vacant ones** (`:322-334`)
- Auto-applies existing unit credits by calling `process_payment` (`:336-352`)
- Writes an audit row with `actor_id = NULL` (`:355-366`)
- Is `SECURITY DEFINER` with **no authorisation check whatsoever**

`SUPERSEDED` — the paragraph below was wrong and is kept only so the correction is traceable, not deleted silently.

~~The pg_cron schedule is entirely commented out. `002_billing_engine.sql:442-463` contains the `CREATE EXTENSION`, `cron.schedule`, and verification commands, every line prefixed with `--`. No cron job has ever been created.~~

`VERIFIED` **That was file-only evidence and it was false against the live database.** Confirmed directly during Stage 0 execution, 7 August 2026: a real, active `pg_cron` job (`jobid 1`, name `generate-monthly-dues`, schedule `0 0 1 * *`, running as `postgres` with no JWT) existed on the hosted project and had already fired successfully once, on 2026-08-01. The commented-out block in the migration file was never applied to production — someone scheduled it directly against the hosted database, outside any tracked migration, and the file was never updated to match. This is the exact repo/hosted-state divergence the rest of this document warns about, caught by re-querying the live database rather than trusting a file read.

The job has since been unscheduled — `SELECT cron.unschedule('generate-monthly-dues')`, run directly as `postgres` via the Supabase SQL Editor on 7 August 2026, confirmed by `SELECT count(*) FROM cron.job WHERE command ILIKE '%generate_monthly_dues%'` returning `0`. This is recorded as `DEC-16` in `docs/DECISION_LOG.md`, alongside the Stage 0 remediation it was a precondition for.

What this means now, corrected:

- The owner's decision that dues generation is **officer-triggered** (DEC-01, §5.1) is now enforced in reality, not just in the migration file — the automated path that used to exist is gone.
- **There is no scheduled dues generation as of 7 August 2026.** The manual trigger already in `DashboardPage.tsx:201` is the only path. See the new open item this creates, §10 item 16.
- The only remaining NULL-session caller is the Edge Function (§3.7), which is now the sole reason the strict, no-exceptions guard in Stage 0 was safe to apply — nothing legitimate needed a NULL-session carve-out once the cron job was removed.

### 3.7 The Edge Function — a finding not in the prior audit

`VERIFIED` `supabase/functions/generate-monthly-dues/index.ts` is a Deno HTTP endpoint that:

- Accepts `POST` from any origin (`Access-Control-Allow-Origin: '*'`, `:3`)
- Constructs a Supabase client using `SUPABASE_SERVICE_ROLE_KEY` (`:24-27`), explicitly to bypass RLS
- Reads an optional `billing_month` from the request body (`:31-33`)
- Calls `generate_monthly_dues` with it (`:35-36`)

There is **no authorisation check in this function**. It does not verify a JWT, does not check a shared secret, and does not check a caller role.

`OPEN` This is an internet-reachable, unauthenticated endpoint that writes financial records using the service-role key. It is arguably a more direct exposure than the RPC grants that Stage 0 was scoped to close, and **Stage 0 as currently written does not touch it** — §1.2 of the Stage 0 prompt explicitly forbids modifying this file.

**Recommendation:** treat this as a Stage 0 follow-up with its own task, before any mobile client is pointed at this project. Either delete the function (dues generation is officer-triggered from the app, so it may be unnecessary), or gate it behind `verify_jwt` plus a role check.

### 3.8 Payment allocation — as built

`VERIFIED` `process_payment()` at `002_billing_engine.sql:14-124` takes `p_unit_id`, `p_amount`, `p_method`, `p_reference`, `p_received_by`, `p_notes`. It reads any unit credit balance, then allocates across unpaid dues **oldest first**, with no parameter by which a caller may designate a target month.

It is `SECURITY DEFINER` with no authorisation check. `void_or_waive_due` (`:148`) and `approve_credit_refund` (`:254`) in the same file **do** carry `has_any_role(ARRAY['admin','president','vice_president'])` guards. The asymmetry appears accidental.

### 3.9 Receipts — as built

`VERIFIED` There is no receipt entity in the schema. `src/lib/printPDF.ts:155` computes a display value from the payment UUID:

```
payment.id.replace(/-/g,'').toUpperCase().substring(0,10)
```

This is rendered as "OR No." on a printed document and is **never stored**. It is not gapless, not sequential, and not reproducible if the payment row is ever regenerated.

### 3.10 Prototype data

`VERIFIED` (from the prior audit, not re-verified this session) The hosted project holds 5 dues rows and 2 payment rows against **zero units**, possible because the financial foreign keys are nullable. This is prototype noise, but it demonstrates precisely the referential defect the target model must prevent.

---

## 4. TARGET MODEL

### 4.1 Identity and authentication

`OWNER-DECIDED` Authentication is **username-based**, not email-based.

| Concept | Value | Note |
|---|---|---|
| Login identifier | Username | Not an email address |
| Owner username | Derived from the owner's legal full name | e.g. `luz.garcia` |
| Unit identifier | `house_no` + `street` | e.g. `113 Sampaguita` — used on receipts, bills, and audit records |

**The critical separation:** the username identifies a *person*; `house_no + street` identifies a *property*. Conflating them was the source of the multi-unit conflict. A person may hold many properties; a property may be held by one owner and occupied by several people.

`PROPOSED` Email remains an optional profile field for notifications and receipt delivery. It is not a credential.

`OPEN` Username assignment procedure. Who creates the username when a new owner registers — self-service at signup, or officer-issued? What happens on a name collision (two owners named Maria Santos)? Recommended: officer-issued at unit registration, with a numeric suffix on collision.

### 4.2 Address model

`OWNER-DECIDED` Every unit is identified by `house_no` **and** `street`.

Required schema change, blocking:

1. Add a `street` column to `units`
2. **Drop** the `UNIQUE (house_no)` constraint at `003_house_no.sql:30-31`
3. Add `UNIQUE (house_no, street)` in its place

Until step 2 happens, `111a Sunflower` and `111b Sunflower` and `113 Sampaguita` cannot coexist correctly.

`OPEN` Street list. The known streets are Sampaguita and Sunflower. The complete list is not established. Also unresolved: whether `house_no` values like `111a` and `111b` are unit subdivisions of a single physical house number, and if so whether that relationship needs to be modelled or whether the suffixed string is sufficient. Recommended: treat `111a` as an opaque `house_no` string unless a subdivision relationship proves necessary.

### 4.3 Access model

`OWNER-DECIDED` The following table is the complete access specification.

| Occupancy type | Who pays dues | App access | Time scope | May upload receipts |
|---|---|---|---|---|
| **Owner-occupied** | Owner | Owner account | All periods, always | Yes |
| **Owner + family sharing** | Owner or designated family member | One shared unit account; owner plus one designated adult | All periods, always | Either — one at a time |
| **Full-house rental** | Tenant | Separate tenant login, own password | **Tenancy dates only** | Yes; owner may override |
| **Room-for-rent** | Owner | Owner account only. Room renter has **no access** | All periods, always | Owner only |
| **Multi-unit owner** | Owner | One account listing all owned units | All periods, all units | Yes, across units |

Key rules:

1. `OWNER-DECIDED` A tenant sees the full ledger and receipt history **for their tenancy period only**. They do not see the period before they moved in.
2. `OWNER-DECIDED` The owner always sees everything, including periods during which a tenant occupied the unit.
3. `OWNER-DECIDED` The room-for-rent arrangement is a private contract between owner and renter. The association is not a party to it and the system does not model it beyond a flag on the unit.
4. `OWNER-DECIDED` One unit account per unit for the owner-occupied and family cases, regardless of how many adults live there.

Required schema support (none of which exists today, per §3.5):

- A `unit_occupancies` relation carrying `unit_id`, `person_id`, `relationship` (`owner` / `tenant` / `family_member`), `start_date`, `end_date`
- Multi-unit ownership expressed as multiple `owner` rows for one person
- Time-scoped read policies that filter by the requesting person's active date range on that unit

`OPEN` Tenant onboarding. `OWNER-DECIDED` states that on first app download a person declares whether they are an owner or a tenant, and when they started. What verifies that declaration? A self-declared tenancy start date is a self-service claim to see financial history. Recommended: tenant accounts are **officer-created** from a lease record, not self-registered. This is a genuine unresolved conflict between ease of onboarding and financial data protection.

`OPEN` Historical data on launch. `OWNER-DECIDED` notes that because the app is new, there is no prior digital history and this should not be a problem initially. This is true for tenants. It is **not** true for owners with existing arrears — see §5.3.

### 4.4 Officer roles and elections

`OWNER-DECIDED` Officers rotate through elections. The system must survive rotation without invalidating history.

Requirements:

1. Every financial action records the acting officer's identity **and their position at that moment**
2. Historical records are immutable. A receipt reconciled by Treasurer A in March 2026 continues to read "Treasurer A" after Treasurer B takes office
3. Role assignment is time-bounded — a person holds a position for a term, not permanently

`PROPOSED` Replace the flat `profiles.role` (§3.3) with a time-bounded `officer_terms` relation carrying `person_id`, `position`, `term_start`, `term_end`. Capability checks resolve against the term active on the date of the action.

`PROPOSED` Redefine `admin` as a system-maintenance role distinct from elected positions, held by the system maintainer, not conferred by election.

`OWNER-DECIDED` Break-glass emergency access (DEC-13): explicitly activated by a named action, never always-on; auto-expires within 24–72 hours; forces an audit-log entry; notifies other officers on activation.

---

## 5. FINANCIAL RULES

### 5.1 Dues generation

`OWNER-DECIDED` **Officer-triggered, not automatic.** An assigned officer sets the billing period; the charge then reflects on every homeowner account in the app.

Requirements:

1. An authorised officer selects the billing month and confirms
2. The system generates one due per unit
3. The due date is auto-calculated
4. The acting officer is recorded on the generation event — `VERIFIED` the current implementation writes `actor_id = NULL` (`002:357`), which must change
5. Generation is idempotent — re-running for the same month must not duplicate charges

`VERIFIED` Idempotency already exists via `ON CONFLICT (unit_id, billing_month) DO NOTHING` (`002:331`). This behaviour should be preserved.

`OPEN` Vacant units. `VERIFIED` the current function bills **all** units including vacant ones (`002:322-323`, `SELECT id FROM units` with no status filter). Whether a vacant unit accrues dues is an association policy question, not a technical one. It materially affects arrears balances.

`OPEN` Due date rule. `VERIFIED` the current rule is the 5th of the following month (`002:318-320`). Whether this is adopted association policy or a developer assumption is unestablished, and it interacts with the grace period in §5.4.

### 5.2 Payment allocation

`OWNER-DECIDED` **Payor-designated, not automatic oldest-first.**

| Rule | Decision |
|---|---|
| Who chooses the covered month(s) | The payor |
| May a payor pay a newer month while an older one is unpaid | Yes |
| Does the older month stay open | Yes — it remains open and delinquent-eligible |
| May the officer override the payor's designation | Yes, if reconciliation reveals a discrepancy |
| Does the declared month appear on the receipt | Yes |

This supersedes the FIFO behaviour at `002_billing_engine.sql:55-72` and requires a target-month parameter that `process_payment` does not currently accept.

`OWNER-DECIDED` Overpayment carries forward as credit to the next month (DEC-05) — approved association policy, not merely current practice.

### 5.3 Arrears and installments

`OWNER-DECIDED` A homeowner in arrears may pay by installment. **No time limit. No penalty. No interest.**

Example, as given by the owner: a unit with six months of arrears may pay March and April now, leaving the rest open, with no penalty consequence.

`OPEN` **Opening balances.** This is the most significant unaddressed gap in the launch plan. Existing homeowners have real arrears accumulated under the paper system. On launch, the app will show a balance. Where does the opening figure come from?

Options, none yet chosen:
- Import from existing paper or spreadsheet records, with a reconciliation and sign-off step
- Start every unit at zero and treat pre-launch arrears as out-of-system
- Enter opening balances per unit as an officer task during onboarding

This must be decided before the first homeowner logs in, because the first thing they will do is check whether the number is right. Getting it wrong on day one destroys the transparency goal in §1.4 permanently.

### 5.4 Penalties and grace period

`RESEARCH-BACKED` Under RA 9904 and DHSUD/HLURB guidance, an association may impose late charges **only** where the Bylaws expressly authorise them and specify the rate, computation, grace period, and start date — or where a rule to that effect was adopted following the procedure the Bylaws require. Where no validly adopted rule exists, penalties are legally vulnerable. Penalties may not be applied retroactively, and courts may reduce rates found unconscionable.

`OWNER-DECIDED` Wonderland has no such rule locally, and the owner's instruction is that there should be **no penalty**.

**Therefore:**

1. The MVP implements **no penalty and no interest calculation of any kind**
2. `PROPOSED` A 30-day grace period after the due date, during which an account is late but not delinquent — this is a display and notification concept only, with no financial consequence attached
3. Should the association later adopt a penalty rule, it requires: a Bylaw provision or validly adopted resolution, an effective date, and no retroactive application

`OPEN` The owner's Facebook announcement of the Sports Court Permit Policy mentions penalties arising from sports facility use, and the owner's requested receipt wording includes "monthly dues and penalties from sports." **This implies a penalty regime already exists for facility violations.** Its legal basis, rate, and adoption procedure are unestablished. This must be researched against the actual Bylaws before any penalty appears in the system.

### 5.5 Dues rate changes

`OWNER-DECIDED` (DEC-06) The approval chain is: **Board proposes → membership approval/ratification as required by governing law and Bylaws → Secretary records → Treasurer implements → Auditor verifies.**

`VERIFIED` This chain is already documented in the repository at `docs/phase-1/2026-08-04_WONDERLAND_PHASE_1_POLICY_GOVERNANCE_CONTROLS_REGISTER_v1.0.md:241`, with §8.3 of the same document listing dues increases as requiring membership ratification.

Requirement: a new dues rate may not be **activated** in the system without evidence attached for each step in the chain.

`OPEN` Procedural mechanics — quorum, notice period, vote threshold — depend on the actual Bylaws, which have not been located. Until then the system enforces the *sequence* and the *evidence*, not the numeric thresholds.

---

## 6. PAYMENT AND RECONCILIATION WORKFLOW

This is the core workflow of the system. It is specified in full because every other financial requirement depends on it.

### 6.1 Payment channels

`OWNER-DECIDED` The app **never** processes payments. It displays receiving details only: bank account, GCash, QRPH, InstaPay QR codes. Money moves entirely outside the system.

### 6.2 The workflow

**Step 1 — Homeowner submits.**

The homeowner uploads a screenshot of their bank or GCash transaction confirmation, and selects the covered month(s) and unit(s).

`OWNER-DECIDED` Month selection is by **checkbox, pre-populated with the oldest unpaid months already checked**, not free-text entry:

```
This payment covers:
  [x] March 2026     ₱5,000 unpaid
  [x] April 2026     ₱5,000 unpaid
  [ ] May 2026       ₱5,000 unpaid
```

The homeowner adjusts only if their intent differs from the default. For a multi-unit owner, unit selection uses the same checkbox pattern.

The submission enters `PENDING_RECONCILIATION`.

**Step 2 — Officer reconciles.**

The assigned officer opens the reconciliation queue, opens the submission, and checks the association's actual receiving account — bank, GCash — to confirm the funds arrived and the amount matches.

`OWNER-DECIDED` The action is labelled **"Mark as Reconciled."** This wording is deliberate: it states what the officer actually did — compared the claim against the receiving account — rather than implying a fraud determination.

Outcomes:

| Outcome | Effect |
|---|---|
| **Reconciled** | Dues marked paid for the designated months; receipt generated |
| **Rejected** | Homeowner notified in-app with the reason; may re-upload a corrected submission; the rejection is retained in history for audit |

`OWNER-DECIDED` Cash payments bypass this workflow — the officer issues the receipt directly at the point of collection.

**Step 3 — Receipt issues.**

`OWNER-DECIDED` The receipt is generated **only after reconciliation.** The homeowner sees a pending status before that, never a receipt.

`OWNER-DECIDED` For a payment covering multiple units, **one receipt per unit** is issued, not a single combined receipt.

### 6.3 Duplicate and mismatch handling

`OWNER-DECIDED` These are handled by human judgement at the reconciliation step — the officer sees the same reference number twice, or sees the claimed amount differ from the received amount, and rejects with a reason.

`PROPOSED` The system should **assist** that judgement without replacing it: flag when an uploaded reference number matches one already reconciled, and display the claimed amount prominently against the designated months' total so a mismatch is visible at a glance.

### 6.4 Receipt content

`OWNER-DECIDED` The receipt follows this substance, modernised from the association's 1984-era paper form:

> Received from **[name]** the sum of **[amount in words, auto-generated from the numeric amount]** (₱[amount]) for the month(s) of **[months]**, in payment of **[purpose]**.

Required elements:

| Element | Note |
|---|---|
| Association logo | Circular Wonderland mark, maroon and navy |
| Full registered name and address | Per §0 header |
| Receipt number | Stored, gapless, sequential — see §6.5 |
| Date and time of reconciliation | |
| Payor name | |
| Unit identifier | `house_no` + `street` |
| Per-month breakdown | Month, year, amount |
| Total in figures **and** words | Words auto-generated from the figure |
| Purpose | Monthly dues, or other category |
| Payment method and reference number | From the uploaded confirmation |
| Reconciling officer name **and position** | Captured at reconciliation time; immutable thereafter |
| Reconciliation status | |

`PROPOSED` Visual treatment: maroon (`#8B3A3A`) as the primary brand colour drawn from the logo, with a distinct visual treatment for the verification block. Logo at 80×80px in the receipt header. Output as PDF, A4, print-friendly.

### 6.5 Receipt numbering

`PROPOSED` Receipts require a **stored, gapless, sequential** number — for example `WTHO-2026-000184`.

This replaces the current UUID-substring approach (§3.9), which is not gapless, not sequential, and not reproducible. A receipt number is a financial control document; deriving it from a random identifier defeats its purpose.

`OPEN` Numbering scope: does the sequence run per year, continuously, or per unit? Recommended: continuous within a calendar year, reset annually, which matches common Philippine practice.

### 6.6 Receipt storage and download

`OWNER-DECIDED` Receipts are generated once, immediately after reconciliation, and stored as PDF in Supabase Storage. Homeowners retrieve them on-demand from their app's payment history without using a browser.

Workflow:

1. Officer reconciles a payment
2. System generates a PDF using the receipt template (§6.4)
3. PDF is stored in Supabase Storage with a unique filename tied to the payment ID
4. Homeowner opens their payment history in the app
5. Payment shows status "Reconciled" with a "Download Receipt" button
6. Homeowner taps the button
7. App fetches the pre-generated PDF from storage
8. PDF downloads to the device's Downloads folder
9. No browser involved; no corruption risk; suitable for offline-capable storage access

**Storage specification:**

- Location: `supabase/storage/wonderland-receipts/[unit_id]/[receipt_id].pdf`
- Access control:
  - Homeowners: read-only, scoped to their own units and tenancy periods
  - Tenants: read-only, scoped to their tenancy dates only
  - Officers: read-only for audit; cannot access homeowner downloads
  - Service role: read and write for backup/recovery only
- Encryption: Supabase Storage default (at-rest)
- Retention: permanent (financial record)

**Why this approach:** PDF is generated once on the backend and stored as-is, eliminating on-device conversion and corruption risk. Network latency is minimal because the file is pre-built, not generated on-demand.

---

## 7. NON-FINANCIAL FEATURES

### 7.1 Announcements

`OWNER-DECIDED` Announcements are posted **in the app.** Facebook remains a secondary channel; auto-posting to Facebook is deferred to a later stage.

Rationale, as reasoned with the owner: requiring an officer to post in two places guarantees they will eventually post in only one, and the app is the place that must be authoritative.

`OWNER-DECIDED` Announcements appear on the dashboard and in a dedicated navigation section.

**Image specification** — the association already produces templated announcement graphics:

| Parameter | Value |
|---|---|
| Aspect ratio | 16:9, locked |
| Recommended | 1200 × 675 px |
| Minimum | 800 × 450 px |
| Maximum | 1600 × 900 px |
| Formats | JPG, PNG, WebP |
| Max file size | 2 MB |

`PROPOSED` Upload behaviour: validate the aspect ratio on selection; offer an in-app crop rather than rejecting an off-ratio image; never stretch, tile, or letterbox. Display must preserve the ratio at every screen width.

`PROPOSED` Template design guidance, derived from the association's existing graphics: keep critical text outside the outer 10% margin so nothing is lost on narrow screens; ensure body text remains legible at 400px rendered width.

### 7.2 Sports court guest permits

`VERIFIED` From the association's announcement of 7 June 2026, the policy already in force is:

- Outside players may not book independently; a registered homeowner or resident must sponsor and sign
- Maximum 6 outside players per group
- Morning session 07:30–11:30; afternoon/evening session 15:30–18:30; closed to guests 11:30–15:30
- Proper athletic clothing required; shirtless play prohibited
- Security grants entry only to guests named on an approved permit
- Applications currently: paper form from the HOA Admin Office or Guardhouse, submitted at least 1 day before play

`OWNER-DECIDED` This moves into the app.

Requirements: resident-sponsored application; guest roster of up to 6 names; session-time selection constrained to the permitted windows; officer approval at least one day ahead; an approved permit retrievable by gate security for entry verification.

`OPEN` How gate security verifies a permit at the gate. Security may have no smartphone, and the guardhouse may have no reliable connection. Options: printable permit, QR code scanned by the guard, or a daily approved-list export. This determines whether the digital permit is actually usable at the point it matters.

### 7.3 Facility bookings

`OWNER-DECIDED` In scope.

`OPEN` Almost entirely unspecified. Which facilities are bookable, what the time slots are, whether bookings carry a fee, whether they conflict with the sports court guest sessions, who approves, and what the cancellation rule is — none of this is established. This feature cannot be built from its current specification and needs a dedicated requirements session.

### 7.4 Knowledge base

`OWNER-DECIDED` Searchable and offline-readable, covering rules, policies, and FAQs.

`OWNER-DECIDED` Structured as follows:

| Section | Content |
|---|---|
| **HOA Information** | What the association is, Bylaws summary, current officers, contact details |
| **Financial** | How dues work, payment methods and QR codes, grace period, installment arrangements, how to request an installment, how to read a receipt |
| **Facilities** | Sports court rules, guest permit process, dress code, facility hours, booking process |
| **Community** | Visitor entry, security contacts, election schedule, announcement archive |
| **Procedures** | Filing a complaint, requesting an audit, verifying your own dues record |
| **FAQs** | Searchable question-and-answer set |

Knowledge base and announcements remain **separate**: the knowledge base is evergreen and pull-based (the resident searches when they need something); announcements are time-stamped and push-based.

`PROPOSED` Content is admin-maintained centrally, cached on first login for offline reading.

`OPEN` Who writes and maintains the content. This is a substantial ongoing writing task, not a build task, and it has no owner assigned.

---

## 8. STAGE PLAN

Each stage completes before the next begins. Each requires its own Implementation Guide and its own approval.

### Stage 0 — Containment `IN PROGRESS`

Close the unauthenticated execute exposure on the financial RPCs; establish tracked migration structure; record the decision log.

**Amendment arising from §3.6:** file evidence suggested the pg_cron schedule was never enabled; that was wrong. A real, active job existed on the hosted database, undocumented anywhere in the repository, and was confirmed and removed during Stage 0 execution on 7 August 2026 (`DEC-16`). The guard on `generate_monthly_dues` did not need to accommodate it going forward, since removing the job was the correct response — but the discovery is the reason Stage 0 took longer than planned, and it's the clearest example in this whole project of why "the file says X" and "the database does X" have to be checked separately.

**Follow-up task, not yet scoped:** the unauthenticated Edge Function (§3.7).

### Stage 1 — Mobile foundation

React Native + Expo project; navigation; username-based authentication; session handling; design system built from the association's brand marks; CI for mobile builds.

Ends when a homeowner can log in with a username and see an empty, correct dashboard.

### Stage 2 — Property and people

The `street` column and the corrected `UNIQUE (house_no, street)` constraint; the `unit_occupancies` relation; owner, tenant, family member, and room-for-rent modelling; time-bounded officer terms; RLS policies implementing §4.3; unit and resident registration screens.

Ends when the access model in §4.3 is enforced by the database, not merely by the interface.

### Stage 3 — Financial core

Officer-triggered dues generation with actor capture; payor-designated allocation; receipt upload with pre-populated month selection; officer reconciliation queue; stored sequential receipt numbering; PDF generation; homeowner ledger; opening-balance import (§5.3).

Ends when a homeowner can see a correct ledger and an officer can reconcile a real payment end to end.

### Stage 4 — Community features

Announcements; sports court permits; facility bookings; knowledge base.

Per §2.4.1, whether this stage is inside the MVP boundary or immediately after it is the owner's call. The build sequence is the same either way.

### Stage 5 — Hardening and launch

Test coverage for finance, authorisation, and RLS — `VERIFIED` currently zero (§3.1); UAT with real officers; opening-balance reconciliation and sign-off; production project setup; backup and recovery configuration per DEC-14 (RPO ≤ 24h, RTO ≤ 48h); pilot rollout.

---

## 9. QUALITY AND OPERATIONS

### 9.1 Testing

`VERIFIED` Current coverage is 9 tests over a Button and an ErrorBoundary. Zero coverage of finance, authorisation, or RLS.

`PROPOSED` Minimum before any real money is recorded:

- Payment allocation across every designated-month permutation, including the skip-ahead case in §5.2
- Receipt number sequence gaplessness under concurrent reconciliation
- RLS enforcement per §4.3, tested from the perspective of each user type — particularly that a tenant cannot read outside their tenancy window
- Authorisation on every financial function, tested as an unprivileged caller
- Idempotency of dues generation

### 9.2 User acceptance testing

`PROPOSED` UAT must be performed by actual Wonderland officers on actual Android devices, using real historical figures, before launch. The specific scenario that matters most is opening-balance verification (§5.3): an officer confirming that what the app shows for a unit matches what the paper record says.

### 9.3 Performance budgets

`OWNER-DECIDED` (DEC-08) Approved as proposed in the prior audit at §3.15, unchanged — cold launch ≤ 4.0s, warm launch ≤ 1.5s, screen transition ≤ 1.0s cached, memory ≤ 250 MB on a 3GB device, app size ≤ 60 MB, crash-free sessions ≥ 99%.

### 9.4 Success measures

`OWNER-DECIDED` (DEC-09) Approved as proposed at §1.7, unchanged. `BUS-026` — 100% of material financial actions carry a complete audit event — is an invariant, not a target.

### 9.5 Recovery

`OWNER-DECIDED` (DEC-14) RPO ≤ 24 hours, RTO ≤ 48 hours.

`OPEN` Point-in-time recovery on Supabase requires a paid tier. This is a cost decision that has not been made, and the stated RPO is not achievable on the free tier.

### 9.6 Offline posture

`OWNER-DECIDED` (DEC-10) Financial writes are online-only. Non-financial reads — knowledge base, last-known statement, announcements — may be cached for offline use.

---

## 10. OPEN ITEMS REGISTER

Consolidated from the sections above. None of these blocks Stage 0. Several block Stage 2 or Stage 3.

| # | Item | Section | Blocks |
|---|---|---|---|
| 1 | Unauthenticated Edge Function | §3.7 | Stage 0 follow-up — **urgent** |
| 2 | Opening balances for existing arrears | §5.3 | Stage 3, launch |
| 3 | Tenant onboarding verification | §4.3 | Stage 2 |
| 4 | Complete street list; `111a`/`111b` semantics | §4.2 | Stage 2 |
| 5 | Username assignment and collision procedure | §4.1 | Stage 1 |
| 6 | Do vacant units accrue dues | §5.1 | Stage 3 |
| 7 | Due-date rule — policy or assumption | §5.1 | Stage 3 |
| 8 | Legal basis for existing sports facility penalties | §5.4 | Stage 4 |
| 9 | Receipt numbering scope | §6.5 | Stage 3 |
| 10 | Gate security permit verification method | §7.2 | Stage 4 |
| 11 | Facility bookings — substantially unspecified | §7.3 | Stage 4 |
| 12 | Knowledge base content ownership | §7.4 | Stage 4 |
| 13 | Bylaws location — quorum, notice, thresholds | §5.5 | Stage 3 |
| 14 | Supabase paid tier for PITR | §9.5 | Launch |
| 15 | MVP boundary — is Stage 4 inside it | §2.4.1 | Planning |
| 16 | No automatic dues generation as of 7 Aug 2026 — the cron job was removed (DEC-16) and no scheduled path replaces it. First manual run needed before 1 September 2026, via the existing button at `DashboardPage.tsx:201` | §3.6 | Immediate — needs a reminder, not a build |

---

## 11. DOCUMENT STRUCTURE AND IMPLEMENTATION

### 11.1 Why this document contains no code

This document defines *what* to build and *why*. It is read by the owner, by officers during UAT, and by anyone joining the project later. Code in it would age badly and would obscure the requirements.

Implementation detail lives in **stage-specific Implementation Guides**, produced immediately before each stage begins:

| Document | Purpose | Audience |
|---|---|---|
| This document | What to build, why, business rules, access model | Owner, officers, everyone |
| `STAGE_N_IMPLEMENTATION_GUIDE.md` | Schema, method signatures, component structure, code references for that stage | The coding agent |
| `DECISION_LOG.md` | Decisions made, dated, with rationale | Everyone |
| Inline code comments | How this specific file works | Whoever maintains it |

The coding agent receives the Implementation Guide for the current stage, not this document.

### 11.2 Repository placement

```
wonderland-hoa-system/
├── docs/
│   ├── WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md   ← this document, sole authority
│   ├── DECISION_LOG.md                            ← created in Stage 0
│   ├── STAGE_0_PROMPT.md                          ← current
│   └── STAGE_N_IMPLEMENTATION_GUIDE.md            ← created per stage
```

### 11.3 Amendment

This document is amended by explicit decision recorded in `DECISION_LOG.md`, not by silent edit. Where an amendment supersedes a clause here, the clause is marked `SUPERSEDED` with a reference to the decision, and the original text is retained.

---

*End of document.*
