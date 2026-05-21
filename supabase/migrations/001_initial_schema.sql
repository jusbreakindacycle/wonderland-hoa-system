-- =============================================================
-- WHOA — Wonderland Townhomes HOA
-- Phase 1 + 2 Schema, RLS Policies, and Helper Functions
-- Paste this entire file into: Supabase → SQL Editor → New Query
-- =============================================================


-- ============================================================
-- SECTION 1: TABLES
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id               uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name        text,
  role             text        CHECK (role IN (
                                  'admin',
                                  'president', 'vice_president',
                                  'treasurer', 'secretary', 'auditor', 'pro', 'board_member',
                                  'security',
                                  'resident'
                                )),
  position_label   text,
  is_active        boolean     DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

-- Units
CREATE TABLE IF NOT EXISTS units (
  id          uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  block       text   NOT NULL,
  lot         text   NOT NULL,
  unit_code   text   GENERATED ALWAYS AS (block || '-' || lot) STORED,
  status      text   CHECK (status IN ('occupied', 'vacant')) DEFAULT 'occupied',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (block, lot)
);

-- Homeowners (one per unit)
CREATE TABLE IF NOT EXISTS homeowners (
  id              uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         uuid  REFERENCES units ON DELETE CASCADE,
  profile_id      uuid  REFERENCES profiles,
  full_name       text  NOT NULL,
  email           text,
  contact_number  text,
  move_in_date    date,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- System Config (monthly dues amount, etc.)
CREATE TABLE IF NOT EXISTS system_config (
  key         text PRIMARY KEY,
  value       text,
  updated_by  uuid REFERENCES profiles,
  updated_at  timestamptz DEFAULT now()
);

-- Dues (one record per unit per billing month)
CREATE TABLE IF NOT EXISTS dues (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id          uuid          REFERENCES units ON DELETE CASCADE,
  billing_month    text          NOT NULL,
  amount           numeric(10,2) NOT NULL,
  due_date         date          NOT NULL,
  status           text          CHECK (status IN ('unpaid', 'partial', 'paid', 'waived', 'void')) DEFAULT 'unpaid',
  amount_paid      numeric(10,2) DEFAULT 0,
  balance          numeric(10,2) GENERATED ALWAYS AS (amount - amount_paid) STORED,
  void_waive_reason  text,
  voided_waived_by   uuid        REFERENCES profiles,
  voided_waived_at   timestamptz,
  created_at       timestamptz   DEFAULT now(),
  UNIQUE (unit_id, billing_month)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id          uuid          REFERENCES units ON DELETE CASCADE,
  amount           numeric(10,2) NOT NULL,
  payment_method   text          CHECK (payment_method IN ('cash', 'gcash', 'bank_transfer', 'credit')),
  reference_number text,
  payment_date     date          NOT NULL DEFAULT CURRENT_DATE,
  received_by      uuid          REFERENCES profiles,
  credit_used      numeric(10,2) DEFAULT 0,
  notes            text,
  created_at       timestamptz   DEFAULT now()
);

-- Payment Allocations (FIFO breakdown per payment)
CREATE TABLE IF NOT EXISTS payment_allocations (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id       uuid          REFERENCES payments ON DELETE CASCADE,
  due_id           uuid          REFERENCES dues ON DELETE CASCADE,
  amount_allocated numeric(10,2) NOT NULL,
  created_at       timestamptz   DEFAULT now()
);

-- Unit Credits (overpayment wallet per unit)
CREATE TABLE IF NOT EXISTS unit_credits (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     uuid          REFERENCES units ON DELETE CASCADE UNIQUE,
  balance     numeric(10,2) DEFAULT 0,
  updated_at  timestamptz   DEFAULT now()
);

-- Credit Transactions (audit trail for credit wallet changes)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id               uuid          REFERENCES units,
  type                  text          CHECK (type IN ('credit_added', 'credit_applied', 'refund_requested', 'refund_approved')),
  amount                numeric(10,2),
  reference_payment_id  uuid          REFERENCES payments,
  notes                 text,
  created_by            uuid          REFERENCES profiles,
  created_at            timestamptz   DEFAULT now()
);

-- Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id            uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       uuid  REFERENCES units,
  submitted_by  uuid  REFERENCES profiles,
  subject       text  NOT NULL,
  description   text  NOT NULL,
  status        text  CHECK (status IN ('open', 'in_progress', 'resolved')) DEFAULT 'open',
  assigned_to   uuid  REFERENCES profiles,
  resolved_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- Visitors
CREATE TABLE IF NOT EXISTS visitors (
  id            uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       uuid  REFERENCES units,
  visitor_name  text  NOT NULL,
  purpose       text,
  time_in       timestamptz DEFAULT now(),
  time_out      timestamptz,
  logged_by     uuid  REFERENCES profiles,
  created_at    timestamptz DEFAULT now()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id            uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text  NOT NULL,
  body          text  NOT NULL,
  target        text  CHECK (target IN ('all', 'block', 'unit')) DEFAULT 'all',
  target_value  text,
  posted_by     uuid  REFERENCES profiles,
  created_at    timestamptz DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid   REFERENCES profiles,
  action      text   NOT NULL,
  table_name  text,
  record_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  remarks     text,
  created_at  timestamptz DEFAULT now()
);


-- ============================================================
-- SECTION 2: SEED DATA
-- ============================================================

INSERT INTO system_config (key, value)
VALUES ('monthly_dues_amount', '2000')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- SECTION 3: HELPER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Convenience: check if caller has any of the given roles
CREATE OR REPLACE FUNCTION has_any_role(allowed_roles text[])
RETURNS boolean AS $$
  SELECT get_my_role() = ANY(allowed_roles);
$$ LANGUAGE sql SECURITY DEFINER;


-- ============================================================
-- SECTION 4: AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'resident'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE units              ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeowners         ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues               ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_credits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints         ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;


-- -------- profiles --------
-- Everyone can read their own profile; admin/board can read all
CREATE POLICY "profiles: read own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: admin read all"
  ON profiles FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','treasurer','secretary','auditor','pro','board_member']));

CREATE POLICY "profiles: admin update roles"
  ON profiles FOR UPDATE
  USING (has_any_role(ARRAY['admin','president','vice_president']));


-- -------- units --------
-- Finance/admin roles and board can read all units
CREATE POLICY "units: finance/admin read"
  ON units FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','treasurer','secretary','auditor','pro','board_member','security']));

-- Resident can read their own unit (via homeowners link)
CREATE POLICY "units: resident read own"
  ON units FOR SELECT
  USING (
    id IN (
      SELECT unit_id FROM homeowners WHERE profile_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "units: admin/secretary insert"
  ON units FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','president','vice_president','secretary']));

CREATE POLICY "units: admin/secretary update"
  ON units FOR UPDATE
  USING (has_any_role(ARRAY['admin','president','vice_president','secretary']));


-- -------- homeowners --------
CREATE POLICY "homeowners: admin/secretary read all"
  ON homeowners FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','secretary','treasurer','auditor','board_member']));

CREATE POLICY "homeowners: resident read own"
  ON homeowners FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "homeowners: admin/secretary write"
  ON homeowners FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','president','vice_president','secretary']));

CREATE POLICY "homeowners: admin/secretary update"
  ON homeowners FOR UPDATE
  USING (has_any_role(ARRAY['admin','president','vice_president','secretary']));


-- -------- system_config --------
CREATE POLICY "system_config: finance read"
  ON system_config FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','treasurer','auditor','board_member']));

CREATE POLICY "system_config: admin write"
  ON system_config FOR ALL
  USING (has_any_role(ARRAY['admin']));


-- -------- dues --------
CREATE POLICY "dues: finance/admin read all"
  ON dues FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','treasurer','auditor','board_member']));

CREATE POLICY "dues: resident read own"
  ON dues FOR SELECT
  USING (
    unit_id IN (
      SELECT unit_id FROM homeowners WHERE profile_id = auth.uid() AND is_active = true
    )
  );

-- Only server-side functions (SECURITY DEFINER) insert/update dues
CREATE POLICY "dues: system insert"
  ON dues FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','president','vice_president','treasurer']));

CREATE POLICY "dues: admin/pres update (void/waive)"
  ON dues FOR UPDATE
  USING (has_any_role(ARRAY['admin','president','vice_president']));


-- -------- payments --------
CREATE POLICY "payments: finance read all"
  ON payments FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','treasurer','auditor','board_member']));

CREATE POLICY "payments: resident read own"
  ON payments FOR SELECT
  USING (
    unit_id IN (
      SELECT unit_id FROM homeowners WHERE profile_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "payments: finance insert"
  ON payments FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','president','vice_president','treasurer']));


-- -------- payment_allocations --------
CREATE POLICY "payment_allocations: finance read"
  ON payment_allocations FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','treasurer','auditor','board_member']));

CREATE POLICY "payment_allocations: resident read own"
  ON payment_allocations FOR SELECT
  USING (
    payment_id IN (
      SELECT p.id FROM payments p
      JOIN homeowners h ON h.unit_id = p.unit_id
      WHERE h.profile_id = auth.uid() AND h.is_active = true
    )
  );

CREATE POLICY "payment_allocations: finance insert"
  ON payment_allocations FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','president','vice_president','treasurer']));


-- -------- unit_credits --------
CREATE POLICY "unit_credits: finance read all"
  ON unit_credits FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','treasurer','auditor','board_member']));

CREATE POLICY "unit_credits: resident read own"
  ON unit_credits FOR SELECT
  USING (
    unit_id IN (
      SELECT unit_id FROM homeowners WHERE profile_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "unit_credits: finance write"
  ON unit_credits FOR ALL
  USING (has_any_role(ARRAY['admin','president','vice_president','treasurer']));


-- -------- credit_transactions --------
CREATE POLICY "credit_transactions: finance read all"
  ON credit_transactions FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','treasurer','auditor','board_member']));

CREATE POLICY "credit_transactions: resident read own"
  ON credit_transactions FOR SELECT
  USING (
    unit_id IN (
      SELECT unit_id FROM homeowners WHERE profile_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "credit_transactions: finance insert"
  ON credit_transactions FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','president','vice_president','treasurer']));

-- Residents can request refunds (insert only, type = 'refund_requested')
CREATE POLICY "credit_transactions: resident refund request"
  ON credit_transactions FOR INSERT
  WITH CHECK (
    type = 'refund_requested'
    AND unit_id IN (
      SELECT unit_id FROM homeowners WHERE profile_id = auth.uid() AND is_active = true
    )
  );


-- -------- complaints --------
-- All authenticated users can read complaints (filtered by role in app layer)
CREATE POLICY "complaints: admin/secretary read all"
  ON complaints FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','secretary','auditor','board_member']));

CREATE POLICY "complaints: resident read own"
  ON complaints FOR SELECT
  USING (submitted_by = auth.uid());

-- Anyone authenticated can submit a complaint
CREATE POLICY "complaints: anyone submit"
  ON complaints FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND submitted_by = auth.uid());

-- Secretary/admin can assign and update status
CREATE POLICY "complaints: admin/secretary update"
  ON complaints FOR UPDATE
  USING (has_any_role(ARRAY['admin','president','vice_president','secretary']));


-- -------- visitors --------
CREATE POLICY "visitors: admin/security read all"
  ON visitors FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','security']));

CREATE POLICY "visitors: security insert"
  ON visitors FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','president','vice_president','security']));

CREATE POLICY "visitors: security update (time_out)"
  ON visitors FOR UPDATE
  USING (has_any_role(ARRAY['admin','president','vice_president','security']));


-- -------- announcements --------
-- All authenticated users can read announcements (filtered in app for target)
CREATE POLICY "announcements: authenticated read"
  ON announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "announcements: admin/secretary/pro insert"
  ON announcements FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','president','vice_president','secretary','pro']));

CREATE POLICY "announcements: admin/secretary/pro update"
  ON announcements FOR UPDATE
  USING (has_any_role(ARRAY['admin','president','vice_president','secretary','pro']));


-- -------- audit_logs --------
CREATE POLICY "audit_logs: finance/admin read"
  ON audit_logs FOR SELECT
  USING (has_any_role(ARRAY['admin','president','vice_president','treasurer','auditor','board_member']));

-- Insert allowed only from SECURITY DEFINER functions (treated as postgres role)
-- App-level inserts use finance roles
CREATE POLICY "audit_logs: finance insert"
  ON audit_logs FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','president','vice_president','treasurer','secretary']));


-- ============================================================
-- DONE — Run this entire script in Supabase SQL Editor
-- ============================================================
