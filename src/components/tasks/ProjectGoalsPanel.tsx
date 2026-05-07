import { useState, useRef, useEffect } from "react";
import { CheckCircle2, Circle, Plus, Trash2, X, Target, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/useGoals";
import type { ProjectGoal } from "@/types";
import type { Project } from "@/types";

interface Props {
  project: Project;
  onClose: () => void;
}

function GoalItem({
  goal,
  projectId: _projectId,
}: {
  goal: ProjectGoal;
  projectId: number;
}) {
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitEdit() {
    const title = editTitle.trim();
    if (title && title !== goal.title) {
      updateGoal.mutate({ id: goal.id, payload: { title } });
    } else {
      setEditTitle(goal.title);
    }
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-2 px-3 py-2.5 rounded-lg border transition-colors",
        goal.is_done
          ? "border-success/20 bg-success/5"
          : "border-border bg-layer-2 hover:border-border/80"
      )}
    >
      <button
        onClick={() => updateGoal.mutate({ id: goal.id, payload: { is_done: !goal.is_done } })}
        className="mt-0.5 shrink-0 text-text-muted hover:text-success transition-colors"
      >
        {goal.is_done
          ? <CheckCircle2 className="w-4 h-4 text-success" />
          : <Circle className="w-4 h-4" />
        }
      </button>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") { setEditTitle(goal.title); setEditing(false); }
            }}
            className="w-full bg-transparent text-xs text-text-primary outline-none border-b border-primary"
          />
        ) : (
          <p
            className={cn(
              "text-xs leading-relaxed",
              goal.is_done ? "line-through text-text-muted" : "text-text-primary"
            )}
          >
            {goal.title}
          </p>
        )}
        {goal.description && !editing && (
          <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">{goal.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {editing ? (
          <button
            onClick={commitEdit}
            className="text-success hover:text-success/80 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={() => deleteGoal.mutate(goal.id)}
          className="text-text-muted hover:text-danger transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function ProjectGoalsPanel({ project, onClose }: Props) {
  const { data: rawGoals = [] } = useProjectGoals(project.id);
  const goals = [...rawGoals].sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
    return b.id - a.id;
  });
  const createGoal = useCreateGoal();
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const done = goals.filter((g) => g.is_done).length;
  const total = goals.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    createGoal.mutate(
      { project_id: project.id, title },
      { onSuccess: () => setNewTitle("") },
    );
  }

  return (
    <div className="w-72 shrink-0 flex flex-col border-l border-border bg-layer-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-text-primary">驗收目標</span>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Project info + progress */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-xs font-medium text-text-primary mb-2 truncate">{project.name}</p>
        {total > 0 && (
          <>
            <div className="flex items-center justify-between text-[10px] text-text-muted mb-1.5">
              <span>{done} / {total} 完成</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-layer-3 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  pct === 100 ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
        {total === 0 && (
          <p className="text-[10px] text-text-muted">尚未設定驗收目標</p>
        )}
      </div>

      {/* Goals list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {goals.map((goal) => (
          <GoalItem key={goal.id} goal={goal} projectId={project.id} />
        ))}
      </div>

      {/* Add new goal */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="新增驗收項目..."
            className="flex-1 bg-layer-2 border border-border rounded-md px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 shrink-0"
            onClick={handleAdd}
            disabled={!newTitle.trim() || createGoal.isPending}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
