-- Migration 009: materials a teacher attaches to one particular pair (a day, a group, a pair number),
-- from the pair's sheet on the dashboard. As with teacher_materials, only the file's name and size are kept
-- until file storage arrives.
CREATE TABLE lesson_materials (
  id         bigserial   PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        date        NOT NULL,
  group_name text        NOT NULL,
  period     smallint    NOT NULL CHECK (period BETWEEN 0 AND 8),
  name       text        NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  type       text        NOT NULL DEFAULT 'other',
  size       text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lesson_materials_user_day_idx ON lesson_materials (user_id, day);
