-- Migration 013: a coursework topic can offer tasks to choose from. Each task is taken by one student: the student's
-- work on the topic points at it. A student first books a task ("booked"), then hands in the file.
CREATE TABLE coursework_choices (
  id       bigserial PRIMARY KEY,
  topic_id bigint    NOT NULL REFERENCES coursework_topics(id) ON DELETE CASCADE,
  position integer   NOT NULL,
  title    text      NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
  UNIQUE (topic_id, position)
);
ALTER TABLE coursework_works DROP CONSTRAINT coursework_works_status_check;
ALTER TABLE coursework_works ADD CONSTRAINT coursework_works_status_check CHECK (status IN ('booked', 'submitted', 'revision', 'accepted'));
ALTER TABLE coursework_works ADD COLUMN choice_id bigint REFERENCES coursework_choices(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX coursework_works_choice_idx ON coursework_works (choice_id) WHERE choice_id IS NOT NULL;
