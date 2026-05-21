-- =============================================================
-- WHOA — Migration 003: Block+Lot → House No.
-- Also adds move_out_date to homeowners.
--
-- Safe to run on an empty units table.
-- Paste into Supabase → SQL Editor → Run
-- =============================================================

-- Step 1: Drop the generated unit_code column (depends on block+lot)
ALTER TABLE units DROP COLUMN IF EXISTS unit_code;

-- Step 2: Drop the unique constraint on (block, lot)
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_block_lot_key;

-- Step 3: Drop the lot column
ALTER TABLE units DROP COLUMN IF EXISTS lot;

-- Step 4: Rename block → house_no
ALTER TABLE units RENAME COLUMN block TO house_no;

-- Step 5: Re-add unit_code as an alias for house_no (keeps all
--         existing frontend/backend references working unchanged)
ALTER TABLE units
  ADD COLUMN unit_code text GENERATED ALWAYS AS (house_no) STORED;

-- Step 6: Unique constraint on house_no
ALTER TABLE units
  ADD CONSTRAINT units_house_no_key UNIQUE (house_no);

-- Step 7: Add move_out_date to homeowners
ALTER TABLE homeowners
  ADD COLUMN IF NOT EXISTS move_out_date date;

-- =============================================================
-- DONE
-- =============================================================
