import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckCircle2,
  PlusCircle,
  AlertTriangle,
  Mail,
  MailCheck,
  Download,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/tauri";
import type { WeeklyReport } from "@/types";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
}

function StatCard({ icon, label, value, accent = "text-[var(--color-primary)]" }: StatCardProps) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={`${accent} opacity-80`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{label}</p>
      </div>
    </div>
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

  const {
    data: report,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<WeeklyReport>({
    queryKey: ["weekly-report"],
    queryFn: () => api.reports.weekly(),
    staleTime: 5 * 60 * 1000,
  });

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus(null);
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const savePath = await save({
        defaultPath: `pm-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!savePath) return;
      await api.reports.export(savePath);
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
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? t("reports.generating") : t("reports.generate")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? t("reports.exporting") : t("reports.export")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCheckUpdates}
            disabled={isChecking}
            className="text-xs gap-1.5"
          >
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
          {/* KPI stats */}
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              {t("reports.summary")}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                icon={<CheckCircle2 className="h-8 w-8" />}
                label={t("reports.tasksCompleted")}
                value={report.tasks_completed}
                accent="text-green-400"
              />
              <StatCard
                icon={<PlusCircle className="h-8 w-8" />}
                label={t("reports.tasksCreated")}
                value={report.tasks_created}
                accent="text-[var(--color-primary)]"
              />
              <StatCard
                icon={<AlertTriangle className="h-8 w-8" />}
                label={t("reports.tasksOverdue")}
                value={report.tasks_overdue}
                accent="text-red-400"
              />
              <StatCard
                icon={<Mail className="h-8 w-8" />}
                label={t("reports.emailsReceived")}
                value={report.emails_received}
                accent="text-[var(--color-accent)]"
              />
              <StatCard
                icon={<MailCheck className="h-8 w-8" />}
                label={t("reports.emailsReplied")}
                value={report.emails_replied}
                accent="text-green-400"
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
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {proj.name}
                      </span>
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
  );
}
