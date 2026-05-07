import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, Priority, TaskStatus, CreateTaskPayload } from "@/types";
import { useProjects } from "@/hooks/useProjects";
import { useEmployees } from "@/hooks/useEmployees";
import { useAllGoals } from "@/hooks/useGoals";

const schema = z.object({
  title: z.string().min(1, "任務名稱不能為空"),
  description: z.string().optional(),
  project_id: z.string().optional(),
  goal_id: z.string().optional(),
  assignee: z.string().optional(),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  status: z.enum(["todo", "in_progress", "review", "done", "overdue"]),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  defaultProjectId?: number;
  onSubmit: (data: CreateTaskPayload, assigneeEmail?: string | null) => void;
  loading?: boolean;
}

export function TaskFormDialog({ open, onOpenChange, task, defaultProjectId, onSubmit, loading }: TaskFormDialogProps) {
  const { t } = useTranslation();
  const { data: projects } = useProjects();
  const { data: employees = [] } = useEmployees();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      project_id: "none",
      goal_id: "none",
      assignee: "",
      priority: "P2",
      status: "todo",
      start_date: "",
      due_date: "",
    },
  });

  const selectedAssigneeName = useWatch({ control: form.control, name: "assignee" });
  const watchedProjectId = useWatch({ control: form.control, name: "project_id" });
  const activeProjectId = watchedProjectId && watchedProjectId !== "none" ? Number(watchedProjectId) : null;
  const { data: allGoals = [] } = useAllGoals();
  const specificGoals = allGoals.filter((g) => g.project_id === activeProjectId && activeProjectId !== null);
  const globalGoals   = allGoals.filter((g) => g.project_id === null);
  const hasGoals = specificGoals.length > 0 || globalGoals.length > 0;
  const selectedEmployee = employees.find((e) => e.name === selectedAssigneeName);
  const assigneeHasNoEmail = selectedEmployee && !selectedEmployee.email;

  useEffect(() => {
    if (!open) return;
    if (task) {
      form.reset({
        title: task.title,
        description: task.description ?? "",
        project_id: task.project_id ? String(task.project_id) : "none",
        goal_id: task.goal_id ? String(task.goal_id) : "none",
        assignee: task.assignee ?? "",
        priority: task.priority as Priority,
        status: task.status as TaskStatus,
        start_date: task.start_date ?? "",
        due_date: task.due_date ?? "",
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      form.reset({
        title: "", description: "",
        project_id: defaultProjectId ? String(defaultProjectId) : "none",
        goal_id: "none",
        assignee: "",
        priority: "P2", status: "todo", start_date: today, due_date: "",
      });
    }
  }, [task, open, form]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const handleSubmit = form.handleSubmit((values: FormValues) => {
    const emp = employees.find((e) => e.name === values.assignee);
    onSubmit(
      {
        title: values.title,
        description: values.description || undefined,
        project_id: values.project_id && values.project_id !== "none" ? Number(values.project_id) : undefined,
        goal_id: values.goal_id && values.goal_id !== "none" ? Number(values.goal_id) : undefined,
        assignee: values.assignee && values.assignee !== "none" ? values.assignee : undefined,
        priority: values.priority as Priority,
        status: values.status as TaskStatus,
        start_date: values.start_date || new Date().toISOString().slice(0, 10),
        due_date: values.due_date || undefined,
      },
      emp?.email ?? null
    );
  });

  const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];
  const STATUSES: TaskStatus[] = ["todo", "in_progress", "review", "done"];

  if (!open) return null;

  return createPortal(
    <>
      {/* 背景遮罩 */}
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          backgroundColor: "rgba(0,0,0,0.55)",
        }}
      />

      {/* 對話框本體 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "100%", maxWidth: "28rem",
          maxHeight: "90vh", overflowY: "auto",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          backgroundColor: "var(--color-dialog-bg)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
      >
        {/* 標題列 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>
            {task ? t("tasks.editTask") : t("tasks.newTask")}
          </h2>
          <button
            type="button" onClick={close}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--color-text-secondary)", padding: "0.25rem",
              display: "flex", alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 表單 */}
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
            <Textarea id="description" {...form.register("description")} rows={2} />
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
                  <Select value={field.value} onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue("goal_id", "none");
                  }}>
                    <SelectTrigger><SelectValue placeholder={t("projects.noProject")} /></SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto">
                      <SelectItem value="none">{t("projects.noProject")}</SelectItem>
                      {(projects ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>所屬目標</Label>
              <Controller
                control={form.control}
                name="goal_id"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={field.onChange}
                    disabled={!hasGoals}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={hasGoals ? "選擇目標" : "無可用目標"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto">
                      <SelectItem value="none">— 不指定 —</SelectItem>
                      {specificGoals.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] text-text-muted uppercase tracking-wider">專案目標</div>
                          {specificGoals.map((g) => (
                            <SelectItem key={g.id} value={String(g.id)}>{g.title}</SelectItem>
                          ))}
                        </>
                      )}
                      {globalGoals.length > 0 && (
                        <>
                          {specificGoals.length > 0 && <div className="mx-1 my-1 h-px bg-border/50" />}
                          <div className="px-2 py-1 text-[10px] text-text-muted uppercase tracking-wider">🌐 全部專案適用</div>
                          {globalGoals.map((g) => (
                            <SelectItem key={g.id} value={String(g.id)}>{g.title}</SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("tasks.fields.assignee")}</Label>
              <Controller
                control={form.control}
                name="assignee"
                render={({ field }) => (
                  <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="（未指定）" /></SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto">
                      <SelectItem value="none">— 未指定 —</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.name}>{e.name}{e.department ? ` · ${e.department}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {assigneeHasNoEmail && (
                <p className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-warning)" }}>
                  <AlertTriangle size={11} />此員工未填 Email，指派後不會發送通知
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start_date">{t("tasks.fields.startDate")}</Label>
              <Input id="start_date" type="date" {...form.register("start_date")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="due_date">{t("tasks.fields.dueDate")}</Label>
              <Input id="due_date" type="date" {...form.register("due_date")} />
            </div>
          </div>

          {/* 底部按鈕 */}
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.loading") : task ? t("common.save") : t("common.create")}
            </Button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}
