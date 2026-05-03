import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import type { TaskStatus } from "@/types";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
        STATUS_COLORS[status],
        className
      )}
    >
      {t(`tasks.status.${status}`)}
    </span>
  );
}
