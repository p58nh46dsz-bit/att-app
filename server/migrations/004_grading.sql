-- Migration 004: grading by subject, and accounts created while grading.
-- subjects.gradable: which subjects a teacher can put marks in (a "Консультация" is not a graded subject).
ALTER TABLE subjects ADD COLUMN gradable boolean NOT NULL DEFAULT true;
UPDATE subjects SET gradable = false WHERE name = 'Консультация';
-- users.name_incomplete: the account was created automatically from a roster entry that has only initials
-- («Аветисян С.К.»); an administrator completes the full name and gives the student the login and password.
ALTER TABLE users ADD COLUMN name_incomplete boolean NOT NULL DEFAULT false;
-- users_v is rebuilt so it exposes the new column (a view fixes its column list when created).
DROP VIEW users_v;
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
