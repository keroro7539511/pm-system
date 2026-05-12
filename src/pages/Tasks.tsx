import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/tauri";
import { toast } from "@/stores/toastStore";
import { List, Kanban, Loader2, FolderPlus, CheckCircle2, Clock, Pencil, Trash2, Target } from "lucide-react";
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

const STATUS_ACCENT: Record<string, string> = {
  active:    "bg-success/15 text-success border-success/25",
  paused:    "bg-warning/15 text-warning border-warning/25",
  completed: "bg-text-muted/15 text-text-muted border-text-muted/25",
};

function ProjectChip({
  project,
  selected,
  onClick,
}: {
  project: Project;
  selected: boolean;
  onClick: () => void;
}) {
  const pct = project.task_count > 0
    ? Math.round((project.done_count / project.task_count) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors shrink-0",
        selected
          ? "bg-primary/15 border-primary/40 text-primary"
          : "border-border text-text-secondary hover:bg-layer-2 hover:text-text-primary"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_ACCENT[project.status]?.split(" ")[0])} />
      <span className="max-w-[120px] truncate">{project.name}</span>
      {project.task_count > 0 && (
        <span className={cn(
          "text-[10px] rounded px-1 py-0.5 font-normal",
          selected ? "bg-primary/20 text-primary" : "bg-layer-3 text-text-muted"
        )}>
          {project.done_count}/{project.task_count}
        </span>
      )}
      {project.task_count > 0 && pct === 100 && (
        <CheckCircle2 className="w-3 h-3 text-success" />
      )}
    </button>
  );
}

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

  const isLoading = tasksLoading || projectsLoading;

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

  function taskBasePayload(task: Task) {
    return {
      title:       task.title,
      description: task.description   ?? undefined,
      project_id:  task.project_id    ?? undefined,
      assignee:    task.assignee      ?? undefined,
      priority:    task.priority,
      start_date:  task.start_date    ?? undefined,
      due_date:    task.due_date      ?? undefined,
      status:      task.status,
      goal_id:     task.goal_id       ?? undefined,
    } as const;
  }

  function handleStatusChange(task: Task, status: import("@/types").TaskStatus) {
    updateTask.mutate({ id: task.id, payload: { ...taskBasePayload(task), status } });
  }

  function handleGoalChange(task: Task, goalId: number | null) {
    updateTask.mutate({ id: task.id, payload: { ...taskBasePayload(task), goal_id: goalId } });
  }

  function handlePriorityChange(task: Task, priority: import("@/types").Priority) {
    updateTask.mutate({ id: task.id, payload: { ...taskBasePayload(task), priority } });
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingTask(undefined);
  }

  function handleFormSubmit(data: CreateTaskPayload, assigneeEmail?: string | null) {
    const sendNotify = (task: import("@/types").Task) => {
      const projectName = task.project_id
        ? (projects.find((p) => p.id === task.project_id)?.name ?? null)
        : null;

      // Outlook email via PowerShell — ask for confirmation first
      if (settings.use_outlook && task.assignee && assigneeEmail) {
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
      }

      api.notifications.taskAssigned({
        taskId:        task.id,
        taskTitle:     task.title,
        description:   task.description,
        assignee:      task.assignee,
        assigneeEmail: assigneeEmail ?? null,
        priority:      task.priority,
        status:        task.status,
        projectName,
        startDate:     task.start_date,
        dueDate:       task.due_date,
      })
        .then((sent) => {
          if (!sent) {
            if (task.assignee && !settings.use_outlook) {
              toast("任務已建立，但通知未發送 — 請至設定頁填入「任務指派通知 Webhook URL」並儲存", "info");
            }
            return;
          }
          if (task.assignee) {
            toast(`已通知 ${task.assignee}（${assigneeEmail ?? "無 Email"}）`, "success");
          }
        })
        .catch((e: unknown) => toast(`Webhook 發送失敗：${String(e)}`, "error"));
    };

    if (editingTask) {
      updateTask.mutate(
        { id: editingTask.id, payload: { ...data } },
        { onSuccess: (updated) => { handleFormClose(false); sendNotify(updated); } }
      );
    } else {
      createTask.mutate(data, {
        onSuccess: (created) => { handleFormClose(false); sendNotify(created); },
      });
    }
  }

  function handleNotifyConfirm() {
    if (!notifyPending) return;
    const { to, assignee, subject, body } = notifyPending;
    setNotifyPending(null);
    api.outlook.sendEmail(to, subject, body)
      .then(() => toast(`Outlook 已寄信給 ${assignee}（${to}）`, "success"))
      .catch((e: unknown) => toast(`Outlook 寄信失敗：${String(e)}`, "error"));
  }

  function handleDeleteConfirm() {
    if (!deletingTask) return;
    deleteTask.mutate(deletingTask.id, { onSuccess: () => setDeletingTask(undefined) });
  }

  function handleCreateProject(data: CreateProjectPayload) {
    createProject.mutate(data, {
      onSuccess: (project) => {
        setProjectFormOpen(false);
        setSelectedProjectId(project.id);
      },
    });
  }

  function handleUpdateProject(data: UpdateProjectPayload) {
    if (!editingProject) return;
    updateProject.mutate(
      { id: editingProject.id, payload: data },
      { onSuccess: () => { setEditingProject(undefined); setProjectFormOpen(false); } }
    );
  }

  function handleDeleteProjectConfirm() {
    if (!deletingProject) return;
    deleteProject.mutate(deletingProject.id, {
      onSuccess: () => {
        if (selectedProjectId === deletingProject.id) setSelectedProjectId(null);
        setDeletingProject(undefined);
      },
    });
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex flex-col h-full overflow-hidden p-5 gap-3">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-lg font-semibold text-text-primary">{t("tasks.title")}</h1>
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

      {/* Project filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
        {/* All */}
        <button
          onClick={() => setSelectedProjectId(null)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors shrink-0",
            selectedProjectId === null
              ? "bg-primary/15 border-primary/40 text-primary"
              : "border-border text-text-secondary hover:bg-layer-2 hover:text-text-primary"
          )}
        >
          {t("projects.allProjects")}
          <span className={cn(
            "text-[10px] rounded px-1 py-0.5 font-normal",
            selectedProjectId === null ? "bg-primary/20 text-primary" : "bg-layer-3 text-text-muted"
          )}>
            {tasks.length}
          </span>
        </button>

        {/* Project chips */}
        {projects.map((project) => (
          <ProjectChip
            key={project.id}
            project={project}
            selected={selectedProjectId === project.id}
            onClick={() => {
              const next = selectedProjectId === project.id ? null : project.id;
              setSelectedProjectId(next);
              if (next === null) setGoalsOpen(false);
            }}
          />
        ))}

        {/* New project button */}
        <button
          onClick={() => setProjectFormOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-border text-xs text-text-muted hover:border-primary/50 hover:text-primary transition-colors shrink-0"
        >
          <FolderPlus className="w-3 h-3" />
          {t("projects.newProject")}
        </button>

        {/* Edit / delete / goals actions — visible when a project is selected */}
        {selectedProject && (
          <>
            <div className="w-px h-4 bg-border shrink-0" />
            <Button
              size="sm"
              variant={goalsOpen ? "default" : "ghost"}
              className="h-7 px-2.5 text-xs gap-1.5 shrink-0"
              onClick={() => setGoalsOpen((v) => !v)}
            >
              <Target className="w-3 h-3" />
              驗收目標
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-xs gap-1.5 text-text-secondary hover:text-text-primary shrink-0"
              onClick={() => { setEditingProject(selectedProject); setProjectFormOpen(true); }}
            >
              <Pencil className="w-3 h-3" />
              {t("projects.editProject")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-xs gap-1.5 text-danger/70 hover:text-danger hover:bg-danger/10 shrink-0"
              onClick={() => setDeletingProject(selectedProject)}
            >
              <Trash2 className="w-3 h-3" />
              {t("projects.deleteProject")}
            </Button>
          </>
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

      {/* Task form */}
      <TaskFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        task={editingTask}
        defaultProjectId={selectedProjectId ?? undefined}
        onSubmit={handleFormSubmit}
        loading={createTask.isPending || updateTask.isPending}
      />

      {/* Outlook notify confirmation */}
      <Dialog open={!!notifyPending} onOpenChange={(open) => !open && setNotifyPending(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>寄送通知信件</DialogTitle>
            <DialogDescription>
              是否透過 Outlook 寄信通知負責人？
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

      {/* Delete confirmation */}
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
