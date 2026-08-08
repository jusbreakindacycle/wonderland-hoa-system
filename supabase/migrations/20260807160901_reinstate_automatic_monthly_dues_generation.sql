-- =============================================================
-- WHOA — Reinstate automatic monthly dues generation
--
-- Written 2026-08-08 (filename timestamp is 2026-08-07 16:09:01
-- UTC, the Supabase CLI convention; the association is UTC+8).
--
-- Forward-only. Supersedes the cron removal recorded in DEC-16.
-- Recorded as DEC-17 in docs/DECISION_LOG.md.
--
-- Nothing earlier is renamed, renumbered, or edited. Migrations
-- 001, 002, 003 and 20260807050836 are untouched.
--
-- ── Why this migration exists ───────────────────────────────
--
-- Stage 0 (DEC-16) discovered an ACTIVE pg_cron job on the hosted
-- database — 'generate-monthly-dues', '0 0 1 * *', last run
-- 2026-08-01 00:00:00 UTC, succeeded — that existed in NO
-- migration file. The repository's only trace of it was a fully
-- commented-out block at 002_billing_engine.sql:442-463, which did
-- not reflect production. Someone had scheduled it by hand in the
-- SQL Editor. Because the Stage 0 guards reject JWT-less callers,
-- the owner unscheduled the job before applying that migration,
-- which left the association with NO automatic dues generation at
-- all — only the manual control in
-- src/pages/dashboard/DashboardPage.tsx.
--
-- The owner has since approved reversing requirements §5.1 from
-- "officer-triggered only" to "automatic, with mandatory officer
-- notification". This migration restores the schedule INSIDE
-- tracked migration history (STEP 2) so repo and hosted state
-- cannot silently diverge again, and adds the one guard path a
-- postgres-identity cron run needs (STEP 1).
--
-- ── Scope ───────────────────────────────────────────────────
--
-- generate_monthly_dues is the ONLY function replaced here.
-- process_payment, void_or_waive_due, approve_credit_refund and
-- preview_payment_allocation are deliberately NOT touched: the
-- identity carve-out below applies to generate_monthly_dues alone,
-- and none of those four should ever accept an unauthenticated
-- caller. No table, column, constraint, index or RLS policy is
-- altered. The dues amount, the due-date rule and all allocation
-- logic are unchanged.
--
-- No REVOKE or GRANT appears below. Privileges survive
-- CREATE OR REPLACE FUNCTION, and Stage 0 already left this
-- function granted to exactly authenticated, postgres and
-- service_role — verified against the live database immediately
-- before this migration was written:
--     proacl = {postgres=X/postgres,authenticated=X/postgres,
--               service_role=X/postgres}
-- =============================================================


-- ============================================================
-- STEP 1: generate_monthly_dues — identity carve-out
--
-- The complete body from
-- 20260807050836_stage0_containment_secure_definer_functions.sql
-- :334-418 is reproduced below. Exactly three things change, each
-- marked (a), (b), (c) inline. Same SECURITY DEFINER, same inline
-- SET search_path, same amount lookup, same due-date rule, same
-- ON CONFLICT idempotency, same return shape.
--
-- ── (a) THE GUARD: session_user, NOT current_user ────────────
--
-- The task prompt specified `current_user <> 'postgres'`. That is
-- a FAIL-OPEN and is not used here. Reason, verified against the
-- live database before writing this file:
--
--     SELECT pg_get_userbyid(proowner), prosecdef
--       FROM pg_proc WHERE proname = 'generate_monthly_dues';
--     -> postgres | true
--
-- Inside a SECURITY DEFINER body, `current_user` IS the function
-- owner. This function is owned by postgres, so
-- `current_user <> 'postgres'` evaluates to FALSE on every single
-- call, the AND short-circuits, and the RAISE becomes
-- unreachable — every `authenticated` caller could generate dues.
-- That would silently undo the Stage 0 guard this migration is
-- supposed to extend, not weaken.
--
-- `session_user` is immune to BOTH `SET ROLE` and SECURITY
-- DEFINER — it always reports the role that opened the
-- connection. Two facts, both queried live, make it exact here:
--
--   1. pg_cron connects as the job's own user. The historical run
--      is still in cron.job_run_details:
--          username   = postgres
--          command    = ' SELECT generate_monthly_dues(); '
--          status     = succeeded
--          start_time = 2026-08-01 00:00:00 UTC
--      -> a cron run presents session_user = 'postgres'.
--
--   2. anon, authenticated and service_role are all
--      rolcanlogin = false. Only `authenticator` can log in
--      (rolcanlogin = true, rolinherit = false). PostgREST logs in
--      as authenticator and SET ROLEs to one of the three, which
--      changes current_user but NEVER session_user.
--      -> every REST call presents session_user = 'authenticator',
--         and no REST caller can ever present as postgres.
--
-- ── (b) THE CREDIT LOOP ──────────────────────────────────────
--
-- See the comment at the loop itself. This function calls
-- process_payment, whose strict Stage 0 guard is deliberately left
-- in place, so the nested call cannot succeed on a scheduled run.
--
-- ── (c) THE AUDIT ACTOR ──────────────────────────────────────
--
-- See the comment at the INSERT. audit_logs.actor_id is
-- `uuid REFERENCES profiles` (001_initial_schema.sql:159), so a
-- sentinel UUID is not available without inventing a fake profile
-- row — a data change far outside this task. The existing
-- `remarks text` column and the new_value jsonb carry the
-- distinction instead. No new column is added.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_monthly_dues(
  p_billing_month text DEFAULT to_char(now(), 'YYYY-MM')
)
RETURNS jsonb AS $$
DECLARE
  v_amount       numeric;
  v_due_date     date;
  v_unit         record;
  v_inserted     int := 0;
  v_skipped      int := 0;
  v_credit_applied int := 0;
  v_credit_unit  record;
  -- (a) A scheduled run is a postgres-identity session with no JWT.
  -- Evaluated once, before the guard, so every branch below agrees.
  v_scheduled    boolean := (session_user = 'postgres' AND auth.uid() IS NULL);
BEGIN
  -- (a) STAGE 0 GUARD, plus exactly one added path: the Postgres
  -- role `postgres`, which is how the pg_cron job in STEP 2 runs.
  -- `IS NOT TRUE` is retained unchanged from Stage 0 because
  -- has_any_role() returns NULL — not false — for a caller with no
  -- resolvable role. See the header for why this is session_user
  -- and not current_user.
  IF session_user <> 'postgres' AND (
    auth.uid() IS NULL
    OR has_any_role(ARRAY['admin', 'president', 'vice_president', 'treasurer']) IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'Permission denied: only admin, president, vice president, or treasurer can generate monthly dues.';
  END IF;

  -- Read monthly dues amount from config
  SELECT value::numeric INTO v_amount
  FROM system_config
  WHERE key = 'monthly_dues_amount';

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'system_config missing key: monthly_dues_amount';
  END IF;

  -- due_date = 5th of the following month
  v_due_date := (to_date(p_billing_month, 'YYYY-MM') + interval '1 month')::date;
  v_due_date := make_date(extract(year FROM v_due_date)::int, extract(month FROM v_due_date)::int, 5);

  -- Insert one due per unit (occupied AND vacant)
  FOR v_unit IN
    SELECT id FROM units
  LOOP
    INSERT INTO dues (unit_id, billing_month, amount, due_date, status, amount_paid)
    VALUES (v_unit.id, p_billing_month, v_amount, v_due_date, 'unpaid', 0)
    ON CONFLICT (unit_id, billing_month) DO NOTHING;

    IF FOUND THEN
      v_inserted := v_inserted + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  -- (b) Auto-apply existing unit credits via FIFO — unchanged for an
  -- officer-triggered run, SKIPPED on a scheduled run.
  --
  -- process_payment carries the strict Stage 0 guard and is
  -- deliberately not modified by this migration. On a scheduled run
  -- auth.uid() is NULL, so get_my_role() is NULL, so has_any_role()
  -- is NULL, so `IS NOT TRUE` fires and process_payment RAISEs.
  -- That exception would propagate out of this function and roll the
  -- whole transaction back — generating NO dues at all for the month,
  -- which is a far worse outcome than deferring a credit.
  --
  -- Deferral is self-healing: process_payment reads and applies any
  -- unit credit at the start of EVERY payment, so a deferred credit
  -- is applied at that unit's next payment or at the next
  -- officer-triggered generation, whichever comes first. No credit is
  -- lost, no allocation logic is changed, and the officer sees
  -- 'credits_deferred': true on the audit row and the dashboard.
  IF NOT v_scheduled THEN
    FOR v_credit_unit IN
      SELECT unit_id, balance
      FROM unit_credits
      WHERE balance > 0
    LOOP
      PERFORM process_payment(
        p_unit_id     := v_credit_unit.unit_id,
        p_amount      := 0,
        p_method      := 'credit',
        p_reference   := NULL,
        p_received_by := NULL,
        p_notes       := 'Auto-applied credit on dues generation for ' || p_billing_month
      );
      v_credit_applied := v_credit_applied + 1;
    END LOOP;
  END IF;

  -- (c) Audit log for the generation run.
  -- actor_id was hardcoded NULL for every run. It now carries
  -- auth.uid(): NULL on a scheduled run, the acting officer's id on a
  -- manual one. That is what makes the two distinguishable, and it
  -- also closes the defect requirements §5.1 item 4 records against
  -- 002_billing_engine.sql:357.
  INSERT INTO audit_logs (actor_id, action, table_name, new_value, remarks)
  VALUES (
    auth.uid(),
    'dues.generated',
    'dues',
    jsonb_build_object(
      'billing_month',    p_billing_month,
      'dues_inserted',    v_inserted,
      'dues_skipped',     v_skipped,
      'credits_applied',  v_credit_applied,
      'triggered_by',     CASE WHEN v_scheduled THEN 'scheduled' ELSE 'officer' END,
      'credits_deferred', v_scheduled
    ),
    CASE WHEN v_scheduled
      THEN 'Scheduled run - pg_cron job generate-monthly-dues. Credit auto-apply deferred to the next payment or officer-triggered run.'
      ELSE NULL
    END
  );

  RETURN jsonb_build_object(
    'billing_month',    p_billing_month,
    'dues_inserted',    v_inserted,
    'dues_skipped',     v_skipped,
    'credits_applied',  v_credit_applied,
    'triggered_by',     CASE WHEN v_scheduled THEN 'scheduled' ELSE 'officer' END,
    'credits_deferred', v_scheduled
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ============================================================
-- STEP 2: THE TRACKED SCHEDULE
--
-- Written 2026-08-08. This supersedes the removal recorded in
-- DEC-16. It is the same job name and the same schedule that was
-- unscheduled during Stage 0 — there was never anything wrong with
-- either; what was wrong was WHERE the schedule lived.
--
-- Stage 0's root cause was a schedule that existed on the hosted
-- database and in no migration file. That cannot recur while this
-- block lives here: `supabase db push` is now the only thing that
-- creates it, and `git log` is now its history.
--
-- Every line below is live SQL. There are deliberately no
-- commented-out alternatives — the Stage 0 postmortem found that a
-- file full of inactive-looking SQL was part of what made the
-- divergence invisible.
--
-- pg_cron was already installed on this project (extension schema
-- pg_catalog, cron.* objects present), so CREATE EXTENSION IF NOT
-- EXISTS is a no-op here and is kept only so the migration is
-- self-contained on a fresh database.
--
-- cron.schedule(job_name, schedule, command) upserts by job name,
-- so re-running this migration re-points the same job rather than
-- creating a duplicate.
--
-- To verify after `supabase db push` (expect exactly one row,
-- username `postgres`, active true):
--     SELECT jobname, schedule, username, active
--       FROM cron.job
--      WHERE command ILIKE '%generate_monthly_dues%';
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'generate-monthly-dues',
  '0 0 1 * *',
  $$ SELECT generate_monthly_dues(); $$
);


-- ============================================================
-- NOT HANDLED BY THIS MIGRATION — reported, not silently left
--
-- 1. supabase/functions/generate-monthly-dues/index.ts still
--    accepts unauthenticated POST from any origin and calls
--    generate_monthly_dues with the service-role key. It remains
--    correctly REJECTED after this migration: it reaches the
--    database through PostgREST, so its session_user is
--    `authenticator`, never `postgres`, and it carries no officer
--    JWT. The carve-out above does not reopen it. Deleting or
--    gating that function is still its own task (requirements
--    §3.7).
--
-- 2. auth_leaked_password_protection is still DISABLED. It is a
--    dashboard/API auth setting, not SQL.
--
-- 3. The credit deferral in STEP 1(b) exists only because
--    process_payment may not be modified by this task. If a later
--    task gives process_payment its own reviewed carve-out, the
--    `IF NOT v_scheduled` wrapper should be removed and the loop
--    restored to unconditional.
-- ============================================================
