import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Check, Clock, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useMarkEmailRead, useUpdateEmail } from "@/hooks/useEmails";
import type { Email, EmailStatus } from "@/types";

interface EmailDetailProps {
  email: Email | null;
}

const STATUS_ACTIONS: { status: EmailStatus; label: string; icon: React.FC<{ className?: string }> }[] = [
  { status: "replied", label: "標記已回覆", icon: Check },
  { status: "pending", label: "待處理", icon: Clock },
  { status: "converted", label: "已轉需求", icon: RefreshCw },
];

export function EmailDetail({ email }: EmailDetailProps) {
  const { t, i18n } = useTranslation();
  const markRead = useMarkEmailRead();
  const updateEmail = useUpdateEmail();

  useEffect(() => {
    if (email && email.status === "unread") {
      markRead.mutate(email.id);
    }
  }, [email?.id]);

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
        <Mail className="w-10 h-10" />
        <p className="text-sm">選擇信件以查看內容</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-text-primary mb-1">
          {email.subject ?? "(無主旨)"}
        </h2>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>From: {email.sender ?? "—"}</span>
          <span>{formatDate(email.received_at ?? email.created_at, i18n.language)}</span>
          {email.category && (
            <Badge variant="muted" className="text-[10px]">{email.category}</Badge>
          )}
        </div>
      </div>

      {/* AI Summary */}
      {email.ai_summary && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-purple/10 border border-purple/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple" />
            <span className="text-xs font-medium text-purple">AI 摘要</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{email.ai_summary}</p>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
          {email.body ?? t("common.noData")}
        </pre>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
        {STATUS_ACTIONS.map(({ status, label, icon: Icon }) => (
          <Button
            key={status}
            size="sm"
            variant={email.status === status ? "default" : "outline"}
            className="gap-1.5 text-xs"
            onClick={() => updateEmail.mutate({ id: email.id, payload: { status } })}
          >
            <Icon className="w-3 h-3" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
