export type ProjectStatus = "active" | "paused" | "completed";

export interface Project {
  id: number;
  name: string;
  client_id: number | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_at: string;
  task_count: number;
  done_count: number;
}

export interface CreateProjectPayload {
  name: string;
  client_id?: number;
  status?: ProjectStatus;
  start_date?: string;
  end_date?: string;
  description?: string;
}
