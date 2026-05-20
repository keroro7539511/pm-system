import { useTranslation } from "react-i18next";
import { CheckCircle, Clock, AlertTriangle, ListTodo } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TaskTrendChart } from "@/components/dashboard/TaskTrendChart";
import { StatusPieChart } from "@/components/dashboard/StatusPieChart";
import { ProjectProgressChart } from "@/components/dashboard/ProjectProgressChart";
import { useTaskStats } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";

export function Dashboard() {
  const { t } = useTranslation();
  const { data: stats } = useTaskStats();
  const { data: projects } = useProjects();

  if (stats !== undefined && stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
        <ListTodo className="h-20 w-20 opacity-20" />
        <p className="text-lg text-text-secondary">{t("dashboard.empty")}</p>
        <p className="text-sm text-center max-w-xs">{t("dashboard.emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5 overflow-auto h-full">
      <h1 className="text-lg font-semibold text-text-primary">{t("dashboard.title")}</h1>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title={t("dashboard.kpi.totalTasks")}
          value={stats?.total ?? 0}
          icon={ListTodo}
          color="text-primary"
          bgColor="bg-primary/10"
          weekDelta={3}
          weekLabel={t("dashboard.weekCompare")}
          animationDelay="0s"
        />
        <KpiCard
          title={t("dashboard.kpi.doneTasks")}
          value={stats?.done ?? 0}
          icon={CheckCircle}
          color="text-success"
          bgColor="bg-success/10"
          weekDelta={2}
          weekLabel={t("dashboard.weekCompare")}
          animationDelay="0.1s"
        />
        <KpiCard
          title={t("dashboard.kpi.inProgress")}
          value={stats?.in_progress ?? 0}
          icon={Clock}
          color="text-primary"
          bgColor="bg-primary/10"
          weekDelta={-1}
          weekLabel={t("dashboard.weekCompare")}
          animationDelay="0.2s"
        />
        <KpiCard
          title={t("dashboard.kpi.overdue")}
          value={stats?.overdue ?? 0}
          icon={AlertTriangle}
          color="text-warning"
          bgColor="bg-warning/10"
          weekDelta={0}
          weekLabel={t("dashboard.weekCompare")}
          animationDelay="0.3s"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <TaskTrendChart />
        </div>
        <StatusPieChart stats={stats} />
      </div>

      {/* Project progress */}
      <ProjectProgressChart projects={projects} />
    </div>
  );
}
