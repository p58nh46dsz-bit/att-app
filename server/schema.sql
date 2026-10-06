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

-- ── Public catalogue blobs (specialties, FAQ, open days, news, curriculum, …) ──
-- Read-only, public, replaceable by an admin; the app has a built-in fallback copy.
CREATE TABLE IF NOT EXISTS content (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

-- ── Groups and rosters (real names live here, not in git) ────────────────────
CREATE TABLE IF NOT EXISTS groups (
  code           text PRIMARY KEY,
  specialty_code text,
  specialty_name text,
  mdk_code       text,
  mdk_name       text
);
CREATE TABLE IF NOT EXISTS group_roster (
  group_code   text NOT NULL REFERENCES groups(code) ON DELETE CASCADE,
  position     integer NOT NULL,
  student_name text NOT NULL,
  topic        text,                        -- course-project topic, if assigned
  PRIMARY KEY (group_code, position)
);

-- ── Teacher documents: history of sent служебки / signed приказы ─────────────
CREATE TABLE IF NOT EXISTS document_history (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('memo', 'order')),
  title      text NOT NULL,
  meta       text NOT NULL DEFAULT '',
  payload    jsonb NOT NULL DEFAULT '{}',   -- every field of the formed document
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Notifications: broadcast per audience (user_id NULL) or personal ────────
CREATE TABLE IF NOT EXISTS notifications (
  id         bigserial PRIMARY KEY,
  audience   text NOT NULL CHECK (audience IN ('student', 'teacher')),
  user_id    uuid REFERENCES users(id) ON DELETE CASCADE,
  cls        text NOT NULL DEFAULT '',      -- severity: red | amber | green | ''
  icon       text NOT NULL,
  msg        text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notification_reads (
  user_id         uuid   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id bigint NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, notification_id)
);

-- ── Student personal data ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grades (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject  text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  items    jsonb NOT NULL DEFAULT '[]',     -- [{type, val}]
  PRIMARY KEY (user_id, subject)
);
CREATE TABLE IF NOT EXISTS portfolio_items (
  id       bigserial PRIMARY KEY,
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  icon     text NOT NULL,
  title    text NOT NULL,
  meta     text NOT NULL DEFAULT '',
  tag      text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS consultations (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type_title text NOT NULL,
  day        date NOT NULL,
  slot       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day, slot)                        -- one consultant: a slot can be booked once
);
CREATE TABLE IF NOT EXISTS certificate_requests (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cert_key   text NOT NULL,
  status     text NOT NULL DEFAULT 'process' CHECK (status IN ('process', 'ready')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cert_key)
);

-- ── Teacher data ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_materials (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject    text NOT NULL,
  name       text NOT NULL,
  type       text NOT NULL DEFAULT 'other',
  size       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS grade_entries (
  id           bigserial PRIMARY KEY,
  teacher_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_code   text NOT NULL,
  student_name text NOT NULL,
  value        text NOT NULL,               -- 5 | 4 | 3 | 2 | н
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS group_messages (
  id         bigserial PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_code text NOT NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Applicants (public form): personal data, stored only here ───────────────
CREATE TABLE IF NOT EXISTS applications (
  id         bigserial PRIMARY KEY,
  data       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Schedule (imported from schedule.json by npm run seed:data) ─────────────
CREATE TABLE IF NOT EXISTS schedule_days (
  group_code text NOT NULL,
  day        date NOT NULL,
  record     jsonb NOT NULL,                -- the day's record, as in schedule.json
  PRIMARY KEY (group_code, day)
);

CREATE TABLE IF NOT EXISTS test_results (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id text NOT NULL REFERENCES dpo_programs(id) ON DELETE CASCADE,
  test_idx   integer NOT NULL,
  score      text,
  taken_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, program_id, test_idx)
);

-- ── v2: administrator panel ──────────────────────────────────────────────────
-- Readable-by-admin passwords: the same password that is hashed above, also stored ENCRYPTED
-- (AES-256-GCM, key PASSWORD_KEY lives in server/.env, never in the database). A leaked
-- database alone does not reveal passwords; NULL = created before this feature, set on next reset.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_enc text;
-- Tokens issued before this moment are rejected, so a reset signs the old session out.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz NOT NULL DEFAULT now();

-- Certificate requests get an id, a purpose, an admin note and the admin workflow statuses.
-- (the student app still shows new/processing as "в обработке" and ready as "готова")
ALTER TABLE certificate_requests ADD COLUMN IF NOT EXISTS id bigserial;
ALTER TABLE certificate_requests ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT '';
ALTER TABLE certificate_requests ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';
ALTER TABLE certificate_requests DROP CONSTRAINT IF EXISTS certificate_requests_status_check;
ALTER TABLE certificate_requests ALTER COLUMN status SET DEFAULT 'new';
UPDATE certificate_requests SET status = 'processing' WHERE status = 'process';
ALTER TABLE certificate_requests ADD CONSTRAINT certificate_requests_status_check CHECK (status IN ('new', 'processing', 'ready'));
CREATE UNIQUE INDEX IF NOT EXISTS certificate_requests_id_idx ON certificate_requests (id);

CREATE TABLE IF NOT EXISTS announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  body       text NOT NULL,
  audience   text NOT NULL CHECK (audience IN ('all', 'student', 'teacher', 'group')),
  group_code text NOT NULL DEFAULT '',
  pinned     boolean NOT NULL DEFAULT false,
  status     text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- A published announcement is delivered as notifications (so read/unread works as before).
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS announcement_id uuid REFERENCES announcements(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS appeals (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject    text NOT NULL,
  message    text NOT NULL,
  status     text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'working', 'resolved')),
  reply      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  starts_at  timestamptz NOT NULL,
  place      text NOT NULL DEFAULT '',
  body       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Who did what. Never contains passwords. admin_login stays readable after the account is gone.
CREATE TABLE IF NOT EXISTS admin_audit (
  id          bigserial PRIMARY KEY,
  admin_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  admin_login text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('account', 'news', 'certificate', 'appeal', 'event')),
  action      text NOT NULL,
  target      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
