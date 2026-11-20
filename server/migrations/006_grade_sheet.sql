-- Migration 006: a mark belongs to a piece of work on a date, so saving the same sheet again updates it.
-- work_date: the day of the work (a teacher can enter marks for an earlier lesson).
ALTER TABLE grade_records ADD COLUMN work_date date NOT NULL DEFAULT current_date;
UPDATE grade_records SET work_date = created_at::date;
-- one mark per student, subject, kind of work and day; one absence per student, subject and day
CREATE UNIQUE INDEX grade_records_work_idx   ON grade_records (student_id, subject_id, kind, work_date) WHERE subject_id IS NOT NULL;
CREATE UNIQUE INDEX attendance_lesson_idx    ON attendance_records (student_id, subject_id, day) WHERE subject_id IS NOT NULL;
CREATE INDEX grade_records_sheet_idx         ON grade_records (subject_id, work_date);
