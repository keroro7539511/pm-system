import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_COLORS, KANBAN_COLUMNS } from "@/lib/constants";
import { useDropdownPortal } from "@/hooks/useDropdownPortal";
import type { TaskStatus } from "@/types";

interface StatusSelectProps {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
}

export function StatusSelect({ status, onChange, disabled }: StatusSelectProps) {
  const { t } = useTranslation();
  const { open, pos, triggerRef, dropdownRef, close, handleToggle } =
    useDropdownPortal(148);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={disabled ? undefined : handleToggle}
        className={cn(
          "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-opacity",
          STATUS_COLORS[status],
          disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"
        )}
      >
        {t(`tasks.status.${status}`)}
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
          {KANBAN_COLUMNS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); close(); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-white/10 transition-colors text-left"
            >
              <span className={cn(
                "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium flex-1",
                STATUS_COLORS[s]
              )}>
                {t(`tasks.status.${s}`)}
              </span>
              {s === status && <Check className="w-3 h-3 text-success shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
