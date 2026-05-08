import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckCircle2,
  PlusCircle,
  AlertTriangle,
  Mail,
  MailCheck,
  MailOpen,
  ArrowRightCircle,
  Download,
  RefreshCw,
  Sparkles,
  X,
  Calendar,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIORITY_COLORS, STATUS_COLORS } from "@/lib/constants";
import { api } from "@/lib/tauri";
import { useTasks } from "@/hooks/useTasks";
import { useEmails } from "@/hooks/useEmails";
import type { WeeklyReport } from "@/types";

type DetailType =
  | "tasks_completed"
  | "tasks_created"
  | "tasks_overdue"
  | "emails_received"
  | "emails_replied"
  | "emails_pending"
  | "emails_converted";

const DETAIL_LABELS: Record<DetailType, string> = {
  tasks_completed: "本週完成任務",
  tasks_created: "本週新增任務",
  tasks_overdue: "逾期任務",
  emails_received: "本週收到信件",
  emails_replied: "本週已回覆信件",
  emails_pending: "待處理信件",
  emails_converted: "本週已轉需求信件",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "待辦",
  in_progress: "進行中",
  review: "審核中",
  done: "已完成",
  overdue: "已逾期",
};

const EMAIL_STATUS_LABELS: Record<string, string> = {
  unread: "未讀",
  read: "已讀",
  replied: "已回覆",
  pending: "待處理",
  converted: "已轉需求",
};

const EMAIL_STATUS_COLORS: Record<string, string> = {
  unread: "bg-primary/20 text-primary border-primary/40",
  read: "bg-text-muted/20 text-text-secondary border-text-muted/40",
  replied: "bg-success/20 text-success border-success/40",
  pending: "bg-warning/20 text-warning border-warning/40",
  converted: "bg-purple/20 text-purple border-purple/40",
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
  active?: boolean;
  onClick?: () => void;
}

function StatCard({ icon, label, value, accent = "text-[var(--color-primary)]", active, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "glass-card p-5 flex items-center gap-4 w-full text-left transition-all",
        onClick && "cursor-pointer hover:border-[var(--color-primary)]/50 hover:bg-white/[0.06]",
        active && "border-[var(--color-primary)]/60 bg-primary/5 ring-1 ring-[var(--color-primary)]/30",
      )}
    >
      <div className={`${accent} opacity-80`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{label}</p>
      </div>
    </button>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 bg-layer-3 rounded-full overflow-hidden">
      <div
        className="h-full bg-[var(--color-primary)] rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Reports() {
  const { t } = useTranslation();
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [detailType, setDetailType] = useState<DetailType | null>(null);

  const { data: report, isLoading, isError, refetch, isFetching } = useQuery<WeeklyReport>({
    queryKey: ["weekly-report"],
    queryFn: () => api.reports.weekly(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allTasks = [] } = useTasks();
  const { data: allEmails = [] } = useEmails();

  const today = new Date().toISOString().slice(0, 10);

  const detailItems = useMemo(() => {
    if (!detailType || !report) return [];
    const start = report.period_start;
    const end = report.period_end;

    switch (detailType) {
      case "tasks_completed":
        return allTasks.filter(
          (t) => t.status === "done" && t.completed_at && t.completed_at.slice(0, 10) >= start && t.completed_at.slice(0, 10) <= end
        );
      case "tasks_created":
        return allTasks.filter(
          (t) => t.created_at.slice(0, 10) >= start && t.created_at.slice(0, 10) <= end
        );
      case "tasks_overdue":
        return allTasks.filter(
          (t) => t.status !== "done" && t.due_date && t.due_date < today
        );
      case "emails_received":
        return allEmails.filter(
          (e) => e.received_at && e.received_at.slice(0, 10) >= start && e.received_at.slice(0, 10) <= end
        );
      case "emails_replied":
        return allEmails.filter(
          (e) => e.status === "replied" && e.received_at && e.received_at.slice(0, 10) >= start && e.received_at.slice(0, 10) <= end
        );
      case "emails_pending":
        return allEmails.filter((e) => ["unread", "read", "pending"].includes(e.status));
      case "emails_converted":
        return allEmails.filter(
          (e) => e.status === "converted" && e.received_at && e.received_at.slice(0, 10) >= start && e.received_at.slice(0, 10) <= end
        );
      default:
        return [];
    }
  }, [detailType, report, allTasks, allEmails, today]);

  const isTaskDetail = detailType?.startsWith("tasks_") ?? false;

  function toggleDetail(type: DetailType) {
    setDetailType((prev) => (prev === type ? null : type));
  }

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus(null);
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const savePath = await save({
        defaultPath: `週報-${new Date().toISOString().slice(0, 10)}.xlsx`,
        filters: [{ name: "Excel 活頁簿", extensions: ["xlsx"] }],
      });
      if (!savePath) return;
      await api.reports.exportExcel(savePath);
      setExportStatus(`${t("reports.exportPath")} ${savePath}`);
    } catch (e) {
      setExportStatus(String(e));
    } finally {
      setIsExporting(false);
    }
  };

  const handleCheckUpdates = async () => {
    setIsChecking(true);
    setUpdateStatus(null);
    try {
      const msg = await api.reports.checkUpdates();
      setUpdateStatus(msg);
    } catch (e) {
      setUpdateStatus(String(e));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main report column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {t("reports.title")}
            </h1>
            {report && (
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                {t("reports.period")}：{report.period_start} → {report.period_end}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="text-xs gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? t("reports.generating") : t("reports.generate")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={isExporting} className="text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {isExporting ? t("reports.exporting") : t("reports.export")}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCheckUpdates} disabled={isChecking} className="text-xs gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {isChecking ? t("reports.checkingUpdates") : t("reports.checkUpdates")}
            </Button>
          </div>
        </div>

        {/* Status messages */}
        {exportStatus && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2 text-sm text-green-300">
            {exportStatus}
          </div>
        )}
        {updateStatus && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-300">
            {updateStatus}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-[var(--color-text-muted)]">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            {t("common.loading")}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 text-[var(--color-text-muted)]">
            <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
            <p>{t("common.error")}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : report ? (
          <>
            {/* Task stats */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                任務
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  icon={<CheckCircle2 className="h-8 w-8" />}
                  label={t("reports.tasksCompleted")}
                  value={report.tasks_completed}
                  accent="text-green-400"
                  active={detailType === "tasks_completed"}
                  onClick={() => toggleDetail("tasks_completed")}
                />
                <StatCard
                  icon={<PlusCircle className="h-8 w-8" />}
                  label={t("reports.tasksCreated")}
                  value={report.tasks_created}
                  accent="text-[var(--color-primary)]"
                  active={detailType === "tasks_created"}
                  onClick={() => toggleDetail("tasks_created")}
                />
                <StatCard
                  icon={<AlertTriangle className="h-8 w-8" />}
                  label={t("reports.tasksOverdue")}
                  value={report.tasks_overdue}
                  accent="text-red-400"
                  active={detailType === "tasks_overdue"}
                  onClick={() => toggleDetail("tasks_overdue")}
                />
              </div>
            </div>

            {/* Email stats */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                信件
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  icon={<Mail className="h-8 w-8" />}
                  label={t("reports.emailsReceived")}
                  value={report.emails_received}
                  accent="text-[var(--color-accent)]"
                  active={detailType === "emails_received"}
                  onClick={() => toggleDetail("emails_received")}
                />
                <StatCard
                  icon={<MailCheck className="h-8 w-8" />}
                  label={t("reports.emailsReplied")}
                  value={report.emails_replied}
                  accent="text-green-400"
                  active={detailType === "emails_replied"}
                  onClick={() => toggleDetail("emails_replied")}
                />
                <StatCard
                  icon={<MailOpen className="h-8 w-8" />}
                  label="待處理信件"
                  value={report.emails_pending}
                  accent="text-yellow-400"
                  active={detailType === "emails_pending"}
                  onClick={() => toggleDetail("emails_pending")}
                />
                <StatCard
                  icon={<ArrowRightCircle className="h-8 w-8" />}
                  label="本週已轉需求"
                  value={report.emails_converted}
                  accent="text-purple-400"
                  active={detailType === "emails_converted"}
                  onClick={() => toggleDetail("emails_converted")}
                />
              </div>
            </div>

            {/* Active projects */}
            {report.active_projects.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                  {t("reports.activeProjects")}
                </h2>
                <div className="glass-card divide-y divide-[var(--color-border)]">
                  {report.active_projects.map((proj) => (
                    <div key={proj.name} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{proj.name}</span>
                        <span className="text-sm text-[var(--color-text-muted)]">
                          {proj.done_count}/{proj.task_count} {t("reports.progress")} {proj.progress_pct}%
                        </span>
                      </div>
                      <ProgressBar pct={proj.progress_pct} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            {report.highlights.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                  {t("reports.highlights")}
                </h2>
                <div className="glass-card p-5 space-y-2">
                  {report.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-[var(--color-primary)] mt-0.5">•</span>
                      <p className="text-sm text-[var(--color-text-secondary)]">{h}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Detail panel */}
      {detailType && (
        <div className="w-80 shrink-0 border-l border-[var(--color-border)] flex flex-col bg-[var(--color-card-bg)]">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] shrink-0">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {DETAIL_LABELS[detailType]}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">{detailItems.length} 筆</span>
              <button
                onClick={() => setDetailType(null)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Panel list */}
          <div className="flex-1 overflow-y-auto">
            {detailItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[var(--color-text-muted)]">
                <p className="text-sm">無資料</p>
              </div>
            ) : isTaskDetail ? (
              <div className="divide-y divide-[var(--color-border)]">
                {(detailItems as ReturnType<typeof allTasks.filter>).map((task) => (
                  <div key={task.id} className="px-4 py-3 space-y-1.5">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn(
                        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                        PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]
                      )}>
                        {task.priority}
                      </span>
                      <span className={cn(
                        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                        STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]
                      )}>
                        {STATUS_LABELS[task.status] ?? task.status}
                      </span>
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                          <Calendar className="h-3 w-3" />
                          {task.due_date}
                        </span>
                      )}
                      {task.assignee && (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                          <User className="h-3 w-3" />
                          {task.assignee}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {(detailItems as ReturnType<typeof allEmails.filter>).map((email) => (
                  <div key={email.id} className="px-4 py-3 space-y-1.5">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] leading-snug line-clamp-2">
                      {email.subject ?? "(無主旨)"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn(
                        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                        EMAIL_STATUS_COLORS[email.status] ?? ""
                      )}>
                        {EMAIL_STATUS_LABELS[email.status] ?? email.status}
                      </span>
                      {email.sender && (
                        <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[160px]">
                          {email.sender}
                        </span>
                      )}
                    </div>
                    {email.received_at && (
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {email.received_at.slice(0, 16).replace("T", " ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
