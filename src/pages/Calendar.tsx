import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, isSameDay, parseISO,
  startOfWeek, endOfWeek, differenceInCalendarDays,
  isWithinInterval,
} from "date-fns";
import { zhTW, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import type { Task } from "@/types";

interface TaskBar {
  task: Task;
  startCol: number;
  endCol: number;
  lane: number;
  continuesLeft: boolean;
  continuesRight: boolean;
}

const BAR_HEIGHT = 20;
const BAR_GAP = 2;
const DATE_ROW_H = 30;

function barColor(task: Task) {
  if (task.priority === "P0") return "bg-danger text-white";
  if (task.priority === "P1") return "bg-warning text-white";
  if (task.priority === "P2") return "bg-primary text-white";
  return "bg-purple text-white";
}

export function Calendar() {
  const { i18n } = useTranslation();
  const locale = i18n.language === "zh-TW" ? zhTW : enUS;
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { data: allTasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();

  const tasks = useMemo(
    () => selectedProjectId === null
      ? allTasks
      : allTasks.filter((t) => t.project_id === selectedProjectId),
    [allTasks, selectedProjectId],
  );

  const { weeks } = useMemo(() => {
    const monthStart = startOfMonth(current);
    const monthEnd = endOfMonth(current);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: calStart, end: calEnd });
    const ws: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) ws.push(allDays.slice(i, i + 7));
    return { weeks: ws };
  }, [current]);

  const weekDays = i18n.language === "zh-TW"
    ? ["一", "二", "三", "四", "五", "六", "日"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function getWeekBars(week: Date[]): TaskBar[] {
    const weekStart = week[0];
    const weekEnd = week[6];

    const overlapping = tasks
      .filter((task) => {
        const end = task.due_date ? parseISO(task.due_date) : null;
        const start = task.start_date ? parseISO(task.start_date) : end;
        if (!start || !end) return false;
        return start <= weekEnd && end >= weekStart;
      })
      .sort((a, b) => (a.start_date ?? a.due_date ?? "").localeCompare(b.start_date ?? b.due_date ?? ""));

    const bars: TaskBar[] = [];
    const laneEnds: number[] = [];

    for (const task of overlapping) {
      const taskEnd = task.due_date ? parseISO(task.due_date) : null;
      const taskStart = task.start_date ? parseISO(task.start_date) : taskEnd;
      if (!taskStart || !taskEnd) continue;

      const startCol = Math.max(0, differenceInCalendarDays(taskStart, weekStart));
      const endCol = Math.min(6, differenceInCalendarDays(taskEnd, weekStart));

      let lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] > startCol) lane++;
      laneEnds[lane] = endCol + 1;

      bars.push({
        task,
        startCol,
        endCol,
        lane,
        continuesLeft: taskStart < weekStart,
        continuesRight: taskEnd > weekEnd,
      });
    }

    return bars;
  }

  function getActiveTasksForDay(day: Date): Task[] {
    return tasks.filter((task) => {
      const end = task.due_date ? parseISO(task.due_date) : null;
      const start = task.start_date ? parseISO(task.start_date) : end;
      if (!start || !end) return false;
      return isWithinInterval(day, { start, end });
    });
  }

  const selectedTasks = selectedDay ? getActiveTasksForDay(selectedDay) : [];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main calendar area */}
      <div className="flex flex-col flex-1 p-5 overflow-auto min-w-0">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h1 className="text-lg font-semibold text-text-primary">
            {format(current, "yyyy年 M月", { locale })}
          </h1>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7"
              onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs px-3"
              onClick={() => setCurrent(new Date())}>
              {i18n.language === "zh-TW" ? "今天" : "Today"}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7"
              onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Project filter */}
        <div className="flex items-center gap-2 mb-4 shrink-0 overflow-x-auto pb-1">
          <Layers className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <button
            onClick={() => setSelectedProjectId(null)}
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              selectedProjectId === null
                ? "bg-primary border-primary text-white"
                : "border-border text-text-muted hover:border-primary/50 hover:text-text-primary"
            )}
          >
            {i18n.language === "zh-TW" ? "全部專案" : "All Projects"}
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id === selectedProjectId ? null : p.id)}
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

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border border-border rounded-t-lg overflow-hidden shrink-0">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-[11px] text-text-muted py-2 font-medium border-r border-border last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Week rows */}
        <div className="border-l border-r border-b border-border rounded-b-lg overflow-hidden">
          {weeks.map((week, wi) => {
            const bars = getWeekBars(week);
            const numLanes = bars.length > 0 ? Math.max(...bars.map((b) => b.lane)) + 1 : 0;
            const rowH = DATE_ROW_H + numLanes * (BAR_HEIGHT + BAR_GAP) + (numLanes > 0 ? 4 : 0);

            return (
              <div
                key={wi}
                className="relative border-b border-border last:border-b-0"
                style={{ height: rowH }}
              >
                {/* Day cell backgrounds — full-height click targets */}
                <div className="absolute inset-0 grid grid-cols-7">
                  {week.map((day) => {
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    const sameMonth = isSameMonth(day, current);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={cn(
                          "flex flex-col items-start p-1 border-r border-border last:border-r-0 transition-colors",
                          isToday(day) && "bg-primary/5",
                          isSelected ? "bg-primary/15" : sameMonth ? "hover:bg-white/5" : "",
                          !sameMonth && "opacity-35"
                        )}
                      >
                        <span className={cn(
                          "text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full",
                          isToday(day) ? "bg-primary text-white" : sameMonth ? "text-text-primary" : "text-text-muted"
                        )}>
                          {format(day, "d")}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Task bars — pointer-events-none so clicks fall through to cells */}
                {bars.map(({ task, startCol, endCol, lane, continuesLeft, continuesRight }) => {
                  const leftPad = continuesLeft ? 0 : 4;
                  const rightPad = continuesRight ? 0 : 4;
                  return (
                    <div
                      key={`${task.id}-${wi}`}
                      style={{
                        position: "absolute",
                        left: `calc(${startCol} / 7 * 100% + ${leftPad}px)`,
                        width: `calc(${endCol - startCol + 1} / 7 * 100% - ${leftPad + rightPad}px)`,
                        top: DATE_ROW_H + lane * (BAR_HEIGHT + BAR_GAP),
                        height: BAR_HEIGHT,
                        zIndex: 10,
                        pointerEvents: "none",
                      }}
                      className={cn(
                        "flex items-center px-2 text-[10px] font-medium overflow-hidden whitespace-nowrap select-none",
                        barColor(task),
                        !continuesLeft && "rounded-l-full",
                        !continuesRight && "rounded-r-full",
                      )}
                    >
                      {/* Show title only on first visible segment */}
                      {!continuesLeft && <span className="truncate">{task.title}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail sidebar */}
      {selectedDay && (
        <div className="w-64 border-l border-border p-4 overflow-y-auto shrink-0">
          <p className="text-sm font-medium text-text-primary mb-1">
            {format(selectedDay, "M月d日 (EEEE)", { locale })}
          </p>
          {selectedProjectId !== null && (
            <p className="text-[10px] text-primary mb-3">
              {projects.find((p) => p.id === selectedProjectId)?.name}
            </p>
          )}
          {selectedProjectId === null && <div className="mb-3" />}
          {selectedTasks.length === 0 ? (
            <p className="text-xs text-text-muted">此日無進行中任務</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedTasks.map((task) => (
                <div key={task.id} className="glass-card p-2">
                  <p className="text-xs font-medium text-text-primary mb-1">{task.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge priority={task.priority} />
                    {task.assignee && (
                      <span className="text-[10px] text-text-muted">{task.assignee}</span>
                    )}
                  </div>
                  {(task.start_date || task.due_date) && (
                    <p className="text-[10px] text-text-muted mt-1">
                      {task.start_date ?? "—"} → {task.due_date ?? "—"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
