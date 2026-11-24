-- Migration 017: files attached to a DPO topic's programme (the teacher adds them while the topic is a draft or returned).
CREATE TABLE dpo_topic_files (
  id         bigserial   PRIMARY KEY,
  topic_id   bigint      NOT NULL REFERENCES dpo_topics(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  mime       text        NOT NULL DEFAULT '',
  bytes      integer     NOT NULL DEFAULT 0,
  stored     boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dpo_topic_files_topic_idx ON dpo_topic_files (topic_id);
