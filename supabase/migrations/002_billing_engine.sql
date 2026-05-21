-- =============================================================
-- WHOA — Phase 2: Billing Engine
-- Paste this into Supabase → SQL Editor → New Query
-- Run AFTER 001_initial_schema.sql
-- =============================================================


-- ============================================================
-- FUNCTION: process_payment()
-- Full FIFO payment processor with credit wallet support.
-- Wrapped in a single transaction — rolls back on any error.
-- ============================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- FUNCTION: void_or_waive_due()
-- Admin/president/vp only. Reason always required.
-- Void reverses allocations back to unit credit.
-- Waive forgives the debt with no refund.
-- ============================================================

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
  -- Permission check
  IF NOT has_any_role(ARRAY['admin', 'president', 'vice_president']) THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- FUNCTION: approve_credit_refund()
-- Admin approves a resident's refund request.
-- Zeroes out unit_credits.balance.
-- ============================================================

CREATE OR REPLACE FUNCTION approve_credit_refund(
  p_unit_id    uuid,
  p_actor_id   uuid,
  p_notes      text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF NOT has_any_role(ARRAY['admin', 'president', 'vice_president']) THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- FUNCTION: generate_monthly_dues()
-- Idempotent — safe to run multiple times.
-- Creates one due per active unit for the given billing month.
-- After inserting dues, auto-applies any existing unit credits (FIFO).
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
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- FUNCTION: preview_payment_allocation()
-- READ-ONLY preview — shows how a payment would be allocated.
-- Used by the frontend "Record Payment" modal live preview.
-- ============================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- PG_CRON: Auto-run dues generation on the 1st of every month
-- Requires the pg_cron extension. Enable it in:
--   Supabase Dashboard → Database → Extensions → pg_cron
-- Then run the schedule command below.
-- ============================================================

-- Step 1: Enable the extension (run manually in SQL editor if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Schedule dues generation at midnight on the 1st of every month
-- SELECT cron.schedule(
--   'generate-monthly-dues',
--   '0 0 1 * *',
--   $$ SELECT generate_monthly_dues(); $$
-- );

-- To verify the job was created:
-- SELECT * FROM cron.job;

-- To remove the schedule if needed:
-- SELECT cron.unschedule('generate-monthly-dues');


-- ============================================================
-- DONE
-- ============================================================
