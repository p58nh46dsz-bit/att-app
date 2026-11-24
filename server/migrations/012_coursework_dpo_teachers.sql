-- Migration 012: coursework (topics a teacher gives to a group, the students' works, marks) and teachers of
-- the ДПО programmes (a teacher leads a programme: students who signed up, materials, tests).

-- Coursework: a topic belongs to one teacher and one group; every student of the group has at most one work on it.
CREATE TABLE coursework_topics (
  id         bigserial   PRIMARY KEY,
  teacher_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_name text        NOT NULL,
  subject_id integer     REFERENCES subjects(id) ON DELETE SET NULL,
  title      text        NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  descr      text        NOT NULL DEFAULT '' CHECK (length(descr) <= 2000),
  due        date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coursework_topics_teacher_idx ON coursework_topics (teacher_id, created_at DESC);
CREATE INDEX coursework_topics_group_idx   ON coursework_topics (group_name);

-- status: submitted (waiting for the teacher), revision (sent back), accepted (the mark is set)
CREATE TABLE coursework_works (
  id           bigserial   PRIMARY KEY,
  topic_id     bigint      NOT NULL REFERENCES coursework_topics(id) ON DELETE CASCADE,
  student_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  mime         text        NOT NULL DEFAULT '',
  bytes        integer,
  stored       boolean     NOT NULL DEFAULT false,
  status       text        NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'revision', 'accepted')),
  grade        smallint    CHECK (grade BETWEEN 2 AND 5),
  comment      text        NOT NULL DEFAULT '' CHECK (length(comment) <= 1000),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (topic_id, student_id)
);

-- a coursework mark also lands in the student's marks (kind "Курсовая"); the link lets a changed mark replace the old one
ALTER TABLE grade_records ADD COLUMN coursework_work_id bigint UNIQUE REFERENCES coursework_works(id) ON DELETE CASCADE;

-- ДПО: who leads which programme, and the files of the programme's materials
CREATE TABLE dpo_program_teachers (
  program_id text NOT NULL REFERENCES dpo_programs(id) ON UPDATE CASCADE ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (program_id, teacher_id)
);
ALTER TABLE dpo_materials ADD COLUMN mime text NOT NULL DEFAULT '', ADD COLUMN stored boolean NOT NULL DEFAULT false;
