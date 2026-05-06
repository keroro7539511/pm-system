import { useState, useMemo } from "react";
import {
  Target, Plus, Pencil, Trash2, CheckCircle2, Circle,
  Layers, ChevronDown, ChevronRight, ListTodo, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAllGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/useGoals";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { GoalFormDialog } from "@/components/goals/GoalFormDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import type { GoalWithStats, CreateGoalPayload } from "@/types";

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-layer-3 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            pct === 100 ? "bg-success" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-text-muted shrink-0">{pct}%</span>
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
}: {
  goal: GoalWithStats;
  onEdit: (goal: GoalWithStats) => void;
  onDelete: (goal: GoalWithStats) => void;
}) {
  const { data: allTasks = [] } = useTasks();
  const [expanded, setExpanded] = useState(false);

  const linkedTasks = useMemo(
    () => allTasks.filter((t) => t.goal_id === goal.id),
    [allTasks, goal.id]
  );

  const isDone = goal.task_count > 0 && goal.done_count === goal.task_count;

  return (
    <div className={cn(
      "glass-card flex flex-col gap-3 p-4 transition-colors",
      isDone && "opacity-70"
    )}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isDone
            ? <CheckCircle2 className="w-4.5 h-4.5 text-success" />
            : <Circle className="w-4.5 h-4.5 text-text-muted/40" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn(
              "text-sm font-medium",
              isDone ? "line-through text-text-muted" : "text-text-primary"
            )}>
              {goal.title}
            </span>
            <Badge
              variant="muted"
              className={cn(
                "text-[10px] px-1.5 py-0 shrink-0",
                !goal.project_id && "border-primary/30 bg-primary/10 text-primary/80"
              )}
            >
              {goal.project_name ?? "🌐 全部專案"}
            </Badge>
          </div>

          {goal.description && (
            <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
              {goal.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(goal)}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-layer-3 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(goal)}
            className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress */}
      {goal.task_count > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-muted">
              任務進度 {goal.done_count}/{goal.task_count}
            </span>
            {isDone && (
              <span className="text-[10px] text-success font-medium">全部完成 ✓</span>
            )}
          </div>
          <ProgressBar done={goal.done_count} total={goal.task_count} />
        </div>
      )}

      {goal.task_count === 0 && (
        <p className="text-[11px] text-text-muted flex items-center gap-1">
          <Clock className="w-3 h-3" />
          尚無連結任務，請在任務管理中指派此目標
        </p>
      )}

      {/* Task count badge + expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary transition-colors self-start"
      >
        <ListTodo className="w-3 h-3" />
        {goal.task_count > 0
          ? `${goal.task_count} 個相關任務`
          : "尚無相關任務"}
        {goal.task_count > 0 && (
          expanded
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3" />
        )}
      </button>

      {/* Linked tasks list */}
      {expanded && linkedTasks.length > 0 && (
        <div className="flex flex-col gap-1.5 pl-4 border-l border-border">
          {linkedTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2">
              {task.status === "done"
                ? <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                : <Circle className="w-3 h-3 text-text-muted shrink-0" />
              }
              <span className={cn(
                "text-xs",
                task.status === "done" ? "line-through text-text-muted" : "text-text-secondary"
              )}>
                {task.title}
              </span>
              <PriorityBadge priority={task.priority} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Goals() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const { data: goals = [] } = useAllGoals(selectedProjectId);
  const { data: projects = [] } = useProjects();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithStats | undefined>();
  const [deletingGoal, setDeletingGoal] = useState<GoalWithStats | undefined>();

  function handleCreate(payload: CreateGoalPayload) {
    createGoal.mutate(payload, { onSuccess: () => setFormOpen(false) });
  }

  function handleUpdate(payload: { title: string; description?: string }) {
    if (!editingGoal) return;
    updateGoal.mutate(
      { id: editingGoal.id, payload },
      { onSuccess: () => { setEditingGoal(undefined); setFormOpen(false); } }
    );
  }

  function handleDeleteConfirm() {
    if (!deletingGoal) return;
    deleteGoal.mutate(deletingGoal.id, { onSuccess: () => setDeletingGoal(undefined) });
  }

  const done = goals.filter((g) => g.task_count > 0 && g.done_count === g.task_count).length;

  return (
    <div className="flex flex-col h-full overflow-hidden p-5 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            目標管理
          </h1>
          {goals.length > 0 && (
            <p className="text-xs text-text-muted mt-0.5">
              {done}/{goals.length} 個目標已完成
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => { setEditingGoal(undefined); setFormOpen(true); }}>
          <Plus className="w-3.5 h-3.5" />
          新增目標
        </Button>
      </div>

      {/* Project filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        <Layers className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <button
          onClick={() => setSelectedProjectId(undefined)}
          className={cn(
            "shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
            selectedProjectId === undefined
              ? "bg-primary border-primary text-white"
              : "border-border text-text-muted hover:border-primary/50 hover:text-text-primary"
          )}
        >
          全部專案
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProjectId(p.id === selectedProjectId ? undefined : p.id)}
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
              selectedProjectId === p.id
                ? "bg-primary border-primary text-white"
                : "border-border text-text-muted hover:border-primary/50 hover:text-text-primary"
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Goals list */}
      <div className="flex-1 overflow-y-auto">
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-3">
            <Target className="w-10 h-10 opacity-30" />
            <p className="text-sm">尚未設定任何目標</p>
            <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              新增第一個目標
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={(g) => { setEditingGoal(g); setFormOpen(true); }}
                onDelete={setDeletingGoal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <GoalFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingGoal(undefined); }}
        goal={editingGoal}
        defaultProjectId={selectedProjectId}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        loading={createGoal.isPending || updateGoal.isPending}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deletingGoal} onOpenChange={(open) => !open && setDeletingGoal(undefined)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>刪除目標</DialogTitle>
            <DialogDescription>
              確定要刪除「{deletingGoal?.title}」？與此目標關聯的任務將取消連結，但不會被刪除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingGoal(undefined)}>取消</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteGoal.isPending}>
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
