-- Add missing columns to round_holes (added in code but never migrated)
ALTER TABLE round_holes
  ADD COLUMN IF NOT EXISTS approach_club       TEXT,
  ADD COLUMN IF NOT EXISTS approach_distance   TEXT,
  ADD COLUMN IF NOT EXISTS approach_direction  TEXT,
  ADD COLUMN IF NOT EXISTS approach_yardage    INT,
  ADD COLUMN IF NOT EXISTS up_down             BOOLEAN,
  ADD COLUMN IF NOT EXISTS recovery_club       TEXT,
  ADD COLUMN IF NOT EXISTS hole_notes          TEXT,
  ADD COLUMN IF NOT EXISTS bunker_count        INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS water_count         INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalty_count       INT NOT NULL DEFAULT 0;

-- Drop old check constraint that only allowed 'FW','L','R','PEN'
-- and replace with the values the app actually uses
ALTER TABLE round_holes DROP CONSTRAINT IF EXISTS round_holes_tee_result_check;
ALTER TABLE round_holes ADD CONSTRAINT round_holes_tee_result_check
  CHECK (tee_result IN ('FW', 'LEFT', 'RIGHT', 'SHORT', 'OB', 'L', 'R', 'PEN', '-'));
