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

-- ── Элективы (ДПО и кружки): catalogue ───────────────────────────────────────
-- Seeded from the app's mock data by `npm run seed:catalog`; later edited by an admin.
CREATE TABLE IF NOT EXISTS dpo_programs (
  id        text PRIMARY KEY,
  position  integer NOT NULL,              -- display order
  title     text NOT NULL,
  category  text NOT NULL,
  price     text NOT NULL,
  hours     text NOT NULL,
  term      text NOT NULL,
  doc       text NOT NULL,
  paid      boolean NOT NULL DEFAULT true,
  tags      text[] NOT NULL DEFAULT '{}',  -- interest ids that make it "Рекомендовано"
  descr     text NOT NULL DEFAULT '',
  materials jsonb NOT NULL DEFAULT '[]',   -- [{name,type,date,size}]
  tests     jsonb NOT NULL DEFAULT '[]'    -- [{title,status,score?,questions?:[{q,options,correct}]}]
);

CREATE TABLE IF NOT EXISTS circles (
  id         text PRIMARY KEY,
  position   integer NOT NULL,
  title      text NOT NULL,
  category   text NOT NULL,
  leader     text NOT NULL DEFAULT '',
  age_range  text,
  hours      text,
  schedule   text NOT NULL DEFAULT '',
  tags       text[] NOT NULL DEFAULT '{}',
  paid       boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS interest_options (
  id       text PRIMARY KEY,
  position integer NOT NULL,
  label    text NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

-- ── Элективы: what each user did ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interest_surveys (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tags       text[] NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registrations (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('dpo', 'circle')),
  item_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, item_id)
);

CREATE TABLE IF NOT EXISTS test_results (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id text NOT NULL REFERENCES dpo_programs(id) ON DELETE CASCADE,
  test_idx   integer NOT NULL,
  score      text,
  taken_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, program_id, test_idx)
);
