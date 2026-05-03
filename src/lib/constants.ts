import type { Priority, TaskStatus } from "@/types";

export const PRIORITY_COLORS: Record<Priority, string> = {
  P0: "bg-danger/20 text-danger border-danger/40",
  P1: "bg-warning/20 text-warning border-warning/40",
  P2: "bg-primary/20 text-primary border-primary/40",
  P3: "bg-text-muted/20 text-text-muted border-text-muted/40",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-text-muted/20 text-text-secondary border-text-muted/40",
  in_progress: "bg-primary/20 text-primary border-primary/40",
  review: "bg-purple/20 text-purple border-purple/40",
  done: "bg-success/20 text-success border-success/40",
  overdue: "bg-danger/20 text-danger border-danger/40",
};

export const KANBAN_COLUMNS: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export const NAV_ITEMS = [
  { key: "dashboard", icon: "LayoutDashboard", path: "/" },
  { key: "tasks", icon: "CheckSquare", path: "/tasks" },
  { key: "emails", icon: "Mail", path: "/emails" },
  { key: "calendar", icon: "Calendar", path: "/calendar" },
  { key: "reports", icon: "BarChart3", path: "/reports" },
  { key: "documents", icon: "FolderOpen", path: "/documents" },
  { key: "settings", icon: "Settings", path: "/settings" },
] as const;
