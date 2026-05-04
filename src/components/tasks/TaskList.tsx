import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Calendar, ChevronUp, ChevronDown, Minus } from "lucide-react";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { StatusSelect } from "@/components/shared/StatusSelect";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

function PriorityIcon({ priority }: { priority: string }) {
  if (priority === "P0" || priority === "P1") return <ChevronUp className="w-3.5 h-3.5 text-danger" />;
  if (priority === "P3") return <ChevronDown className="w-3.5 h-3.5 text-text-muted" />;
  return <Minus className="w-3.5 h-3.5 text-text-muted" />;
}

export function TaskList({ tasks, onEdit, onDelete, onStatusChange }: TaskListProps) {
  const { t, i18n } = useTranslation();

  if (tasks.length === 0) {
    return <EmptyState title={t("tasks.empty")} description={t("tasks.emptyDesc")} />;
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] text-text-muted">
            <th className="pb-2 text-left font-medium pl-2 w-6"></th>
            <th className="pb-2 text-left font-medium">{t("tasks.fields.title")}</th>
            <th className="pb-2 text-left font-medium w-20">{t("tasks.fields.priority")}</th>
            <th className="pb-2 text-left font-medium w-24">{t("tasks.fields.status")}</th>
            <th className="pb-2 text-left font-medium w-24">{t("tasks.fields.dueDate")}</th>
            <th className="pb-2 text-left font-medium w-20">{t("tasks.fields.assignee")}</th>
            <th className="pb-2 w-16"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {tasks.map((task) => {
            const overdue = task.status !== "done" && isOverdue(task.due_date);
            return (
              <tr
                key={task.id}
                className={cn("group hover:bg-layer-1 transition-colors", overdue && "bg-danger/5")}
              >
                <td className="py-2 pl-2">
                  <PriorityIcon priority={task.priority} />
                </td>
                <td className="py-2 pr-4">
                  <p className={cn("font-medium text-text-primary truncate max-w-xs", overdue && "text-danger/90")}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-[11px] text-text-muted truncate max-w-xs mt-0.5">{task.description}</p>
                  )}
                </td>
                <td className="py-2">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="py-2">
                  <StatusSelect
                    status={task.status}
                    onChange={(s) => onStatusChange(task, s)}
                  />
                </td>
                <td className={cn("py-2 text-xs", overdue ? "text-danger" : "text-text-muted")}>
                  {task.due_date ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(task.due_date, i18n.language)}
                    </span>
                  ) : "—"}
                </td>
                <td className="py-2 text-xs text-text-muted">{task.assignee ?? "—"}</td>
                <td className="py-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(task)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-danger" onClick={() => onDelete(task)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
