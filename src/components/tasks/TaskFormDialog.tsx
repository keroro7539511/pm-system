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
import { SearchableSelect } from "@/components/ui/SearchableSelect";
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
        assignee: task.assignee ?? "none",
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
        assignee: "none",
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
                  <SearchableSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={PRIORITIES.map((p) => ({ value: p, label: `${p} · ${t(`tasks.priority.${p}`)}` }))}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("tasks.fields.status")}</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={STATUSES.map((s) => ({ value: s, label: t(`tasks.status.${s}`) }))}
                  />
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
                  <SearchableSelect
                    value={field.value ?? "none"}
                    onValueChange={(v) => { field.onChange(v); form.setValue("goal_id", "none"); }}
                    options={[
                      { value: "none", label: t("projects.noProject") },
                      ...(projects ?? []).map((p) => ({ value: String(p.id), label: p.name })),
                    ]}
                    placeholder={t("projects.noProject")}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>所屬目標</Label>
              <Controller
                control={form.control}
                name="goal_id"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? "none"}
                    onValueChange={field.onChange}
                    disabled={!hasGoals}
                    placeholder={hasGoals ? "選擇目標" : "無可用目標"}
                    groups={[
                      { label: "", options: [{ value: "none", label: "— 不指定 —" }] },
                      ...(specificGoals.length > 0 ? [{ label: "專案目標", options: specificGoals.map((g) => ({ value: String(g.id), label: g.title })) }] : []),
                      ...(globalGoals.length > 0 ? [{ label: "🌐 全部專案適用", options: globalGoals.map((g) => ({ value: String(g.id), label: g.title })) }] : []),
                    ]}
                  />
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
                  <SearchableSelect
                    value={field.value ?? "none"}
                    onValueChange={field.onChange}
                    placeholder="（未指定）"
                    options={[
                      { value: "none", label: "— 未指定 —" },
                      ...employees.map((e) => ({ value: e.name, label: e.name, sub: e.department ?? undefined })),
                    ]}
                  />
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
