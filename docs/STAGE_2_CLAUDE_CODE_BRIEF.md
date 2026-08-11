# Wonderland HOA System — Stage 2 Implementation Brief for Claude Code
**Date:** 2026-08-12  
**Mode:** Opus 5, Extra High Effort, Plan Mode  
**Status:** ✅ Ready to Implement

---

## 🎯 Mission

Implement the Stage 2 property and occupancy model that:
1. Adds `street` column to `units` table (Phase 1)
2. Creates `occupancies` time-bounded ownership table (Phase 2)
3. Populates `occupancies` from existing `homeowners` data (Phase 3)
4. Implements RLS policies for multi-property access (DEC-21, DEC-22)
5. Exposes audit functions for officers (DEC-23)
6. Sets governance policy for handle reassignment (DEC-24)

---

## ✅ Actual Production Schema (VERIFIED)

### homeowners Table
```sql
CREATE TABLE homeowners (
  id              uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         uuid  REFERENCES units ON DELETE CASCADE,  -- ← Direct FK (no primary_unit_id)
  profile_id      uuid  REFERENCES profiles,
  full_name       text  NOT NULL,
  email           text,
  contact_number  text,
  move_in_date    date,
  move_out_date   date,  -- ← Already added by migration 003
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
```

### units Table (current)
```sql
CREATE TABLE units (
  id          uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  house_no    text   NOT NULL,
  unit_code   text   GENERATED ALWAYS AS (house_no) STORED,
  status      text   CHECK (status IN ('occupied', 'vacant')) DEFAULT 'occupied',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (house_no)  -- ← Will change to UNIQUE (house_no, street)
);
```

### Test Data Status
- Current test data: house_no values like "165", "16A", "113", "167", "13B", "115"
- **Can be safely discarded** during Phase 1 backfill
- Will be replaced with clean data once `street` column is added

---

## ✅ Authoritative Street List (5 Streets, DECIDED)

Source: `docs/DECISION_LOG.md` DEC-18 + legacy reconciliation docs

| Street | Status |
|--------|--------|
| Sampaguita | ✅ CONFIRMED |
| Sunflower | ✅ CONFIRMED |
| Wonderland Avenue | ✅ CONFIRMED |
| Yellowbell | ✅ CONFIRMED |
| Orchids | ✅ CONFIRMED |
| **Circle** | ❌ **EXPLICITLY EXCLUDED** |

**No officer input needed** — streets are already decided. Use these 5 for backfill validation.

---

## 🔴 CRITICAL CORRECTION: Phase 3 Migration SQL

**What the original migration plan says (WRONG):**
```sql
INSERT INTO occupancies (homeowner_id, unit_id, move_in_date, created_at)
SELECT 
  h.id,
  h.primary_unit_id,  -- ❌ DOES NOT EXIST
  ...
```

**What it MUST be (CORRECT):**
```sql
INSERT INTO occupancies (homeowner_id, unit_id, move_in_date, created_at)
SELECT 
  h.id,
  h.unit_id,  -- ✅ Use actual FK column
  COALESCE(h.move_in_date, '2020-01-01'::DATE) as move_in_date,
  NOW()
FROM homeowners h
WHERE h.unit_id IS NOT NULL
  AND h.is_active = true
ON CONFLICT DO NOTHING;
```

**Rationale:**
- `homeowners.unit_id` is the **direct foreign key** to units (verified in Supabase)
- No `primary_unit_id` or `homeowner_units` junction table exists
- Use existing `move_in_date` from homeowners as occupancy start date
- Only migrate active homeowners

---

## ⚠️ REFERENCE ISSUE: Non-existent Audit File

**Both documents reference:** `WONDERLAND_TASK_AUDIT_HOUSE_NO_CONSTRAINT.md`

**Status:** ❌ **This file does not exist** (it was mentioned but never created)

**Action for Claude Code:**
- Ignore references to this file
- Do NOT create it (not required for migration)
- The backfill validation comes from the 5 streets + actual Supabase data

**Pre-migration checklist should NOT include:**
- ~~"You have read the `WONDERLAND_TASK_AUDIT_HOUSE_NO_CONSTRAINT.md` audit report"~~
- ~~"You have obtained **street addresses for the six units with missing street data**"~~ 

These are superseded by: **Street list is already decided (5 streets above).**

---

## 📋 Stage 2 Architecture Decisions (COMPLETE & APPROVED)

All four decisions are sound and ready to implement without changes:

### DEC-21: RLS for Multi-Property Ownership ✅
- Residents can view only units with `occupancy.move_out_date IS NULL`
- Multiple ownership supported (one occupancy row per unit)
- Mobile UI deferred to Stage 3

### DEC-22: Super-Admin Occupancy Transfer Permissions ✅
- Only `officers.role = 'super_admin'` can insert/update occupancies
- Regular officers have read-only access
- Enforced at RLS + application layer
- Stage 4 expansion to other roles deferred

### DEC-23: Audit Trail via RPC Functions ✅
- `occupancy_history()` RPC function for historical queries
- Officers-only exposure (no UI in Stage 2)
- Append-only table ensures immutability
- Stage 4 Reports UI deferred

### DEC-24: Handle Reassignment Policy ✅
- Handles are property-derived and mutable per transfer
- New owner gets fresh handle at Stage 3 enrollment
- No code changes in Stage 2; policy only
- No retroactive handle reassignment

---

## 🚀 Phase-by-Phase Implementation Checklist

### Phase 1: Add `street` Column
- [ ] Add `street` column as nullable
- [ ] Backfill with 5 streets using valid house_no groupings from existing data
- [ ] Make `street` NOT NULL after backfill
- [ ] Drop old `UNIQUE (house_no)` constraint
- [ ] Add new `UNIQUE (house_no, street)` constraint
- [ ] Regenerate `unit_code` via generated column (automatic)
- [ ] Test: `SELECT house_no, street, unit_code FROM units LIMIT 10` → expect format "113 Sampaguita"

### Phase 2: Create `occupancies` Table
- [ ] Create table with all columns and constraints
- [ ] Add comments on columns (move_out_date, ended_by_officer)
- [ ] Test: `\d occupancies` returns correct schema

### Phase 3: Populate `occupancies` from `homeowners`
- [ ] Migrate using **corrected SQL** above (not `primary_unit_id`)
- [ ] Use `homeowners.unit_id` as occupancy source
- [ ] Use `homeowners.move_in_date` as occupancy start
- [ ] Validate: `SELECT COUNT(*) FROM occupancies` ≈ number of active homeowners with units
- [ ] Test multi-unit scenario if any homeowner will be linked to multiple units post-Stage-2

### Phase 4: Create Indexes
- [ ] `idx_occupancies_unit_current` (partial on `move_out_date IS NULL`)
- [ ] `idx_occupancies_homeowner_current` (partial on `move_out_date IS NULL`)
- [ ] `idx_occupancies_dates` (for date range queries)
- [ ] `idx_units_street` (for searching by street)

### Phase 5: Create PostgreSQL Functions
- [ ] `get_current_owner(unit_id)` — returns current homeowner + move_in_date
- [ ] `get_owned_units(homeowner_id)` — returns all current units owned by resident
- [ ] `occupancy_history(unit_id, from_date, to_date)` — audit trail with durations
- [ ] `record_occupancy_transfer(unit_id, new_homeowner_id, move_in_date, officer_id)` — atomic transfer with both occupancy records

### Phase 6: Enable RLS Policies
- [ ] Temporarily disable RLS during backfill (Phase 1)
- [ ] Re-enable RLS after Phase 5
- [ ] Create policies:
  - `residents_view_owned_units` (units table) — see only current owned units
  - `officers_view_all_units` (units table) — officers see all units
  - `officers_view_occupancies` (occupancies table) — officers see all occupancies
  - `super_admin_insert_occupancies` (occupancies table) — super-admin only
  - `super_admin_update_occupancies` (occupancies table) — super-admin only
  - `no_delete_occupancies` (occupancies table) — append-only enforcement

---

## 🧪 Testing & Validation

### Unit Tests (SQL)
1. **Street + House No Uniqueness:**
   ```sql
   INSERT INTO units (house_no, street) VALUES ('113', 'Sampaguita');  -- ✅ Success
   INSERT INTO units (house_no, street) VALUES ('113', 'Sampaguita');  -- ❌ Unique constraint
   INSERT INTO units (house_no, street) VALUES ('113', 'Sunflower');   -- ✅ Success (diff street)
   ```

2. **Occupancy Functions:**
   ```sql
   SELECT * FROM get_current_owner('unit-uuid');  -- ✅ Returns 1 row with homeowner
   SELECT * FROM get_owned_units('homeowner-uuid');  -- ✅ Returns all current units
   SELECT * FROM occupancy_history('unit-uuid', '2020-01-01'::DATE, NULL);  -- ✅ Full history
   ```

3. **RLS (as super-admin):**
   ```sql
   CALL record_occupancy_transfer('unit-uuid', 'new-homeowner-uuid', '2026-08-12'::DATE, 'officer-uuid');
   -- ✅ Old occupancy updated, new occupancy created
   ```

4. **RLS (as regular officer):**
   ```sql
   CALL record_occupancy_transfer(...);  -- ❌ Permission denied (super-admin only)
   ```

### Integration Tests (App Layer)
1. Officer web app: Unit details screen shows current homeowner from occupancies join
2. Officer web app: Super-admin can see "Record Transfer" button; regular officers see read-only view
3. Officer web app: RPC call to `occupancy_history()` returns historical data for audit
4. Mobile app: Resident logs in → sees only their current units (RLS working)

### Regression Tests
1. Existing officer workflows (dashboard, units, dues, payments, complaints) still work
2. Mobile app boots, authenticates, no console errors
3. Unit codes display correctly on receipts/bills (format: "113 Sampaguita" not "113")

---

## 🛑 Pre-Implementation Checklist

Before Claude Code runs any SQL:

- [ ] **Backup created:** Manual backup of Supabase project taken
- [ ] **Commit reference verified:** Current HEAD is `3c02da9` or later (Stage 2 docs commit)
- [ ] **Test data understood:** Current units table has ~6 test records (house_no 113, 115, 165, 167, 16A, 13B); these will be replaced
- [ ] **Street list confirmed:** Using 5 streets only (Sampaguita, Sunflower, Wonderland Avenue, Yellowbell, Orchids)
- [ ] **Phase 3 SQL correction noted:** Will use `homeowners.unit_id`, not `primary_unit_id`
- [ ] **Officers table exists:** Verify `officers` table with `role` column exists in schema
- [ ] **No concurrent migrations:** No other migrations running against Supabase

---

## 📚 Authority & References

| Document | Location | Use |
|----------|----------|-----|
| Architecture Decisions | Uploaded + repo `docs/` | DEC-21 through DEC-24 |
| Database Migration Plan | Uploaded + repo `docs/` | Phase structure (with Phase 3 correction) |
| Comprehensive Requirements | `docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md` | §2–4 (property/occupancy model) |
| Decision Log | `docs/DECISION_LOG.md` | DEC-18 (handles), DEC-20 (no self-reg), DEC-21 (streets exist) |
| Current Schema | Supabase table editor | Verified `homeowners.unit_id`, no `primary_unit_id` |

---

## 📝 Deliverables Expected After Implementation

1. ✅ Migration 004 SQL file (or 004_occupancy_model.sql)
   - Phases 1–6 in order
   - Annotated with phase labels
   - Includes backfill, function creation, RLS policies

2. ✅ Updated DECISION_LOG.md
   - DEC-21 through DEC-24 added (if not already present)

3. ✅ Test results
   - Unit tests passed (uniqueness, function calls, RLS)
   - Integration tests passed (officer web app, mobile app)
   - Regression tests passed (no existing workflows broken)

4. ✅ Migration script safe to run
   - Non-destructive (test data is OK to lose)
   - Rollback plan tested (backup restore works)
   - No data corruption or orphans

---

## 🎬 Ready to Start

**Provide to Claude Code:**
1. ✅ Both Stage 2 documents (Architecture Decisions + Migration Plan)
2. ✅ This corrected brief (Phase 3 SQL fix noted, no audit file reference)
3. ✅ Five street names (confirmed)
4. ✅ Confirmation: test data can be discarded

**Claude Code Settings:**
- Model: Claude Opus 4.5 or 5 (Extra High Effort)
- Mode: Plan Mode (write out entire migration plan first, then execute)
- Scope: Full end-to-end migration Phases 1–6

**Expected Duration:** 2–3 hours (plan + execution + testing)

---

**END OF BRIEF — Ready for Claude Code Implementation**