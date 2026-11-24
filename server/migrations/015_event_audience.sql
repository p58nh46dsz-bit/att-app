-- Migration 015: who sees an administration event. 'all' = students and teachers, 'student' / 'teacher' = one side only,
-- 'staff' = only the administration (their dashboard), no notification to students or teachers.
ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';
ALTER TABLE admin_events DROP CONSTRAINT IF EXISTS admin_events_audience_check;
ALTER TABLE admin_events ADD CONSTRAINT admin_events_audience_check CHECK (audience IN ('all', 'student', 'teacher', 'staff'));
