CREATE TABLE IF NOT EXISTS gmail_tokens (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    access_token  TEXT    NOT NULL,
    refresh_token TEXT,
    expires_at    INTEGER NOT NULL,
    email         TEXT,
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
