# Wonderland HOA System — Stage 2 Architecture Decisions

**Date:** 2026-08-12  
**Stage 2 Merge Commit:** `3c02da9`  
**Authority Sources:**
- `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` §2–4
- `docs/DECISION_LOG.md` DEC-18, DEC-20
- `docs/ux/WONDERLAND_STAGE_1_IMPLEMENTATION_GUIDE.md` §11.5

---

## Overview

Stage 2 implements the property and occupancy model that unblocks financial workflows (Stage 3) and resolves the 13B duplicate-homeowner bug. Before implementation, four architectural decisions must be made and logged. This document records them.

**Scope:** These decisions govern RLS policy, officer permissions, audit exposure, and handle lifecycle—all foundational to the occupancy model. They are not implementation choices; they are **governance decisions** that affect data access, security, and officer workflows.

---

## DEC-21: RLS Policy for Multi-Property Ownership

### Decision

**After the occupancy model is implemented, residents may own multiple units. The RLS policy must allow a resident to view and act on all properties they currently own (one occupancy row per owned unit with `move_out_date IS NULL`). Mobile multi-property switching UI is deferred to Stage 3.**

### Rationale

1. **RLS Layer:** RLS policies must be defined when the data model exists, not when the UI exists. Without RLS, the data is unprotected.
2. **Multiple Ownership:** RA 9904 (Homeowners Association Act) does not prohibit one resident from owning multiple units in the same HOA (e.g., an investor, a unit owner who bought an additional parking unit). The schema must not assume one-to-one.
3. **Mobile Deferral:** The mobile app UI for "Switch between my units" is not part of Stage 2; the RLS and API query logic are. Stage 3 adds the UI switcher once API is ready.

### Implementation Details

**RLS Rule for Residents (homeowners):**

```sql
-- Residents can view their current units (occupancy.move_out_date IS NULL)
CREATE POLICY "residents_view_owned_units"
  ON units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM occupancies
      WHERE occupancies.unit_id = units.id
        AND occupancies.homeowner_id = auth.uid()
        AND occupancies.move_out_date IS NULL
    )
  );
```

**API Query (for Stage 2 Officer Web Bridge):**

```sql
-- Officer retrieves current occupancy for a given unit
SELECT 
  u.id, u.house_no, u.street, u.unit_code,
  h.id as homeowner_id, h.email, h.first_name, h.last_name,
  occ.move_in_date, occ.created_at
FROM units u
LEFT JOIN occupancies occ ON occ.unit_id = u.id 
  AND occ.move_out_date IS NULL
LEFT JOIN homeowners h ON h.id = occ.homeowner_id
WHERE u.id = $1;
```

**Resident Query (for mobile multi-property context in Stage 3):**

```sql
-- Resident retrieves all units they currently own
SELECT 
  u.id, u.house_no, u.street, u.unit_code
FROM units u
INNER JOIN occupancies occ ON occ.unit_id = u.id
WHERE occ.homeowner_id = auth.uid()
  AND occ.move_out_date IS NULL
ORDER BY u.house_no, u.street;
```

**Status:** ✅ **APPROVED** — Proceed with RLS implementation as part of schema migration.

---

## DEC-22: Officer Occupancy-Transfer Permissions

### Decision

**Only super-admin officers can record occupancy transfers (ownership changes). Regular officers can view current occupancy but cannot modify it. This restriction is enforced at both RLS and application logic layers. Expansion to other officer roles is deferred to Stage 4.**

### Rationale

1. **Data Integrity:** Occupancy transfers are audit-critical. A single mistake (assigning a unit to the wrong resident) breaks financial tracking. Restricting write access to super-admin limits risk.
2. **Authority Precedent:** DEC-20 (HOA-provisioned accounts) and S1-D4 (officer web app as operational bridge) both defer complex officer permissions to later stages. This preserves that pattern.
3. **Stage 4 Expansion:** Once Stage 3 (financial workflows) is stable and officers have more experience with occupancy, Stage 4 can introduce role-based transfer permissions (e.g., treasurer can approve transfers, secretary records them).
4. **Immutability:** All transfers create new occupancy rows; deletion is never allowed (per Comprehensive Requirements §3.5). Only super-admin has the authority to initiate the permanent record.

### Implementation Details

**RLS Layer (Supabase):**

```sql
-- Only super-admin can insert/update occupancies
CREATE POLICY "super_admin_manage_occupancies"
  ON occupancies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM officers
      WHERE officers.id = auth.uid()
        AND officers.role = 'super_admin'
    )
  );

CREATE POLICY "super_admin_update_occupancies"
  ON occupancies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM officers
      WHERE officers.id = auth.uid()
        AND officers.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM officers
      WHERE officers.id = auth.uid()
        AND officers.role = 'super_admin'
    )
  );

-- All officers (including super-admin) can view occupancies
CREATE POLICY "officers_view_occupancies"
  ON occupancies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM officers
      WHERE officers.id = auth.uid()
    )
  );
```

**Application Layer (Officer Web App):**

1. The existing officer web app (S1-D4 bridge) has an "Officers" table with a `role` column.
2. Add a `role` check in the occupancy-transfer UI: if `role != 'super_admin'`, hide the "Record Transfer" button and display a message: "Only administrators can record ownership transfers."
3. Backend RPC (PostgreSQL function) validates super-admin status before accepting transfer records.

**Transfer Workflow (Officer View):**

```
1. Super-admin navigates to Unit 115 Sampaguita
2. Current occupancy shown: Owner = Maria Cruz, Move-in = 2020-03-15, Move-out = NULL
3. Super-admin clicks "Record Transfer"
4. Form opens: New Owner (autocomplete homeowners list), Move-in Date (default today)
5. Behind the scenes:
   a. END old occupancy: UPDATE occupancies SET move_out_date = ?, ended_by_officer = ? WHERE unit_id = ? AND move_out_date IS NULL
   b. CREATE new occupancy: INSERT INTO occupancies (homeowner_id, unit_id, move_in_date, created_at) VALUES (...)
6. Confirmation screen shows both records created.
```

**Status:** ✅ **APPROVED** — Proceed with super-admin-only write access. Log a Stage 4 decision to revisit role-based expansion.

---

## DEC-23: Audit Trail Querying (Exposure and Scope)

### Decision

**Historical occupancy queries (e.g., "Who owned this unit between 2020-01-01 and 2023-12-31?") are exposed only as PostgreSQL RPC functions callable by officers. No UI screen is built in Stage 2. Stage 4 will expose this via a Reports or Audit screen if needed.**

### Rationale

1. **Immutability Requirement:** Per Comprehensive Requirements §3.5, the occupancy table must be append-only (no deletes). This makes historical queries safe and auditable by design.
2. **Officer Need:** Officers may need to reconcile "Who paid in 2021?" against "Who was the owner in 2021?" for dispute resolution. The RPC enables this without a UI.
3. **Privacy:** Exposing full ownership history in a public or overly-permissive UI creates privacy risk. Restricting to officers only via RPC is safer.
4. **Stage 2 Scope:** Building a Reports UI requires design (permissions, export formats, search filters) that belongs in Stage 4, not Stage 2. Stage 2 builds the query, Stage 4 builds the interface.
5. **Data Integrity:** RPC functions can include validation and audit logging at the function level, ensuring no ad-hoc queries bypass governance.

### Implementation Details

**RPC Function (PostgreSQL):**

```sql
CREATE OR REPLACE FUNCTION occupancy_history(
  unit_id_param UUID,
  from_date DATE DEFAULT NULL,
  to_date DATE DEFAULT NULL
)
RETURNS TABLE (
  homeowner_id UUID,
  homeowner_name TEXT,
  move_in_date DATE,
  move_out_date DATE,
  occupancy_duration_days INT,
  status TEXT
) 
LANGUAGE SQL
STABLE
AS $$
SELECT
  occ.homeowner_id,
  CONCAT(h.first_name, ' ', h.last_name) as homeowner_name,
  occ.move_in_date,
  occ.move_out_date,
  COALESCE(EXTRACT(DAY FROM (occ.move_out_date - occ.move_in_date))::INT, 
           EXTRACT(DAY FROM (CURRENT_DATE - occ.move_in_date))::INT) as occupancy_duration_days,
  CASE 
    WHEN occ.move_out_date IS NULL THEN 'CURRENT'
    ELSE 'HISTORICAL'
  END as status
FROM occupancies occ
JOIN homeowners h ON h.id = occ.homeowner_id
WHERE occ.unit_id = unit_id_param
  AND (from_date IS NULL OR occ.move_in_date >= from_date)
  AND (to_date IS NULL OR occ.move_out_date <= to_date OR occ.move_out_date IS NULL)
ORDER BY occ.move_in_date DESC;
$$;

-- Grant only to authenticated officers
GRANT EXECUTE ON FUNCTION occupancy_history TO authenticated;

-- Add RLS check inside function to ensure only officers call it
-- (Supabase requires function-level auth, not role-based execute grant in this pattern)
```

**Supabase Exposure:**

1. Add to officer web app's RPC client: `supabase.rpc('occupancy_history', { unit_id_param, from_date, to_date })`
2. Officer can retrieve history programmatically (e.g., via a manual query tool in the browser console, or a future Reports UI)
3. No UI button or screen in Stage 2; officers use API directly or via CLI tool

**Stage 4 Follow-up:**

```
TODO (Stage 4 decision):
- Should occupancy_history be exposed in a dedicated "Ownership Audit" or "Unit History" screen?
- Should there be export formats (CSV, PDF)?
- Should the query be filterable by date range in the UI, or only pre-defined windows?
```

**Status:** ✅ **APPROVED** — RPC function exposed, no UI. Log Stage 4 decision for Reports/Audit screen design.

---

## DEC-24: Handle Reassignment Rules Post-Ownership-Transfer

### Decision

**After an ownership transfer, the officer records the transfer (DEC-22). The new owner's login handle is generated by the same rule as DEC-18 (derived from HOA property, e.g., `115.sampaguita`), applied at account-creation time or first-login in Stage 3. Handles are not reassigned retroactively; each new owner gets a new handle derived from their new unit. This is deferred to Stage 3 onboarding.**

### Rationale

1. **Immutability of Handles (DEC-18):** DEC-18 established that login handles are **mutable per transfer, immutable per session**—once a resident logs in with `115.sampaguita`, their Supabase Auth UUID is bound to that handle for the session. If they sell the unit, the handle changes (new owner gets `115.sampaguita`), but their personal identity (Auth UUID) persists.
2. **No Retroactive Reassignment:** Reassigning handles after ownership transfer creates sessions/token confusion. Instead, Stage 3 onboarding for the new owner creates a fresh account with a fresh handle.
3. **Old Owner's Account:** If a resident sells and becomes a tenant elsewhere, their old account (with Auth UUID) persists but is marked inactive. A Stage 4 decision can address "Can a former owner become a tenant and get a new account?" (rental unit support).
4. **Stage 3 Scope:** Creating accounts for new owners is part of Stage 3's resident enrollment workflow, not Stage 2's data model.

### Implementation Details

**No schema changes required for Stage 2.** This is a policy decision for Stage 3 implementation.

**Stage 2 Context (for Stage 3 reference):**

After Stage 2 merges, when a super-admin records an ownership transfer:
- Old occupancy: `move_out_date = TODAY`
- New occupancy: `move_in_date = TODAY`
- New owner's Auth record does **not** exist yet (they have no account)

**Stage 3 Workflow (to be designed, not implemented now):**

1. Officer creates account for new owner (or new owner self-enrolls via HOA code, if self-registration is enabled later)
2. New owner's account is provisioned with `login_handle = house_no || '.' || street_abbreviated` (e.g., `115.sampaguita`)
3. New owner's `homeowner_id` is linked to their Auth UUID
4. Old owner's account remains but is marked `status = 'inactive'` (cannot log in unless re-enrolled as tenant)

**Handle Collision Prevention:**

- If two different owners have held the same unit over time, they get **different** handles:
  - Owner A (2020–2024): `115.sampaguita` (account ID X)
  - Owner B (2024–now): `115.sampaguita` (account ID Y) — **this is OK**, they are different Supabase Auth UUIDs
- The handle itself is reused (it's property-derived), but the Auth identity is unique (one account per person per ownership period).

**Status:** ✅ **APPROVED** — No action in Stage 2. Document this as the Stage 3 onboarding rule.

---

## Summary Table: Four Decisions

| Decision | Scope | Owner Role | Timeline | Follow-up |
|----------|-------|-----------|----------|-----------|
| **DEC-21: RLS for Multi-Property** | Data layer | Resident (current owner only) | Stage 2 schema + RLS | Stage 3 mobile UI |
| **DEC-22: Super-Admin Transfers** | Permissions + workflow | Super-admin only | Stage 2 schema + RLS + web app | Stage 4 role expansion |
| **DEC-23: Audit Trail Queries** | API exposure | Officers via RPC | Stage 2 RPC function | Stage 4 Reports UI |
| **DEC-24: Handle Reassignment** | Policy (no schema impact) | Officer initiates, system assigns | Stage 2 policy doc | Stage 3 onboarding design |

---

## Validation Checklist for Stage 2 Implementation

When the database migration and code is ready, verify each decision:

- [ ] **DEC-21:** RLS policy allows resident to view only units with `occupancy.move_out_date IS NULL` and `homeowner_id = auth.uid()`
- [ ] **DEC-21:** API query returns all units owned by resident (testing with multi-unit scenario)
- [ ] **DEC-22:** Only super-admin can call occupancy insert/update RPC; regular officers see read-only view
- [ ] **DEC-22:** Officer web app hides "Record Transfer" button for non-super-admin users
- [ ] **DEC-23:** `occupancy_history()` RPC exists and is callable by authenticated officers
- [ ] **DEC-23:** `occupancy_history()` filters by date range and returns full audit trail
- [ ] **DEC-24:** No code changes in Stage 2; only document as policy for Stage 3

---

## References

1. **Comprehensive Requirements:** `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` §2.1 (units), §3.5 (occupancy—marked OPEN for Stage 2 to solve), §4.2 (address model)
2. **Decision Log:** `docs/DECISION_LOG.md` DEC-18 (handle derivation, street format), DEC-20 (HOA-provisioned, no self-registration)
3. **Stage 1 Implementation Guide:** `docs/WONDERLAND_STAGE_1_IMPLEMENTATION_GUIDE.md` §11.5 (auth context)
4. **Legal Basis:** RA 9904 (Homeowners Association Act of 2004), §23 (officers and governance)

---

**End of Stage 2 Architecture Decisions.**  
Ready for Stage 2 Database Migration Plan and implementation in Claude Code.