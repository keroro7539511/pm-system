-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_emails_client_id   ON emails(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at   ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_clients_domain     ON clients(domain);
