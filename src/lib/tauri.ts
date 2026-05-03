import { invoke } from "@tauri-apps/api/core";
import type {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskStats,
  Project,
  CreateProjectPayload,
  Client,
  CreateClientPayload,
  UpdateClientPayload,
  Email,
  UpdateEmailPayload,
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

  clients: {
    getAll: () => invoke<Client[]>("get_clients"),
    create: (payload: CreateClientPayload) => invoke<Client>("create_client", { payload }),
    update: (id: number, payload: UpdateClientPayload) => invoke<Client>("update_client", { id, payload }),
    delete: (id: number) => invoke<void>("delete_client", { id }),
  },

  emails: {
    getAll: (clientId?: number, status?: string) =>
      invoke<Email[]>("get_emails", { clientId: clientId ?? null, status: status ?? null }),
    update: (id: number, payload: UpdateEmailPayload) => invoke<Email>("update_email", { id, payload }),
    markRead: (id: number) => invoke<void>("mark_email_read", { id }),
    unreadCount: () => invoke<number>("get_unread_count"),
  },

  settings: {
    get: () => invoke<AppSettings>("get_settings"),
    save: (settings: AppSettings) => invoke<void>("save_settings", { settings }),
    testN8n: (url: string) => invoke<boolean>("test_n8n_connection", { url }),
  },
};
