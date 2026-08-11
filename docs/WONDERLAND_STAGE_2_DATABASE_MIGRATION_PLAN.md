# Wonderland HOA System — Stage 2 Database Migration Plan

**Date:** 2026-08-12  
**Target Database:** Supabase PostgreSQL (HOA project)  
**Authority:** `DECISION_LOG.md` **DEC-22 – DEC-26**, then `WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` §2–4, `DECISION_LOG.md` DEC-18/DEC-20, `WONDERLAND_STAGE_2_ARCHITECTURE_DECISIONS.md` (DEC-22 through DEC-25, as amended)  
**Status:** ✅ **IMPLEMENTED** by `supabase/migrations/20260812061500_stage2_property_and_occupancy_model.sql` — see the amendment banner below.

---

> ## ⚠️ AMENDED — this plan was written against an assumed schema
>
> Seven of this document's assumptions are false against the live database (project
> `fgsehrblzpheeghplice`, PostgreSQL 17.6), verified 12 August 2026. The migration that shipped
> corrects each one. **`docs/DECISION_LOG.md` DEC-22 … DEC-26 is the authority**; where this plan
> and the log disagree, the log wins.
>
> | # | This plan says | Reality | Where corrected |
> |---|---|---|---|
> | C1 | An `officers` table with `role = 'super_admin'` exists | It did not. Roles were on `profiles.role`, ten values, no `super_admin`. The table is now created by the migration | DEC-23 |
> | C2 | `occupancies.homeowner_id = auth.uid()` identifies a resident | Different keys. Resolve via `homeowners.profile_id = auth.uid()` | DEC-22 |
> | C3 | `homeowners.first_name` / `.last_name` | The column is `full_name` | DEC-24 |
> | C4 | `unit_code` regenerates automatically (Phase 1c) | A generated column's expression is fixed. It needed `ALTER COLUMN unit_code SET EXPRESSION AS (…)` | DEC-26 item 3 |
> | C5 | These are DEC-21…DEC-24 | DEC-21 was already the Android application id (2026-08-10). Renumbered DEC-22…DEC-25 | DEC-22…DEC-25 |
> | C6 | Disable RLS during migration (Phase 6) | Unnecessary — the migration runs as `postgres`, the table owner, which already bypasses RLS — and it leaves `units` unprotected meanwhile. Omitted | DEC-26 item 6 |
> | C7 | `EXTRACT(DAY FROM (date - date))` | `date - date` is already an integer; `EXTRACT` raises on it | DEC-24 |
>
> DEC-26 additionally records what the shipped migration adds beyond this plan: the destructive
> test-data prune, the five-street CHECK constraint, the one-current-owner-per-unit unique index,
> `>=` rather than `>` on the date check, a backfill that keeps closed occupancy periods, and a
> transitional `homeowners` → `occupancies` sync trigger.

---

## Pre-Migration Checklist

Before running any SQL, verify:

- [ ] You have a **backup** of the production database (Supabase project). **This is not optional** — the shipped migration's STEP 0 deletes units 167, 16A and 13B and cascades to their homeowners, dues, payments and credits. A backup restore is the only rollback path.
- [ ] You have confirmed the **5 authoritative street names** (Sampaguita, Sunflower, Wonderland Avenue, Yellowbell, Orchids — Circle is excluded)
- [ ] ~~You understand that existing test data (house_no 113, 115, 165, 167, 16A, 13B) will be replaced during Phase 1 backfill~~ → superseded by the owner's mapping of 12 Aug 2026: 113 Sunflower, 115 Yellowbell, 165 Sampaguita; 167/16A/13B **deleted**; 117 Wonderland Avenue and 121 Orchids **created** as vacant (DEC-26 item 1)
- [ ] All developers have pulled the latest `main` (commit `3c02da9` or later — Stage 2 docs commit)
- [ ] No other migrations are in flight
- [ ] ~~`officers` table exists with a `role` column (for super-admin RLS checks in Phase 6)~~ `SUPERSEDED` — **this was unmet.** The table did not exist; the migration creates it (C1, DEC-23)

---

## Overview of Changes

### Phase 1: Add `street` Column to `units` Table

**Current State:**
```sql
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_no VARCHAR(20) NOT NULL,
  unit_code VARCHAR(50) GENERATED ALWAYS AS (house_no) STORED,
  UNIQUE (house_no)
  -- other columns omitted
);
```

**Problem:** 
- `unit_code` is bare `house_no` (e.g., "113", "115", "118")
- No street context; receipts are ambiguous
- Cannot represent multiple units with the same `house_no` on different streets

**After Phase 1:**
```sql
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_no VARCHAR(20) NOT NULL,
  street VARCHAR(100) NOT NULL,  -- ← NEW
  unit_code VARCHAR(150) GENERATED ALWAYS AS 
    (house_no || ' ' || street) STORED,  -- ← CHANGED
  UNIQUE (house_no, street)  -- ← CHANGED
  -- other columns omitted
);
```

**Impact:**
- `unit_code` is now `"113 Sampaguita"` (human-readable, audit-safe)
- Multiple streets can have a "113" each
- ~35 references to `unit_code` in code/docs update seamlessly (generated column changes automatically)

### Phase 2: Create `occupancies` Table

**New Table:**
```sql
CREATE TABLE occupancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES homeowners(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  move_in_date DATE NOT NULL,
  move_out_date DATE,  -- NULL = currently owns
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_by_officer UUID REFERENCES officers(id) ON DELETE SET NULL,
  UNIQUE (unit_id, homeowner_id, move_in_date),  -- Prevent duplicate entries for same combo
  CHECK (move_out_date IS NULL OR move_out_date > move_in_date)
);
```

**Purpose:**
- Time-bounded ownership model (solves 13B bug)
- One row per occupancy period
- Append-only (no deletes; `moved_out_date` ends tenure)
- Audit trail included (`created_at`, `ended_by_officer`)

### Phase 3: Populate `occupancies` from Current Data

**Current state (actual schema verified in production):**

The `homeowners` table has a direct FK `unit_id` linking homeowners to units. Migrate all active homeowners to occupancies:

```sql
INSERT INTO occupancies (homeowner_id, unit_id, move_in_date, created_at)
SELECT 
  h.id,
  h.unit_id,  -- Direct FK column
  COALESCE(h.move_in_date, '2020-01-01'::DATE),  -- Use move_in_date or default
  NOW()
FROM homeowners h
WHERE h.unit_id IS NOT NULL
  AND h.is_active = true  -- Only active homeowners
ON CONFLICT DO NOTHING;  -- Safety: if already exists, skip
```

### Phase 4: Add Indexes

**For Performance (occupancy queries):**

```sql
CREATE INDEX idx_occupancies_unit_current 
  ON occupancies(unit_id, move_out_date) 
  WHERE move_out_date IS NULL;  -- Partial index for "current owner" queries

CREATE INDEX idx_occupancies_homeowner 
  ON occupancies(homeowner_id) 
  WHERE move_out_date IS NULL;  -- Partial index for "units owned by resident"

CREATE INDEX idx_occupancies_dates 
  ON occupancies(move_in_date, move_out_date);  -- For date range queries

CREATE INDEX idx_units_street 
  ON units(street);  -- For searching by street
```

### Phase 5: Update `unit_code` References

**Before Phase 1:** All code queries refer to `u.unit_code` (which is bare `house_no`)  
**After Phase 1:** `u.unit_code` is now `house_no || ' ' || street` (generated; all queries work as-is)

**No code changes needed in the generated column itself.** However, verify that all user-facing outputs (receipts, bills, search results) now show the full address:

**Search/Filter Examples:**
```sql
-- Before: WHERE house_no = '113'
-- After: WHERE unit_code LIKE '113%' or house_no = '113' (both work)

-- Better: Explicit search
WHERE house_no = '113' AND street = 'Sampaguita'
```

### Phase 6: Update RLS Policies (DEC-22, DEC-23)

**From** `WONDERLAND_STAGE_2_ARCHITECTURE_DECISIONS.md` (DEC-22, DEC-23):

See **§3: RLS Policies** below.

---

## Migration SQL (Phase-by-Phase)

### Phase 1a: Add `street` Column (Non-Destructive)

```sql
-- Step 1: Add street column as nullable (temporarily)
ALTER TABLE units ADD COLUMN street VARCHAR(100);

-- Step 2: Backfill known streets (see §4 below for data collection)
-- This will be done manually by the officer; placeholder here:
-- UPDATE units SET street = 'Sampaguita' WHERE house_no IN ('113', '115', '118', '124', '128', '130');

-- Step 3: After backfill, make it NOT NULL
ALTER TABLE units ALTER COLUMN street SET NOT NULL;
```

**Why NOT NULL after backfill?** Street is essential for address uniqueness. Null streets break receipts.

### Phase 1b: Migrate the Unique Constraint

```sql
-- Step 1: Drop old constraint
ALTER TABLE units DROP CONSTRAINT units_house_no_key;

-- Step 2: Add new constraint
ALTER TABLE units ADD CONSTRAINT units_house_no_street_key 
  UNIQUE (house_no, street);
```

### Phase 1c: Regenerate `unit_code`

> ⚠️ **CORRECTED (C4) — it is NOT automatic.** A generated column's expression is fixed at creation.
> `unit_code` has been a bare alias of `house_no` since `003_house_no.sql:23-24` and stays that way
> until explicitly altered. The claim below, and the identical claim in §"Impact" above
> ("generated column changes automatically"), are both wrong.

```sql
-- ❌ AS DRAFTED — nothing happens
-- The generated column definition updates automatically.
```

```sql
-- ✅ AS SHIPPED. PostgreSQL 17 (live server is 17.6); rewrites the table.
-- MUST run AFTER `street` is NOT NULL, or every unit_code concatenates to NULL.
ALTER TABLE units
  ALTER COLUMN unit_code SET EXPRESSION AS (house_no || ' ' || street);

-- Verify:
SELECT house_no, street, unit_code FROM units ORDER BY street, house_no;
-- Expected: "113 Sunflower", "115 Yellowbell", "117 Wonderland Avenue",
--           "121 Orchids", "165 Sampaguita"
```

> On a server older than PG 17, substitute the `003_house_no.sql` pattern: `DROP COLUMN unit_code`,
> then `ADD COLUMN unit_code text GENERATED ALWAYS AS (house_no || ' ' || street) STORED`. That
> changes on-disk column order and nothing else.

### Phase 2: Create `occupancies` Table

```sql
CREATE TABLE occupancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES homeowners(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  move_in_date DATE NOT NULL,
  move_out_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_by_officer UUID REFERENCES officers(id) ON DELETE SET NULL,
  
  -- Prevent duplicate occupancy records for same homeowner/unit/move-in combo
  UNIQUE (unit_id, homeowner_id, move_in_date),
  
  -- Logical constraint: move-out must be after move-in
  CHECK (move_out_date IS NULL OR move_out_date > move_in_date),
  
  -- Immutability: created_at should never be updated
  -- (Enforce via application logic: do not allow UPDATE on occupancies)
);

-- Add comment for documentation
COMMENT ON TABLE occupancies IS 
  'Time-bounded ownership model. One row per occupancy period. Append-only: delete is never allowed. move_out_date = NULL means currently owns. Audit trail via created_at and ended_by_officer.';

COMMENT ON COLUMN occupancies.move_out_date IS 
  'Date when occupancy ended (ownership transferred). NULL = currently owns this unit.';

COMMENT ON COLUMN occupancies.ended_by_officer IS 
  'Officer who recorded this occupancy end (ownership transfer). Tracks who initiated the change.';
```

### Phase 3: Populate `occupancies` from Existing Homeowner-Unit Links

**Actual Schema:** The existing `homeowners` table has a direct FK `unit_id` linking each homeowner to their unit.

**Migration SQL:**

```sql
INSERT INTO occupancies (homeowner_id, unit_id, move_in_date, created_at)
SELECT 
  h.id,
  h.unit_id,  -- ← Direct FK column (verified in production Supabase)
  COALESCE(h.move_in_date, '2020-01-01'::DATE) as move_in_date,
  CURRENT_TIMESTAMP
FROM homeowners h
WHERE h.unit_id IS NOT NULL
  AND h.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM occupancies occ
    WHERE occ.homeowner_id = h.id AND occ.unit_id = h.unit_id
  )  -- Prevent re-insertion if already exists
ON CONFLICT DO NOTHING;  -- Safety: if already exists, skip

-- Verify the migration:
SELECT COUNT(*) FROM occupancies;  -- Should match number of active homeowners with units
```

**Rationale:**
- `homeowners.unit_id` is the direct FK to units (verified in production Supabase)
- `homeowners.move_in_date` is used as the occupancy start date (not `hoa_join_date`)
- Only active homeowners are migrated (`is_active = true`)
- Conflict handling prevents duplicate insertion if this runs twice

**Post-Migration Verification:**

```sql
-- Check that every active homeowner has at least one occupancy row
SELECT COUNT(*) as homeowners_with_current_occupancy
FROM homeowners h
WHERE h.is_active = true
  AND EXISTS (
    SELECT 1 FROM occupancies occ
    WHERE occ.homeowner_id = h.id AND occ.move_out_date IS NULL
  );

-- Should match or closely align with:
SELECT COUNT(*) as active_homeowners_with_units 
FROM homeowners 
WHERE is_active = true AND unit_id IS NOT NULL;
```

### Phase 4: Add Indexes

```sql
CREATE INDEX idx_occupancies_unit_current 
  ON occupancies(unit_id, move_out_date) 
  WHERE move_out_date IS NULL;

CREATE INDEX idx_occupancies_homeowner_current 
  ON occupancies(homeowner_id, move_out_date) 
  WHERE move_out_date IS NULL;

CREATE INDEX idx_occupancies_dates 
  ON occupancies(move_in_date, move_out_date);

CREATE INDEX idx_units_street 
  ON units(street);

-- Index for unique constraint (PostgreSQL creates this automatically, but explicit is clear)
-- No explicit index needed; UNIQUE constraint includes the index.
```

### Phase 5: Create PostgreSQL Functions (DEC-22, DEC-24)

> ⚠️ **CORRECTED — none of the four blocks in this section ship as written.** Common to all four:
> they select `h.first_name` / `h.last_name`, which do not exist (C3 — the column is `full_name`),
> and they carry **no authorisation guard**, while being granted to `authenticated`. The shipped
> versions are all `SECURITY DEFINER` with `SET search_path = public, pg_temp` and open with the
> `IS NOT TRUE` guard shape that DEC-16 established and DEC-17 preserved. Per-function departures
> are noted inline below and in `DECISION_LOG.md` DEC-23 and DEC-24.

#### Function 1: Get Current Owner of a Unit (DEC-22 — Current Occupancy Query)

```sql
CREATE OR REPLACE FUNCTION get_current_owner(unit_id_param UUID)
RETURNS TABLE (
  homeowner_id UUID,
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR,
  move_in_date DATE,
  occupancy_id UUID
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    h.id,
    h.first_name,
    h.last_name,
    h.email,
    occ.move_in_date,
    occ.id
  FROM occupancies occ
  JOIN homeowners h ON h.id = occ.homeowner_id
  WHERE occ.unit_id = unit_id_param
    AND occ.move_out_date IS NULL;
$$;
```

#### Function 2: Get All Current Units Owned by a Homeowner (DEC-22 — Multi-Property Query)

> ⚠️ Additionally: as drafted, this takes an arbitrary `homeowner_id_param` with no check. Granted to
> `authenticated` and RLS-exempt, it would hand any resident the complete property holdings of any
> other resident. The shipped version requires the caller to be an officer **or** to own the
> `homeowners` row (`h.profile_id = auth.uid()`).

```sql
CREATE OR REPLACE FUNCTION get_owned_units(homeowner_id_param UUID)
RETURNS TABLE (
  unit_id UUID,
  house_no VARCHAR,
  street VARCHAR,
  unit_code VARCHAR,
  move_in_date DATE
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    u.id,
    u.house_no,
    u.street,
    u.unit_code,
    occ.move_in_date
  FROM occupancies occ
  JOIN units u ON u.id = occ.unit_id
  WHERE occ.homeowner_id = homeowner_id_param
    AND occ.move_out_date IS NULL
  ORDER BY u.house_no, u.street;
$$;
```

#### Function 3: Occupancy History (DEC-24 — Audit Trail Query)

> ⚠️ Additionally: `EXTRACT(DAY FROM (occ.move_out_date - occ.move_in_date))` **raises** (C7).
> `date - date` is already an integer day count and `EXTRACT` rejects an integer. Shipped form:
> `(COALESCE(o.move_out_date, CURRENT_DATE) - o.move_in_date)::int`.

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
  status VARCHAR,
  occupancy_id UUID
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    occ.homeowner_id,
    CONCAT(h.first_name, ' ', h.last_name),
    occ.move_in_date,
    occ.move_out_date,
    COALESCE(
      EXTRACT(DAY FROM (occ.move_out_date - occ.move_in_date))::INT, 
      EXTRACT(DAY FROM (CURRENT_DATE - occ.move_in_date))::INT
    ) as occupancy_duration_days,
    CASE 
      WHEN occ.move_out_date IS NULL THEN 'CURRENT'
      ELSE 'HISTORICAL'
    END as status,
    occ.id
  FROM occupancies occ
  JOIN homeowners h ON h.id = occ.homeowner_id
  WHERE occ.unit_id = unit_id_param
    AND (from_date IS NULL OR occ.move_in_date >= from_date)
    AND (to_date IS NULL OR occ.move_out_date <= to_date OR occ.move_out_date IS NULL)
  ORDER BY occ.move_in_date DESC;
$$;
```

#### Function 4: Record Occupancy Transfer (DEC-23 — Super-Admin Only)

> ⚠️ **Four departures in the shipped version**, each necessary (DEC-23):
> 1. **No `officer_id_param`.** In a `SECURITY DEFINER` function a caller-supplied actor is
>    spoofable — any permitted caller could attribute a transfer to a colleague. The actor comes
>    from `auth.uid()`.
> 2. **It does not raise when the unit has no current occupancy.** Units 117 and 121 ship vacant;
>    the version below (`IF old_occ_id IS NULL THEN RAISE`) could never record their first owner.
> 3. **It writes an `audit_logs` row** (`action = 'occupancy.transferred'`). DEC-09 makes BUS-026 a
>    non-negotiable invariant and an ownership transfer is the most audit-critical write in the
>    system; the version below records nothing.
> 4. **It returns `jsonb`**, matching `generate_monthly_dues`, and sets `units.status = 'occupied'`.
>
> The comment `-- Function runs with superuser privs (controlled via RLS policy)` below is also
> misleading: `SECURITY DEFINER` **bypasses** RLS. The guard inside the function *is* the access
> control — this is exactly the failure mode DEC-16 finding F5 recorded against
> `preview_payment_allocation`.

```sql
CREATE OR REPLACE FUNCTION record_occupancy_transfer(
  unit_id_param UUID,
  new_homeowner_id_param UUID,
  move_in_date_param DATE,
  officer_id_param UUID
)
RETURNS TABLE (
  old_occupancy_id UUID,
  new_occupancy_id UUID,
  message VARCHAR
)
LANGUAGE PLPGSQL
SECURITY DEFINER  -- Function runs with superuser privs (controlled via RLS policy)
AS $$
DECLARE
  old_occ_id UUID;
  new_occ_id UUID;
BEGIN
  -- Step 1: Find the current occupancy for this unit
  SELECT id INTO old_occ_id
  FROM occupancies
  WHERE unit_id = unit_id_param
    AND move_out_date IS NULL
  LIMIT 1;

  IF old_occ_id IS NULL THEN
    RAISE EXCEPTION 'No current occupancy found for unit %', unit_id_param;
  END IF;

  -- Step 2: End the old occupancy (set move_out_date to today)
  UPDATE occupancies
  SET 
    move_out_date = CURRENT_DATE,
    ended_by_officer = officer_id_param
  WHERE id = old_occ_id;

  -- Step 3: Create new occupancy for the new homeowner
  INSERT INTO occupancies (homeowner_id, unit_id, move_in_date, created_at)
  VALUES (new_homeowner_id_param, unit_id_param, move_in_date_param, CURRENT_TIMESTAMP)
  RETURNING id INTO new_occ_id;

  -- Step 4: Return results
  RETURN QUERY
  SELECT old_occ_id, new_occ_id, 'Transfer recorded successfully'::VARCHAR;
END;
$$;
```

---

## Phase 6: RLS Policies (DEC-22, DEC-23)

### ~~Disable Default RLS Temporarily (for migration)~~ — ⚠️ NOT DONE (C6)

> This step is **omitted from the shipped migration**. It buys nothing and costs safety: the
> migration runs as `postgres`, which owns every table involved and therefore already bypasses RLS
> (no table carries `FORCE ROW LEVEL SECURITY`). Executing it would leave `units` unprotected for
> the duration of the migration for no benefit. See `DECISION_LOG.md` DEC-26 item 6.

```sql
-- ❌ NOT RUN — retained for traceability
-- ALTER TABLE units DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE occupancies DISABLE ROW LEVEL SECURITY;
```

### Enable and Create Policies

#### Units Table: Residents Can View Their Current Units

> ⚠️ **CORRECTED.** Three problems with the block below.
> (a) `occupancies.homeowner_id = auth.uid()` compares different keys and matches nothing (C2).
> (b) It **adds** a policy next to the existing `units: resident read own`. Permissive policies are
> OR-ed, so this would have *widened* resident access, not narrowed it to current occupancy. The
> shipped migration **drops and recreates** the existing policy under the same name.
> (c) `officers_view_all_units` is redundant — `units: finance/admin read` already grants `SELECT`
> on `units` to all nine officer roles — and is **not** created.
> See `DECISION_LOG.md` DEC-22.

```sql
-- ❌ AS DRAFTED — retained for traceability
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "residents_view_owned_units"
  ON units FOR SELECT
  AS PERMISSIVE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM occupancies
      WHERE occupancies.unit_id = units.id
        AND occupancies.homeowner_id = auth.uid()
        AND occupancies.move_out_date IS NULL
    )
  );

CREATE POLICY "officers_view_all_units"
  ON units FOR SELECT
  AS PERMISSIVE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM officers
      WHERE officers.id = auth.uid()
    )
  );
```

#### Occupancies Table: Officers Can View, Super-Admin Can Write

> ⚠️ **CORRECTED.** The `officers` table read by every policy below **did not exist** (C1); the
> migration now creates it, keyed on `profiles.id` so `officers.id = auth.uid()` is correct as
> written. The shipped policies use the `"table: audience action"` naming of
> `001_initial_schema.sql` and call the `is_officer()` / `is_super_admin()` helpers rather than
> repeating the subquery. A `"occupancies: resident read own"` policy is also added — a resident
> may read their own occupancy rows, including closed ones, which are their own tenure history.
> See `DECISION_LOG.md` DEC-23.

```sql
ALTER TABLE occupancies ENABLE ROW LEVEL SECURITY;

-- All officers can view occupancies
CREATE POLICY "officers_view_occupancies"
  ON occupancies FOR SELECT
  AS PERMISSIVE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM officers
      WHERE officers.id = auth.uid()
    )
  );

-- Super-admin can insert occupancies
CREATE POLICY "super_admin_insert_occupancies"
  ON occupancies FOR INSERT
  AS PERMISSIVE
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM officers
      WHERE officers.id = auth.uid()
        AND officers.role = 'super_admin'
    )
  );

-- Super-admin can update occupancies
CREATE POLICY "super_admin_update_occupancies"
  ON occupancies FOR UPDATE
  AS PERMISSIVE
  TO authenticated
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

-- No one can delete occupancies (append-only)
CREATE POLICY "no_delete_occupancies"
  ON occupancies FOR DELETE
  AS RESTRICTIVE
  TO authenticated
  USING (false);
```

---

## Section 4: Backfill Data Collection

### Authoritative Street List (Decided)

The following 5 streets are confirmed as the complete list for Wonderland HOA:

| Street | Status | Source |
|--------|--------|--------|
| Sampaguita | ✅ Confirmed | DECISION_LOG.md DEC-18 |
| Sunflower | ✅ Confirmed | DECISION_LOG.md DEC-18 |
| Wonderland Avenue | ✅ Confirmed | Legacy reconciliation docs |
| Yellowbell | ✅ Confirmed | Legacy reconciliation docs |
| Orchids | ✅ Confirmed | Legacy reconciliation docs |
| **Circle** | ❌ **Excluded** | Explicitly not used |

**No officer input required.** Street list is already decided. Use these 5 streets for Phase 1a backfill.

### Backfill Strategy

Current test data in the `units` table (house_no: 113, 115, 165, 167, 16A, 13B) will be **replaced** during Phase 1a backfill. This is acceptable since the test data is manually created and non-production.

**Phase 1a Backfill SQL:**

> ⚠️ **SUPERSEDED by the owner's mapping of 12 August 2026** (DEC-26 item 1). The mapping below was
> explicitly illustrative. What shipped: 113 → Sunflower, 115 → Yellowbell, 165 → Sampaguita; units
> **167, 16A and 13B were deleted** (cascading to 3 homeowners, 5 dues, 4 payments, 2 unit credits
> and 3 payment allocations, and requiring an explicit prior delete of `credit_transactions`, whose
> foreign keys are `NO ACTION`); **117 Wonderland Avenue** and **121 Orchids** were created as
> vacant. Column type is `text`, matching every other text column in this schema, not `VARCHAR(100)`.
> A `units_street_check` constraint now restricts `street` to the five confirmed values.

```sql
-- ❌ AS DRAFTED (illustrative) — retained for traceability
-- ALTER TABLE units ADD COLUMN street VARCHAR(100);
-- UPDATE units SET street = 'Sampaguita' WHERE house_no IN ('113', '115');
-- UPDATE units SET street = 'Sunflower' WHERE house_no IN ('165', '167');
-- UPDATE units SET street = 'Wonderland Avenue' WHERE house_no IN ('16A', '13B');

-- ✅ AS SHIPPED
ALTER TABLE units ADD COLUMN IF NOT EXISTS street text;

UPDATE units SET street = 'Sunflower'  WHERE house_no = '113';
UPDATE units SET street = 'Sampaguita' WHERE house_no = '165';
UPDATE units SET street = 'Yellowbell' WHERE house_no = '115';

-- Step 3: Verify backfill
SELECT house_no, street, unit_code FROM units 
ORDER BY street, house_no;
-- Expected: All units should have a street value; unit_code should show "HouseNo Street" format

-- Step 4: Make street NOT NULL
ALTER TABLE units ALTER COLUMN street SET NOT NULL;

-- Step 5: Update constraints
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_house_no_key;
ALTER TABLE units ADD CONSTRAINT units_house_no_street_key UNIQUE (house_no, street);
```

**Note:** The house_no-to-street mapping above is illustrative. Use actual HOA property assignments for production.

**Update, 12 Aug 2026:** the owner supplied the actual assignment; see the banner on the block above and `DECISION_LOG.md` DEC-26 item 1. The shipped migration also adds the enforcing constraint:

```sql
ALTER TABLE units
  ADD CONSTRAINT units_street_check
  CHECK (street IN ('Sampaguita','Sunflower','Wonderland Avenue','Yellowbell','Orchids'));
```

This makes the phase-2 blueprint's "`Circle` is excluded and must not be selectable as an official property street" enforceable in the database rather than only in the UI, and closes Requirements §4.2's `OPEN` street list at five.

---

## Section 5: Testing and Validation Checklist

### Unit Tests

```sql
-- Test 1: Current owner query
SELECT * FROM get_current_owner('unit-123-id');
-- Expected: One row with homeowner details and move_in_date

-- Test 2: Multi-property query
SELECT * FROM get_owned_units('homeowner-456-id');
-- Expected: All units owned by homeowner with move_out_date IS NULL

-- Test 3: Occupancy history
SELECT * FROM occupancy_history('unit-123-id', '2020-01-01'::DATE, '2026-12-31'::DATE);
-- Expected: All occupancies for the unit, with durations and status

-- Test 4: Unique constraint
INSERT INTO units (house_no, street) VALUES ('113', 'Sampaguita');
INSERT INTO units (house_no, street) VALUES ('113', 'Sampaguita');
-- Expected: Second insert fails with UNIQUE constraint violation ✓

INSERT INTO units (house_no, street) VALUES ('113', 'Mahogany');
-- ❌ WRONG. `Mahogany` is not one of the five confirmed streets and now
--    violates units_street_check. Use a real street instead:
INSERT INTO units (house_no, street) VALUES ('113', 'Orchids');
-- Expected: Insert succeeds (different street) ✓
INSERT INTO units (house_no, street) VALUES ('113', 'Circle');
-- Expected: violates units_street_check ✓  (DEC-26 item 2)

-- Test 5: One current owner per unit (DEC-26 item 4)
INSERT INTO occupancies (homeowner_id, unit_id, move_in_date)
VALUES ('<other-homeowner>', '<unit-113-id>', CURRENT_DATE);
-- Expected: violates idx_occupancies_one_current_owner_per_unit ✓

-- Test 6: Append-only
DELETE FROM occupancies WHERE id = '<any>';
-- Expected: 0 rows affected — no permissive DELETE policy, plus a
--           RESTRICTIVE "occupancies: no delete" policy ✓
```

### Integration Tests (Application Layer)

**Test Scenario 1: Ownership Transfer**

```
1. Officer navigates to Unit 115 Sampaguita in web app
2. Current owner: Maria Cruz (move_in_date: 2020-03-15, move_out_date: NULL)
3. Officer clicks "Record Transfer"
4. Form: New Owner = "Juan Dela Cruz", Move-in Date = today
5. Backend calls: record_occupancy_transfer(unit_115_id, juan_id, TODAY, officer_id)
6. Result: 
   - Old occupancy: move_out_date = TODAY, ended_by_officer = officer_id
   - New occupancy: homeowner_id = juan_id, move_in_date = TODAY, move_out_date = NULL
7. Verify: occupancy_history(unit_115_id) shows both records
```

**Test Scenario 2: RLS Policy — Resident Views Only Own Units**

```
1. Login as Maria Cruz (homeowner_id = maria_uuid)
2. Query: SELECT * FROM units (via mobile app)
3. Expected: Only units where occupancies.homeowner_id = maria_uuid AND move_out_date IS NULL
4. Maria's old unit (sold): NOT visible
5. Maria's new unit (after purchase in Stage 3): visible once occupancy row is created
```

> ⚠️ Scenario 1 above describes an officer web-app transfer flow. **That UI is not built in
> Stage 2** — it is new product functionality on the legacy web bridge, which DEC-20 forbids
> (owner decision, 12 Aug 2026; `DECISION_LOG.md` DEC-26 item 10). Test the RPC directly instead,
> and note that the shipped signature has **no** `officer_id` argument:
> `record_occupancy_transfer(p_unit_id, p_new_homeowner_id, p_move_in_date DEFAULT CURRENT_DATE)`.
> Test it against a **vacant** unit (117 or 121) as well, which the drafted version could not
> handle, and confirm an `occupancy.transferred` row lands in `audit_logs`.

**Test Scenario 3: RLS Policy — Super-Admin Can Update Occupancy**

```
1. Login as super-admin officer
2. Call: record_occupancy_transfer(...)
3. Expected: Success, both occupancy rows created/updated
4. Login as non-super-admin officer
5. Call: record_occupancy_transfer(...)
6. Expected: Failure (permission denied via RLS)
```

### Regression Tests

**Mobile App:**

```
1. Android device + Expo Go
2. Login with existing homeowner credentials
3. Expected: Dashboard loads (empty, per Stage 1)
4. No errors in console
5. Session persists (SecureStore + AsyncStorage intact)
```

**Officer Web App (S1-D4 Bridge):**

```
1. Login as officer
2. Navigate to Units view
3. Expected: Units table shows updated unit_code (e.g., "113 Sampaguita")
4. Click on a unit to view details
5. Expected: Current owner displayed (from occupancies table)
6. (Optional) Super-admin: Test "Record Transfer" button
```

---

## Section 6: Rollback Plan

If the migration fails or causes data corruption:

### Option 1: Restore from Backup (Recommended)

```bash
# Supabase: Restore the project to a point-in-time snapshot
# (Done via Supabase console: Project Settings → Backups → Restore)
```

### ~~Option 2: Manual Rollback (If Backup Unavailable)~~ — ⚠️ NOT A VALID PATH

> The shipped migration's STEP 0 **deletes** units 167, 16A and 13B and cascades to their
> homeowners, dues, payments, credits and payment allocations. No sequence of DDL below can bring
> those rows back. **A backup restore is the only rollback.** The block is retained only because it
> documents how to reverse the schema half of the change. See `DECISION_LOG.md` DEC-26 item 1.

```sql
-- Step 1: Drop new structures
DROP TABLE IF EXISTS occupancies CASCADE;
DROP FUNCTION IF EXISTS get_current_owner CASCADE;
DROP FUNCTION IF EXISTS get_owned_units CASCADE;
DROP FUNCTION IF EXISTS occupancy_history CASCADE;
DROP FUNCTION IF EXISTS record_occupancy_transfer CASCADE;

-- Step 2: Restore units table to pre-Phase-1 state
ALTER TABLE units ALTER COLUMN unit_code DROP EXPRESSION;
ALTER TABLE units DROP COLUMN street;
ALTER TABLE units DROP CONSTRAINT units_house_no_street_key;
ALTER TABLE units ADD CONSTRAINT units_house_no_key UNIQUE (house_no);
ALTER TABLE units ADD COLUMN unit_code VARCHAR(50) GENERATED ALWAYS AS (house_no) STORED;

-- Step 3: Verify
SELECT house_no, unit_code FROM units LIMIT 5;
-- Expected: unit_code is bare house_no (e.g., "113", not "113 Sampaguita")
```

**Why restore from backup is preferred:** Manual rollback is error-prone and may leave the schema in an inconsistent state. Always back up before migration.

---

## Section 7: Implementation Timeline

Assuming Claude Code (Opus 5, Extra High) is used:

| Phase | Task | Estimated Duration | Done |
|-------|------|-------------------|------|
| Pre-Migration | Collect backfill data from officer | 1–2 days | |
| Phase 1a–1c | Add `street`, migrate constraints, regen `unit_code` | 15 min SQL | |
| Phase 2 | Create `occupancies` table | 10 min SQL | |
| Phase 3 | Populate `occupancies` from existing data | 5 min SQL + verification | |
| Phase 4 | Add indexes | 5 min SQL | |
| Phase 5 | Create PostgreSQL functions | 20 min SQL | |
| Phase 6 | Enable RLS + create policies | 15 min SQL | |
| Testing | Unit, integration, regression tests | 1–2 hours | |
| **Total** | | **~2–3 hours** | |

---

## Section 8: Deployment Checklist

Before deploying to production:

- [ ] Backup created (Supabase project backup taken) — **mandatory**, see the Rollback section
- [x] ~~Officer has provided street addresses for six missing units~~ → owner supplied the mapping 12 Aug 2026 (DEC-26 item 1)
- [ ] All SQL reviewed by second developer (if available)
- [ ] Test environment (second Supabase project) has passed all tests
- [ ] Mobile app tested (boots, authenticates, no regression)
- [ ] Officer web app tested (loads units, shows current occupancy)
- [ ] RLS policies validated (resident can't see other residents' units)
- [ ] Rollback plan documented and verified
- [ ] Monitoring set up (error logs, database performance)
- [ ] Stage 1 requirements still satisfied (no regression)

---

## References

1. **Comprehensive Requirements:** `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` §2–4
2. **Architecture Decisions:** `WONDERLAND_STAGE_2_ARCHITECTURE_DECISIONS.md` (DEC-22 through DEC-25, as amended)
3. **Decision Log:** `docs/DECISION_LOG.md` DEC-18 (handles), DEC-20 (no self-registration, web-bridge scope), **DEC-22 – DEC-26 (the authority for everything in this plan)**. Note: DEC-21 is the Android application id, **not** a streets decision — the street list comes from `docs/phase-1/…CONTROLS_REGISTER_v1.0.md:35-40`, `docs/phase-2/…BLUEPRINT_v1.0.md:240-246` and `docs/reconciliation/…STACK_REVIEW.md:76`, and is closed by DEC-26 item 2.
4. **Stage 1 Implementation Guide:** `docs/WONDERLAND_STAGE_1_IMPLEMENTATION_GUIDE.md` §11.5 (auth context)
5. **The migration itself:** `supabase/migrations/20260812061500_stage2_property_and_occupancy_model.sql`

---

**End of Stage 2 Database Migration Plan.**

**Revision Date:** 2026-08-12 (second revision)  
**Changes, first revision:** Phase 3 SQL corrected to use `homeowners.unit_id` (verified in production); non-existent audit file reference removed; §4 backfill updated to use confirmed 5-street list; pre-migration checklist updated.  
**Changes, second revision:** amendment banner added recording seven assumptions falsified against the live database (C1–C7); DEC-21…DEC-24 renumbered DEC-22…DEC-25; inline `⚠️ CORRECTED` notes added to Phase 1c, Phase 5 (all four functions), Phase 6 (both policy sets and the RLS-disable step), §4 backfill, §5 tests and §6 rollback. `docs/DECISION_LOG.md` DEC-22 – DEC-26 is now the authority; this plan is a historical record of the design, not of what shipped.