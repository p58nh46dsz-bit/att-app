-- Migration 011: the file itself for a material attached to a pair. The bytes live on the server's disk
-- (FILES_DIR/lesson/<id>); the row keeps the type and size and whether the file has arrived.
ALTER TABLE lesson_materials
  ADD COLUMN mime   text    NOT NULL DEFAULT '',
  ADD COLUMN bytes  integer,
  ADD COLUMN stored boolean NOT NULL DEFAULT false;
CREATE INDEX lesson_materials_group_day_idx ON lesson_materials (group_name, day);
