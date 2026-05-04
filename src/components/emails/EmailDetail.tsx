import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Check, Clock, RefreshCw, Sparkles, X, Copy, Loader2, Trash2, Paperclip, FileText, Image, File, FolderArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useMarkEmailRead, useUpdateEmail } from "@/hooks/useEmails";
import { api } from "@/lib/tauri";
import { useEmailAttachments } from "@/hooks/useAttachments";
import type { Email, EmailAttachment, EmailStatus } from "@/types";

interface EmailDetailProps {
  email: Email | null;
  onDelete?: (email: Email) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentIcon({ mimeType }: { mimeType: string | null }) {
  const t = mimeType ?? "";
  if (t.startsWith("image/")) return <Image className="w-4 h-4 shrink-0 text-primary" />;
  if (t === "application/pdf") return <FileText className="w-4 h-4 shrink-0 text-danger" />;
  if (t.includes("zip") || t.includes("tar") || t.includes("rar") || t.includes("7z"))
    return <FolderArchive className="w-4 h-4 shrink-0 text-warning" />;
  if (t.includes("word") || t.includes("document") || t.includes("text"))
    return <FileText className="w-4 h-4 shrink-0 text-primary" />;
  return <File className="w-4 h-4 shrink-0 text-text-muted" />;
}

function isImage(mimeType: string | null) {
  return (mimeType ?? "").startsWith("image/");
}

function ImageThumb({ att }: { att: EmailAttachment }) {
  const [src, setSrc] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.attachments.readBase64(att.file_path).then((b64) => {
      if (!cancelled) setSrc(`data:${att.mime_type ?? "image/jpeg"};base64,${b64}`);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [att.file_path, att.mime_type]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setLightbox(false);
  }, []);

  useEffect(() => {
    if (lightbox) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [lightbox, handleKey]);

  return (
    <>
      <button
        onClick={() => src && setLightbox(true)}
        title={att.filename}
        className="relative rounded-lg overflow-hidden border border-border bg-layer-2 hover:border-primary/50 transition-colors shrink-0"
        style={{ width: 80, height: 80 }}
      >
        {src ? (
          <img src={src} alt={att.filename} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5">
          <p className="text-[9px] text-white truncate">{att.filename}</p>
        </div>
      </button>

      {/* Lightbox */}
      {lightbox && src && (
        <div
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={src}
            alt={att.filename}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain"
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <span className="text-white/70 text-xs">{att.filename}</span>
            <button
              onClick={(e) => { e.stopPropagation(); api.attachments.open(att.file_path); }}
              className="text-xs text-primary hover:underline"
            >
              用系統開啟
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function AttachmentBar({ attachments }: { attachments: EmailAttachment[] }) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => isImage(a.mime_type));
  const files  = attachments.filter((a) => !isImage(a.mime_type));

  return (
    <div className="flex flex-col gap-2">
      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((att) => <ImageThumb key={att.id} att={att} />)}
        </div>
      )}
      {/* Non-image files */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((att) => (
            <button
              key={att.id}
              onClick={() => api.attachments.open(att.file_path)}
              title={att.file_path}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-layer-2 hover:bg-layer-3 hover:border-primary/40 transition-colors text-left max-w-[220px]"
            >
              <AttachmentIcon mimeType={att.mime_type} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{att.filename}</p>
                {att.size !== null && (
                  <p className="text-[10px] text-text-muted">{formatBytes(att.size)}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function parseEmailBody(raw: string): string[] {
  let text = raw;

  // If it looks like HTML, extract text content via DOMParser
  if (/<[a-z][\s\S]*>/i.test(text)) {
    try {
      // Convert common block elements to newlines before stripping
      text = text
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<\/tr>/gi, "\n")
        .replace(/<\/h[1-6]>/gi, "\n\n")
        .replace(/<\/blockquote>/gi, "\n");
      const doc = new DOMParser().parseFromString(text, "text/html");
      text = doc.body?.innerText ?? doc.body?.textContent ?? text;
    } catch {
      // fallback: strip tags with regex
      text = text.replace(/<[^>]+>/g, "");
    }
  }

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Collapse 3+ consecutive blank lines → 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text
    .trim()
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function EmailBody({ body }: { body?: string | null }) {
  if (!body) {
    return <p className="text-xs text-text-muted italic">（無內容）</p>;
  }

  const paragraphs = parseEmailBody(body);

  return (
    <div className="text-sm text-text-secondary leading-7 space-y-3">
      {paragraphs.map((p, i) => {
        // Quoted reply lines (starting with ">")
        const isQuote = p.split("\n").every((line) => line.trimStart().startsWith(">"));
        if (isQuote) {
          return (
            <blockquote key={i} className="border-l-2 border-border pl-3 text-text-muted text-xs leading-6">
              {p.replace(/^>\s?/gm, "")}
            </blockquote>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {p}
          </p>
        );
      })}
    </div>
  );
}

const STATUS_ACTIONS: { status: EmailStatus; label: string; icon: React.FC<{ className?: string }> }[] = [
  { status: "replied", label: "標記已回覆", icon: Check },
  { status: "pending", label: "待處理", icon: Clock },
  { status: "converted", label: "已轉需求", icon: RefreshCw },
];

export function EmailDetail({ email, onDelete }: EmailDetailProps) {
  const { i18n } = useTranslation();
  const markRead = useMarkEmailRead();
  const updateEmail = useUpdateEmail();
  const { data: attachments = [] } = useEmailAttachments(email?.id ?? null);

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

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-5 pt-3 pb-1 shrink-0">
          <div className="flex items-center gap-1.5 mb-2 text-xs text-text-muted">
            <Paperclip className="w-3 h-3" />
            <span>{attachments.length} 個附件</span>
          </div>
          <AttachmentBar attachments={attachments} />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
        <EmailBody body={email.body} />
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
