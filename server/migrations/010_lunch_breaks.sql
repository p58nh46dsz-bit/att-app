-- Migration 010: lunch of the 1st–2nd buildings, per group and day. The teacher of the group's 2nd pair says whether
-- the pair breaks for lunch (11:30–12:20, the pair then runs 10:50–11:30 and 12:20–13:10) or lunch follows it
-- (12:20–13:25); the group's students see the same times.
CREATE TABLE lunch_breaks (
  day        date        NOT NULL,
  group_name text        NOT NULL,
  split      boolean     NOT NULL,
  teacher_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, group_name)
);
