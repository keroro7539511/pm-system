export interface ProjectGoal {
  id: number;
  project_id: number | null;
  title: string;
  description: string | null;
  is_done: boolean;
  sort_order: number;
  created_at: string;
}

export interface GoalWithStats {
  id: number;
  project_id: number | null;
  project_name: string | null;
  title: string;
  description: string | null;
  is_done: boolean;
  sort_order: number;
  task_count: number;
  done_count: number;
  created_at: string;
}

export interface CreateGoalPayload {
  project_id: number | null;
  title: string;
  description?: string;
}

export interface UpdateGoalPayload {
  title?: string;
  description?: string | null;
  is_done?: boolean;
}
