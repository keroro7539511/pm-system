import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Check, Clock, RefreshCw, Sparkles, X, Copy, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useMarkEmailRead, useUpdateEmail } from "@/hooks/useEmails";
import { api } from "@/lib/tauri";
import type { Email, EmailStatus } from "@/types";

interface EmailDetailProps {
  email: Email | null;
  onDelete?: (email: Email) => void;
}

const STATUS_ACTIONS: { status: EmailStatus; label: string; icon: React.FC<{ className?: string }> }[] = [
  { status: "replied", label: "標記已回覆", icon: Check },
  { status: "pending", label: "待處理", icon: Clock },
  { status: "converted", label: "已轉需求", icon: RefreshCw },
];

export function EmailDetail({ email, onDelete }: EmailDetailProps) {
  const { t, i18n } = useTranslation();
  const markRead = useMarkEmailRead();
  const updateEmail = useUpdateEmail();

  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (email && email.status === "unread") {
      markRead.mutate(email.id);
    }
    // reset draft when switching emails
    setDraftOpen(false);
    setDraft("");
    setDraftError(null);
  }, [email?.id]);

  async function handleGenerateDraft() {
    if (!email) return;
    setDraftOpen(true);
    setDraftLoading(true);
    setDraftError(null);
    setDraft("");
    try {
      const result = await api.ai.generateEmailDraft(
        email.subject ?? "",
        email.sender ?? "",
        email.body ?? "",
      );
      setDraft(result);
    } catch (e) {
      setDraftError(String(e));
    } finally {
      setDraftLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
      <div className="px-5 py-4 border-b border-border shrink-0">
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
        <div className="mx-5 mt-4 p-3 rounded-lg bg-purple/10 border border-purple/20 shrink-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple" />
            <span className="text-xs font-medium text-purple">AI 摘要</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{email.ai_summary}</p>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
        <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
          {email.body ?? t("common.noData")}
        </pre>
      </div>

      {/* AI Draft Panel */}
      {draftOpen && (
        <div className="shrink-0 border-t border-border bg-layer-2">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            <span className="flex items-center gap-1.5 text-xs font-medium text-purple">
              <Sparkles className="w-3.5 h-3.5" />
              AI 回覆草稿
            </span>
            <button
              onClick={() => setDraftOpen(false)}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-2">
            {draftLoading ? (
              <div className="flex items-center gap-2 text-xs text-text-muted py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI 正在生成回覆草稿...
              </div>
            ) : draftError ? (
              <div className="space-y-2">
                <p className="text-xs text-danger leading-relaxed">{draftError}</p>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleGenerateDraft}>
                  重新生成
                </Button>
              </div>
            ) : (
              <>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="草稿將顯示於此，可直接編輯..."
                  className="w-full h-36 bg-layer-3 border border-border rounded-md px-3 py-2 text-xs text-text-secondary resize-none focus:outline-none focus:border-primary transition-colors font-sans leading-relaxed"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1.5"
                    onClick={handleCopy}
                    disabled={!draft}
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? "已複製！" : "複製草稿"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={handleGenerateDraft}
                  >
                    重新生成
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-border shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs text-purple border-purple/30 hover:bg-purple/10 hover:text-purple"
          onClick={handleGenerateDraft}
          disabled={draftLoading}
        >
          <Sparkles className="w-3 h-3" />
          AI 擬稿
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

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

        <div className="flex-1" />

        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs text-text-muted hover:text-danger hover:bg-danger/10"
            onClick={() => onDelete(email)}
          >
            <Trash2 className="w-3 h-3" />
            刪除
          </Button>
        )}
      </div>
    </div>
  );
}
