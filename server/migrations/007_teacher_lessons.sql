-- Migration 007: the academy's teachers' timetable (scripts/scrape_teachers.py → teacher_schedule.json).
-- It lists, for every day, every pair of every teacher with its group and room, so it also tells each group what
-- it has. Names are kept as the academy prints them ("Кошкин В.А."); an account is matched by surname + initials.
CREATE TABLE teacher_schedule_days (
  day          date PRIMARY KEY,
  weekday      text,
  generated_at timestamptz
);
CREATE TABLE teacher_lessons (
  id         bigserial PRIMARY KEY,
  day        date     NOT NULL REFERENCES teacher_schedule_days(day) ON DELETE CASCADE,
  corpus     text     NOT NULL,                 -- '1-2' | '3'
  period     smallint NOT NULL,                 -- pair number (0 exists in the 3rd building)
  teacher    text     NOT NULL,                 -- as printed
  group_name text     NOT NULL DEFAULT '',      -- as printed, normalised ДВ-41; '' when the timetable names none
  subject    text     NOT NULL DEFAULT '',      -- abbreviation; the 3rd building's sheet does not give it
  room       text     NOT NULL DEFAULT '',
  note       text     NOT NULL DEFAULT '',      -- "(зам)", "(2)", "(лр)"…
  start_time time,
  end_time   time
);
CREATE INDEX teacher_lessons_day_idx     ON teacher_lessons (day, period);
CREATE INDEX teacher_lessons_group_idx   ON teacher_lessons (group_name, day);
CREATE INDEX teacher_lessons_teacher_idx ON teacher_lessons (lower(split_part(teacher, ' ', 1)), day);
