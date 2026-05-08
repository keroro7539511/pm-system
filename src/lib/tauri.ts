import { invoke } from "@tauri-apps/api/core";
import type {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskStats,
  TaskTrendPoint,
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  Client,
  CreateClientPayload,
  UpdateClientPayload,
  Contact,
  CreateContactPayload,
  UpdateContactPayload,
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  Email,
  EmailAttachment,
  UpdateEmailPayload,
  Document,
  CreateDocumentPayload,
  UpdateDocumentPayload,
  WeeklyReport,
  AppSettings,
  ProjectGoal,
  GoalWithStats,
  CreateGoalPayload,
  UpdateGoalPayload,
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
    trend: () => invoke<TaskTrendPoint[]>("get_task_trend"),
  },

  projects: {
    getAll: () => invoke<Project[]>("get_projects"),
    create: (payload: CreateProjectPayload) =>
      invoke<Project>("create_project", { payload }),
    update: (id: number, payload: UpdateProjectPayload) =>
      invoke<Project>("update_project", { id, payload }),
    delete: (id: number) => invoke<void>("delete_project", { id }),
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
    delete: (id: number) => invoke<void>("delete_email", { id }),
    update: (id: number, payload: UpdateEmailPayload) => invoke<Email>("update_email", { id, payload }),
    markRead: (id: number) => invoke<void>("mark_email_read", { id }),
    unreadCount: () => invoke<number>("get_unread_count"),
  },

  contacts: {
    getAll: (projectId?: number | null, search?: string) =>
      invoke<Contact[]>("get_contacts", { projectId: projectId ?? null, search: search ?? null }),
    create: (payload: CreateContactPayload) =>
      invoke<Contact>("create_contact", { payload }),
    update: (id: number, payload: UpdateContactPayload) =>
      invoke<Contact>("update_contact", { id, payload }),
    delete: (id: number) => invoke<void>("delete_contact", { id }),
  },

  employees: {
    getAll: (search?: string) =>
      invoke<Employee[]>("get_employees", { search: search ?? null }),
    create: (payload: CreateEmployeePayload) =>
      invoke<Employee>("create_employee", { payload }),
    upsert: (payload: CreateEmployeePayload) =>
      invoke<Employee>("upsert_employee", { payload }),
    update: (id: number, payload: UpdateEmployeePayload) =>
      invoke<Employee>("update_employee", { id, payload }),
    delete: (id: number) => invoke<void>("delete_employee", { id }),
  },

  documents: {
    getAll: (search?: string) =>
      invoke<Document[]>("get_documents", { search: search ?? null }),
    create: (payload: CreateDocumentPayload) =>
      invoke<Document>("create_document", { payload }),
    update: (id: number, payload: UpdateDocumentPayload) =>
      invoke<Document>("update_document", { id, payload }),
    delete: (id: number) => invoke<void>("delete_document", { id }),
  },

  reports: {
    weekly: () => invoke<WeeklyReport>("generate_weekly_report"),
    export: (savePath: string) => invoke<void>("export_data", { savePath }),
    exportExcel: (savePath: string) => invoke<void>("export_weekly_excel", { savePath }),
    checkUpdates: () => invoke<string>("check_for_updates"),
  },

  settings: {
    get: () => invoke<AppSettings>("get_settings"),
    save: (settings: AppSettings) => invoke<void>("save_settings", { settings }),
    testN8n: (url: string) => invoke<boolean>("test_n8n_connection", { url }),
  },

  outlook: {
    sendEmail: (to: string, subject: string, body: string) =>
      invoke<void>("send_outlook_email", { to, subject, body }),
  },

  notifications: {
    taskAssigned: (params: {
      taskId: number;
      taskTitle: string;
      description?: string | null;
      assignee?: string | null;
      assigneeEmail?: string | null;
      priority?: string | null;
      status?: string | null;
      projectName?: string | null;
      startDate?: string | null;
      dueDate?: string | null;
    }) =>
      invoke<boolean>("notify_task_assigned", {
        payload: {
          taskId:       params.taskId,
          taskTitle:    params.taskTitle,
          description:  params.description   ?? null,
          assignee:     params.assignee      ?? null,
          assigneeEmail: params.assigneeEmail ?? null,
          priority:     params.priority      ?? null,
          status:       params.status        ?? null,
          projectName:  params.projectName   ?? null,
          startDate:    params.startDate     ?? null,
          dueDate:      params.dueDate       ?? null,
        },
      }),
  },

  goals: {
    getAll: (projectId?: number) =>
      invoke<GoalWithStats[]>("get_all_goals", { projectId: projectId ?? null }),
    getForProject: (projectId: number) =>
      invoke<ProjectGoal[]>("get_project_goals", { projectId }),
    create: (payload: CreateGoalPayload) =>
      invoke<ProjectGoal>("create_project_goal", { payload }),
    update: (id: number, payload: UpdateGoalPayload) =>
      invoke<ProjectGoal>("update_project_goal", { id, payload }),
    delete: (id: number) => invoke<void>("delete_project_goal", { id }),
  },

  ai: {
    generateEmailDraft: (subject: string, sender: string, body: string) =>
      invoke<string>("generate_email_draft", { subject, sender, body }),
  },

  attachments: {
    getForEmail: (emailId: number) =>
      invoke<EmailAttachment[]>("get_email_attachments", { emailId }),
    open: (path: string) =>
      invoke<void>("open_attachment", { path }),
    readBase64: (path: string) =>
      invoke<string>("read_attachment_base64", { path }),
  },
};
