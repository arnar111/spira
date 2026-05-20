CREATE TABLE IF NOT EXISTS accounts (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accounts_updated_at_idx ON accounts (updated_at DESC);
