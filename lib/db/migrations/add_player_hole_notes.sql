CREATE TABLE IF NOT EXISTS player_hole_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_hole_id UUID NOT NULL REFERENCES course_holes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_hole_id, user_id)
);
