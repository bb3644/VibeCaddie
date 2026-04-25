-- Training Journal table
CREATE TABLE IF NOT EXISTS training_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_date DATE NOT NULL,
  location TEXT,
  focus_area TEXT NOT NULL,
  plan TEXT NOT NULL,
  reflection TEXT,
  ai_feedback TEXT,
  ai_feedback_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_journal_user_id ON training_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_training_journal_session_date ON training_journal(user_id, session_date DESC);
