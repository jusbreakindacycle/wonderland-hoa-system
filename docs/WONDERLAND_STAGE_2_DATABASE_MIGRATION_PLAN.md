# Wonderland HOA System — Stage 2 Database Migration Plan

**Date:** 2026-08-12  
**Target Database:** Supabase PostgreSQL (HOA project)  
**Authority:** `WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` §2–4, `DECISION_LOG.md` DEC-18/DEC-20, `WONDERLAND_TASK_AUDIT_HOUSE_NO_CONSTRAINT.md`, `WONDERLAND_STAGE_2_ARCHITECTURE_DECISIONS.md` (DEC-21 through DEC-24)  
**Status:** Ready for implementation in Claude Code (Opus 5, Extra High effort, Plan mode)

---

## Pre-Migration Checklist

Before running any SQL, verify:

- [ ] You have a **backup** of the production database (Supabase project)
- [ ] You have read the `WONDERLAND_TASK_AUDIT_HOUSE_NO_CONSTRAINT.md` audit report
- [ ] You have obtained **street addresses for the six units with missing street data** from the HOA officer (see **§4: Backfill Data Collection** below)
- [ ] All developers have pulled the latest `main` (commit `8e28502` or later)
- [ ] No other migrations are in flight

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

**Current state (hypothetical schema before Stage 2):**

Assuming the schema has a `homeowners.primary_unit_id` or similar linking homeowners to units, migrate to occupancies:

```sql
INSERT INTO occupancies (homeowner_id, unit_id, move_in_date, created_at)
SELECT 
  h.id,
  h.primary_unit_id,  -- or however unit is currently linked
  COALESCE(h.hoa_join_date, '2020-01-01'::DATE),  -- Use HOA join date or default
  NOW()
FROM homeowners h
WHERE h.primary_unit_id IS NOT NULL
  AND h.status IN ('active', 'inactive')  -- Exclude deleted users
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

### Phase 6: Update RLS Policies (DEC-21, DEC-22)

**From** `WONDERLAND_STAGE_2_ARCHITECTURE_DECISIONS.md` (DEC-21, DEC-22):

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

### Phase 1c: Regenerate `unit_code` (Automatic via Generated Column)

```sql
-- The generated column definition updates automatically.
-- Verify it's correct:
SELECT house_no, street, unit_code FROM units LIMIT 10;
-- Expected: unit_code should now be "113 Sampaguita", "115 Sampaguita", etc.
```

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

**Assumption:** The existing schema has a way to link homeowners to units (e.g., `homeowners.primary_unit_id`, or a separate `homeowner_units` table).

**Option A: Single unit per homeowner (simple migration)**

```sql
INSERT INTO occupancies (homeowner_id, unit_id, move_in_date, created_at)
SELECT 
  h.id,
  h.primary_unit_id,
  COALESCE(h.hoa_join_date, h.created_at::DATE, '2020-01-01'::DATE) as move_in_date,
  CURRENT_TIMESTAMP
FROM homeowners h
WHERE h.primary_unit_id IS NOT NULL
  AND h.status NOT IN ('deleted')  -- Exclude deleted users
  AND NOT EXISTS (
    SELECT 1 FROM occupancies occ
    WHERE occ.homeowner_id = h.id AND occ.unit_id = h.primary_unit_id
  )  -- Prevent re-insertion if already exists
;

-- Verify the migration:
SELECT COUNT(*) FROM occupancies;  -- Should match or exceed number of active homeowners
```

**Option B: Multiple units per homeowner (if historical data exists)**

If homeowners can own multiple units and that's tracked elsewhere (e.g., `homeowner_units` junction table), iterate and create one occupancy row per (homeowner, unit) pair:

```sql
INSERT INTO occupancies (homeowner_id, unit_id, move_in_date, created_at)
SELECT 
  hu.homeowner_id,
  hu.unit_id,
  COALESCE(hu.acquire_date, h.hoa_join_date, '2020-01-01'::DATE) as move_in_date,
  CURRENT_TIMESTAMP
FROM homeowner_units hu
JOIN homeowners h ON h.id = hu.homeowner_id
WHERE hu.status NOT IN ('deleted')
  AND NOT EXISTS (
    SELECT 1 FROM occupancies occ
    WHERE occ.homeowner_id = hu.homeowner_id AND occ.unit_id = hu.unit_id
  )
;
```

**Post-Migration Verification:**

```sql
-- Check that every current homeowner has at least one occupancy row
SELECT COUNT(*) as homeowners_with_current_occupancy
FROM homeowners h
WHERE EXISTS (
  SELECT 1 FROM occupancies occ
  WHERE occ.homeowner_id = h.id AND occ.move_out_date IS NULL
);

-- Should be close to or equal to:
SELECT COUNT(*) as active_homeowners FROM homeowners WHERE status = 'active';
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

### Phase 5: Create PostgreSQL Functions (DEC-21, DEC-23)

#### Function 1: Get Current Owner of a Unit (DEC-21 — Current Occupancy Query)

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

#### Function 2: Get All Current Units Owned by a Homeowner (DEC-21 — Multi-Property Query)

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

#### Function 3: Occupancy History (DEC-23 — Audit Trail Query)

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

#### Function 4: Record Occupancy Transfer (DEC-22 — Super-Admin Only)

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

## Phase 6: RLS Policies (DEC-21, DEC-22)

### Disable Default RLS Temporarily (for migration)

```sql
ALTER TABLE units DISABLE ROW LEVEL SECURITY;
ALTER TABLE occupancies DISABLE ROW LEVEL SECURITY;
```

### Enable and Create Policies

#### Units Table: Residents Can View Their Current Units

```sql
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

### Six Units with Missing Street Data

From `WONDERLAND_TASK_AUDIT_HOUSE_NO_CONSTRAINT.md`:

The following units have no known street data in the current system:

| House No | Current Status | Street Address (TO BE PROVIDED BY OFFICER) |
|----------|-----------------|-------------------------------------------|
| 113      | Active          | _____________________________________________ |
| 115      | Active          | _____________________________________________ |
| 118      | Active          | _____________________________________________ |
| 124      | Active          | _____________________________________________ |
| 128      | Active          | _____________________________________________ |
| 130      | Active          | _____________________________________________ |

### Officer Input Form (Use This to Collect Data)

**To the HOA Officer:**

Before Stage 2 implementation begins, please provide the street address for each of these units. Provide the full street name (e.g., "Sampaguita", "Mahogany", "Acacia").

Once you provide this, the migration team will backfill the database automatically.

**Input method:**
1. Print or screenshot this table
2. Fill in the "Street Address" column by hand or email
3. Send to the development team before migration begins

### Backfill SQL (After Officer Provides Data)

Once the officer provides street addresses, run:

```sql
-- Example (replace with actual streets provided by officer):
UPDATE units SET street = 'Sampaguita' WHERE house_no = '113';
UPDATE units SET street = 'Sampaguita' WHERE house_no = '115';
UPDATE units SET street = 'Mahogany' WHERE house_no = '118';
UPDATE units SET street = 'Mahogany' WHERE house_no = '124';
UPDATE units SET street = 'Acacia' WHERE house_no = '128';
UPDATE units SET street = 'Palmera' WHERE house_no = '130';

-- Verify backfill:
SELECT house_no, street, unit_code FROM units 
WHERE house_no IN ('113', '115', '118', '124', '128', '130')
ORDER BY house_no;
-- Expected: All six should have a street value, and unit_code should show "HouseNo Street"
```

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
-- Expected: Insert succeeds (different street) ✓
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

### Option 2: Manual Rollback (If Backup Unavailable)

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

- [ ] Backup created (Supabase project backup taken)
- [ ] Officer has provided street addresses for six missing units
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
2. **House No Audit:** `WONDERLAND_TASK_AUDIT_HOUSE_NO_CONSTRAINT.md`
3. **Architecture Decisions:** `WONDERLAND_STAGE_2_ARCHITECTURE_DECISIONS.md` (DEC-21 through DEC-24)
4. **Decision Log:** `docs/DECISION_LOG.md` DEC-18, DEC-20
5. **Stage 1 Guide:** `docs/WONDERLAND_STAGE_1_IMPLEMENTATION_GUIDE.md` §11.5 (auth context)

---

**End of Stage 2 Database Migration Plan.**  
Ready for implementation in Claude Code with the Architecture Decisions document.
