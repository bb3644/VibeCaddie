CREATE TABLE IF NOT EXISTS op36_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES player_profiles(user_id) ON DELETE CASCADE,
  current_level   INTEGER NOT NULL DEFAULT 1,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS op36_rounds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES player_profiles(user_id) ON DELETE CASCADE,
  played_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  level           INTEGER NOT NULL CHECK (level BETWEEN 1 AND 10),
  distance_label  TEXT NOT NULL,
  nines           TEXT NOT NULL CHECK (nines IN ('front', 'back', 'both')),
  front_holes     JSONB,
  back_holes      JSONB,
  front_score     INTEGER,
  back_score      INTEGER,
  total_score     INTEGER NOT NULL,
  total_putts     INTEGER,
  girs            INTEGER,
  uds             INTEGER,
  birdies         INTEGER,
  three_putts     INTEGER,
  points          INTEGER NOT NULL DEFAULT 0,
  mastery         BOOLEAN NOT NULL DEFAULT FALSE,
  result          TEXT NOT NULL CHECK (result IN ('advance','demote','stay','graduate')),
  level_after     INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
