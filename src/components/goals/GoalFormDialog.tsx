import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import type { GoalWithStats, CreateGoalPayload } from "@/types";

const schema = z.object({
  project_id: z.string().min(1, "請選擇專案"),
  title: z.string().min(1, "目標名稱不能為空"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalWithStats;
  defaultProjectId?: number;
  onCreate: (payload: CreateGoalPayload) => void;
  onUpdate: (payload: { title: string; description?: string }) => void;
  loading?: boolean;
}

export function GoalFormDialog({
  open, onOpenChange, goal, defaultProjectId, onCreate, onUpdate, loading,
}: Props) {
  const { data: projects = [] } = useProjects();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { project_id: "", title: "", description: "" },
  });

  useEffect(() => {
    if (!open) return;
    if (goal) {
      form.reset({
        project_id: goal.project_id === null ? "global" : String(goal.project_id),
        title: goal.title,
        description: goal.description ?? "",
      });
    } else {
      form.reset({
        project_id: defaultProjectId ? String(defaultProjectId) : "",
        title: "",
        description: "",
      });
    }
  }, [open, goal, defaultProjectId, form]);

  const handleSubmit = form.handleSubmit((values) => {
    if (goal) {
      onUpdate({ title: values.title, description: values.description || undefined });
    } else {
      onCreate({
        project_id: values.project_id === "global" ? null : Number(values.project_id),
        title: values.title,
        description: values.description || undefined,
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? "編輯目標" : "新增目標"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Project selector — disabled when editing */}
          <div className="flex flex-col gap-1.5">
            <Label>所屬專案 *</Label>
            <Controller
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!!goal}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇專案" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">🌐 全部專案適用</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.project_id && (
              <p className="text-xs text-danger">{form.formState.errors.project_id.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>目標名稱 *</Label>
            <Input {...form.register("title")} placeholder="e.g. 使用者驗收測試通過" />
            {form.formState.errors.title && (
              <p className="text-xs text-danger">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>說明（選填）</Label>
            <Textarea
              {...form.register("description")}
              rows={3}
              placeholder="詳細描述此目標的驗收條件..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "儲存中..." : goal ? "儲存" : "建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
