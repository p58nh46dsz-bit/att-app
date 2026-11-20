-- Migration 005: which subject a teacher teaches to which group, and an audit kind for group changes.
-- A teacher first chooses a group (teacher_groups, already there), then names the subjects they teach to it.
CREATE TABLE teacher_assignments (
  teacher_id uuid    NOT NULL,
  group_code text    NOT NULL,
  subject_id integer NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, group_code, subject_id),
  FOREIGN KEY (teacher_id, group_code) REFERENCES teacher_groups(teacher_id, group_code) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX teacher_assignments_group_idx   ON teacher_assignments (group_code);
CREATE INDEX teacher_assignments_subject_idx ON teacher_assignments (subject_id);
ALTER TABLE admin_audit DROP CONSTRAINT admin_audit_kind_check;
ALTER TABLE admin_audit ADD CONSTRAINT admin_audit_kind_check CHECK (kind IN ('account', 'news', 'certificate', 'appeal', 'event', 'group'));
