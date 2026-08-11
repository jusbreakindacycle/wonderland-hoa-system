-- =============================================================
-- WHOA — Stage 2: Property and Occupancy Model
--
-- Corrects the two schema defects recorded in
-- docs/WONDERLAND_COMPREHENSIVE_REQUIREMENTS.md §3.4 and §3.5:
--
--   §3.4  house_no is GLOBALLY UNIQUE, so `113 Sampaguita` and
--         `113 Sunflower` cannot both exist. This blocks the
--         addressing scheme §4.2 requires.
--   §3.5  Ownership has no time dimension. Unit 13B carried two
--         `homeowners` rows with nothing to say which was current
--         — the "13B duplicate-homeowner bug".
--
-- Authority: docs/WONDERLAND_STAGE_2_ARCHITECTURE_DECISIONS.md
-- (DEC-22…DEC-25 after renumbering) and
-- docs/WONDERLAND_STAGE_2_DATABASE_MIGRATION_PLAN.md, both as
-- amended by DEC-26 in docs/DECISION_LOG.md.
--
-- Naming follows the Supabase CLI <timestamp>_name.sql convention
-- established by 20260807050836. A `004_…` name was rejected: it
-- would sort BEFORE 20260807050836 and silently reorder history.
--
-- ── Corrections to the Stage 2 documents ────────────────────
--
-- The two Stage 2 planning documents were written against an
-- assumed schema. Seven of their assumptions are false against
-- the live database (project fgsehrblzpheeghplice, PG 17.6).
-- Each is corrected here rather than silently worked around, and
-- each is recorded in DEC-26.
--
-- C1. There is NO `officers` table. Roles live on profiles.role,
--     CHECK-constrained to ten values, none of them 'super_admin'.
--     Owner decision: build the table (STEP 1), keyed on
--     profiles.id so that DEC-23's `officers.id = auth.uid()`
--     works exactly as written.
--
-- C2. DEC-22's policy compares `occupancies.homeowner_id` to
--     `auth.uid()`. Those are different keys — homeowner_id
--     references homeowners.id, auth.uid() is a profiles.id — so
--     the policy would match no row, ever. Resident identity
--     resolves through homeowners.profile_id = auth.uid(), which
--     is what all six existing resident policies in
--     001_initial_schema.sql already do.
--
-- C3. homeowners has `full_name`, not first_name/last_name.
--
-- C4. A generated column's expression does NOT follow a newly
--     added column. unit_code is pinned to `(house_no)` by
--     003_house_no.sql:23-24 and stays there until altered.
--     PG 17 ALTER COLUMN … SET EXPRESSION is used (STEP 2).
--
-- C5. DEC-21 was ALREADY TAKEN by the Android application id
--     (2026-08-10). The four Stage 2 decisions are renumbered
--     DEC-22…DEC-25 and DEC-26 records the deltas below.
--
-- C6. The plan's "temporarily disable RLS during backfill" step is
--     omitted. This migration runs as `postgres`, which owns every
--     table here and therefore already bypasses RLS (no table
--     carries FORCE ROW LEVEL SECURITY). Disabling would buy
--     nothing and would leave `units` unprotected for the
--     duration.
--
-- C7. The plan's duration arithmetic,
--     EXTRACT(DAY FROM (date - date)), raises: date minus date is
--     an integer in Postgres, and EXTRACT rejects an integer.
--     Plain subtraction is used in STEP 5.
--
-- ── Guard convention is inherited, not re-decided ────────────
--
-- Every guard below uses `IS NOT TRUE`, per DEC-16 finding F4.
-- The two new helpers in STEP 1 are `SELECT EXISTS (...)` and so
-- return true/false and never NULL, but the form is kept uniform
-- so that no future edit reintroduces the fail-open.
-- =============================================================


-- ============================================================
-- STEP 0: PRUNE TEST UNITS (owner-directed, DESTRUCTIVE)
--
-- Owner decision, 12 August 2026: units 167, 16A and 13B are
-- discarded rather than assigned a street; 117 Wonderland Avenue
-- and 121 Orchids are created in STEP 2. The surviving set gives
-- each of the five confirmed streets exactly one unit.
--
-- This is IRREVERSIBLE without a backup restore. Cascading from
-- `units` removes, at the row counts verified 2026-08-12:
--     homeowners           3   (incl. the 13B Jan–May 2026 record)
--     dues                 5
--     payments             4
--     unit_credits         2
--     payment_allocations  3
--
-- credit_transactions must be deleted FIRST and explicitly.
-- credit_transactions_unit_id_fkey and
-- credit_transactions_reference_payment_id_fkey are both
-- NO ACTION, not CASCADE, so they would abort the unit delete.
-- complaints and visitors are also NO ACTION but hold zero rows.
-- ============================================================

DELETE FROM credit_transactions;
DELETE FROM units;


-- ============================================================
-- STEP 1: OFFICERS
--
-- DEC-23 restricts occupancy writes to a super-admin officer. No
-- officers table existed (C1); this creates it.
--
-- The primary key IS profiles.id, which IS auth.users.id. That is
-- deliberate: it makes `officers.id = auth.uid()` — the exact
-- predicate the architecture document writes — correct without
-- translation, and it makes an officer row impossible to create
-- for a person who has no profile.
--
-- Seeding derives from the role model that exists today: every
-- non-resident profile becomes an officer, and 'admin' — which
-- Requirements §3.3 describes as the permanent superuser — becomes
-- the super_admin. Against live data this yields exactly one row.
--
-- SCOPE LIMIT, recorded in DEC-26: `officers` is a SECOND
-- authorisation source alongside profiles.role. This migration
-- does NOT migrate the 42 existing policies onto it; they continue
-- to use has_any_role(). Reconciling the two models is later work,
-- and doing it here would rewrite the entire security surface in a
-- migration whose subject is the property model.
-- ============================================================

CREATE TABLE IF NOT EXISTS officers (
  id              uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('super_admin', 'officer')),
  position_label  text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE officers IS
  'Officer authorisation for the occupancy model (DEC-23). id = profiles.id = auth.users.id, so officers.id = auth.uid() is a direct comparison. Seeded from profiles.role; the 42 policies in 001_initial_schema.sql still use has_any_role() and are NOT governed by this table (DEC-26).';

COMMENT ON COLUMN officers.role IS
  'super_admin may record occupancy transfers (DEC-23). officer is read-only over occupancies. Expansion to finer roles is deferred to Stage 4.';

INSERT INTO officers (id, role, position_label, is_active)
SELECT p.id,
       CASE WHEN p.role = 'admin' THEN 'super_admin' ELSE 'officer' END,
       p.position_label,
       COALESCE(p.is_active, true)
  FROM profiles p
 WHERE p.role IS NOT NULL
   AND p.role <> 'resident'
    ON CONFLICT (id) DO NOTHING;

-- Helpers, mirroring has_any_role() at 001_initial_schema.sql:183-192.
-- SECURITY DEFINER so that reading `officers` from inside an
-- `officers` RLS policy does not recurse.
CREATE OR REPLACE FUNCTION is_officer()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM officers WHERE id = auth.uid() AND is_active
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM officers
     WHERE id = auth.uid() AND is_active AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

-- Privilege posture per DEC-16 STEP 1/3. anon IS revoked here,
-- unlike get_my_role/has_any_role: every policy created by this
-- migration carries an explicit `TO authenticated`, so no anon
-- session ever evaluates one of these helpers and the revocation
-- cannot turn an anonymous read into a hard permission error.
REVOKE EXECUTE ON FUNCTION public.is_officer()      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin()  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_officer()      TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_super_admin()  TO authenticated;

ALTER TABLE officers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "officers: officers read all"
  ON officers FOR SELECT
  TO authenticated
  USING (is_officer());

CREATE POLICY "officers: super_admin insert"
  ON officers FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "officers: super_admin update"
  ON officers FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());


-- ============================================================
-- STEP 2: units.street  (migration plan Phase 1)
--
-- Backfill values are the owner's mapping of 12 August 2026:
--     113 -> Sunflower
--     165 -> Sampaguita
--     115 -> Yellowbell
-- 167, 16A and 13B were removed in STEP 0; 117 and 121 are created
-- below. Every unit therefore has a street before SET NOT NULL.
--
-- The CHECK constraint makes the five-street list enforceable in
-- the database rather than only in the UI. Sources agree and are
-- unambiguous about the exclusion:
--     docs/phase-1/…POLICY_GOVERNANCE_CONTROLS_REGISTER_v1.0.md:35-40
--     docs/phase-2/…DOMAIN_AND_SERVICE_BLUEPRINT_v1.0.md:240-246
--       "`Circle` is excluded and must not be selectable as an
--        official property street."
--     docs/reconciliation/…RECONCILIATION_AND_STACK_REVIEW.md:76
-- Adding a sixth street later is a one-line migration, which is
-- the tracked audit trail this repository wants (cf. DEC-17).
-- ============================================================

ALTER TABLE units ADD COLUMN IF NOT EXISTS street text;

UPDATE units SET street = 'Sunflower'  WHERE house_no = '113';
UPDATE units SET street = 'Sampaguita' WHERE house_no = '165';
UPDATE units SET street = 'Yellowbell' WHERE house_no = '115';

ALTER TABLE units ALTER COLUMN street SET NOT NULL;

ALTER TABLE units
  ADD CONSTRAINT units_street_check
  CHECK (street IN (
    'Sampaguita',
    'Sunflower',
    'Wonderland Avenue',
    'Yellowbell',
    'Orchids'
  ));

-- Requirements §4.2 steps 2 and 3, verbatim.
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_house_no_key;
ALTER TABLE units
  ADD CONSTRAINT units_house_no_street_key UNIQUE (house_no, street);

-- C4. Not automatic. `unit_code` has been a generated alias of
-- house_no since 003_house_no.sql:23-24 and must be re-expressed.
-- SET EXPRESSION is PostgreSQL 17 (live server is 17.6); it
-- rewrites the table. It must run AFTER street is NOT NULL, or
-- every unit_code would concatenate to NULL.
--
-- If a future environment predates PG 17, replace this single
-- statement with the 003_house_no.sql pattern — DROP COLUMN
-- unit_code, then ADD COLUMN unit_code text GENERATED ALWAYS AS
-- (house_no || ' ' || street) STORED. That changes on-disk column
-- order and nothing else.
ALTER TABLE units
  ALTER COLUMN unit_code SET EXPRESSION AS (house_no || ' ' || street);

COMMENT ON COLUMN units.street IS
  'One of the five confirmed Wonderland streets. Circle is excluded by units_street_check.';

COMMENT ON COLUMN units.unit_code IS
  'Generated "<house_no> <street>", e.g. "113 Sunflower". The unit identifier printed on receipts, bills and audit records (Requirements §4.1).';

-- Owner decision, 12 August 2026. Vacant: no homeowner, and
-- therefore no occupancy row until a transfer is recorded.
-- NOTE: generate_monthly_dues bills vacant units too
-- (002_billing_engine.sql:322-334, carried over unchanged by
-- DEC-17). Whether that is correct is Requirements §5.1's open
-- question and is NOT resolved here.
INSERT INTO units (house_no, street, status) VALUES
  ('117', 'Wonderland Avenue', 'vacant'),
  ('121', 'Orchids',           'vacant')
    ON CONFLICT (house_no, street) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_units_street ON units(street);
-- Option B: delete the two baseline units created above, for a completely clean schema
DELETE FROM units WHERE house_no IN ('117', '121');

-- ============================================================
-- STEP 3: occupancies  (migration plan Phase 2 + Phase 4)
--
-- Time-bounded ownership. One row per occupancy period; append
-- only; move_out_date IS NULL means "currently owns".
--
-- Three deliberate departures from the migration plan, all in
-- DEC-26:
--
--  a. ended_by_officer references officers(id), which STEP 1 now
--     makes resolvable.
--
--  b. The date CHECK is `>=`, not `>`. A same-day handover is
--     legitimate and is exactly what record_occupancy_transfer
--     produces: it closes the outgoing row on the incoming
--     owner's move-in date. `>` would reject every same-day
--     transfer.
--
--  c. The partial unique index on (unit_id) WHERE move_out_date
--     IS NULL is ADDED. Without it this table can still represent
--     two simultaneous current owners of one unit — which is the
--     13B bug, merely relocated. With it, the bug is
--     unrepresentable. It forbids modelled co-ownership;
--     `homeowners` has no co-owner concept today and Requirements
--     §4.3 specifies "One unit account per unit, regardless of how
--     many adults live there", so nothing is lost that the system
--     can currently express.
--
-- The plan's idx_occupancies_unit_current is intentionally NOT
-- created: (c) already indexes exactly (unit_id) WHERE
-- move_out_date IS NULL, and a duplicate would cost writes for no
-- read benefit.
-- ============================================================

CREATE TABLE IF NOT EXISTS occupancies (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id      uuid        NOT NULL REFERENCES homeowners(id) ON DELETE RESTRICT,
  unit_id           uuid        NOT NULL REFERENCES units(id)      ON DELETE RESTRICT,
  move_in_date      date        NOT NULL,
  move_out_date     date,
  ended_by_officer  uuid        REFERENCES officers(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT occupancies_unit_homeowner_move_in_key
    UNIQUE (unit_id, homeowner_id, move_in_date),

  CONSTRAINT occupancies_dates_check
    CHECK (move_out_date IS NULL OR move_out_date >= move_in_date)
);

COMMENT ON TABLE occupancies IS
  'Time-bounded ownership. One row per occupancy period. Append-only: DELETE is denied by a RESTRICTIVE policy and no permissive DELETE policy exists. move_out_date IS NULL means the homeowner currently owns the unit. Audit trail via created_at and ended_by_officer.';

COMMENT ON COLUMN occupancies.move_out_date IS
  'Date the occupancy ended (ownership transferred). NULL = currently owns this unit.';

COMMENT ON COLUMN occupancies.ended_by_officer IS
  'The super_admin officer who recorded the end of this occupancy, as resolved from auth.uid() inside record_occupancy_transfer. Never supplied by the caller.';

-- (c) above: at most one open occupancy per unit.
CREATE UNIQUE INDEX IF NOT EXISTS idx_occupancies_one_current_owner_per_unit
  ON occupancies(unit_id)
  WHERE move_out_date IS NULL;

-- "which units does this resident currently hold" (DEC-22,
-- multi-property). Not unique: one person may hold many units.
CREATE INDEX IF NOT EXISTS idx_occupancies_homeowner_current
  ON occupancies(homeowner_id, move_out_date)
  WHERE move_out_date IS NULL;

-- Date-range scans for occupancy_history (DEC-24).
CREATE INDEX IF NOT EXISTS idx_occupancies_dates
  ON occupancies(move_in_date, move_out_date);


-- ============================================================
-- STEP 4: BACKFILL occupancies  (migration plan Phase 3)
--
-- The plan's Phase 3 filtered on `is_active = true`. That filter
-- is dropped (owner decision, 12 August 2026): a closed ownership
-- period is precisely what an append-only audit trail exists to
-- hold, and discarding it would leave occupancy_history() blind to
-- every tenure that ended before this migration ran.
--
-- Source column is homeowners.unit_id — the direct FK. There is no
-- primary_unit_id and no homeowner_units junction table; the
-- original plan text was wrong and the brief already corrected it.
--
-- After STEP 0 the live source is two active homeowners (113 and
-- 165), so this inserts two open rows and no closed ones. The
-- closed-row branch is still correct and is exercised by any
-- environment whose data was not pruned.
--
-- If this statement raises a unique violation on
-- idx_occupancies_one_current_owner_per_unit, the migration MUST
-- be allowed to fail: it means two homeowners are simultaneously
-- active on one unit, which is the 13B bug present in that data
-- set and must be resolved by hand before proceeding.
-- ============================================================

INSERT INTO occupancies (homeowner_id, unit_id, move_in_date, move_out_date, created_at)
SELECT h.id,
       h.unit_id,
       COALESCE(h.move_in_date, DATE '2020-01-01'),
       CASE
         WHEN h.is_active IS TRUE THEN NULL
         ELSE COALESCE(h.move_out_date, CURRENT_DATE)
       END,
       now()
  FROM homeowners h
 WHERE h.unit_id IS NOT NULL
    ON CONFLICT ON CONSTRAINT occupancies_unit_homeowner_move_in_key DO NOTHING;


-- ============================================================
-- STEP 5: FUNCTIONS  (migration plan Phase 5)
--
-- All four are SECURITY DEFINER with search_path pinned inline,
-- and all four carry their authorisation guard as the first
-- statement — the shape DEC-16 established and DEC-17 preserved.
-- Being SECURITY DEFINER they bypass RLS, so the guard IS the
-- access control; that is exactly the failure mode F5 recorded
-- against preview_payment_allocation.
-- ============================================================

-- ------------------------------------------------------------
-- 5a. get_current_owner — officers only.
--     Returns full_name (C3), not first_name/last_name.
--     At most one row, enforced by
--     idx_occupancies_one_current_owner_per_unit.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_owner(p_unit_id uuid)
RETURNS TABLE (
  homeowner_id    uuid,
  full_name       text,
  email           text,
  contact_number  text,
  move_in_date    date,
  occupancy_id    uuid
) AS $$
BEGIN
  IF is_officer() IS NOT TRUE THEN
    RAISE EXCEPTION 'Permission denied: only officers can read unit occupancy.';
  END IF;

  RETURN QUERY
  SELECT h.id, h.full_name, h.email, h.contact_number, o.move_in_date, o.id
    FROM occupancies o
    JOIN homeowners  h ON h.id = o.homeowner_id
   WHERE o.unit_id = p_unit_id
     AND o.move_out_date IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 5b. get_owned_units — DEC-22's multi-property query.
--
--     Callable by an officer for anyone, or by a resident for
--     THEIR OWN homeowner record only. Without the second clause
--     this function would hand any authenticated resident the
--     complete property holdings of any other resident, since
--     SECURITY DEFINER bypasses the RLS that would otherwise stop
--     them.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_owned_units(p_homeowner_id uuid)
RETURNS TABLE (
  unit_id       uuid,
  house_no      text,
  street        text,
  unit_code     text,
  move_in_date  date,
  occupancy_id  uuid
) AS $$
BEGIN
  IF is_officer() IS NOT TRUE
     AND NOT EXISTS (
       SELECT 1 FROM homeowners h
        WHERE h.id = p_homeowner_id
          AND h.profile_id = auth.uid()
     )
  THEN
    RAISE EXCEPTION 'Permission denied: you may only read your own owned units.';
  END IF;

  RETURN QUERY
  SELECT u.id, u.house_no, u.street, u.unit_code, o.move_in_date, o.id
    FROM occupancies o
    JOIN units       u ON u.id = o.unit_id
   WHERE o.homeowner_id = p_homeowner_id
     AND o.move_out_date IS NULL
   ORDER BY u.street, u.house_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 5c. occupancy_history — DEC-24. Officers only, no UI in Stage 2.
--
--     Duration is plain date subtraction (C7). The plan's
--     EXTRACT(DAY FROM (occ.move_out_date - occ.move_in_date))
--     raises: `date - date` is already an integer count of days
--     and EXTRACT rejects an integer argument.
--
--     The to_date filter keeps open occupancies visible: an
--     occupancy that has not ended has not ended before the window
--     closes either.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION occupancy_history(
  p_unit_id    uuid,
  p_from_date  date DEFAULT NULL,
  p_to_date    date DEFAULT NULL
)
RETURNS TABLE (
  occupancy_id             uuid,
  homeowner_id             uuid,
  homeowner_name           text,
  move_in_date             date,
  move_out_date            date,
  occupancy_duration_days  int,
  status                   text,
  ended_by_officer         uuid
) AS $$
BEGIN
  IF is_officer() IS NOT TRUE THEN
    RAISE EXCEPTION 'Permission denied: only officers can read occupancy history.';
  END IF;

  RETURN QUERY
  SELECT o.id,
         o.homeowner_id,
         h.full_name,
         o.move_in_date,
         o.move_out_date,
         (COALESCE(o.move_out_date, CURRENT_DATE) - o.move_in_date)::int,
         CASE WHEN o.move_out_date IS NULL THEN 'CURRENT' ELSE 'HISTORICAL' END,
         o.ended_by_officer
    FROM occupancies o
    JOIN homeowners  h ON h.id = o.homeowner_id
   WHERE o.unit_id = p_unit_id
     AND (p_from_date IS NULL OR o.move_in_date  >= p_from_date)
     AND (p_to_date   IS NULL OR o.move_out_date <= p_to_date OR o.move_out_date IS NULL)
   ORDER BY o.move_in_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 5d. record_occupancy_transfer — DEC-23. super_admin only.
--
--     Four departures from the plan's version, all in DEC-26:
--
--     1. NO officer_id PARAMETER. The plan passed the acting
--        officer in as an argument. In a SECURITY DEFINER function
--        that is spoofable — any permitted caller could attribute
--        the transfer to a colleague. The actor is taken from
--        auth.uid().
--
--     2. It no longer RAISES when the unit has no current
--        occupancy. Units 117 and 121 ship vacant (STEP 2); the
--        plan's version could never record their first owner.
--
--     3. It writes an audit_logs row. DEC-09 makes BUS-026 — every
--        material action carries a complete audit event — a
--        non-negotiable invariant, and an ownership transfer is
--        the most audit-critical write in the system. The plan's
--        version recorded nothing.
--
--     4. It returns jsonb, matching generate_monthly_dues, rather
--        than a one-row TABLE carrying a human-readable message.
--
--     The UPDATE precedes the INSERT so that
--     idx_occupancies_one_current_owner_per_unit is satisfied at
--     every point.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_occupancy_transfer(
  p_unit_id           uuid,
  p_new_homeowner_id  uuid,
  p_move_in_date      date DEFAULT CURRENT_DATE
)
RETURNS jsonb AS $$
DECLARE
  v_actor            uuid := auth.uid();
  v_old_occupancy_id uuid;
  v_old_homeowner_id uuid;
  v_new_occupancy_id uuid;
BEGIN
  IF is_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Permission denied: only a super_admin officer can record an occupancy transfer.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM units WHERE id = p_unit_id) THEN
    RAISE EXCEPTION 'Unit % not found.', p_unit_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM homeowners WHERE id = p_new_homeowner_id) THEN
    RAISE EXCEPTION 'Homeowner % not found.', p_new_homeowner_id;
  END IF;

  -- Lock the outgoing occupancy, if there is one. A vacant unit
  -- has none, and that is not an error (departure 2).
  SELECT id, homeowner_id
    INTO v_old_occupancy_id, v_old_homeowner_id
    FROM occupancies
   WHERE unit_id = p_unit_id
     AND move_out_date IS NULL
     FOR UPDATE;

  IF v_old_homeowner_id = p_new_homeowner_id THEN
    RAISE EXCEPTION 'Homeowner % already holds the current occupancy of unit %.',
      p_new_homeowner_id, p_unit_id;
  END IF;

  IF v_old_occupancy_id IS NOT NULL THEN
    UPDATE occupancies
       SET move_out_date    = p_move_in_date,
           ended_by_officer = v_actor
     WHERE id = v_old_occupancy_id;
  END IF;

  INSERT INTO occupancies (homeowner_id, unit_id, move_in_date)
  VALUES (p_new_homeowner_id, p_unit_id, p_move_in_date)
  RETURNING id INTO v_new_occupancy_id;

  UPDATE units SET status = 'occupied' WHERE id = p_unit_id;

  -- Departure 3: BUS-026 (DEC-09).
  INSERT INTO audit_logs (actor_id, action, table_name, record_id, old_value, new_value, remarks)
  VALUES (
    v_actor,
    'occupancy.transferred',
    'occupancies',
    v_new_occupancy_id,
    jsonb_build_object(
      'ended_occupancy_id', v_old_occupancy_id,
      'previous_homeowner_id', v_old_homeowner_id
    ),
    jsonb_build_object(
      'unit_id',      p_unit_id,
      'homeowner_id', p_new_homeowner_id,
      'move_in_date', p_move_in_date
    ),
    CASE WHEN v_old_occupancy_id IS NULL
      THEN 'Initial occupancy recorded — unit had no current occupancy.'
    END
  );

  RETURN jsonb_build_object(
    'unit_id',               p_unit_id,
    'ended_occupancy_id',    v_old_occupancy_id,
    'previous_homeowner_id', v_old_homeowner_id,
    'new_occupancy_id',      v_new_occupancy_id,
    'new_homeowner_id',      p_new_homeowner_id,
    'move_in_date',          p_move_in_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Privilege posture per DEC-16 STEP 1/3.
REVOKE EXECUTE ON FUNCTION public.get_current_owner(uuid)                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_owned_units(uuid)                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.occupancy_history(uuid, date, date)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_occupancy_transfer(uuid, uuid, date)   FROM PUBLIC, anon;

GRANT  EXECUTE ON FUNCTION public.get_current_owner(uuid)                       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_owned_units(uuid)                         TO authenticated;
GRANT  EXECUTE ON FUNCTION public.occupancy_history(uuid, date, date)           TO authenticated;
GRANT  EXECUTE ON FUNCTION public.record_occupancy_transfer(uuid, uuid, date)   TO authenticated;


-- ============================================================
-- STEP 6: homeowners -> occupancies SYNC TRIGGER
--         (transitional bridge compatibility)
--
-- src/hooks/useHomeowners.ts:16-21 is the officer web bridge's
-- de-facto ownership-transfer path: two unbatched, non-
-- transactional writes that deactivate the incumbent homeowner
-- and insert the replacement. DEC-20 forbids adding new product
-- functionality to that bridge, so it is not being rewritten in
-- Stage 2.
--
-- Without this trigger, the first homeowner an officer assigns
-- after this migration lands in `homeowners` and never reaches
-- `occupancies`. Unit visibility (STEP 7) is occupancy-backed, so
-- that resident would see nothing, and Stage 3 would inherit two
-- disagreeing records of who owns what.
--
-- TENSION, recorded openly in DEC-26: this trigger writes
-- `occupancies` OUTSIDE DEC-23's super_admin gate. It is
-- SECURITY DEFINER and therefore bypasses the STEP 7 policies. The
-- justification is that it does not create a new write path — it
-- mirrors a `homeowners` write that the existing
-- "homeowners: admin/secretary write" policy already authorises,
-- and that already changes ownership today. It is a TIME-BOXED
-- bridge measure and MUST be dropped when Stage 3 moves resident
-- enrolment onto record_occupancy_transfer.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_occupancy_from_homeowner()
RETURNS trigger AS $$
DECLARE
  v_move_in date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.unit_id IS NOT NULL AND NEW.is_active IS TRUE THEN
      v_move_in := COALESCE(NEW.move_in_date, CURRENT_DATE);

      -- Close whatever occupancy the unit currently has, so the
      -- partial unique index is never violated. GREATEST keeps
      -- occupancies_dates_check satisfied when the incoming
      -- move-in predates the incumbent's.
      UPDATE occupancies
         SET move_out_date = GREATEST(v_move_in, move_in_date)
       WHERE unit_id = NEW.unit_id
         AND move_out_date IS NULL;

      INSERT INTO occupancies (homeowner_id, unit_id, move_in_date)
      VALUES (NEW.id, NEW.unit_id, v_move_in)
          ON CONFLICT ON CONSTRAINT occupancies_unit_homeowner_move_in_key DO NOTHING;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active IS TRUE AND NEW.is_active IS NOT TRUE THEN
      UPDATE occupancies
         SET move_out_date = GREATEST(
               COALESCE(NEW.move_out_date, CURRENT_DATE),
               move_in_date
             )
       WHERE homeowner_id = NEW.id
         AND move_out_date IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.sync_occupancy_from_homeowner() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_homeowner_occupancy_sync ON homeowners;
CREATE TRIGGER on_homeowner_occupancy_sync
  AFTER INSERT OR UPDATE ON homeowners
  FOR EACH ROW EXECUTE FUNCTION sync_occupancy_from_homeowner();


-- ============================================================
-- STEP 7: RLS  (migration plan Phase 6, DEC-22 and DEC-23)
--
-- Every policy created here carries an explicit `TO authenticated`.
-- The 42 policies in 001_initial_schema.sql have no TO clause and
-- are therefore TO public, evaluated even in anon sessions — the
-- property DEC-16 had to work around when it kept anon's EXECUTE
-- on has_any_role. New policies do not repeat that.
--
-- APPEND-ONLY: there is no permissive DELETE policy on
-- occupancies, which alone already denies every DELETE. The
-- RESTRICTIVE policy below is redundant by construction and is
-- kept deliberately — it states the invariant in the schema so
-- that adding a permissive DELETE policy later cannot silently
-- re-enable deletion.
-- ============================================================

ALTER TABLE occupancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "occupancies: officers read all"
  ON occupancies FOR SELECT
  TO authenticated
  USING (is_officer());

-- C2. Resident identity resolves through homeowners.profile_id,
-- NOT through homeowner_id = auth.uid(). A resident sees every
-- occupancy row of their own — including closed ones, which are
-- their own tenure history, not someone else's.
CREATE POLICY "occupancies: resident read own"
  ON occupancies FOR SELECT
  TO authenticated
  USING (
    homeowner_id IN (
      SELECT h.id FROM homeowners h WHERE h.profile_id = auth.uid()
    )
  );

CREATE POLICY "occupancies: super_admin insert"
  ON occupancies FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "occupancies: super_admin update"
  ON occupancies FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "occupancies: no delete"
  ON occupancies AS RESTRICTIVE FOR DELETE
  TO authenticated
  USING (false);

-- ------------------------------------------------------------
-- units: REPLACE the resident policy, do not add alongside it.
--
-- Permissive policies are OR-ed. Creating the plan's
-- "residents_view_owned_units" next to the existing
-- "units: resident read own" would WIDEN resident access — a unit
-- would be visible through either the old homeowners path or the
-- new occupancies path. The intent is the opposite: occupancies
-- becomes the single source of truth for who currently holds a
-- unit. The policy name is kept so the naming scheme in
-- 001_initial_schema.sql stays intact.
--
-- The plan's "officers_view_all_units" is NOT created:
-- "units: finance/admin read" already grants SELECT to all nine
-- officer roles.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "units: resident read own" ON units;

CREATE POLICY "units: resident read own"
  ON units FOR SELECT
  USING (
    id IN (
      SELECT o.unit_id
        FROM occupancies o
        JOIN homeowners  h ON h.id = o.homeowner_id
       WHERE h.profile_id = auth.uid()
         AND o.move_out_date IS NULL
    )
  );


-- ============================================================
-- NOT HANDLED BY THIS MIGRATION — reported, not silently left
--
-- 1. The resident policies on dues, payments, payment_allocations,
--    unit_credits and credit_transactions still resolve through
--    homeowners.is_active, not through occupancies. Unit
--    visibility is now occupancy-backed while financial visibility
--    is not; the two agree today only because the STEP 6 trigger
--    keeps them in step. Migrating them is DEC-07's dated
--    property-relationship model (owner sees everything, tenant
--    sees only their own dates) and needs the relationship column
--    Requirements §4.3 specifies, which this table does not have.
--    Stage 3.
--
-- 2. `occupancies` carries no `relationship` column. Requirements
--    §4.3 asks for owner / tenant / family_member on a
--    unit_occupancies relation. The Stage 2 documents specify an
--    ownership-only model and that is what is built here. Adding
--    the column later is additive (nullable, defaulted 'owner').
--
-- 3. The STEP 6 trigger is transitional and MUST be dropped when
--    Stage 3 moves src/hooks/useHomeowners.ts onto
--    record_occupancy_transfer. Until then `homeowners` remains a
--    writable second source of ownership truth.
--
-- 4. `officers` does not govern the 42 policies from
--    001_initial_schema.sql; those still use profiles.role via
--    has_any_role(). Two authorisation models now coexist.
--    Reconciling them is its own task.
--
-- 5. STEP 0 is irreversible. The rollback path for this migration
--    is a Supabase backup restore, not the manual DDL reversal
--    sketched in the migration plan §6.
--
-- 6. src/pages/dues/DuesPage.tsx:114 reads
--    units.homeowners[0].full_name with no is_active filter and
--    can therefore print a former owner's name. Pre-existing, not
--    introduced here, and not fixed here — it is one of the eight
--    call sites that should move onto get_current_owner in
--    Stage 3.
--
-- 7. auth_leaked_password_protection is still DISABLED, and
--    supabase/functions/generate-monthly-dues/index.ts is still an
--    unauthenticated internet-reachable endpoint. Both carried
--    over unchanged from DEC-16 and DEC-17.
-- ============================================================
