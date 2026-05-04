import { useState, useRef, useEffect } from "react";
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

const DROPDOWN_HEIGHT = 148; // 4 items × ~37px

export function StatusSelect({ status, onChange, disabled }: StatusSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function handleToggle() {
    if (disabled) return;
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropUp(rect.bottom + DROPDOWN_HEIGHT > window.innerHeight - 8);
    }
    setOpen((o) => !o);
  }

  function handleSelect(s: TaskStatus) {
    onChange(s);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
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
        <ChevronDown className={cn("w-2.5 h-2.5 opacity-60 transition-transform", dropUp && open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 z-50 min-w-[110px] rounded-lg border border-border shadow-lg py-1",
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          )}
          style={{ backgroundColor: "var(--color-dialog-bg)" }}
        >
          {KANBAN_COLUMNS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-white/10 transition-colors text-left"
            >
              <span
                className={cn(
                  "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium flex-1",
                  STATUS_COLORS[s]
                )}
              >
                {t(`tasks.status.${s}`)}
              </span>
              {s === status && <Check className="w-3 h-3 text-success shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
