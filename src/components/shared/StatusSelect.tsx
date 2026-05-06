import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_COLORS, KANBAN_COLUMNS } from "@/lib/constants";
import type { TaskStatus } from "@/types";

interface StatusSelectProps {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
}

const DROPDOWN_HEIGHT = 148;

export function StatusSelect({ status, onChange, disabled }: StatusSelectProps) {
  const { t } = useTranslation();
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
    if (disabled) return;
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

  function handleSelect(s: TaskStatus) {
    onChange(s);
    close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
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
              onClick={() => handleSelect(s)}
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
