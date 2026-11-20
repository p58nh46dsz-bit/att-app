-- Migration 003: bring the schema to 3NF and add the missing relationships.
-- Runs once (see migrate.js → schema_migrations), inside a single transaction: either
-- everything is applied or nothing is. Existing data is moved, not dropped.
--
-- What changes, in short:
--   * reference tables: specialties, subjects, certificate_types, consultation_types/slots, portfolio_categories
--   * students belong to a group through group_students (one place, not users.group_code + roster)
--   * teacher data out of users.profile jsonb → teacher_profiles, teacher_groups, users.email/phone
--   * grades: one row per mark (grade_records) + attendance_records, instead of jsonb arrays and name strings
--   * ДПО: materials / tests / questions / options as tables, tags as junction tables, numbers as numbers
--   * registrations split per kind with real foreign keys; interests in junction tables
--   * schedule lessons as rows; applications with typed columns
--   * foreign keys, CHECK constraints and indexes everywhere they were missing
-- users_v is the read model that keeps the API shape (group_code, profile) stable.

-- ── Reference tables ─────────────────────────────────────────────────────────
CREATE TABLE specialties (
  code text PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE subjects (
  id            serial PRIMARY KEY,
  code          text,                          -- e.g. 'МДК 02.01'
  name          text NOT NULL UNIQUE,
  for_materials boolean NOT NULL DEFAULT false  -- offered in the teacher's "materials" screen
);
CREATE TABLE certificate_types (
  key      text PRIMARY KEY,
  position integer NOT NULL,
  icon     text NOT NULL,
  title    text NOT NULL,
  sub      text NOT NULL DEFAULT ''
);
CREATE TABLE consultation_types (
  id       serial PRIMARY KEY,
  position integer NOT NULL,
  icon     text NOT NULL,
  title    text NOT NULL UNIQUE,
  sub      text NOT NULL DEFAULT ''
);
CREATE TABLE consultation_slots (
  slot     text PRIMARY KEY,                   -- '09:00'
  position integer NOT NULL
);
CREATE TABLE portfolio_categories (
  key      text PRIMARY KEY,
  position integer NOT NULL,
  icon     text NOT NULL,
  color    text NOT NULL,
  title    text NOT NULL,
  sub      text NOT NULL DEFAULT ''
);

-- Move the lists that lived in content blobs.
INSERT INTO certificate_types (key, position, icon, title, sub)
  SELECT e->>'key', (o - 1)::int, e->>'icon', e->>'title', COALESCE(e->>'sub', '')
  FROM content c, jsonb_array_elements(c.value) WITH ORDINALITY AS t(e, o)
  WHERE c.key = 'certificates';
INSERT INTO consultation_types (position, icon, title, sub)
  SELECT (o - 1)::int, e->>'icon', e->>'title', COALESCE(e->>'sub', '')
  FROM content c, jsonb_array_elements(c.value) WITH ORDINALITY AS t(e, o)
  WHERE c.key = 'consultation_types';
INSERT INTO consultation_slots (slot, position)
  SELECT s, (o - 1)::int FROM content c, jsonb_array_elements_text(c.value) WITH ORDINALITY AS t(s, o)
  WHERE c.key = 'consultation_slots';
INSERT INTO portfolio_categories (key, position, icon, color, title, sub)
  SELECT e->>'key', (o - 1)::int, e->>'icon', e->>'color', e->>'title', COALESCE(e->>'sub', '')
  FROM content c, jsonb_array_elements(c.value) WITH ORDINALITY AS t(e, o)
  WHERE c.key = 'portfolio_categories';
INSERT INTO subjects (name, for_materials)
  SELECT s, true FROM content c, jsonb_array_elements_text(c.value) AS t(s)
  WHERE c.key = 'teacher_subjects' ON CONFLICT (name) DO UPDATE SET for_materials = true;
DELETE FROM content WHERE key IN ('certificates', 'consultation_types', 'consultation_slots', 'portfolio_categories', 'teacher_subjects');

-- ── Groups, specialties, subjects ────────────────────────────────────────────
-- Every group code used anywhere must exist before foreign keys are added.
INSERT INTO groups (code) SELECT DISTINCT group_code FROM users WHERE group_code IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO groups (code) SELECT DISTINCT g FROM users, jsonb_array_elements_text(COALESCE(profile->'groups', '[]')) AS t(g) ON CONFLICT DO NOTHING;
INSERT INTO groups (code) SELECT DISTINCT group_code FROM group_messages ON CONFLICT DO NOTHING;
INSERT INTO groups (code) SELECT DISTINCT group_code FROM schedule_days ON CONFLICT DO NOTHING;
UPDATE announcements SET group_code = NULL WHERE group_code = '';
ALTER TABLE announcements ALTER COLUMN group_code DROP NOT NULL, ALTER COLUMN group_code DROP DEFAULT;
INSERT INTO groups (code) SELECT DISTINCT group_code FROM announcements WHERE group_code IS NOT NULL ON CONFLICT DO NOTHING;

INSERT INTO specialties (code, name) SELECT DISTINCT specialty_code, specialty_name FROM groups WHERE specialty_code IS NOT NULL AND specialty_name IS NOT NULL;
INSERT INTO subjects (code, name) SELECT DISTINCT mdk_code, mdk_name FROM groups WHERE mdk_name IS NOT NULL ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code;
ALTER TABLE groups ADD COLUMN mdk_subject_id integer REFERENCES subjects(id) ON DELETE SET NULL;
UPDATE groups g SET mdk_subject_id = s.id FROM subjects s WHERE g.mdk_name = s.name;
ALTER TABLE groups ADD CONSTRAINT groups_specialty_fk FOREIGN KEY (specialty_code) REFERENCES specialties(code) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE groups DROP COLUMN specialty_name, DROP COLUMN mdk_code, DROP COLUMN mdk_name;

-- ── Group membership: one place for "who is in which group" ──────────────────
-- A row is a place in a group. user_id is set when the person has an account; until then only the
-- display name is known (the roster imported from the college). Grades and attendance hang on this id.
CREATE TABLE group_students (
  id           bigserial PRIMARY KEY,
  group_code   text    NOT NULL REFERENCES groups(code) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id      uuid    UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  position     integer NOT NULL DEFAULT 0,
  topic        text,                                -- course-project topic, if assigned
  CONSTRAINT group_students_who CHECK (user_id IS NOT NULL OR display_name IS NOT NULL)
);
INSERT INTO group_students (group_code, display_name, position, topic)
  SELECT group_code, student_name, position, topic FROM group_roster ORDER BY group_code, position;
-- Link roster places to accounts: "Фамилия И.О." ↔ users of that group.
UPDATE group_students gs SET user_id = m.id, display_name = NULL
FROM (
  SELECT DISTINCT ON (u.id) gs2.id AS gs_id, u.id
  FROM group_students gs2
  JOIN users u ON u.role = 'student' AND u.group_code = gs2.group_code AND u.last_name = split_part(gs2.display_name, ' ', 1)
   AND left(u.first_name, 1) || '.' || CASE WHEN u.middle_name = '' THEN '' ELSE left(u.middle_name, 1) || '.' END = split_part(gs2.display_name, ' ', 2)
  ORDER BY u.id, gs2.id
) m
WHERE gs.id = m.gs_id;
-- Accounts that are not on any roster get their own place.
INSERT INTO group_students (group_code, user_id, position)
  SELECT u.group_code, u.id, COALESCE((SELECT max(position) + 1 FROM group_students WHERE group_code = u.group_code), 0)
  FROM users u WHERE u.role = 'student' AND u.group_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM group_students g WHERE g.user_id = u.id);
DROP TABLE group_roster;

-- ── Teacher data out of users.profile ────────────────────────────────────────
ALTER TABLE users ADD COLUMN email text, ADD COLUMN phone text;
UPDATE users SET email = NULLIF(profile->>'email', ''), phone = NULLIF(profile->>'phone', '') WHERE role = 'teacher';
CREATE TABLE teacher_profiles (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  department text NOT NULL DEFAULT '',
  position   text NOT NULL DEFAULT 'Преподаватель',
  experience text NOT NULL DEFAULT ''
);
INSERT INTO teacher_profiles (user_id, department, position, experience)
  SELECT id, COALESCE(profile->>'department', ''), COALESCE(NULLIF(profile->>'position', ''), 'Преподаватель'), COALESCE(profile->>'experience', '')
  FROM users WHERE role = 'teacher';
CREATE TABLE teacher_groups (
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_code text NOT NULL REFERENCES groups(code) ON UPDATE CASCADE ON DELETE CASCADE,
  position   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (teacher_id, group_code)
);
INSERT INTO teacher_groups (teacher_id, group_code, position)
  SELECT u.id, g, (o - 1)::int FROM users u, jsonb_array_elements_text(COALESCE(u.profile->'groups', '[]')) WITH ORDINALITY AS t(g, o)
  WHERE u.role = 'teacher';

-- The API still sees "group_code" and "profile": this view assembles them from the tables above.
ALTER TABLE users DROP COLUMN profile;
ALTER TABLE users DROP COLUMN group_code;   -- also drops users_group_idx
ALTER TABLE users ADD CONSTRAINT users_email_format CHECK (email IS NULL OR email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
CREATE VIEW users_v AS
SELECT u.*,
  gs.group_code AS group_code,
  CASE WHEN u.role = 'teacher' THEN jsonb_build_object(
    'email', u.email, 'phone', u.phone, 'department', tp.department, 'position', tp.position, 'experience', tp.experience,
    'groups', COALESCE((SELECT jsonb_agg(g.group_code ORDER BY g.position) FROM teacher_groups g WHERE g.teacher_id = u.id), '[]'::jsonb))
  ELSE '{}'::jsonb END AS profile
FROM users u
LEFT JOIN group_students gs ON gs.user_id = u.id
LEFT JOIN teacher_profiles tp ON tp.user_id = u.id;

-- ── Grades and attendance ────────────────────────────────────────────────────
CREATE TABLE grade_records (
  id         bigserial PRIMARY KEY,
  student_id bigint   NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,
  subject_id integer  REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id uuid     REFERENCES users(id) ON DELETE SET NULL,
  kind       text     NOT NULL DEFAULT '',       -- «Контрольная №1», «Зачёт»…
  value      smallint NOT NULL CHECK (value BETWEEN 2 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE attendance_records (
  id         bigserial PRIMARY KEY,
  student_id bigint  NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,
  subject_id integer REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id uuid    REFERENCES users(id) ON DELETE SET NULL,
  day        date    NOT NULL DEFAULT current_date,
  status     text    NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO subjects (name) SELECT DISTINCT subject FROM grades ON CONFLICT (name) DO NOTHING;
INSERT INTO grade_records (student_id, subject_id, kind, value)
  SELECT gs.id, s.id, COALESCE(it.item->>'type', ''), (it.item->>'val')::numeric::smallint
  FROM grades g
  JOIN group_students gs ON gs.user_id = g.user_id
  JOIN subjects s ON s.name = g.subject
  CROSS JOIN LATERAL jsonb_array_elements(g.items) WITH ORDINALITY AS it(item, ord)
  WHERE jsonb_typeof(it.item->'val') = 'number' AND (it.item->>'val')::numeric BETWEEN 2 AND 5
  ORDER BY g.position, it.ord;
DROP TABLE grades;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM grade_entries) THEN
    RAISE EXCEPTION 'grade_entries has rows: they must be moved to grade_records/attendance_records by hand before this migration';
  END IF;
END $$;
DROP TABLE grade_entries;

-- ── Other tables that referenced text codes or names ─────────────────────────
ALTER TABLE group_messages ADD CONSTRAINT group_messages_group_fk FOREIGN KEY (group_code) REFERENCES groups(code) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE announcements ADD CONSTRAINT announcements_group_fk FOREIGN KEY (group_code) REFERENCES groups(code) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE announcements ADD CONSTRAINT announcements_group_chk CHECK ((audience = 'group') = (group_code IS NOT NULL));

ALTER TABLE certificate_requests ADD CONSTRAINT certificate_requests_type_fk FOREIGN KEY (cert_key) REFERENCES certificate_types(key) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE portfolio_items ADD CONSTRAINT portfolio_items_category_fk FOREIGN KEY (category) REFERENCES portfolio_categories(key) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE consultations ADD COLUMN type_id integer REFERENCES consultation_types(id) ON DELETE RESTRICT;
UPDATE consultations c SET type_id = t.id FROM consultation_types t WHERE t.title = c.type_title;
ALTER TABLE consultations ALTER COLUMN type_id SET NOT NULL;
ALTER TABLE consultations DROP COLUMN type_title;
ALTER TABLE consultations ADD CONSTRAINT consultations_slot_fk FOREIGN KEY (slot) REFERENCES consultation_slots(slot) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE teacher_materials ADD COLUMN subject_id integer REFERENCES subjects(id) ON DELETE RESTRICT;
INSERT INTO subjects (name, for_materials) SELECT DISTINCT subject, true FROM teacher_materials ON CONFLICT (name) DO NOTHING;
UPDATE teacher_materials m SET subject_id = s.id FROM subjects s WHERE s.name = m.subject;
ALTER TABLE teacher_materials ALTER COLUMN subject_id SET NOT NULL;
ALTER TABLE teacher_materials DROP COLUMN subject;

ALTER TABLE notifications ADD CONSTRAINT notifications_cls_chk CHECK (cls IN ('', 'red', 'amber', 'green'));

-- ── Schedule: lessons as rows ────────────────────────────────────────────────
ALTER TABLE schedule_days ADD CONSTRAINT schedule_days_group_fk FOREIGN KEY (group_code) REFERENCES groups(code) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE schedule_days ADD COLUMN corpus text, ADD COLUMN weekday text, ADD COLUMN source_url text, ADD COLUMN generated_at timestamptz;
UPDATE schedule_days SET corpus = record->>'corpus', weekday = record->>'weekday', source_url = record->>'source_url',
  generated_at = NULLIF(record->>'generated_at', '')::timestamptz;
CREATE TABLE schedule_lessons (
  group_code text NOT NULL,
  day        date NOT NULL,
  period     smallint NOT NULL,
  start_time time NOT NULL,
  end_time   time NOT NULL,
  room       text NOT NULL DEFAULT '',
  subject    text NOT NULL,                 -- as printed in the college's timetable (abbreviation)
  teacher    text NOT NULL DEFAULT '',      -- as printed; may list several people
  PRIMARY KEY (group_code, day, period),
  FOREIGN KEY (group_code, day) REFERENCES schedule_days(group_code, day) ON UPDATE CASCADE ON DELETE CASCADE
);
INSERT INTO schedule_lessons (group_code, day, period, start_time, end_time, room, subject, teacher)
  SELECT d.group_code, d.day, (l->>'period')::smallint,
         make_time((l->'start'->>0)::int, (l->'start'->>1)::int, 0), make_time((l->'end'->>0)::int, (l->'end'->>1)::int, 0),
         COALESCE(l->>'room', ''), l->>'subj', COALESCE(l->>'teacher', '')
  FROM schedule_days d, jsonb_array_elements(d.record->'lessons') AS l;
ALTER TABLE schedule_days DROP COLUMN record;

-- ── ДПО and circles ──────────────────────────────────────────────────────────
ALTER TABLE dpo_programs ADD COLUMN price_rub integer, ADD COLUMN hours_count integer, ADD COLUMN term_amount integer, ADD COLUMN term_unit text CHECK (term_unit IN ('days', 'weeks'));
UPDATE dpo_programs SET
  price_rub = NULLIF(regexp_replace(price, '[^0-9]', '', 'g'), '')::int,
  hours_count = NULLIF(regexp_replace(hours, '[^0-9]', '', 'g'), '')::int,
  term_amount = NULLIF(regexp_replace(term, '[^0-9]', '', 'g'), '')::int,
  term_unit = CASE WHEN term LIKE '%дн%' THEN 'days' WHEN term LIKE '%нед%' THEN 'weeks' END;
ALTER TABLE dpo_programs ALTER COLUMN hours_count SET NOT NULL, ALTER COLUMN term_amount SET NOT NULL, ALTER COLUMN term_unit SET NOT NULL;

CREATE TABLE dpo_materials (
  id         bigserial PRIMARY KEY,
  program_id text    NOT NULL REFERENCES dpo_programs(id) ON UPDATE CASCADE ON DELETE CASCADE,
  position   integer NOT NULL,
  name       text    NOT NULL,
  type       text    NOT NULL DEFAULT 'other',
  size       text    NOT NULL DEFAULT '',
  date_label text    NOT NULL DEFAULT ''        -- shown as written, e.g. «3 мая»
);
INSERT INTO dpo_materials (program_id, position, name, type, size, date_label)
  SELECT p.id, (o - 1)::int, m->>'name', COALESCE(m->>'type', 'other'), COALESCE(m->>'size', ''), COALESCE(m->>'date', '')
  FROM dpo_programs p, jsonb_array_elements(p.materials) WITH ORDINALITY AS t(m, o);

CREATE TABLE dpo_tests (
  id         bigserial PRIMARY KEY,
  program_id text    NOT NULL REFERENCES dpo_programs(id) ON UPDATE CASCADE ON DELETE CASCADE,
  position   integer NOT NULL,
  title      text    NOT NULL,
  status     text    NOT NULL DEFAULT 'available' CHECK (status IN ('passed', 'available', 'locked')),
  score      text,
  UNIQUE (program_id, position)
);
CREATE TABLE dpo_questions (
  id          bigserial PRIMARY KEY,
  test_id     bigint  NOT NULL REFERENCES dpo_tests(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  text        text    NOT NULL,
  correct_idx integer NOT NULL,
  UNIQUE (test_id, position)
);
CREATE TABLE dpo_options (
  question_id bigint  NOT NULL REFERENCES dpo_questions(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  text        text    NOT NULL,
  PRIMARY KEY (question_id, position)
);
INSERT INTO dpo_tests (program_id, position, title, status, score)
  SELECT p.id, (o - 1)::int, t->>'title', COALESCE(t->>'status', 'available'), t->>'score'
  FROM dpo_programs p, jsonb_array_elements(p.tests) WITH ORDINALITY AS x(t, o);
INSERT INTO dpo_questions (test_id, position, text, correct_idx)
  SELECT dt.id, (qo - 1)::int, q->>'q', (q->>'correct')::int
  FROM dpo_programs p
  CROSS JOIN LATERAL jsonb_array_elements(p.tests) WITH ORDINALITY AS x(t, o)
  JOIN dpo_tests dt ON dt.program_id = p.id AND dt.position = (x.o - 1)::int
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(x.t->'questions', '[]')) WITH ORDINALITY AS y(q, qo);
INSERT INTO dpo_options (question_id, position, text)
  SELECT dq.id, (z.oo - 1)::int, z.opt
  FROM dpo_programs p
  CROSS JOIN LATERAL jsonb_array_elements(p.tests) WITH ORDINALITY AS x(t, o)
  JOIN dpo_tests dt ON dt.program_id = p.id AND dt.position = (x.o - 1)::int
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(x.t->'questions', '[]')) WITH ORDINALITY AS y(q, qo)
  JOIN dpo_questions dq ON dq.test_id = dt.id AND dq.position = (y.qo - 1)::int
  CROSS JOIN LATERAL jsonb_array_elements_text(y.q->'options') WITH ORDINALITY AS z(opt, oo);

-- test results point at a test row, not at "program + index"
ALTER TABLE test_results ADD COLUMN test_id bigint REFERENCES dpo_tests(id) ON DELETE CASCADE;
UPDATE test_results r SET test_id = t.id FROM dpo_tests t WHERE t.program_id = r.program_id AND t.position = r.test_idx;
DELETE FROM test_results WHERE test_id IS NULL;
ALTER TABLE test_results DROP CONSTRAINT test_results_pkey;
ALTER TABLE test_results DROP COLUMN program_id, DROP COLUMN test_idx;
ALTER TABLE test_results ALTER COLUMN test_id SET NOT NULL;
ALTER TABLE test_results ADD PRIMARY KEY (user_id, test_id);

ALTER TABLE dpo_programs DROP COLUMN price, DROP COLUMN hours, DROP COLUMN term, DROP COLUMN materials, DROP COLUMN tests;

-- interests: junction tables instead of text[] columns
CREATE TABLE user_interests (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_id text NOT NULL REFERENCES interest_options(id) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);
CREATE TABLE program_interests (
  program_id  text NOT NULL REFERENCES dpo_programs(id) ON UPDATE CASCADE ON DELETE CASCADE,
  interest_id text NOT NULL REFERENCES interest_options(id) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (program_id, interest_id)
);
CREATE TABLE circle_interests (
  circle_id   text NOT NULL REFERENCES circles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  interest_id text NOT NULL REFERENCES interest_options(id) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (circle_id, interest_id)
);
INSERT INTO user_interests SELECT s.user_id, t FROM interest_surveys s, unnest(s.tags) AS t WHERE t IN (SELECT id FROM interest_options);
INSERT INTO program_interests SELECT p.id, t FROM dpo_programs p, unnest(p.tags) AS t WHERE t IN (SELECT id FROM interest_options);
INSERT INTO circle_interests SELECT c.id, t FROM circles c, unnest(c.tags) AS t WHERE t IN (SELECT id FROM interest_options);
ALTER TABLE interest_surveys DROP COLUMN tags;   -- the row now only records "survey was completed, when"
ALTER TABLE dpo_programs DROP COLUMN tags;
ALTER TABLE circles DROP COLUMN tags;

-- registrations: one table per kind, each with a real foreign key
CREATE TABLE dpo_registrations (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id text NOT NULL REFERENCES dpo_programs(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, program_id)
);
CREATE TABLE circle_registrations (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  circle_id  text NOT NULL REFERENCES circles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, circle_id)
);
INSERT INTO dpo_registrations (user_id, program_id, created_at) SELECT user_id, item_id, created_at FROM registrations WHERE kind = 'dpo' AND item_id IN (SELECT id FROM dpo_programs);
INSERT INTO circle_registrations (user_id, circle_id, created_at) SELECT user_id, item_id, created_at FROM registrations WHERE kind = 'circle' AND item_id IN (SELECT id FROM circles);
DROP TABLE registrations;

-- ── Applicants: typed columns instead of one blob ────────────────────────────
CREATE TABLE application_documents (
  application_id bigint NOT NULL,
  doc_key        text   NOT NULL,
  PRIMARY KEY (application_id, doc_key)
);
ALTER TABLE applications
  ADD COLUMN edu text, ADD COLUMN specialty text, ADD COLUMN method text, ADD COLUMN consent boolean NOT NULL DEFAULT false,
  ADD COLUMN status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'working', 'accepted', 'rejected'));
UPDATE applications SET edu = data->>'edu', specialty = data->>'spec', method = data->>'method', consent = COALESCE((data->>'consent')::boolean, false);
INSERT INTO application_documents SELECT a.id, d FROM applications a, jsonb_array_elements_text(COALESCE(a.data->'docs', '[]')) AS t(d) ON CONFLICT DO NOTHING;
ALTER TABLE application_documents ADD CONSTRAINT application_documents_fk FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
ALTER TABLE applications DROP COLUMN data;
ALTER TABLE applications ADD CONSTRAINT applications_consent_chk CHECK (consent);

-- ── Indexes for every foreign key that is searched by ────────────────────────
CREATE INDEX group_students_group_idx    ON group_students (group_code, position);
CREATE INDEX grade_records_student_idx   ON grade_records (student_id, subject_id);
CREATE INDEX attendance_student_idx      ON attendance_records (student_id, day);
CREATE INDEX teacher_groups_group_idx    ON teacher_groups (group_code);
CREATE INDEX dpo_materials_program_idx   ON dpo_materials (program_id, position);
CREATE INDEX notifications_user_idx      ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_aud_idx       ON notifications (audience, created_at DESC);
CREATE INDEX announcements_group_idx     ON announcements (group_code);
CREATE INDEX group_messages_group_idx    ON group_messages (group_code, created_at DESC);
CREATE INDEX appeals_user_idx            ON appeals (user_id, created_at DESC);
CREATE INDEX certificate_requests_user_idx ON certificate_requests (user_id);
CREATE INDEX consultations_user_idx      ON consultations (user_id, day);
CREATE INDEX document_history_user_idx   ON document_history (user_id, created_at DESC);
CREATE INDEX portfolio_items_user_idx    ON portfolio_items (user_id, category, position);
CREATE INDEX teacher_materials_user_idx  ON teacher_materials (user_id, subject_id);
CREATE INDEX admin_audit_time_idx        ON admin_audit (created_at DESC);
CREATE INDEX applications_status_idx     ON applications (status, created_at DESC);
