import { useState } from "react";
import { useTranslation } from "react-i18next";
import { List, Kanban, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskList } from "@/components/tasks/TaskList";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import type { Task, CreateTaskPayload } from "@/types";

export function Tasks() {
  const { t } = useTranslation();
  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [deletingTask, setDeletingTask] = useState<Task | undefined>();

  function handleEdit(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingTask(undefined);
  }

  function handleFormSubmit(data: CreateTaskPayload) {
    if (editingTask) {
      updateTask.mutate(
        { id: editingTask.id, payload: { ...data } },
        { onSuccess: () => handleFormClose(false) }
      );
    } else {
      createTask.mutate(data, { onSuccess: () => handleFormClose(false) });
    }
  }

  function handleDeleteConfirm() {
    if (!deletingTask) return;
    deleteTask.mutate(deletingTask.id, { onSuccess: () => setDeletingTask(undefined) });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">{t("tasks.title")}</h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          + {t("tasks.newTask")}
        </Button>
      </div>

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
            <TabsContent value="list" className="flex-1 overflow-auto mt-3">
              <TaskList tasks={tasks} onEdit={handleEdit} onDelete={setDeletingTask} />
            </TabsContent>
            <TabsContent value="kanban" className="flex-1 overflow-hidden mt-3">
              <KanbanBoard tasks={tasks} onEdit={handleEdit} onDelete={setDeletingTask} />
            </TabsContent>
          </>
        )}
      </Tabs>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        task={editingTask}
        onSubmit={handleFormSubmit}
        loading={createTask.isPending || updateTask.isPending}
      />

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
    </div>
  );
}
