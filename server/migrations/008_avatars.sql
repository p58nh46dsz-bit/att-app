-- Migration 008: a profile picture per account. The picture is shrunk to 256x256 in the browser and kept as a
-- small JPEG data URL (about 15-30 kB); one row per user, deleted with the account.
CREATE TABLE user_avatars (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  image      text NOT NULL CHECK (image LIKE 'data:image/jpeg;base64,%' AND length(image) <= 120000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
