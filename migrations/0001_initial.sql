-- Initial schema.
-- Applied via: npm run db:migrate:local (or db:migrate:remote)

-- ── Users ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                        TEXT PRIMARY KEY,
  email                     TEXT NOT NULL UNIQUE,
  name                      TEXT NOT NULL,
  password_hash             TEXT NOT NULL,
  subscription_tier         TEXT NOT NULL DEFAULT 'free',
  subscription_expires_at   TEXT,
  created_at                TEXT NOT NULL,
  updated_at                TEXT NOT NULL
);

-- ── Posts ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS posts (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  published  INTEGER NOT NULL DEFAULT 0,
  author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_posts_author_id  ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- ── Admins ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admins (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ── Rate Limits ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_limits (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  key       TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_rate_limits_key_ts ON rate_limits(key, timestamp);

-- ── Session Tracking ───────────────────────────────────

CREATE TABLE IF NOT EXISTS session_opens (
  user_id       TEXT NOT NULL,
  date          TEXT NOT NULL,
  platform      TEXT NOT NULL DEFAULT 'unknown',
  request_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, date)
);

-- ── A/B Testing ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ab_experiments (
  id        TEXT PRIMARY KEY,
  key       TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'draft',  -- draft | active | paused | completed
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ab_variants (
  id           TEXT PRIMARY KEY,
  experimentId TEXT NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  variantKey   TEXT NOT NULL,
  name         TEXT NOT NULL,
  weight       INTEGER NOT NULL DEFAULT 50,
  config       TEXT NOT NULL DEFAULT '{}',  -- JSON
  enabled      INTEGER NOT NULL DEFAULT 1,
  createdAt    TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ab_assignments (
  id           TEXT PRIMARY KEY,
  userId       TEXT NOT NULL,
  experimentId TEXT NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  variantId    TEXT NOT NULL REFERENCES ab_variants(id) ON DELETE CASCADE,
  variantKey   TEXT NOT NULL,
  assignedAt   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_ab_assignments_user_exp ON ab_assignments(userId, experimentId);
