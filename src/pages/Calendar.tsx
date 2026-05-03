import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, isSameDay, parseISO, startOfWeek, endOfWeek,
} from "date-fns";
import { zhTW, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/types";

export function Calendar() {
  const { i18n } = useTranslation();
  const locale = i18n.language === "zh-TW" ? zhTW : enUS;
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: tasks = [] } = useTasks();

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekDays = i18n.language === "zh-TW"
    ? ["一", "二", "三", "四", "五", "六", "日"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function tasksForDay(day: Date): Task[] {
    return tasks.filter(
      (t) => t.due_date && isSameDay(parseISO(t.due_date), day)
    );
  }

  const selectedTasks = selectedDay ? tasksForDay(selectedDay) : [];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Calendar grid */}
      <div className="flex flex-col flex-1 p-5 overflow-auto min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-text-primary">
            {format(current, "yyyy年 M月", { locale })}
          </h1>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => setCurrent(new Date())}>
              {i18n.language === "zh-TW" ? "今天" : "Today"}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-[11px] text-text-muted py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {days.map((day) => {
            const dayTasks = tasksForDay(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const sameMonth = isSameMonth(day, current);
            return (
              <button
                key={day.toISOString()}
                className={cn(
                  "flex flex-col p-1.5 rounded-lg text-left min-h-[70px] transition-colors border",
                  sameMonth ? "border-border" : "border-transparent",
                  isToday(day) ? "border-primary/50 bg-primary/5" : "",
                  isSelected ? "bg-primary/15 border-primary/40" : sameMonth ? "hover:bg-white/5" : "",
                  !sameMonth && "opacity-30"
                )}
                onClick={() => setSelectedDay(isSelected ? null : day)}
              >
                <span className={cn(
                  "text-xs font-medium mb-1",
                  isToday(day) ? "text-primary" : sameMonth ? "text-text-primary" : "text-text-muted"
                )}>
                  {format(day, "d")}
                </span>
                <div className="flex flex-col gap-0.5">
                  {dayTasks.slice(0, 2).map((task) => (
                    <span
                      key={task.id}
                      className={cn(
                        "text-[9px] rounded px-1 py-0.5 truncate",
                        task.priority === "P0" ? "bg-danger/20 text-danger" :
                        task.priority === "P1" ? "bg-warning/20 text-warning" :
                        "bg-primary/20 text-primary"
                      )}
                    >
                      {task.title}
                    </span>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[9px] text-text-muted">+{dayTasks.length - 2}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail sidebar */}
      {selectedDay && (
        <div className="w-64 border-l border-border p-4 overflow-y-auto">
          <p className="text-sm font-medium text-text-primary mb-3">
            {format(selectedDay, "M月d日 (EEEE)", { locale })}
          </p>
          {selectedTasks.length === 0 ? (
            <p className="text-xs text-text-muted">無截止任務</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedTasks.map((task) => (
                <div key={task.id} className="glass-card p-2">
                  <p className="text-xs font-medium text-text-primary mb-1">{task.title}</p>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    {task.assignee && (
                      <span className="text-[10px] text-text-muted">{task.assignee}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
