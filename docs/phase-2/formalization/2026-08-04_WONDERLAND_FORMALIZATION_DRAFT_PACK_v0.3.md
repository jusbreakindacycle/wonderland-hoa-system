# Wonderland Homeowners Association, Inc.
## Governance and Operations Formalization Draft Pack

### Document Control

| Field | Value |
|---|---|
| Status | **Draft for review and formal adoption** |
| Version | **0.3** |
| Date | 2026-08-04 |
| Project | Wonderland HOA Management System |
| Purpose | Convert confirmed current practices and missing written controls into reviewable resolutions, policies, registers, and technical verification checklists |
| Effect | **None until the required Board and/or membership approval is completed and recorded** |
| Important limitation | This pack cannot replace or fabricate a government-issued registration certificate, historical evidence that never existed, actual election results, signatures, or unverified facts from a live Supabase project |

### Revision Notes — v0.3

This revision retains all v0.2 fee and governance controls and additionally:

- confirms that the current personal Supabase project contains **no useful production data and no real personal, resident, property, authentication, or financial information**;
- classifies the current project as disposable development/prototype infrastructure;
- removes project transfer and data migration as the selected production path;
- selects a **clean Association-controlled Supabase production project** for future adoption;
- retains only an optional final export or snapshot for technical reference before the personal prototype is retired.

---

## 1. Adoption Principles

1. Do not backdate any resolution, policy, term record, or approval.
2. Distinguish:
   - current practice;
   - newly adopted rule;
   - historical fact supported by evidence;
   - unresolved matter.
3. Preserve original records. Corrections use linked reversal, cancellation, replacement, or amendment records.
4. Rules affecting dues, regular assessments, membership rights, or association-wide sanctions should be presented for the approval or ratification required by the governing documents and applicable law.
5. The Secretary records and archives approved decisions. The Treasurer implements financial rules. The Auditor independently reviews compliance.
6. The software system may enforce only rules that are approved and effective.
7. Until formal adoption, the system may model proposed rules but must label them **DRAFT / NOT YET EFFECTIVE**.

---

# PART A — FINANCIAL AND BILLING FORMALIZATION

## 2. Draft Resolution: Monthly Dues, Billing, and No Late Penalty

### Proposed title

**Resolution Confirming the Current Monthly Association Dues and Adopting the Monthly Billing and Collection Policy**

### Proposed findings

The Association currently collects **₱400 per property per month**. One owner may own several properties, and each property is assessed separately. Multiple households sharing one property do not create additional monthly dues for that property.

No surviving written record presently establishes the original approval date of the increase from ₱300 to ₱400. The Association must not invent or backdate that date.

### Proposed resolution

1. The current monthly association dues shall be **₱400 per property**.
2. The rule applies prospectively from the resolution’s approved effective date.
3. The historical use of ₱400 before the effective date shall be recorded as **current practice acknowledged, original approval record unavailable**.
4. Monthly billing shall follow this workflow:
   1. the system prepares a draft monthly charge batch;
   2. approved vacant properties are excluded;
   3. the Treasurer or authorized finance officer reviews the property count, exclusions, applied fee-rule version, and total;
   4. the authorized officer posts the complete batch;
   5. the system records who reviewed and posted it.
5. No monthly charge becomes active through silent or unattended automatic posting.
6. The ₱400 amount shall be stored as an **effective-dated fee-rule version**, not as a permanent hardcoded value.
7. A future increase or decrease may be configured by an authorized officer only after the required approval or ratification has been recorded.
8. Every replacement fee rule must include:
   - amount;
   - effective start date;
   - optional end date;
   - approval source or resolution reference;
   - approving authority;
   - reason for change;
   - officer who encoded and activated the approved rule.
9. A new fee rule affects only charges within its approved effective period. It must not recalculate or overwrite historical charges, allocations, receipts, credits, balances, or reports.
10. The previous fee rule becomes **superseded** when the new rule takes effect; it is never deleted.
11. There is **no monetary late fee, interest, or late-payment penalty** for unpaid monthly dues unless a later duly adopted rule establishes one.
12. Unpaid dues remain outstanding and carry forward.
13. Payments are allocated to the **oldest unpaid charge first**.
14. Partial payments are accepted.
15. Overpayments become property credit and are applied to the next monthly charge.
16. Cash is the only currently approved payment method. GCash and bank transfer remain disabled until formally authorized and supported by an association-controlled account and reconciliation process.

### Approval route

- Board proposal and recorded approval.
- Member approval or ratification when required by the bylaws and applicable rules.
- Secretary records the resolution, votes, effective date, and notice.
- Treasurer implements it.
- Auditor reviews implementation.

### Shared Fee-Version Control

The system shall use the same control pattern for monthly dues and vehicle sticker fees.

| Fee type | Confirmed current amount | Current basis | Future change control |
|---|---:|---|---|
| Monthly association dues | **₱400 per property per month** | Confirmed current practice; formal adoption record pending | Required approval/ratification is recorded, then an authorized officer activates a new effective-dated version |
| Vehicle sticker fee | **₱200 per sticker** | Confirmed current amount; written policy pending | Authorized decision is recorded, then an authorized officer activates a new effective-dated version |

System rules:

1. Officers do not directly overwrite the active amount.
2. An authorized officer creates a new draft fee version.
3. The approval source and effective date are required before activation.
4. Only one active version may apply to a fee type for a given date or billing/sticker period.
5. Existing charges and receipts retain the exact fee version and amount used when created.
6. Corrections use controlled adjustment or reversal records, not retroactive fee replacement.
7. Draft, approved, active, superseded, and cancelled fee versions remain auditable.
8. Fee-rule configuration is separate from authority to approve the fee itself.

---

## 3. Draft Vacant-Property Billing Policy

### Policy statement

A property approved as **vacant** is retained in the property master list but is excluded from future monthly dues beginning on its approved effective billing month.

### Definition

A vacant property is a registered property with no active household, owner-occupant, tenant, or other resident physically occupying it as a home.

Temporary absence, travel, employment elsewhere, renovation, unpaid balances, or lack of a system login does not automatically make a property vacant.

### Workflow

1. Vacancy may be reported by:
   - the owner;
   - an authorized representative;
   - the Secretary based on documented Association knowledge.
2. The request records:
   - property;
   - requested vacancy date;
   - reason;
   - requester;
   - supporting evidence, when available.
3. The Secretary verifies the property and occupancy record.
4. The Treasurer verifies existing balances and the proposed financial effect.
5. The President or Board-designated approver authorizes the effective billing month.
6. The exemption begins on the **first approved billing month** after verification, unless the approving resolution states otherwise.
7. Existing dues and balances before the effective month remain payable.
8. No previous charge is deleted automatically.
9. When occupation resumes:
   - an occupancy relationship is created or reactivated;
   - the vacancy period receives an end date;
   - normal billing resumes from the approved billing month.
10. Vacant status should be revalidated at least annually until the Board adopts another interval.
11. Every approval, rejection, reactivation, and correction is retained in the audit history.

### Formalization requirement

Because this policy changes which properties receive regular assessments, Board approval and member ratification are recommended before production enforcement.

---

## 4. Draft Receipt Issuance and Control Policy

### Receipt series

1. The Association shall use one controlled, sequential receipt-number series for all cash collections.
2. Receipt numbers are unique and never reused.
3. The same receipt number may appear on:
   - the original given to the payer; and
   - an office copy clearly marked **COPY**.

   This is not duplicate issuance and does not create a second transaction.
4. The system stores an immutable digital receipt record for every issued physical receipt.

### Issuance

1. A receipt is issued immediately when cash is accepted.
2. The collection is not complete in the system until the receipt number is recorded.
3. A single receipt may contain several line items, including:
   - monthly dues by billing month;
   - partial-payment allocations;
   - sports violation fine linked to a violation ticket;
   - vehicle sticker fee;
   - another duly approved charge.
4. Dues, fines, and sticker fees remain separate ledger categories even when paid on one receipt.

### Cancellation, void, loss, and replacement

1. An issued or reserved receipt number is never deleted or reassigned.
2. A cancelled or voided receipt is marked with:
   - status;
   - reason;
   - date;
   - acting officer;
   - approving officer, where required.
3. The physical receipt or image is archived.
4. A replacement uses a new sequential number.
5. The replacement receipt links to the cancelled, voided, or lost receipt.
6. Corrections must not overwrite the original collection record.
7. The Auditor can inspect the complete number sequence and all gaps.

### Office copy

Preferred control:

- original physical receipt to payer;
- carbonless duplicate or scanned office copy retained by the Association;
- immutable digital record in the system.

When the current booklet has no carbon copy, the Association should retain a clear scan/photo or a signed receipt-stub record until a controlled duplicate-copy booklet is adopted.

---

# PART B — VEHICLE STICKER FORMALIZATION

## 5. Draft Vehicle Sticker Eligibility and Payment Policy

### Important distinction

Sticker eligibility is not the same as declaring a member fully paid or in good standing.

### Proposed eligibility rule based on current practice

1. A property with no outstanding monthly dues is financially eligible to purchase the current sticker.
2. A property with outstanding dues may become eligible after paying at least **one current monthly due amount**, presently ₱400, toward its oldest outstanding balance at the time of application.
3. The remaining balance stays outstanding.
4. The system must not label the property **fully paid** merely because sticker eligibility was granted.
5. The confirmed current vehicle sticker fee is **₱200 per sticker**.
6. The sticker fee is a separate charge and receipt line item.
7. The ₱200 amount shall be stored as an effective-dated fee-rule version, not as a permanent hardcoded value.
8. A future sticker-fee increase or decrease may be configured by an authorized officer only after the authorized decision and effective period are recorded.
9. A later sticker-fee version must not change previously issued sticker charges or receipts.
10. The Treasurer or authorized finance officer verifies the minimum dues-payment condition and applicable sticker fee.
11. A separately authorized officer or security/sticker custodian issues the physical sticker.
12. Every sticker record includes:
   - vehicle;
   - property;
   - applicant;
   - sticker year/period;
   - sticker serial number;
   - applicable sticker-fee rule version;
   - fee charged;
   - receipt;
   - verifier;
   - issuer;
   - issuance date;
   - status.
13. Denial must state the unmet requirement.
14. The rule must be uniformly applied and publicly announced before enforcement.

### Formalization requirement

Because the rule conditions access to an Association privilege, a written Board-approved policy with member notice and an appeal/correction path is required. Member ratification is recommended if the governing documents require it.

---

# PART C — GOVERNANCE AND RECORDS

## 6. Officer and Committee Term Register Template

### Rule

The software developer may build the register, but may not invent names, election dates, appointment dates, or terms.

### Register fields

| Field | Description |
|---|---|
| Person | Officer or committee member |
| Assignment type | Board seat / principal office / committee / operational designation |
| Assignment | President, Treasurer, Sports Committee, Peace & Order, etc. |
| Source | Election result, Board resolution, appointment, succession |
| Source reference | Resolution/election report/document number |
| Start date | Actual effective date |
| End date | Actual end date |
| Status | Draft / active / expired / resigned / removed / superseded |
| Voting authority | Yes/no and basis |
| Approval capabilities | Specific delegated powers |
| Recorded by | Secretary |
| Evidence attachment | Signed record or report |

### Proposed controls

1. Terms must not exceed the legal or bylaw maximum.
2. The system prevents an assignment from being presented as active without a start date and source.
3. Multiple concurrent assignments are allowed when valid.
4. Expired assignments grant no permissions.
5. Permission changes take effect from the assignment’s effective date.
6. Historical assignments remain visible.
7. Election and appointment records are archived.

---

## 7. Proposed Records Retention Schedule

This is a conservative internal proposal. It should be reviewed by the Association’s legal/accounting adviser before final adoption. Until adopted, the system performs no automatic deletion.

| Record class | Proposed minimum retention |
|---|---|
| Registration certificate, articles, bylaws, amendments | Permanent |
| Board/member resolutions and meeting minutes | Permanent |
| Election reports, officer and committee term history | Permanent |
| Policy, memorandum, rules, forms, and superseded versions | Permanent |
| Property master, address, ownership, occupancy, and vacancy history | Permanent while Association exists |
| Annual financial statements and audit reports | Permanent |
| Receipt-number register and audit trail | Permanent |
| Dues, payments, allocations, credits, reversals, write-offs | Permanent digital ledger |
| Supporting receipts, invoices, collection documents, deposit records | Proposed 10 years after fiscal year |
| Vehicle sticker records | Proposed 5 years after sticker period |
| Complaints and case files | Proposed 5 years after closure |
| Sports violations, fines, restrictions, and appeals | Proposed 5 years after final resolution |
| Sports permits and guest rosters with no incident | Proposed 1 year after event |
| Guest ID images or copies | Do not collect unless a later lawful written policy requires them |
| System access and security logs | Proposed 2 years, longer when linked to an incident |
| Backup copies | According to approved backup rotation; never the sole surviving record |

### Hold rule

Deletion is suspended when a record is connected to:

- an unresolved complaint;
- audit;
- investigation;
- appeal;
- legal dispute;
- government request;
- unpaid balance;
- data-migration verification.

---

# PART D — SPORTS GOVERNANCE

## 8. Draft Sports Sanction Review and Appeal Policy

### Existing progressive framework retained

1. First offense: warning and correction.
2. Second offense: formal violation ticket and ₱500 fine.
3. Third offense: higher sanction.
4. Serious misconduct may bypass earlier stages.

### Review controls

1. Warnings and tickets identify:
   - rule violated;
   - date/time;
   - person;
   - sponsoring resident, when relevant;
   - officer/security witness;
   - evidence;
   - corrective action.
2. The ₱500 fine is linked to a violation ticket and paid through the Association receipt series.
3. Sports-fine payment never settles monthly dues and dues payment never settles a sports fine.
4. Temporary restriction pending review may be imposed for serious misconduct.
5. A third-offense or serious-misconduct case must be submitted to the Board within **15 calendar days**.
6. The Board issues a written decision specifying:
   - factual finding;
   - rule;
   - sanction;
   - start date;
   - fixed end date or review date;
   - appeal path.
7. A resident’s own court access and the resident’s guest-sponsorship privilege are treated separately.
8. An “indefinite” resident sponsorship restriction may not remain without review. It must be reviewed at least every **90 days** until lifted or converted to a fixed sanction.
9. A permanently banned outside guest may request Board review after **one year**, unless the case involves an active legal or security restriction.
10. An appeal may be filed within **15 calendar days** after notice of the decision.
11. The Board’s appeal decision is recorded and linked to the original case.
12. Sanctions are not silently deleted after expiry; their status becomes expired/lifted.

These periods are proposed governance controls and become effective only after formal adoption.

---

# PART E — RECEIPT FORM SPECIFICATION

## 9. Draft Association Collection Receipt Specification

### Recommended document name

**Wonderland Homeowners Association, Inc. — Association Collection Receipt**

The final title should be reviewed against the Association’s BIR registration and invoicing obligations before printing a new booklet. Do not label the document “Official Receipt” solely because the legacy prototype did so.

### Required fields

1. Association name.
2. Association address and contact details.
3. Unique sequential receipt number.
4. Issue date and time.
5. Payer name.
6. Property address or internal property reference.
7. Collection line items:
   - category;
   - billing month or reference;
   - related charge/ticket/sticker;
   - amount.
8. Total amount in figures.
9. Total amount in words.
10. Payment method.
11. Remaining property dues balance after allocation.
12. Property credit created or used.
13. Name and signature of authorized collector.
14. System transaction ID or verification code.
15. Status: issued / cancelled / voided / replaced.
16. Replacement or original receipt reference, when applicable.
17. “Original” or “Office Copy” designation.

### Signature process

- Physical handwritten receipt: authorized collector signs the original and office copy.
- System-printed receipt: the Association decides through written policy whether a wet signature is required.
- The system must not display “no signature required” unless the Association formally adopts that rule.
- A resident’s acknowledgment signature is optional unless the Board adopts it as a control.

---

# PART F — EXTERNAL EVIDENCE AND TECHNICAL VERIFICATION

## 10. Registration Certificate Request — Not a Draft Certificate

The Association must not create its own substitute certificate.

### Provisional system status

Until the official document is obtained:

- legal name: **Wonderland Homeowners Association, Inc.**
- evidence status: **Officer-confirmed; government certificate not yet inspected**
- registration number: unknown
- registration date: unknown
- registering authority/record: to be verified

### Draft request text

> The Association respectfully requests a certified or authenticated copy, or official verification, of its Certificate of Registration/Incorporation and current registry details for records-reconstruction, governance compliance, and implementation of its management system.
>
> Requested details:
> - exact registered legal name;
> - registration number;
> - registration date;
> - registered address;
> - current registry status;
> - available governing-document filings;
> - procedure and fees for obtaining certified copies.

The Secretary should submit the request through the appropriate DHSUD Regional Office/HOA channel and archive the response.

---

## 11. Supabase Environment, Ownership, and Clean Production Setup

This section records the confirmed status of the current personal Supabase project and the selected production path.

### Confirmed current state

1. The current Supabase project is under the Project Steward/developer’s **personal Supabase account or organization**.
2. It is a **development/prototype environment**, not an Association production system.
3. The project contains:
   - no useful production data;
   - no real resident or homeowner information;
   - no real property records;
   - no real authentication-user information belonging to Association users;
   - no real financial transactions, balances, receipts, or other personal information requiring migration.
4. The current project is therefore not a system of record and does not require production data migration.
5. The project may be retained temporarily as a disposable technical reference during Phase 3 and implementation.
6. Before it is reset, archived, or deleted, the Project Steward may take an optional export or snapshot solely for technical reference.
7. No current prototype record shall be treated as authoritative Association data.

### Confirmed production ownership target

Before operational adoption or production launch:

1. Wonderland shall have an **Association-controlled Supabase organization**.
2. The Association shall control and pay for the production plan, billing method, invoices, and renewals.
3. At least two Board-designated Association custodians should hold individual owner-level access for continuity.
4. The Project Steward/developer may retain a separately authorized technical administrator or support role for guidance, maintenance, and incident response.
5. Every administrator uses an individual account. Shared Supabase passwords are prohibited.
6. Multifactor authentication should be enabled for privileged users.
7. Access must be removable or reducible without transferring ownership away from the Association.
8. The production project, backups, credentials, and billing records remain under Association control even when technical-support arrangements change.

### Selected transition path — clean Association production project

Project transfer is not required because the personal prototype contains no useful or real data that must be preserved.

The approved target sequence is:

1. complete and approve the Phase 2 Domain and Service Blueprint;
2. complete and approve the Phase 3 architecture and repository strategy;
3. create a new Association-controlled Supabase organization and production project;
4. add the designated Association owners through individual accounts;
5. configure Association billing;
6. apply only approved migrations and security controls;
7. import the Secretary-verified property and authorized operational records through controlled onboarding;
8. test RLS, permissions, audit history, backups, recovery, and financial invariants;
9. obtain production-readiness approval before launch;
10. archive or retire the personal prototype after the clean production environment is verified.

### Data onboarding rule

Because there is no legacy production data to migrate:

- no database migration or reconciliation from the personal project is required;
- real Association data must come from verified source records and authorized onboarding;
- no sample or prototype record may be copied into production as fact without verification;
- opening balances, historical receipts, officer assignments, and property records require explicit source evidence or a formally approved reconstruction process.

### Security rule

No API keys, passwords, recovery codes, access tokens, or service-role keys belong in this document or Git.

---

# PART G — ADOPTION REGISTER

## 12. Draft Adoption Tracker

| Document | Required action | Status |
|---|---|---|
| Monthly dues, billing, and no-late-penalty resolution | Board proposal + required member approval/ratification | Draft |
| Vacant-property billing policy | Board approval + member ratification recommended | Draft |
| Receipt issuance and control policy | Board approval | Draft |
| Vehicle sticker eligibility and ₱200 fee policy | Board approval, notice, and member ratification where required | Draft |
| Officer and committee term register | Secretary reconstruction + Board certification/election evidence | Template |
| Records retention schedule | Board approval after legal/accounting review | Draft |
| Sports sanction review and appeal policy | Board approval and publication | Draft |
| Receipt form specification | Treasurer/Auditor review + Board approval + BIR compliance check | Draft |
| Registration certificate request | Secretary submits to DHSUD | Ready for submission |
| Supabase clean production setup | Create Association-controlled organization and new production project after Phase 3 approval | Direction confirmed; implementation not started |

---

## 13. System Enforcement Gate

A proposed rule may be represented in the Phase 2 blueprint, but production enforcement requires:

1. approved source document;
2. effective date;
3. approving body;
4. recorded vote or authority;
5. published notice where required;
6. configured rule version;
7. test evidence;
8. auditability;
9. migration rule for existing records;
10. Association-controlled production ownership for hosted infrastructure;
11. backup and rollback readiness.

For fee changes, the system must additionally prove that:

- the new fee version applies only from its effective date;
- prior fee versions remain preserved;
- historical charges, receipts, allocations, and reports are unchanged;
- the person who encoded the rate is distinguishable from the authority that approved it.

Until those conditions are met, the rule remains **DRAFT / NOT YET EFFECTIVE**.
