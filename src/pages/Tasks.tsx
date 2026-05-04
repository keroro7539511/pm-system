import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/tauri";
import { toast } from "@/stores/toastStore";
import { List, Kanban, Loader2, FolderPlus, CheckCircle2, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskList } from "@/components/tasks/TaskList";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { ProjectFormDialog } from "@/components/tasks/ProjectFormDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import type { Task, Project, CreateTaskPayload, CreateProjectPayload } from "@/types";

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
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createProject = useCreateProject();

  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [deletingTask, setDeletingTask] = useState<Task | undefined>();
  const [projectFormOpen, setProjectFormOpen] = useState(false);

  const isLoading = tasksLoading || projectsLoading;

  const filteredTasks = useMemo(() => {
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
    return result;
  }, [tasks, selectedProjectId, searchQuery]);

  function handleStatusChange(task: Task, status: import("@/types").TaskStatus) {
    updateTask.mutate({
      id: task.id,
      payload: {
        title:       task.title,
        description: task.description ?? undefined,
        project_id:  task.project_id ?? undefined,
        assignee:    task.assignee ?? undefined,
        priority:    task.priority,
        status,
        start_date:  task.start_date ?? undefined,
        due_date:    task.due_date ?? undefined,
      },
    });
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
            if (task.assignee) {
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

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex flex-col h-full overflow-hidden p-5 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
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
        <Button size="sm" onClick={() => setFormOpen(true)}>
          + {t("tasks.newTask")}
        </Button>
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
            onClick={() => setSelectedProjectId(
              selectedProjectId === project.id ? null : project.id
            )}
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
      </div>

      {/* Task list / kanban */}
      <Tabs defaultValue="list" className="flex flex-col flex-1 min-h-0">
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
              <TaskList tasks={filteredTasks} onEdit={handleEdit} onDelete={setDeletingTask} onStatusChange={handleStatusChange} />
            </TabsContent>
            <TabsContent value="kanban" className="flex-1 overflow-hidden min-h-0 mt-3">
              <KanbanBoard tasks={filteredTasks} onEdit={handleEdit} onDelete={setDeletingTask} />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Task form */}
      <TaskFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        task={editingTask}
        defaultProjectId={selectedProjectId ?? undefined}
        onSubmit={handleFormSubmit}
        loading={createTask.isPending || updateTask.isPending}
      />

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

      {/* Project form */}
      <ProjectFormDialog
        open={projectFormOpen}
        onOpenChange={setProjectFormOpen}
        onSubmit={handleCreateProject}
        loading={createProject.isPending}
      />
    </div>
  );
}
