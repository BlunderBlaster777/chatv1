CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS channels (
  id          TEXT PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  type        TEXT NOT NULL DEFAULT 'public',
  created_by  TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS channel_members (
  channel_id TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  joined_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (channel_id, user_id),
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id             TEXT PRIMARY KEY,
  channel_id     TEXT NOT NULL,
  user_id        TEXT NOT NULL,
  content        TEXT NOT NULL,
  attachment_url TEXT,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at DESC);

INSERT OR IGNORE INTO users (id, username, password_hash, salt)
VALUES ('system', 'system', '', '');

INSERT OR IGNORE INTO channels (id, name, description, type, created_by) VALUES
  ('ch_general', 'general', 'General chat for everyone', 'public', 'system'),
  ('ch_gaming',  'gaming',  'Talk about games',          'public', 'system'),
  ('ch_random',  'random',  'Random off-topic stuff',    'public', 'system');
