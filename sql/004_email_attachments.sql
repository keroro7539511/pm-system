CREATE TABLE IF NOT EXISTS email_attachments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id    INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  filename    TEXT    NOT NULL,
  file_path   TEXT    NOT NULL,
  mime_type   TEXT,
  size        INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
