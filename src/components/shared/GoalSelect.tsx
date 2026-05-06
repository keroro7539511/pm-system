import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalWithStats } from "@/types";

interface GoalSelectProps {
  goalId: number | null;
  projectId: number | null;
  goals: GoalWithStats[];
  onChange: (goalId: number | null) => void;
}

interface DropdownPos {
  top: number;
  left: number;
  minWidth: number;
  dropUp: boolean;
}

const DROPDOWN_HEIGHT = 220;

export function GoalSelect({ goalId, projectId, goals, onChange }: GoalSelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const projectGoals = projectId ? goals.filter((g) => g.project_id === projectId) : [];
  const globalGoals  = goals.filter((g) => g.project_id === null);
  const current = goals.find((g) => g.id === goalId);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("scroll", close, true);
    };
  }, [open, close]);

  function handleToggle() {
    if (open) { close(); return; }
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropUp = rect.bottom + DROPDOWN_HEIGHT > window.innerHeight - 8;
    setPos({
      top: dropUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      minWidth: Math.max(rect.width, 160),
      dropUp,
    });
    setOpen(true);
  }

  function handleSelect(id: number | null) {
    onChange(id);
    close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors max-w-[140px]",
          current
            ? "border-primary/30 bg-primary/10 text-primary/90 hover:bg-primary/15"
            : "border-border text-text-muted hover:border-border/60 hover:text-text-secondary"
        )}
      >
        {current ? (
          <>
            <Target className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{current.title}</span>
          </>
        ) : (
          <span>— 無目標 —</span>
        )}
        <ChevronDown className={cn("w-2.5 h-2.5 opacity-50 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] rounded-lg border border-border shadow-xl py-1"
          style={{
            top: pos.dropUp ? undefined : pos.top,
            bottom: pos.dropUp ? window.innerHeight - pos.top : undefined,
            left: pos.left,
            minWidth: pos.minWidth,
            backgroundColor: "var(--color-dialog-bg)",
          }}
        >
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-text-muted hover:bg-white/10 transition-colors text-left"
          >
            <span className="flex-1">— 無目標 —</span>
            {!goalId && <Check className="w-3 h-3 text-success shrink-0" />}
          </button>

          <div className="h-px bg-border/50 my-1" />

          {/* 專案目標 */}
          {!projectId && (
            <p className="px-2.5 py-1.5 text-[10px] text-text-muted">請先指定任務專案</p>
          )}
          {projectId && projectGoals.length === 0 && globalGoals.length === 0 && (
            <p className="px-2.5 py-1.5 text-[10px] text-text-muted">此專案尚無目標</p>
          )}
          {projectId && projectGoals.length > 0 && (
            <p className="px-2.5 pt-1 pb-0.5 text-[9px] text-text-muted uppercase tracking-wider">專案目標</p>
          )}
          {projectGoals.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => handleSelect(g.id)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-white/10 transition-colors text-left"
            >
              <Target className="w-3 h-3 text-primary/70 shrink-0" />
              <span className="flex-1 truncate text-text-secondary">{g.title}</span>
              {g.id === goalId && <Check className="w-3 h-3 text-success shrink-0" />}
            </button>
          ))}

          {/* 全部專案適用目標 */}
          {globalGoals.length > 0 && (
            <>
              {projectGoals.length > 0 && <div className="h-px bg-border/50 my-1" />}
              <p className="px-2.5 pt-1 pb-0.5 text-[9px] text-text-muted uppercase tracking-wider">全部專案</p>
              {globalGoals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleSelect(g.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-white/10 transition-colors text-left"
                >
                  <Target className="w-3 h-3 text-purple/70 shrink-0" />
                  <span className="flex-1 truncate text-text-secondary">{g.title}</span>
                  {g.id === goalId && <Check className="w-3 h-3 text-success shrink-0" />}
                </button>
              ))}
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
