-- PM System SQLite schema v1

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    industry TEXT,
    priority INTEGER DEFAULT 2,
    last_contact_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    status TEXT DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    project_id INTEGER REFERENCES projects(id),
    assignee TEXT,
    priority TEXT DEFAULT 'P2',
    status TEXT DEFAULT 'todo',
    due_date DATE,
    estimated_hours REAL,
    actual_hours REAL,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    project_id INTEGER REFERENCES projects(id),
    target_date DATE,
    completion_rate REAL DEFAULT 0,
    status TEXT DEFAULT 'on_track'
);

CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gmail_id TEXT UNIQUE,
    subject TEXT,
    sender TEXT,
    body TEXT,
    ai_summary TEXT,
    category TEXT,
    status TEXT DEFAULT 'unread',
    client_id INTEGER REFERENCES clients(id),
    received_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    source_email_id INTEGER REFERENCES emails(id),
    client_id INTEGER REFERENCES clients(id),
    priority TEXT DEFAULT 'P2',
    status TEXT DEFAULT 'new',
    assignee TEXT,
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT,
    severity TEXT,
    status TEXT DEFAULT 'open',
    project_id INTEGER REFERENCES projects(id),
    assignee TEXT,
    reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
);

CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    attendees TEXT,
    type TEXT,
    transcript TEXT,
    ai_summary TEXT
);

CREATE TABLE IF NOT EXISTS action_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER REFERENCES meetings(id),
    description TEXT NOT NULL,
    assignee TEXT,
    due_date DATE,
    task_id INTEGER REFERENCES tasks(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    version TEXT,
    file_path TEXT,
    content_md TEXT,
    client_id INTEGER REFERENCES clients(id),
    project_id INTEGER REFERENCES projects(id),
    expires_at DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS automation_flows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    n8n_webhook_url TEXT,
    trigger_type TEXT,
    is_active INTEGER DEFAULT 1,
    last_run_at DATETIME,
    last_status TEXT
);

CREATE TABLE IF NOT EXISTS automation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flow_id INTEGER REFERENCES automation_flows(id),
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT,
    input_json TEXT,
    output_json TEXT,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_received ON emails(received_at);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Seed data for development
INSERT OR IGNORE INTO projects (id, name, status, description, start_date, end_date)
VALUES
  (1, 'ERP 系統導入', 'active', '企業資源規劃系統升級', '2026-03-01', '2026-08-31'),
  (2, '官網改版', 'active', '公司官方網站全面翻新', '2026-04-01', '2026-06-30'),
  (3, 'CRM 整合', 'paused', '客戶關係管理系統整合', '2026-01-15', '2026-05-31');

INSERT OR IGNORE INTO tasks (id, title, description, project_id, priority, status, due_date, estimated_hours, assignee)
VALUES
  (1, '需求訪談', '與各部門 PM 進行需求訪談', 1, 'P1', 'done', '2026-04-10', 8, 'Yang'),
  (2, '系統架構設計', '設計新 ERP 系統架構圖', 1, 'P0', 'in_progress', '2026-05-15', 24, 'Yang'),
  (3, 'UI/UX 設計稿', '完成所有頁面的設計稿', 2, 'P1', 'in_progress', '2026-05-20', 40, 'Designer'),
  (4, 'API 串接規格書', '撰寫前後端 API 規格', 1, 'P2', 'todo', '2026-05-30', 16, 'Yang'),
  (5, '測試計畫書', '制定 QA 測試計畫', 1, 'P2', 'todo', '2026-06-10', 8, 'QA'),
  (6, '首頁 RWD 開發', '響應式首頁開發', 2, 'P1', 'todo', '2026-06-01', 20, 'Dev'),
  (7, '客戶資料遷移', '將舊系統資料遷移到新 CRM', 3, 'P0', 'review', '2026-05-05', 32, 'Yang'),
  (8, '使用者培訓', '舉辦系統使用培訓課程', 1, 'P3', 'todo', '2026-07-01', 16, 'Yang');
