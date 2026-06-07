-- Fixed-window rate limiting for the account function. One row per
-- "<ip>:<action>" key; the function upserts and resets the window in a single
-- statement (see checkRateLimit in netlify/functions/account.mts).
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INT NOT NULL DEFAULT 1
);
