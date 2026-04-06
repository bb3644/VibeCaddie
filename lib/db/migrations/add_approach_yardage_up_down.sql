-- Add approach yardage (numeric distance input) and up/down tracking to round_holes
ALTER TABLE round_holes
  ADD COLUMN IF NOT EXISTS approach_yardage INT,
  ADD COLUMN IF NOT EXISTS up_down BOOLEAN;
