export type Priority = "P0" | "P1" | "P2" | "P3";
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "overdue";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  project_id: number | null;
  goal_id: number | null;
  assignee: string | null;
  priority: Priority;
  status: TaskStatus;
  start_date: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  tags: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  project_id?: number;
  goal_id?: number;
  assignee?: string;
  priority?: Priority;
  status?: TaskStatus;
  start_date?: string;
  due_date?: string;
  estimated_hours?: number;
  tags?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  project_id?: number | null;
  goal_id?: number | null;
  assignee?: string | null;
  priority?: Priority;
  status?: TaskStatus;
  start_date?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  tags?: string | null;
  completed_at?: string | null;
}

export interface TaskStats {
  total: number;
  done: number;
  in_progress: number;
  todo: number;
  overdue: number;
}

export interface TaskTrendPoint {
  week: string;
  completed: number;
  created: number;
}
