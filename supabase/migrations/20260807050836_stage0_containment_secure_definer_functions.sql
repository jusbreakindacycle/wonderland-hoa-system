-- =============================================================
-- WHOA — Stage 0: Containment
--
-- Closes the confirmed exposure on the eight SECURITY DEFINER
-- functions in schema `public`. Security remediation only:
-- no table, column, constraint, index, or RLS policy is altered,
-- no row is deleted, and no financial logic is changed.
--
-- Naming: this file uses the Supabase CLI's <timestamp>_name.sql
-- convention. The three legacy migrations (001, 002, 003) keep
-- their NNN_name.sql names and are registered as already-applied
-- via `supabase migration repair --status applied 001 002 003`.
-- They are not renamed, edited, or re-run. '001' sorts before
-- '2026…' so ordering is preserved.
--
-- ── Findings this migration acts on ─────────────────────────
--
-- F1. All eight functions were executable by PUBLIC and by anon.
--     Observed before this migration:
--       proacl = =X/postgres | postgres=X/postgres | anon=X/postgres
--                | authenticated=X/postgres | service_role=X/postgres
--     `=X/postgres` is the implicit PUBLIC grant.
--
-- F2. Seven of eight had a mutable search_path (proconfig NULL).
--     handle_new_user had `search_path=public` but not pg_temp.
--
-- F3. process_payment and generate_monthly_dues had NO
--     authorisation check at all.
--
-- F4. The guards that DO exist — void_or_waive_due:148 and
--     approve_credit_refund:254 — FAIL OPEN. Verified against the
--     live database in a JWT-less session:
--         auth.uid()                               -> NULL
--         get_my_role()                            -> NULL
--         has_any_role(ARRAY['admin',...])         -> NULL  (not false)
--         NOT has_any_role(ARRAY['admin',...])     -> NULL
--     `IF NOT <NULL> THEN RAISE` never fires, so a caller with no
--     resolvable role passed the guard. Every guard below therefore
--     uses `IS NOT TRUE`, which is false-safe AND null-safe.
--
-- F5. preview_payment_allocation leaks financial data. It is
--     SECURITY DEFINER (RLS bypassed), takes an arbitrary
--     p_unit_id, and had no authorisation check — any caller could
--     read any unit's outstanding dues and credit balance.
--
-- ── Role lists are restatements, not new decisions ──────────
--
-- The role sets below already exist in this repository, in two
-- independent places, and are copied unchanged:
--
--   ['admin','president','vice_president','treasurer']
--       = 001_initial_schema.sql "payments: finance insert"
--       = 001_initial_schema.sql "dues: system insert"
--       = src/lib/auth.ts canRecordPayments()
--
--   ['admin','president','vice_president']
--       = 002_billing_engine.sql:148 and :254 (unchanged)
--       = src/lib/auth.ts canVoidOrWaive()
--
-- ── Precondition (must hold before this migration is applied) ─
--
-- An ACTIVE pg_cron job ran generate_monthly_dues() as `postgres`
-- with no JWT:
--     jobid 1 | 'generate-monthly-dues' | '0 0 1 * *' | active
--     last run 2026-08-01 00:00:00 UTC — succeeded
-- A JWT-less caller cannot satisfy the guards below, so that job
-- must be unscheduled by the owner BEFORE this migration is
-- applied, or the 1st-of-month billing run will start failing.
-- Verify immediately before applying:
--     SELECT count(*) FROM cron.job
--      WHERE command ILIKE '%generate_monthly_dues%';   -- expect 0
-- Dues generation then runs from the officer-triggered control in
-- src/pages/dashboard/DashboardPage.tsx.
-- =============================================================


-- ============================================================
-- STEP 1: REVOKE EXECUTE
--
-- PUBLIC is revoked on all eight — no function here should be
-- callable by virtue of the implicit default grant.
--
-- anon is revoked on six. get_my_role and has_any_role are the
-- deliberate, documented exception: every RLS policy in
-- 001_initial_schema.sql was created WITHOUT a `TO` clause, so all
-- 30 of them are `TO public` and their USING/WITH CHECK
-- expressions are evaluated in anon sessions too. Revoking anon's
-- EXECUTE on has_any_role would turn an anonymous read of
-- profiles/units/dues from "returns zero rows" into
-- "ERROR: permission denied for function has_any_role".
-- Neither helper leaks anything to anon: with auth.uid() NULL,
-- get_my_role() returns NULL and has_any_role() returns NULL.
-- This is recorded as DEC-16 in docs/DECISION_LOG.md and leaves
-- 2 of 8 `anon_security_definer_function_executable` advisor
-- findings knowingly open.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_my_role()                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_any_role(text[])           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_payment(uuid, numeric, text, text, uuid, text)
                                                                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_monthly_dues(text)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.void_or_waive_due(uuid, text, text, uuid)
                                                                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_credit_refund(uuid, uuid, text)
                                                                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.preview_payment_allocation(uuid, numeric)
                                                                 FROM PUBLIC, anon;


-- ============================================================
-- STEP 2: PIN search_path
--
-- Closes `function_search_path_mutable`. A SECURITY DEFINER
-- function with a mutable search_path can be redirected to
-- attacker-controlled objects by a caller who sets their own
-- search_path. pg_temp is pinned LAST so a temporary table can
-- never shadow a real one.
--
-- The five functions replaced in STEP 4 also carry this same SET
-- clause inline in their definition. That is deliberate and not
-- redundant: CREATE OR REPLACE FUNCTION replaces the function's
-- configuration wholesale, so a SET applied here would be
-- discarded by the replacement if it were not also inline.
-- (Privileges, by contrast, survive CREATE OR REPLACE, which is
-- why STEP 1 and STEP 3 can safely run before STEP 4.)
-- ============================================================

ALTER FUNCTION public.get_my_role()                  SET search_path = public, pg_temp;
ALTER FUNCTION public.has_any_role(text[])           SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user()              SET search_path = public, pg_temp;
ALTER FUNCTION public.process_payment(uuid, numeric, text, text, uuid, text)
                                                     SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_monthly_dues(text)    SET search_path = public, pg_temp;
ALTER FUNCTION public.void_or_waive_due(uuid, text, text, uuid)
                                                     SET search_path = public, pg_temp;
ALTER FUNCTION public.approve_credit_refund(uuid, uuid, text)
                                                     SET search_path = public, pg_temp;
ALTER FUNCTION public.preview_payment_allocation(uuid, numeric)
                                                     SET search_path = public, pg_temp;


-- ============================================================
-- STEP 3: GRANT EXECUTE TO authenticated
--
-- has_any_role is NOT optional: 30 RLS policies in
-- 001_initial_schema.sql call it directly, and a policy expression
-- is evaluated with the privileges of the session role. Without
-- this grant every policy in the database fails closed and the
-- application stops working entirely.
--
-- get_my_role is granted for symmetry and because it is published
-- in src/lib/database.types.ts. Strictly it is not required: its
-- only caller is has_any_role, which is SECURITY DEFINER owned by
-- postgres, so that nested call is privilege-checked as postgres,
-- not as the session role.
--
-- The five RPCs are granted because officers call them from the
-- client. Each one is now guarded internally (STEP 4), so the
-- grant conveys reachability, not authority.
--
-- handle_new_user is deliberately granted to NOBODY. It is a
-- trigger function on auth.users with no API surface. Trigger
-- execution does not re-check EXECUTE, and the function is owned
-- by postgres, so on_auth_user_created keeps working untouched.
-- ============================================================

GRANT EXECUTE ON FUNCTION public.get_my_role()                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(text[])            TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_payment(uuid, numeric, text, text, uuid, text)
                                                                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_monthly_dues(text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_or_waive_due(uuid, text, text, uuid)
                                                                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_credit_refund(uuid, uuid, text)
                                                                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_payment_allocation(uuid, numeric)
                                                                 TO authenticated;


-- ============================================================
-- STEP 4: AUTHORISATION GUARDS
--
-- Each function below is reproduced with its COMPLETE original
-- body from 002_billing_engine.sql. The only differences are:
--   (a) the guard block, and
--   (b) the inline SET search_path (see STEP 2's note).
-- No financial logic, ordering, rounding, or audit behaviour is
-- altered. All five remain SECURITY DEFINER because each writes
-- tables the calling officer cannot write directly under RLS —
-- removing DEFINER would break them.
-- ============================================================


-- ------------------------------------------------------------
-- 4a. process_payment — was 002_billing_engine.sql:14-124
-- Guard ADDED (there was none). Role set restates the
-- "payments: finance insert" policy in 001_initial_schema.sql.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION process_payment(
  p_unit_id     uuid,
  p_amount      numeric,
  p_method      text,
  p_reference   text      DEFAULT NULL,
  p_received_by uuid      DEFAULT NULL,
  p_notes       text      DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_payment_id     uuid;
  v_credit_balance numeric := 0;
  v_credit_used    numeric := 0;
  v_total          numeric;
  v_remaining      numeric;
  v_due            record;
  v_allocated      numeric;
BEGIN
  -- STAGE 0 GUARD: `IS NOT TRUE` rejects both false and NULL.
  -- A caller with no resolvable role (anon, service_role, or any
  -- JWT-less session) yields NULL here and is now rejected.
  IF has_any_role(ARRAY['admin', 'president', 'vice_president', 'treasurer']) IS NOT TRUE THEN
    RAISE EXCEPTION 'Permission denied: only admin, president, vice president, or treasurer can record payments.';
  END IF;

  -- STEP 1: Read existing unit credit balance
  SELECT COALESCE(balance, 0)
  INTO v_credit_balance
  FROM unit_credits
  WHERE unit_id = p_unit_id;

  IF v_credit_balance > 0 THEN
    v_credit_used := v_credit_balance;
    -- Record that credit will be applied
    INSERT INTO credit_transactions (unit_id, type, amount, notes, created_by)
    VALUES (p_unit_id, 'credit_applied', v_credit_balance, 'Credit applied to incoming payment', p_received_by);
  END IF;

  -- Total available to allocate = cash payment + credit
  v_total     := p_amount + v_credit_used;
  v_remaining := v_total;

  -- STEP 3: Create payment record
  INSERT INTO payments (unit_id, amount, payment_method, reference_number, payment_date, received_by, credit_used, notes)
  VALUES (p_unit_id, p_amount, p_method, p_reference, CURRENT_DATE, p_received_by, v_credit_used, p_notes)
  RETURNING id INTO v_payment_id;

  -- STEP 2 + 4: Fetch unpaid/partial dues FIFO and allocate
  FOR v_due IN
    SELECT id, balance
    FROM dues
    WHERE unit_id = p_unit_id
      AND status IN ('unpaid', 'partial')
    ORDER BY due_date ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    IF v_remaining >= v_due.balance THEN
      -- Full settlement of this due
      v_allocated := v_due.balance;
      UPDATE dues
      SET status = 'paid', amount_paid = amount
      WHERE id = v_due.id;
    ELSE
      -- Partial settlement
      v_allocated := v_remaining;
      UPDATE dues
      SET status = 'partial', amount_paid = amount_paid + v_allocated
      WHERE id = v_due.id;
    END IF;

    INSERT INTO payment_allocations (payment_id, due_id, amount_allocated)
    VALUES (v_payment_id, v_due.id, v_allocated);

    v_remaining := v_remaining - v_allocated;
  END LOOP;

  -- STEP 6: Zero out consumed credit BEFORE storing new credit
  IF v_credit_used > 0 THEN
    UPDATE unit_credits
    SET balance = 0, updated_at = now()
    WHERE unit_id = p_unit_id;
  END IF;

  -- STEP 5: Store overpayment as new credit
  IF v_remaining > 0 THEN
    INSERT INTO unit_credits (unit_id, balance, updated_at)
    VALUES (p_unit_id, v_remaining, now())
    ON CONFLICT (unit_id)
    DO UPDATE SET balance = v_remaining, updated_at = now();

    INSERT INTO credit_transactions (unit_id, type, amount, reference_payment_id, notes, created_by)
    VALUES (p_unit_id, 'credit_added', v_remaining, v_payment_id, 'Overpayment stored as credit', p_received_by);
  END IF;

  -- STEP 7: Audit log
  INSERT INTO audit_logs (actor_id, action, table_name, record_id, new_value)
  VALUES (
    p_received_by,
    'payment.created',
    'payments',
    v_payment_id,
    jsonb_build_object(
      'unit_id',     p_unit_id,
      'amount',      p_amount,
      'method',      p_method,
      'credit_used', v_credit_used,
      'overpayment', v_remaining
    )
  );

  RETURN v_payment_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ------------------------------------------------------------
-- 4b. generate_monthly_dues — was 002_billing_engine.sql:296-375
-- Guard ADDED (there was none). Role set restates the
-- "dues: system insert" policy in 001_initial_schema.sql.
--
-- NOTE: this function calls process_payment internally to
-- auto-apply unit credits. auth.uid() is unchanged across that
-- nested call, so an authorised officer passes both guards.
-- A JWT-less caller now fails at the first guard — which is why
-- the pg_cron job must be unscheduled first (see header).
-- ------------------------------------------------------------

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
BEGIN
  -- STAGE 0 GUARD: see 4a for why `IS NOT TRUE` rather than `NOT`.
  IF has_any_role(ARRAY['admin', 'president', 'vice_president', 'treasurer']) IS NOT TRUE THEN
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

  -- Auto-apply existing unit credits via FIFO
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

  -- Audit log for the generation run
  INSERT INTO audit_logs (actor_id, action, table_name, new_value)
  VALUES (
    NULL,
    'dues.generated',
    'dues',
    jsonb_build_object(
      'billing_month',   p_billing_month,
      'dues_inserted',   v_inserted,
      'dues_skipped',    v_skipped,
      'credits_applied', v_credit_applied
    )
  );

  RETURN jsonb_build_object(
    'billing_month',   p_billing_month,
    'dues_inserted',   v_inserted,
    'dues_skipped',    v_skipped,
    'credits_applied', v_credit_applied
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ------------------------------------------------------------
-- 4c. void_or_waive_due — was 002_billing_engine.sql:134-236
-- Guard REPAIRED, not added. The role list is UNCHANGED. The only
-- change is `IF NOT has_any_role(...)` -> `IF has_any_role(...) IS
-- NOT TRUE`, which closes the fail-open described in F4.
--
-- This goes beyond the two functions named in the Stage 0 brief.
-- Rationale: leaving a known-ineffective authorisation guard on a
-- financial function inside a security remediation would be a
-- worse outcome, and revoking anon alone does not close it — a
-- signed-in user with no matching profiles row also yields NULL.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION void_or_waive_due(
  p_due_id   uuid,
  p_action   text,  -- 'void' or 'waive'
  p_reason   text,
  p_actor_id uuid
)
RETURNS void AS $$
DECLARE
  v_due        record;
  v_old_status text;
  v_alloc      record;
  v_total_reversed numeric := 0;
BEGIN
  -- Permission check (STAGE 0: null-safe; role list unchanged)
  IF has_any_role(ARRAY['admin', 'president', 'vice_president']) IS NOT TRUE THEN
    RAISE EXCEPTION 'Permission denied: only admin, president, or vice president can void/waive dues.';
  END IF;

  -- Validate action
  IF p_action NOT IN ('void', 'waive') THEN
    RAISE EXCEPTION 'Invalid action: must be ''void'' or ''waive''.';
  END IF;

  -- Reason is mandatory
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required for void/waive actions.';
  END IF;

  -- Fetch the due
  SELECT * INTO v_due FROM dues WHERE id = p_due_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Due record not found.';
  END IF;

  IF v_due.status IN ('void', 'waived') THEN
    RAISE EXCEPTION 'Due is already % — cannot action again.', v_due.status;
  END IF;

  v_old_status := v_due.status;

  IF p_action = 'void' THEN
    -- Reverse all allocations back to unit credit
    FOR v_alloc IN
      SELECT pa.id, pa.amount_allocated, pa.payment_id
      FROM payment_allocations pa
      WHERE pa.due_id = p_due_id
    LOOP
      v_total_reversed := v_total_reversed + v_alloc.amount_allocated;
    END LOOP;

    IF v_total_reversed > 0 THEN
      -- Add reversed amount to unit credit
      INSERT INTO unit_credits (unit_id, balance, updated_at)
      VALUES (v_due.unit_id, v_total_reversed, now())
      ON CONFLICT (unit_id)
      DO UPDATE SET balance = unit_credits.balance + v_total_reversed, updated_at = now();

      INSERT INTO credit_transactions (unit_id, type, amount, notes, created_by)
      VALUES (
        v_due.unit_id,
        'credit_added',
        v_total_reversed,
        'Payment reversed — due voided: ' || p_reason,
        p_actor_id
      );
    END IF;

    UPDATE dues
    SET
      status           = 'void',
      void_waive_reason = p_reason,
      voided_waived_by  = p_actor_id,
      voided_waived_at  = now()
    WHERE id = p_due_id;

  ELSIF p_action = 'waive' THEN
    -- Forgive debt, no payment reversal
    UPDATE dues
    SET
      status            = 'waived',
      void_waive_reason = p_reason,
      voided_waived_by  = p_actor_id,
      voided_waived_at  = now()
    WHERE id = p_due_id;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, table_name, record_id, old_value, new_value, remarks)
  VALUES (
    p_actor_id,
    'due.' || p_action,
    'dues',
    p_due_id,
    jsonb_build_object('status', v_old_status, 'amount_paid', v_due.amount_paid),
    jsonb_build_object('status', p_action, 'reason', p_reason, 'reversed_amount', v_total_reversed),
    p_reason
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ------------------------------------------------------------
-- 4d. approve_credit_refund — was 002_billing_engine.sql:245-286
-- Guard REPAIRED, not added. Role list UNCHANGED. See 4c.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION approve_credit_refund(
  p_unit_id    uuid,
  p_actor_id   uuid,
  p_notes      text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_balance numeric;
BEGIN
  -- Permission check (STAGE 0: null-safe; role list unchanged)
  IF has_any_role(ARRAY['admin', 'president', 'vice_president']) IS NOT TRUE THEN
    RAISE EXCEPTION 'Permission denied: only admin, president, or vice president can approve refunds.';
  END IF;

  SELECT balance INTO v_balance
  FROM unit_credits
  WHERE unit_id = p_unit_id;

  IF v_balance IS NULL OR v_balance <= 0 THEN
    RAISE EXCEPTION 'No credit balance to refund for this unit.';
  END IF;

  -- Mark refund approved
  INSERT INTO credit_transactions (unit_id, type, amount, notes, created_by)
  VALUES (p_unit_id, 'refund_approved', v_balance, COALESCE(p_notes, 'Refund approved'), p_actor_id);

  -- Zero out the balance
  UPDATE unit_credits
  SET balance = 0, updated_at = now()
  WHERE unit_id = p_unit_id;

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, table_name, record_id, new_value, remarks)
  VALUES (
    p_actor_id,
    'credit.refund_approved',
    'unit_credits',
    p_unit_id,
    jsonb_build_object('refunded_amount', v_balance),
    p_notes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ------------------------------------------------------------
-- 4e. preview_payment_allocation — was 002_billing_engine.sql:384-439
-- Guard ADDED. This function is read-only but NOT harmless: as
-- SECURITY DEFINER it bypasses RLS, so without a guard any caller
-- passing an arbitrary p_unit_id could read that unit's full
-- outstanding position (per-due billing_month, due_date, balance,
-- status, plus credit_available). That is the same financial data
-- the "payments/dues: finance read" policies restrict.
--
-- Role set matches its only caller — the Record Payment modal in
-- src/pages/payments/PaymentsPage.tsx, gated by
-- src/lib/auth.ts canRecordPayments().
--
-- Kept SECURITY DEFINER: it reads dues and unit_credits for a unit
-- the officer may not hold a direct RLS grant on, and the guard now
-- supplies the authorisation that DEFINER bypasses.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION preview_payment_allocation(
  p_unit_id uuid,
  p_amount  numeric
)
RETURNS jsonb AS $$
DECLARE
  v_credit_balance numeric := 0;
  v_total          numeric;
  v_remaining      numeric;
  v_due            record;
  v_allocations    jsonb := '[]'::jsonb;
  v_allocated      numeric;
BEGIN
  -- STAGE 0 GUARD: see 4a for why `IS NOT TRUE` rather than `NOT`.
  IF has_any_role(ARRAY['admin', 'president', 'vice_president', 'treasurer']) IS NOT TRUE THEN
    RAISE EXCEPTION 'Permission denied: only admin, president, vice president, or treasurer can preview payment allocation.';
  END IF;

  SELECT COALESCE(balance, 0) INTO v_credit_balance
  FROM unit_credits WHERE unit_id = p_unit_id;

  v_total     := p_amount + v_credit_balance;
  v_remaining := v_total;

  FOR v_due IN
    SELECT id, billing_month, due_date, balance, status
    FROM dues
    WHERE unit_id = p_unit_id
      AND status IN ('unpaid', 'partial')
    ORDER BY due_date ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    IF v_remaining >= v_due.balance THEN
      v_allocated := v_due.balance;
    ELSE
      v_allocated := v_remaining;
    END IF;

    v_allocations := v_allocations || jsonb_build_object(
      'due_id',        v_due.id,
      'billing_month', v_due.billing_month,
      'due_date',      v_due.due_date,
      'balance',       v_due.balance,
      'allocated',     v_allocated,
      'will_be_paid',  (v_remaining >= v_due.balance)
    );

    v_remaining := v_remaining - v_allocated;
  END LOOP;

  RETURN jsonb_build_object(
    'unit_id',            p_unit_id,
    'payment_amount',     p_amount,
    'credit_available',   v_credit_balance,
    'total_available',    v_total,
    'allocations',        v_allocations,
    'overpayment',        GREATEST(v_remaining, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ============================================================
-- STEP 5: SECURITY INVOKER assessment
--
-- All eight remain SECURITY DEFINER. None can be demoted:
--
--   get_my_role, has_any_role   read profiles to decide the
--     caller's role. Under INVOKER they would be filtered by the
--     very RLS policies that call them — circular, and every
--     policy would fail closed.
--
--   handle_new_user             inserts into profiles from a
--     trigger on auth.users, executed in the auth admin's session.
--     INVOKER would fail the profiles RLS check on signup.
--
--   process_payment, generate_monthly_dues, void_or_waive_due,
--   approve_credit_refund       write dues, payments,
--     payment_allocations, unit_credits, credit_transactions and
--     audit_logs atomically. No client role holds direct INSERT/
--     UPDATE on all of those.
--
--   preview_payment_allocation  reads across units for the payment
--     modal; see 4e.
--
-- Each is therefore left as DEFINER with a pinned search_path and,
-- where it is reachable from the API, an explicit guard.
-- ============================================================


-- ============================================================
-- NOT HANDLED BY THIS MIGRATION — reported, not silently left
--
-- 1. auth_leaked_password_protection is a dashboard/API auth
--    setting, not SQL. It is still DISABLED. Enable at:
--      Dashboard -> Authentication -> Policies (Password) ->
--      "Prevent use of leaked passwords"
--    This migration does not and cannot change it.
--
-- 2. supabase/functions/generate-monthly-dues/index.ts accepts
--    unauthenticated POST from any origin and calls
--    generate_monthly_dues with the service-role key. After this
--    migration its calls will be REJECTED by the 4b guard, because
--    a service-role session carries no HOA role. That is correct
--    and expected. Fixing the Edge Function itself (delete it, or
--    gate it with verify_jwt plus a role check) is out of scope
--    here and needs its own task.
--
-- 3. The `authenticated_security_definer_function_executable`
--    advisor will remain open for has_any_role and get_my_role by
--    design — see STEP 3.
-- ============================================================


-- ============================================================
-- POST-APPLY VERIFICATION (run read-only; not part of this file's
-- effect)
--
--   SELECT p.proname,
--          has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth,
--          p.prosecdef, p.proconfig
--     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public'
--    ORDER BY p.proname;
--
-- Expect: anon TRUE only for get_my_role and has_any_role;
-- authenticated TRUE for all except handle_new_user; proconfig
-- {search_path=public,pg_temp} on all eight.
-- ============================================================
