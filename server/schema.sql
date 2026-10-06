-- Schema v1: accounts and sign-in. Safe to re-run (IF NOT EXISTS).
-- Real personal data lives only in this database (hosted in Russia in production),
-- never in the git repository.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login           text        NOT NULL,
  role            text        NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  last_name       text        NOT NULL,
  first_name      text        NOT NULL,
  middle_name     text        NOT NULL DEFAULT '',
  group_code      text,                                -- students only, e.g. 'ДВ-41'
  profile         jsonb       NOT NULL DEFAULT '{}',   -- teacher info: department, position, experience, groups[], email, phone
  password_hash   text        NOT NULL,                -- argon2id, never the password
  failed_attempts integer     NOT NULL DEFAULT 0,
  locked_until    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Login is unique regardless of case; the app also trims spaces before looking it up.
CREATE UNIQUE INDEX IF NOT EXISTS users_login_lower_idx ON users (lower(login));
CREATE INDEX IF NOT EXISTS users_group_idx ON users (group_code);
