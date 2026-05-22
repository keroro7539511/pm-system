import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/tauri";
import { toast } from "@/stores/toastStore";
import { List, Kanban, Loader2, Plus, Search, CheckCircle2, Clock, Pencil, Trash2, Target } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskList } from "@/components/tasks/TaskList";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { ProjectFormDialog } from "@/components/tasks/ProjectFormDialog";
import { ProjectGoalsPanel } from "@/components/tasks/ProjectGoalsPanel";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import type { Task, Project, CreateTaskPayload, CreateProjectPayload, UpdateProjectPayload } from "@/types";

const STATUS_DOT: Record<string, string> = {
  active:    "bg-success",
  paused:    "bg-warning",
  completed: "bg-text-muted/50",
};

const STATUS_LABELS = {
  all:       "全部",
  active:    "進行",
  paused:    "暫停",
  completed: "完成",
} as const;

export function Tasks() {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [deletingTask, setDeletingTask] = useState<Task | undefined>();
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [deletingProject, setDeletingProject] = useState<Project | undefined>();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [notifyPending, setNotifyPending] = useState<{
    to: string; assignee: string; subject: string; body: string;
  } | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<keyof typeof STATUS_LABELS>("all");

  const isLoading = tasksLoading || projectsLoading;

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (statusFilter !== "all") result = result.filter((p) => p.status === statusFilter);
    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    return result;
  }, [projects, statusFilter, projectSearch]);

  const filteredTasks = useMemo(() => {
    const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    let result = selectedProjectId !== null
      ? tasks.filter((t) => t.project_id === selectedProjectId)
      : tasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.assignee ?? "").toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const aDone = a.status === "done" ? 1 : 0;
      const bDone = b.status === "done" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const prioDiff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      if (prioDiff !== 0) return prioDiff;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [tasks, selectedProjectId, searchQuery]);

  const handleStatusChange = useCallback((task: Task, status: import("@/types").TaskStatus) => {
    updateTask.mutate({ id: task.id, payload: {
      title: task.title, description: task.description ?? undefined,
      project_id: task.project_id ?? undefined, assignee: task.assignee ?? undefined,
      priority: task.priority, start_date: task.start_date ?? undefined,
      due_date: task.due_date ?? undefined, status, goal_id: task.goal_id ?? undefined,
    }});
  }, [updateTask]);

  const handleGoalChange = useCallback((task: Task, goalId: number | null) => {
    updateTask.mutate({ id: task.id, payload: {
      title: task.title, description: task.description ?? undefined,
      project_id: task.project_id ?? undefined, assignee: task.assignee ?? undefined,
      priority: task.priority, start_date: task.start_date ?? undefined,
      due_date: task.due_date ?? undefined, status: task.status, goal_id: goalId ?? undefined,
    }});
  }, [updateTask]);

  const handlePriorityChange = useCallback((task: Task, priority: import("@/types").Priority) => {
    updateTask.mutate({ id: task.id, payload: {
      title: task.title, description: task.description ?? undefined,
      project_id: task.project_id ?? undefined, assignee: task.assignee ?? undefined,
      priority, start_date: task.start_date ?? undefined,
      due_date: task.due_date ?? undefined, status: task.status, goal_id: task.goal_id ?? undefined,
    }});
  }, [updateTask]);

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  }, []);

  const handleFormClose = useCallback((open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingTask(undefined);
  }, []);

  const handleFormSubmit = useCallback((data: CreateTaskPayload, assigneeEmail?: string | null) => {
    const sendNotify = (task: import("@/types").Task, isNew: boolean) => {
      if (!isNew && (!data.assignee || data.assignee === editingTask?.assignee)) return;
      if (!settings.use_outlook || !task.assignee || !assigneeEmail) return;

      const projectName = task.project_id
        ? (projects.find((p) => p.id === task.project_id)?.name ?? null)
        : null;

      const subject = `[任務分派] ${task.title}`;
      const body = [
        `您好，${task.assignee}，`,
        ``,
        `您已被指派以下任務：`,
        ``,
        `任務：${task.title}`,
        task.description ? `說明：${task.description}` : null,
        projectName ? `專案：${projectName}` : null,
        `優先度：${task.priority}`,
        task.due_date ? `截止日：${task.due_date}` : null,
        ``,
        `此信件由 PM System 自動發送。`,
      ].filter(Boolean).join("\n");
      setNotifyPending({ to: assigneeEmail, assignee: task.assignee, subject, body });
    };

    if (editingTask) {
      updateTask.mutate(
        { id: editingTask.id, payload: { ...data } },
        { onSuccess: (updated) => { handleFormClose(false); sendNotify(updated, false); } }
      );
    } else {
      createTask.mutate(data, {
        onSuccess: (created) => { handleFormClose(false); sendNotify(created, true); },
      });
    }
  }, [editingTask, updateTask, createTask, handleFormClose, projects, settings]);

  const handleNotifyConfirm = useCallback(() => {
    if (!notifyPending) return;
    const { to, assignee, subject, body } = notifyPending;
    setNotifyPending(null);
    api.outlook.sendEmail(to, subject, body)
      .then(() => toast(`已寄信給 ${assignee}（${to}）`, "success"))
      .catch((e: unknown) => toast(`寄信失敗：${String(e)}`, "error"));
  }, [notifyPending]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deletingTask) return;
    deleteTask.mutate(deletingTask.id, {
      onSuccess: () => { setDeletingTask(undefined); toast(t("tasks.deleted"), "success"); },
    });
  }, [deletingTask, deleteTask, t]);

  const handleCreateProject = useCallback((data: CreateProjectPayload) => {
    createProject.mutate(data, {
      onSuccess: (project) => {
        setProjectFormOpen(false);
        setSelectedProjectId(project.id);
      },
    });
  }, [createProject]);

  const handleUpdateProject = useCallback((data: UpdateProjectPayload) => {
    if (!editingProject) return;
    updateProject.mutate(
      { id: editingProject.id, payload: data },
      { onSuccess: () => { setEditingProject(undefined); setProjectFormOpen(false); } }
    );
  }, [editingProject, updateProject]);

  const handleDeleteProjectConfirm = useCallback(() => {
    if (!deletingProject) return;
    deleteProject.mutate(deletingProject.id, {
      onSuccess: () => {
        if (selectedProjectId === deletingProject.id) setSelectedProjectId(null);
        setDeletingProject(undefined);
      },
    });
  }, [deletingProject, deleteProject, selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left project sidebar */}
      <div className="w-56 shrink-0 flex flex-col border-r border-border">
        {/* Sidebar header */}
        <div className="px-3 pt-4 pb-2 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">專案</span>
            <button
              onClick={() => setProjectFormOpen(true)}
              className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <input
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="搜尋專案..."
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md bg-layer-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          {/* Status filter */}
          <div className="flex gap-1">
            {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "flex-1 py-0.5 text-[10px] rounded font-medium transition-colors",
                  statusFilter === s ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text-secondary"
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
          {/* All projects row */}
          <button
            onClick={() => setSelectedProjectId(null)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors mb-1",
              selectedProjectId === null
                ? "bg-primary/10 text-primary"
                : "text-text-secondary hover:bg-layer-2 hover:text-text-primary"
            )}
          >
            <span className="flex-1 text-left truncate font-medium">全部專案</span>
            <span className={cn(
              "text-[10px] rounded px-1 py-0.5 font-normal shrink-0",
              selectedProjectId === null ? "bg-primary/20 text-primary" : "bg-layer-3 text-text-muted"
            )}>
              {tasks.length}
            </span>
          </button>

          {/* Individual project rows */}
          <div className="space-y-0.5">
            {filteredProjects.map((project) => {
              const pct = project.task_count > 0
                ? Math.round((project.done_count / project.task_count) * 100)
                : 0;
              const isSelected = selectedProjectId === project.id;
              return (
                <div
                  key={project.id}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors group cursor-pointer",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-layer-2 hover:text-text-primary"
                  )}
                  onClick={() => {
                    const next = isSelected ? null : project.id;
                    setSelectedProjectId(next);
                    if (next === null) setGoalsOpen(false);
                  }}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[project.status])} />
                  <span className="flex-1 text-left truncate">{project.name}</span>
                  {/* Hover: edit + delete icons */}
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                      className="w-4 h-4 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-layer-3"
                      onClick={(e) => { e.stopPropagation(); setEditingProject(project); setProjectFormOpen(true); }}
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button
                      className="w-4 h-4 rounded flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10"
                      onClick={(e) => { e.stopPropagation(); setDeletingProject(project); }}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {/* Default: progress badge */}
                  {pct === 100 && project.task_count > 0 ? (
                    <CheckCircle2 className="w-3 h-3 text-success shrink-0 group-hover:hidden" />
                  ) : project.task_count > 0 ? (
                    <span className={cn(
                      "group-hover:hidden text-[10px] rounded px-1 py-0.5 font-normal shrink-0",
                      isSelected ? "bg-primary/20 text-primary" : "bg-layer-3 text-text-muted"
                    )}>
                      {project.done_count}/{project.task_count}
                    </span>
                  ) : null}
                </div>
              );
            })}
            {filteredProjects.length === 0 && (
              <p className="text-[11px] text-text-muted text-center py-6">
                {projectSearch ? "無符合的專案" : "尚無專案"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden p-5 gap-3">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-text-primary truncate">
              {selectedProject ? selectedProject.name : t("tasks.title")}
            </h1>
            {selectedProject && (
              <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {selectedProject.start_date && `${selectedProject.start_date}`}
                {selectedProject.start_date && selectedProject.end_date && " → "}
                {selectedProject.end_date && `${selectedProject.end_date}`}
                {!selectedProject.start_date && !selectedProject.end_date && t("projects.noDates")}
              </p>
            )}
          </div>
          {selectedProject && (
            <Button
              size="sm"
              variant={goalsOpen ? "default" : "ghost"}
              className="h-7 px-2.5 text-xs gap-1.5 shrink-0"
              onClick={() => setGoalsOpen((v) => !v)}
            >
              <Target className="w-3 h-3" />
              驗收目標
            </Button>
          )}
        </div>

        {/* Task list / kanban + Goals panel */}
        <div className="flex flex-1 min-h-0 gap-0">
          <Tabs defaultValue="list" className="flex flex-col flex-1 min-h-0 min-w-0">
            <TabsList className="self-start">
              <TabsTrigger value="list">
                <List className="w-3.5 h-3.5" />
                {t("tasks.listView")}
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <Kanban className="w-3.5 h-3.5" />
                {t("tasks.kanbanView")}
              </TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
              </div>
            ) : (
              <>
                <TabsContent value="list" className="flex-1 overflow-auto min-h-0 mt-3">
                  <TaskList tasks={filteredTasks} onEdit={handleEdit} onDelete={setDeletingTask} onStatusChange={handleStatusChange} onGoalChange={handleGoalChange} onPriorityChange={handlePriorityChange} />
                </TabsContent>
                <TabsContent value="kanban" className="flex-1 overflow-hidden min-h-0 mt-3">
                  <KanbanBoard tasks={filteredTasks} onEdit={handleEdit} onDelete={setDeletingTask} />
                </TabsContent>
              </>
            )}
          </Tabs>

          {goalsOpen && selectedProject && (
            <ProjectGoalsPanel
              project={selectedProject}
              onClose={() => setGoalsOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Task form */}
      <TaskFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        task={editingTask}
        defaultProjectId={selectedProjectId ?? undefined}
        onSubmit={handleFormSubmit}
        loading={createTask.isPending || updateTask.isPending}
      />

      {/* Local mail notify confirmation */}
      <Dialog open={!!notifyPending} onOpenChange={(open) => !open && setNotifyPending(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>寄送通知信件</DialogTitle>
            <DialogDescription>
              是否透過本機郵件應用程式寄信通知負責人？
            </DialogDescription>
          </DialogHeader>
          {notifyPending && (
            <div className="rounded-lg border border-border bg-layer-2 px-4 py-3 text-sm space-y-1">
              <p><span className="text-text-muted">收件人：</span><span className="text-text-primary">{notifyPending.assignee}</span></p>
              <p><span className="text-text-muted">Email：</span><span className="text-text-primary">{notifyPending.to}</span></p>
              <p><span className="text-text-muted">主旨：</span><span className="text-text-primary">{notifyPending.subject}</span></p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNotifyPending(null)}>跳過</Button>
            <Button onClick={handleNotifyConfirm}>寄送</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete task confirmation */}
      <Dialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(undefined)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("tasks.deleteTask")}</DialogTitle>
            <DialogDescription>{t("tasks.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingTask(undefined)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteTask.isPending}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project form (create or edit) */}
      <ProjectFormDialog
        open={projectFormOpen}
        onOpenChange={(open) => {
          setProjectFormOpen(open);
          if (!open) setEditingProject(undefined);
        }}
        project={editingProject}
        onCreate={handleCreateProject}
        onUpdate={handleUpdateProject}
        loading={createProject.isPending || updateProject.isPending}
      />

      {/* Delete project confirmation */}
      <Dialog open={!!deletingProject} onOpenChange={(open) => !open && setDeletingProject(undefined)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("projects.deleteProject")}</DialogTitle>
            <DialogDescription>{t("projects.deleteProjectConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingProject(undefined)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteProjectConfirm} disabled={deleteProject.isPending}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
