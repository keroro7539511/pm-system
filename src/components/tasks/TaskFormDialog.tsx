import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, Priority, TaskStatus, CreateTaskPayload } from "@/types";
import { useProjects } from "@/hooks/useProjects";

const schema = z.object({
  title: z.string().min(1, "任務名稱不能為空"),
  description: z.string().optional(),
  project_id: z.string().optional(),
  assignee: z.string().optional(),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  status: z.enum(["todo", "in_progress", "review", "done", "overdue"]),
  due_date: z.string().optional(),
  estimated_hours: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  onSubmit: (data: CreateTaskPayload) => void;
  loading?: boolean;
}

export function TaskFormDialog({ open, onOpenChange, task, onSubmit, loading }: TaskFormDialogProps) {
  const { t } = useTranslation();
  const { data: projects } = useProjects();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      project_id: "",
      assignee: "",
      priority: "P2",
      status: "todo",
      due_date: "",
      estimated_hours: "",
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description ?? "",
        project_id: task.project_id ? String(task.project_id) : "",
        assignee: task.assignee ?? "",
        priority: task.priority as Priority,
        status: task.status as TaskStatus,
        due_date: task.due_date ?? "",
        estimated_hours: task.estimated_hours ? String(task.estimated_hours) : "",
      });
    } else {
      form.reset({
        title: "", description: "", project_id: "", assignee: "",
        priority: "P2", status: "todo", due_date: "", estimated_hours: "",
      });
    }
  }, [task, open, form]);

  const handleSubmit = form.handleSubmit((values: FormValues) => {
    const data: CreateTaskPayload = {
      title: values.title,
      description: values.description || undefined,
      project_id: values.project_id ? Number(values.project_id) : undefined,
      assignee: values.assignee || undefined,
      priority: values.priority as Priority,
      status: values.status as TaskStatus,
      due_date: values.due_date || undefined,
      estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : undefined,
    };
    onSubmit(data);
  });

  const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];
  const STATUSES: TaskStatus[] = ["todo", "in_progress", "review", "done"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? t("tasks.editTask") : t("tasks.newTask")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">{t("tasks.fields.title")} *</Label>
            <Input id="title" {...form.register("title")} placeholder="e.g. 完成 API 規格書" />
            {form.formState.errors.title && (
              <p className="text-xs text-danger">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">{t("tasks.fields.description")}</Label>
            <Textarea id="description" {...form.register("description")} placeholder="" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("tasks.fields.priority")}</Label>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>{p} · {t(`tasks.priority.${p}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("tasks.fields.status")}</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{t(`tasks.status.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("tasks.fields.project")}</Label>
              <Controller
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder={t("projects.noProject")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("projects.noProject")}</SelectItem>
                      {(projects ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assignee">{t("tasks.fields.assignee")}</Label>
              <Input id="assignee" {...form.register("assignee")} placeholder="Yang" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="due_date">{t("tasks.fields.dueDate")}</Label>
              <Input id="due_date" type="date" {...form.register("due_date")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="estimated_hours">{t("tasks.fields.estimatedHours")}</Label>
              <Input id="estimated_hours" type="number" min="0" step="0.5" {...form.register("estimated_hours")} placeholder="8" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.loading") : task ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
