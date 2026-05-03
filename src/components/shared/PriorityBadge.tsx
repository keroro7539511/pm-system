import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { PRIORITY_COLORS } from "@/lib/constants";
import type { Priority } from "@/types";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
        PRIORITY_COLORS[priority],
        className
      )}
    >
      {priority} · {t(`tasks.priority.${priority}`)}
    </span>
  );
}
