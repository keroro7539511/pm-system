import { Pencil, Trash2, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { Button } from "@/components/ui/button";
import { formatDate, isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  dragging?: boolean;
}

export function TaskCard({ task, onEdit, onDelete, dragging }: TaskCardProps) {
  const { i18n } = useTranslation();
  const overdue = task.status !== "done" && isOverdue(task.due_date);

  return (
    <div
      className={cn(
        "glass-card p-3 group cursor-grab active:cursor-grabbing hover:border-border/60 transition-all",
        dragging && "opacity-50 rotate-1 shadow-xl",
        overdue && "border-danger/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm font-medium text-text-primary leading-snug flex-1", overdue && "text-danger/90")}>
          {task.title}
        </p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(task)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-danger" onClick={() => onDelete(task)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <PriorityBadge priority={task.priority} />
        {task.due_date && (
          <span className={cn("flex items-center gap-1 text-[10px]", overdue ? "text-danger" : "text-text-muted")}>
            <Calendar className="w-3 h-3" />
            {formatDate(task.due_date, i18n.language)}
          </span>
        )}
        {task.assignee && (
          <span className="text-[10px] text-text-muted ml-auto">{task.assignee}</span>
        )}
      </div>
    </div>
  );
}
