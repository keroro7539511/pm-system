import { useTranslation } from "react-i18next";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="mb-3 text-text-muted">
        {icon ?? <Inbox className="w-10 h-10" />}
      </div>
      <p className="text-sm font-medium text-text-secondary mb-1">
        {title ?? t("common.noData")}
      </p>
      {description && (
        <p className="text-xs text-text-muted max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
