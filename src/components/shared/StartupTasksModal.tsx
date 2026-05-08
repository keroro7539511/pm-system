import { useMemo } from "react";
import { AlertTriangle, Calendar, CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIORITY_COLORS } from "@/lib/constants";
import { isOverdue } from "@/lib/utils";
import type { Task } from "@/types";

interface Props {
  tasks: Task[];
  onClose: () => void;
}

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function getEndOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function StartupTasksModal({ tasks, onClose }: Props) {
  const weekTasks = useMemo(() => {
    const today = getToday();
    const endOfWeek = getEndOfWeek();

    const relevant = tasks.filter((t) => {
      if (t.status === "done") return false;
      if (!t.due_date) return false;
      return t.due_date <= endOfWeek;
    });

    return relevant.sort((a, b) => {
      const aOverdue = a.due_date! < today ? 0 : 1;
      const bOverdue = b.due_date! < today ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      const dateDiff = a.due_date!.localeCompare(b.due_date!);
      if (dateDiff !== 0) return dateDiff;
      return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
    });
  }, [tasks]);

  const today = getToday();
  const overdueCount = weekTasks.filter((t) => t.due_date! < today).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-border shadow-2xl flex flex-col max-h-[80vh]"
        style={{ backgroundColor: "var(--color-dialog-bg, #0f1623)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-text-primary">本週待辦任務</h2>
              <p className="text-xs text-text-muted mt-0.5">
                共 {weekTasks.length} 筆
                {overdueCount > 0 && (
                  <span className="text-danger ml-1.5">· {overdueCount} 筆已逾期</span>
                )}
              </p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Task list */}
        <div className="overflow-y-auto flex-1 px-3 py-2">
          {weekTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <CheckSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">本週沒有待辦任務</p>
            </div>
          ) : (
            <div className="space-y-1.5 py-1">
              {weekTasks.map((task) => {
                const overdue = isOverdue(task.due_date);
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors",
                      overdue
                        ? "border-danger/25 bg-danger/5"
                        : "border-border bg-layer-2"
                    )}
                  >
                    {/* Priority badge */}
                    <span className={cn(
                      "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold shrink-0 mt-0.5",
                      PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]
                    )}>
                      {task.priority}
                    </span>

                    {/* Title & meta */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        overdue ? "text-danger/90" : "text-text-primary"
                      )}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.due_date && (
                          <span className={cn(
                            "flex items-center gap-1 text-[11px]",
                            overdue ? "text-danger" : "text-text-muted"
                          )}>
                            {overdue && <AlertTriangle className="w-3 h-3" />}
                            <Calendar className="w-3 h-3" />
                            {task.due_date}
                          </span>
                        )}
                        {task.assignee && (
                          <span className="text-[11px] text-text-muted">· {task.assignee}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border shrink-0">
          <Button className="w-full" onClick={onClose}>開始工作</Button>
        </div>
      </div>
    </div>
  );
}
