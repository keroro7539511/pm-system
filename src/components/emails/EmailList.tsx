import { useTranslation } from "react-i18next";
import { Inbox } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Email, EmailStatus } from "@/types";

interface EmailListProps {
  emails: Email[];
  selectedId: number | null;
  onSelect: (email: Email) => void;
}

const STATUS_STYLE: Record<EmailStatus, string> = {
  unread: "font-semibold text-text-primary",
  read: "text-text-secondary",
  replied: "text-success",
  pending: "text-warning",
  converted: "text-purple",
};

const CATEGORY_LABEL: Record<string, string> = {
  requirement: "需求",
  issue: "問題",
  report: "回報",
  other: "其他",
};

export function EmailList({ emails, selectedId, onSelect }: EmailListProps) {
  const { t, i18n } = useTranslation();

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
        <Inbox className="w-8 h-8" />
        <p className="text-xs">{t("common.noData")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto h-full divide-y divide-border/50">
      {emails.map((email) => (
        <button
          key={email.id}
          className={cn(
            "w-full text-left px-4 py-3 hover:bg-white/5 transition-colors",
            selectedId === email.id && "bg-primary/10",
            email.status === "unread" && "border-l-2 border-primary"
          )}
          onClick={() => onSelect(email)}
        >
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-xs truncate flex-1", STATUS_STYLE[email.status])}>
              {email.subject ?? "(無主旨)"}
            </p>
            {email.category && (
              <span className="shrink-0 text-[10px] text-text-muted">
                {CATEGORY_LABEL[email.category] ?? email.category}
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-muted truncate mt-0.5">{email.sender ?? "—"}</p>
          <p className="text-[10px] text-text-muted mt-1">
            {formatDate(email.received_at ?? email.created_at, i18n.language)}
          </p>
        </button>
      ))}
    </div>
  );
}
