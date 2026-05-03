import { invoke } from "@tauri-apps/api/core";
import type {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskStats,
  Project,
  CreateProjectPayload,
  AppSettings,
} from "@/types";

export const api = {
  tasks: {
    getAll: (status?: string) =>
      invoke<Task[]>("get_tasks", { status: status ?? null }),

    create: (payload: CreateTaskPayload) =>
      invoke<Task>("create_task", { payload }),

    update: (id: number, payload: UpdateTaskPayload) =>
      invoke<Task>("update_task", { id, payload }),

    delete: (id: number) => invoke<void>("delete_task", { id }),

    stats: () => invoke<TaskStats>("get_task_stats"),
  },

  projects: {
    getAll: () => invoke<Project[]>("get_projects"),
    create: (payload: CreateProjectPayload) =>
      invoke<Project>("create_project", { payload }),
  },

  settings: {
    get: () => invoke<AppSettings>("get_settings"),
    save: (settings: AppSettings) => invoke<void>("save_settings", { settings }),
    testN8n: (url: string) => invoke<boolean>("test_n8n_connection", { url }),
  },
};
