-- Migration 016: the role "methodist" (методист) and DPO course topics. A teacher writes a topic with its programme and
-- sends it to the methodist. The methodist returns it for rework (with a remark) or approves it. An approved topic goes
-- to a deputy director (a staff account), who sees it on the administration's dashboard.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'teacher', 'admin', 'staff', 'methodist'));

CREATE TABLE dpo_topics (
  id           bigserial   PRIMARY KEY,
  teacher_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  category     text        NOT NULL DEFAULT '',
  hours        integer     CHECK (hours IS NULL OR hours > 0),
  programme    text        NOT NULL DEFAULT '',
  status       text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'returned', 'approved', 'sent')),
  remark       text        NOT NULL DEFAULT '',
  recipient_id uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  sent_at      timestamptz
);
CREATE INDEX dpo_topics_teacher_idx ON dpo_topics (teacher_id);
