ALTER TABLE course_tees
  ADD COLUMN IF NOT EXISTS course_rating DECIMAL(4,1),
  ADD COLUMN IF NOT EXISTS slope_rating INT;
