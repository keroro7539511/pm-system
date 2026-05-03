import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KANBAN_COLUMNS } from "@/lib/constants";
import { useUpdateTask } from "@/hooks/useTasks";
import type { Task, TaskStatus } from "@/types";

interface KanbanBoardProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function KanbanBoard({ tasks, onEdit, onDelete }: KanbanBoardProps) {
  const updateTask = useUpdateTask();
  const [optimistic, setOptimistic] = useState<Map<number, TaskStatus>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function getStatus(task: Task): TaskStatus {
    return optimistic.get(task.id) ?? task.status;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = Number(active.id);
    const newStatus = over.id as TaskStatus;

    if (!KANBAN_COLUMNS.includes(newStatus)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || getStatus(task) === newStatus) return;

    // Optimistic update
    setOptimistic((prev) => new Map(prev).set(taskId, newStatus));

    updateTask.mutate(
      { id: taskId, payload: { status: newStatus } },
      {
        onError: () => {
          setOptimistic((prev) => {
            const next = new Map(prev);
            next.delete(taskId);
            return next;
          });
        },
        onSuccess: () => {
          setOptimistic((prev) => {
            const next = new Map(prev);
            next.delete(taskId);
            return next;
          });
        },
      }
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => getStatus(t) === status)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}
