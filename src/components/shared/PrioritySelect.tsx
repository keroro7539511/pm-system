import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_COLORS } from "@/lib/constants";
import { useDropdownPortal } from "@/hooks/useDropdownPortal";
import type { Priority } from "@/types";

const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];
const PRIORITY_LABELS: Record<Priority, string> = {
  P0: "P0 緊急",
  P1: "P1 高",
  P2: "P2 中",
  P3: "P3 低",
};

interface PrioritySelectProps {
  priority: Priority;
  onChange: (priority: Priority) => void;
}

export function PrioritySelect({ priority, onChange }: PrioritySelectProps) {
  const { open, pos, triggerRef, dropdownRef, close, handleToggle } =
    useDropdownPortal(160);

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
              onClick={() => { onChange(p); close(); }}
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
