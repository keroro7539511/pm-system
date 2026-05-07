import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_COLORS } from "@/lib/constants";
import type { Priority } from "@/types";

const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];
const PRIORITY_LABELS: Record<Priority, string> = {
  P0: "P0 緊急",
  P1: "P1 高",
  P2: "P2 中",
  P3: "P3 低",
};
const DROPDOWN_HEIGHT = 160;

interface PrioritySelectProps {
  priority: Priority;
  onChange: (priority: Priority) => void;
}

export function PrioritySelect({ priority, onChange }: PrioritySelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number; dropUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      minWidth: Math.max(rect.width, 110),
      dropUp,
    });
    setOpen(true);
  }

  function handleSelect(p: Priority) {
    onChange(p);
    close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80 cursor-pointer",
          PRIORITY_COLORS[priority]
        )}
      >
        {priority}
        <ChevronDown className={cn("w-2.5 h-2.5 opacity-60 transition-transform", open && "rotate-180")} />
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
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-white/10 transition-colors text-left"
            >
              <span className={cn(
                "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium flex-1",
                PRIORITY_COLORS[p]
              )}>
                {PRIORITY_LABELS[p]}
              </span>
              {p === priority && <Check className="w-3 h-3 text-success shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
