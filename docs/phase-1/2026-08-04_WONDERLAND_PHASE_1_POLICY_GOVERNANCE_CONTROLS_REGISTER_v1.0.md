# Wonderland HOA System — Phase 1 Policy, Governance and Controls Register

## 1. Document Control

| Field | Value |
|---|---|
| Document status | **Product Owner Approved for Phase 2 Design Input** |
| Version | **1.0** |
| Date approved | **2026-08-04** |
| Project | Wonderland Homeowners Association Management System |
| Association | Wonderland Homeowners Association, Inc. |
| Community | Wonderland Townhomes, Barangay Namayan, Mandaluyong City |
| Phase | Phase 1 — HOA Discovery and Policy Validation |
| Authority | This document approves system-design inputs and internal-control recommendations. It does not by itself amend the association bylaws, create a board resolution, ratify dues, or replace any approval legally reserved to the Board or general membership. |
| Documentation workflow | Drafted, reviewed, revised and approved in ChatGPT. The user places the final document in the repository manually. Claude Code is reserved for coding and technical implementation. |

## 2. Decision Status Legend

| Status | Meaning |
|---|---|
| **Officer-confirmed operating fact** | Reported as the association’s current practice or rule. |
| **Resident-confirmed fact** | Confirmed by the Project Owner through direct and repeated resident experience. |
| **Written-evidence fact** | Supported by a visible notice, memorandum, poster or repository artifact. |
| **Product Owner adopted control** | Approved as a system or governance safeguard for the Phase 2 blueprint. |
| **Formal HOA adoption required** | Must be embodied in valid bylaws, rules, board resolution, member approval or another authoritative association record before being enforced as formal association policy. |
| **Open evidence item** | The operational answer is known, but the authoritative document or exact detail remains to be obtained. |

## 3. Confirmed Community and Property Rules

### 3.1 Community scope

- Wonderland Townhomes is located in Barangay Namayan, Mandaluyong City.
- It is distinct from the similarly named community associated with Barangay Mauway.
- Covered internal streets are:
  - Wonderland Avenue
  - Sampaguita
  - Yellowbell
  - Orchids
  - Sunflower
- Circle is excluded.
- The operational address model does not use phase, block or lot.

### 3.2 Property identity

- A property is operationally identified by separate **house number** and **official street** values.
- House number alone is not unique across the community.
- Duplicate house numbers across different streets exist.
- House-number suffixes exist, including `117-B`.
- Corner properties use one official street for identity and billing.
- A secondary corner street may be retained as a location note but must not create a duplicate property.
- Every property requires an immutable internal property identifier.

### 3.3 Owner, household and property relationships

- One person may own multiple properties.
- Each separately recognised property has its own financial account and separate monthly assessment.
- One owner with three houses is charged three separate monthly dues.
- Two or more families may share one structure while the property remains subject to one combined property-level due.
- Property, owner, resident, tenant, household and user account must therefore be separate domain concepts.

## 4. Confirmed Dues and Billing Rules

| Rule | Adopted value | Evidence status |
|---|---|---|
| Monthly dues | **₱400 per property per month** | Officer-confirmed and resident-confirmed |
| Previous known amount | **₱300 per property per month** | Resident recollection; exact effective dates remain an evidence item |
| Separate dues for multiple properties | **Yes** | Officer-confirmed / resident-confirmed |
| Additional dues for multiple families sharing one property | **No** | Resident-confirmed |
| Formal monthly due date | **None** | Officer-confirmed |
| Monetary late-payment penalty | **None** | Officer-confirmed and consistent with observed five-month balance |
| Balance carry-forward | **Allowed** | Resident-confirmed |
| Allocation order | **Oldest unpaid balance first** | Officer-confirmed |
| Vacant-property monthly billing | **No billing while valid vacant status is active** | Officer-confirmed; formal policy documentation required |
| Non-cash payment methods | **Not accepted** | Officer-confirmed |
| Overpayment | **Applied to the next month’s due as property credit** | Officer-confirmed |

### 4.1 Billing-month traceability

- Payment date and billing coverage are separate facts.
- One payment may cover several months.
- Partial payments are accepted.
- The remaining balance carries forward.
- Every allocation from a payment to a monthly charge must remain traceable.
- No financial record may be silently overwritten or deleted.

### 4.2 Delinquency and vehicle stickers

Known resident practice indicates that an outstanding balance may prevent issuance of a vehicle sticker. The system must not model this as an informal, arbitrary Treasurer decision.

**Product Owner adopted control:**

1. The system calculates the financial status from recorded balances.
2. A vehicle-sticker eligibility rule must come from an approved governing document.
3. The Treasurer verifies financial status but does not invent or selectively apply the restriction.
4. A declaration that a member is delinquent or not in good standing requires the process and due process established by governing rules.
5. Any override must have authority, reason, date, evidence and audit history.

**Formal HOA adoption required:** the exact delinquency threshold, notice procedure, appeal/reconsideration path and effect on sticker eligibility.

## 5. Vacant-Property Process

### 5.1 Adopted definition for system design

A **vacant property** is a registered property with no person currently occupying it as a household, whether owner, authorised resident or tenant.

Vacancy does not mean:

- the owner is temporarily away;
- the owner has no system account;
- the owner is behind on dues;
- the property is undergoing a short temporary absence;
- the property has no newly assigned resident credentials.

### 5.2 Adopted workflow

1. **Request or initiation**
   - Owner, authorised representative or Secretary initiates a vacancy-status request.
2. **Verification**
   - Secretary verifies the property and occupancy information.
3. **Financial review**
   - Treasurer confirms the effect on future monthly assessments and existing balances.
4. **Approval**
   - The Board-authorised approver confirms the vacancy status and effective billing month.
5. **Effect**
   - No new monthly dues are generated during the approved vacant period.
   - All valid balances before the effective date remain payable.
6. **Reoccupation**
   - Occupancy receives a start date.
   - Vacancy receives an end date.
   - Billing resumes from the approved billing month.
7. **Auditability**
   - No status change may erase prior charges or payments.

### 5.3 Formalisation requirement

The existing no-billing treatment for vacant properties should be documented in the bylaws or a properly approved association rule so it can be applied consistently rather than informally.

## 6. Payment and Receipt Controls

### 6.1 Confirmed payment practice

- Cash is the official accepted payment method.
- GCash and bank transfer are not officially accepted.
- A physical receipt is issued.
- Receipt numbers are sequential and unique.
- A receipt shows the billing month or months covered.
- Partial payments are accepted.
- Cancelled or replaced receipts are archived.

### 6.2 Association-wide receipt series

**Product Owner adopted control:** use one controlled, association-wide sequential receipt series for all cash receipts, including monthly dues and sports fines, while recording separate accounting categories and source transactions.

Each receipt must contain:

- unique sequential receipt number;
- receipt status;
- receipt date;
- payer;
- property when applicable;
- receiving officer or authorised collector;
- one or more line items;
- amount per line item;
- total amount;
- payment method;
- billing months when the line item is dues;
- linked violation ticket when the line item is a sports fine;
- optional notes;
- issuer/signature details required by the physical process.

### 6.3 Receipt statuses

- **Issued**
- **Cancelled**
- **Voided**
- **Replaced**

A receipt number must never be reused, deleted or reassigned.

### 6.4 Cancellation and replacement lifecycle

1. Original receipt remains in the receipt register.
2. Status changes to Cancelled, Voided or Replaced.
3. Reason is mandatory.
4. Acting user and approving authority are recorded.
5. Date and time are recorded.
6. Physical copy or image is archived where available.
7. A replacement uses a new sequential number.
8. The replacement links to the original receipt.
9. The original links to the replacement.
10. Any affected accounting entry is reversed or corrected through a traceable transaction, never deletion.

### 6.5 Unresolved physical-control detail

The current information confirms sequential unique receipts but does not conclusively confirm whether the association retains a carbon copy or another duplicate office copy. The future receipt register and archived physical image can provide the required association copy even if the physical booklet does not use carbon paper.

## 7. Overpayments, Credits, Refunds and Write-Offs

### 7.1 Ordinary overpayment

- An overpayment becomes property credit.
- The credit is automatically applied to the next month’s due.
- The credit remains attached to the property financial account.
- Credit creation and application must be recorded as separate ledger events.

### 7.2 Refund control

**Product Owner adopted control:**

- Treasurer prepares and verifies an ordinary refund request.
- A second authorised officer, initially proposed as the President, approves the refund.
- Auditor reviews the supporting record and completed transaction.
- Actual payout must be recorded separately from approval.
- Approval alone must not mark the refund as paid.

### 7.3 Waiver and write-off control

- Auditor must not be the sole approver of a waiver or void because the Auditor must retain an independent review role.
- Treasurer may initiate or recommend a correction, waiver or write-off.
- Correction of an obvious encoding error may be approved by the President or another formally designated financial approver.
- Waiver of a valid charge and write-off of an amount receivable require Board approval through a recorded resolution.
- Auditor reviews the authority, evidence and resulting ledger entry.

## 8. Governance and Authority Matrix

### 8.1 Separation-of-duties principle

No one person should initiate, approve, execute and audit the same material financial action.

| Action | Initiates / prepares | Approves | Executes / records | Independent review |
|---|---|---|---|---|
| Routine cash payment | Payer / collector | Not applicable | Treasurer or authorised collector | Auditor may inspect |
| Correct encoding error | Treasurer | President or designated financial approver | Treasurer | Auditor |
| Void erroneous charge | Treasurer | President or designated financial approver | Treasurer | Auditor |
| Waive valid charge | Treasurer recommends | **Board resolution** | Treasurer | Auditor |
| Write off balance | Treasurer recommends | **Board resolution** | Treasurer | Auditor |
| Ordinary refund | Treasurer prepares | President or second authorised officer | Treasurer | Auditor |
| Exceptional/disputed refund | Treasurer prepares | **Board resolution** | Treasurer | Auditor |
| Apply ordinary next-month credit | System under approved rule | No case approval | System/Treasurer | Auditor may inspect |
| Declare delinquent/not in good standing | Treasurer supplies account evidence | **Majority of entire Board through resolution** | Secretary records; system enforces approved result | Appeal/reconsideration path required |
| Dues change | Board proposes | **Member approval/ratification as required by governing law and bylaws** | Secretary records; Treasurer implements | Auditor verifies application |
| Vacant status | Owner/Secretary | Board-authorised approver under adopted policy | Secretary records; system applies | Treasurer/Auditor may verify |
| Routine sports permit | Resident sponsor | Sports Officer / Sports Committee | Sports Officer; Security verifies | Board may review disputes |
| First sports warning | Security or Sports Officer | Under approved policy | Security/Sports Officer logs | Sports Officer reviews |
| Standard ₱500 sports fine | Sports Officer under approved policy | As delegated by approved rules | Treasurer collects and receipts | Auditor reviews |
| Long-term/indefinite ban | Sports Officer recommends | **Board** | Secretary/Security records and enforces | Appeal to Board |
| Vehicle-sticker eligibility check | Application/renewal | Rule-driven; no arbitrary approval | Treasurer/system verifies | Board reviews disputes |
| Physical sticker issuance | Eligible applicant | Assigned sticker authority | Assigned officer/Security | Register available for audit |
| Publish approved memorandum | Issuing authority | As required by policy | Secretary | Version history retained |
| Publish knowledge-base article | Secretary/editor | Source authority verifies | Secretary/editor | Source and revision retained |

### 8.2 Actions requiring full Board approval

The following are adopted as Board-level matters for the Phase 2 design:

1. Waiver of a valid dues charge.
2. Write-off of an amount receivable.
3. Exceptional or disputed refund.
4. Delinquent/not-in-good-standing declaration.
5. Long-term or indefinite guest ban.
6. Appeal from a material sports sanction.
7. Creation or material change of penalties and sanctions.
8. Adoption of the vacant-property billing policy.
9. Material historical financial correction.
10. Appointment and delegated authority of committees, subject to bylaws.
11. Association-wide policy affecting financial obligations or material privileges, unless member approval is legally or constitutionally required.

### 8.3 Actions requiring membership approval or ratification

Subject to the actual registered bylaws and applicable law:

1. Adoption or amendment of bylaws.
2. Dues increases or regular assessments not already authorised by a valid approved formula.
3. Matters expressly reserved to members by law or bylaws.

### 8.4 Secretary is the recorder, not the dues-change approver

The Secretary:

- records meeting notices, votes, minutes and resolutions;
- certifies the approved record;
- maintains policy and governance archives;
- publishes the authorised result.

The Secretary does not independently approve a dues change.

## 9. Sports-Court Rules and Accounting

### 9.1 Confirmed rules

- Court hours are 7:30 a.m.–11:30 a.m. and 3:30 p.m.–6:30 p.m.
- The court is closed to everyone from 11:30 a.m.–3:30 p.m.
- Non-residents require a registered resident sponsor.
- A guest permit is approved by the Sports Committee / Sports Officer.
- A permit may contain a maximum of six outside players.
- Security checks guest identity against the approved roster.
- The second-offense sports fine is ₱500.
- The same association receipt system is used for the fine.
- No fixed duration currently exists for “indefinite revocation.”

### 9.2 Adopted control for indefinite sanctions

Until the HOA adopts a definite sanction schedule:

- no automatic numeric duration is invented;
- the restriction remains active until formal Board review and lifting;
- the reason, start date, reviewing authority, review date and final disposition are recorded;
- the affected resident or sponsor receives an appeal/review channel.

### 9.3 Sports fine accounting

A sports fine must be separate from monthly dues even when paid on the same receipt.

Example receipt line items:

- Monthly dues — May 2026 — ₱400
- Sports violation fine — Ticket SV-2026-014 — ₱500

Rules:

- dues allocate only to property dues;
- sports-fine payment links only to the violation ticket;
- one payment receipt may contain both categories;
- paying one category must not automatically settle the other;
- privilege restoration is driven by the approved sanction rule and the linked fine status.

## 10. Property Registration and Account Provisioning

### 10.1 Property-first setup

- Secretary supplies the verified property and owner master data.
- Properties are registered before resident use.
- One owner may be linked to multiple properties.
- Each property has a separate financial account.
- Vacant properties remain registered even when no household occupies them.

### 10.2 Accounts belong to people

- A property does not receive a fake or shared user account.
- One owner receives one personal account that may access all authorised properties.
- Residents, tenants and authorised representatives receive their own personal accounts when needed.
- Activity is attributed to the actual signed-in person.

### 10.3 Credential process

**Product Owner adopted control:**

1. Administrator creates or imports a verified person/property relationship.
2. System sends a one-time invitation or account-activation link.
3. User creates a private password.
4. Temporary activation links expire.
5. Permanent passwords are not created and distributed manually by the software developer.
6. Password-reset and access-revocation workflows are required.
7. Deactivating an assignment or relationship does not erase transaction history.

### 10.4 Vacant properties

A vacant property may have:

- a property record;
- an owner relationship;
- no active household;
- no resident account;
- an approved vacant status and billing-exemption period.

It does not require a default login.

## 11. Records, Archives and Knowledge Base

### 11.1 Secretary as principal records custodian

The Secretary maintains or coordinates:

- property master list;
- owner/member records;
- officer and committee assignments;
- minutes and resolutions;
- bylaws and amendments;
- memoranda and notices;
- permit forms;
- current and superseded policies;
- document issue and effective dates.

### 11.2 Officer terms

The system may provide the feature, but the software developer must not invent term dates.

Each assignment records:

- person;
- office or committee;
- start date;
- end date;
- election or appointment basis;
- resolution or evidence reference;
- active/inactive status;
- revocation or replacement history.

### 11.3 Community information structure

The Phase 2 blueprint must include:

1. **Announcements** — temporary and time-sensitive notices.
2. **Knowledge Base** — permanent resident guidance such as garbage placement, dues, stickers, court rules and common procedures.
3. **Policies and Documents** — memoranda, bylaws, resolutions, rules, forms and superseded versions.

Every permanent knowledge article should link to its source policy or authoritative record where available.

## 12. Garbage Information Rule

- Garbage may be placed outside daily beginning at 4:00 p.m.
- The rule applies to all occupied households, including owners, residents and tenants.
- The Mandaluyong City garbage truck normally arrives at approximately 6:00 p.m.
- No known HOA penalty applies to the timing rule.

This belongs in the Knowledge Base and may also be issued as an announcement when changed.

## 13. Formal Adoption and Evidence Items

The following remain required before the system treats them as fully formal association policy:

| Item | Current operational answer | Needed formal record/action |
|---|---|---|
| Exact legal name | Wonderland Homeowners Association, Inc. | Registration certificate/bylaws copy |
| ₱400 dues | Confirmed | Bylaw provision, resolution or member-ratification evidence |
| Prior ₱300 amount and increase date | Known historically | Effective-date evidence and approval record |
| No formal due date | Confirmed | Governing-rule confirmation |
| No late penalty | Confirmed | Governing-rule confirmation |
| Vacant properties not billed | Confirmed | Objective definition and approved policy/resolution |
| Oldest-balance-first | Confirmed | Written payment-allocation rule |
| Overpayment to next month | Confirmed | Written credit rule |
| Sequential receipt series | Confirmed | Blank/redacted receipt and receipt-register format |
| Carbon/duplicate copy | Unclear | Confirm physical booklet practice |
| Cancelled/replaced receipt archive | Confirmed generally | Written lifecycle and approval roles |
| Vehicle sticker restriction | Known practice | Formal eligibility/delinquency policy and due-process path |
| Officer and committee terms | Not yet documented | Election/appointment records and term dates |
| Board/member authority boundaries | Proposed in this document | Adopt through bylaws/resolution as appropriate |
| Sports indefinite revocation | No defined duration | Board-approved review/lifting rule |
| Policy/document archive | Does not exist | Establish custody, versioning and retention rules |
| Association bank account | Cash only currently | If opened later, account must be in association name and not commingled |

## 14. Legal and Governance Basis Used

This register uses the following principles from Republic Act No. 9904 as design constraints:

- the Board has primary authority to manage association affairs;
- members have duties to pay dues and rights to records and due process;
- delinquency guidelines and sanctions belong in the bylaws and require due process;
- the association may impose sanctions under valid bylaws and rules;
- the Board must maintain accounting books and detailed financial records;
- dues collected by the Board must be provided in the bylaws and approved by the required membership majority;
- late fines require due notice/hearing and a previously established schedule furnished to homeowners;
- bylaws specify officer powers, terms, committees, dues and increases;
- association funds must be held in accounts in the association’s name and not commingled with personal funds.

Where current Wonderland practice lacks a written governing record, the system must mark it as pending formalisation rather than pretending that software configuration itself creates legal authority.

## 15. Phase 2 Design Requirements Approved by This Register

The Phase 2 domain and service blueprint must include at minimum:

1. Structured property and address model.
2. Multi-property ownership.
3. Separate owner, resident, tenant, household and user-account relationships.
4. Property-level financial account.
5. Monthly charge, partial payment and allocation ledger.
6. Oldest-balance-first allocation.
7. Property credit and next-month application.
8. Vacant-status approval and billing suspension.
9. Sequential receipt register and receipt lifecycle.
10. Separate financial categories for dues, sports fines and future charges.
11. Separation of duties and approval records.
12. Delinquency/good-standing status with due-process workflow.
13. Vehicle-sticker eligibility and issuance register.
14. Officer, Board and committee assignments with terms.
15. Sports permits, rosters, violations, fines, sanctions and appeals.
16. Announcements, Knowledge Base and policy/document archive.
17. Personal account invitations; no property/default/shared accounts.
18. Complete audit history for material changes.
19. Configurable effective dates and policy versions.
20. No GCash or bank-transfer workflow in the initial approved scope.

## 16. Phase Status

| Phase | Status |
|---|---|
| Phase 0 — Legacy reconciliation | Completed and committed |
| Phase 1 — Discovery | **Substantially complete for core property, dues, payment, receipt, governance and sports domains** |
| Phase 1 formal evidence collection | Still open; non-blocking for blueprint drafting where rules are explicitly marked pending formalisation |
| Phase 2 — Domain and service blueprint | **Authorised to begin in ChatGPT** |
| Phase 3 — Stack and repository strategy approval | Not started |
| Coding and implementation | Not authorised |

## 17. Approval Record

The Product Owner has reviewed the recommendations and instructed that the correct controls be adopted. Accordingly:

- confirmed operational rules are accepted as Phase 2 design inputs;
- separation-of-duties, receipt-control, account-provisioning and governance safeguards are adopted for the blueprint;
- matters requiring Board/member authority remain explicitly pending formal HOA adoption;
- no software implementation is authorised by this document.
