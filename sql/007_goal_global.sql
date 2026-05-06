-- Recreate project_goals with nullable project_id (global goals support)
CREATE TABLE IF NOT EXISTS project_goals_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  is_done     INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO project_goals_new SELECT * FROM project_goals;
DROP TABLE project_goals;
ALTER TABLE project_goals_new RENAME TO project_goals;
CREATE INDEX IF NOT EXISTS idx_project_goals_project ON project_goals(project_id);
