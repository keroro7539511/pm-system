export interface Document {
  id: number;
  name: string;
  doc_type: string | null;
  version: string | null;
  file_path: string | null;
  content_md: string | null;
  client_id: number | null;
  project_id: number | null;
  expires_at: string | null;
  created_at: string;
}

export interface CreateDocumentPayload {
  name: string;
  doc_type?: string;
  version?: string;
  content_md?: string;
  client_id?: number;
  project_id?: number;
  expires_at?: string;
}

export interface UpdateDocumentPayload {
  name?: string;
  doc_type?: string;
  version?: string;
  content_md?: string;
  client_id?: number;
  project_id?: number;
  expires_at?: string;
}

export interface WeeklyReport {
  period_start: string;
  period_end: string;
  tasks_completed: number;
  tasks_created: number;
  tasks_overdue: number;
  emails_received: number;
  emails_replied: number;
  emails_done: number;
  emails_pending: number;
  emails_converted: number;
  active_projects: ProjectSummary[];
  highlights: string[];
}

export interface ProjectSummary {
  name: string;
  status: string;
  progress_pct: number;
  task_count: number;
  done_count: number;
}
