import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { TaskCard } from "./TaskCard";
import { STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

function SortableTaskCard({ task, onEdit, onDelete }: { task: Task; onEdit: (t: Task) => void; onDelete: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} dragging={isDragging} />
    </div>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function KanbanColumn({ status, tasks, onEdit, onDelete }: KanbanColumnProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const colorClass = STATUS_COLORS[status];

  return (
    <div className="flex flex-col w-64 min-w-64 h-full">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium", colorClass)}>
          {t(`tasks.status.${status}`)}
        </span>
        <span className="text-xs text-text-muted">{tasks.length}</span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 flex-1 rounded-lg p-2 min-h-[200px] transition-colors",
          isOver ? "bg-white/5" : "bg-white/[0.02]"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
