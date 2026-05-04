import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartColors } from "@/hooks/useChartColors";
import { calcProgress } from "@/lib/utils";
import type { Project } from "@/types";

interface ProjectProgressChartProps {
  projects?: Project[];
}

export function ProjectProgressChart({ projects }: ProjectProgressChartProps) {
  const { t } = useTranslation();
  const c = useChartColors();

  const data = (projects ?? []).slice(0, 6).map((p) => ({
    name: p.name.length > 8 ? p.name.slice(0, 8) + "…" : p.name,
    progress: calcProgress(p.done_count, p.task_count),
  }));

  if (data.length === 0) {
    data.push(
      { name: "ERP 導入", progress: 65 },
      { name: "官網改版", progress: 40 },
      { name: "CRM 整合", progress: 20 },
    );
  }

  return (
    <Card className="animate-fade-in-delay-4">
      <CardHeader>
        <CardTitle>{t("dashboard.charts.projectProgress")}</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: -8, bottom: 0 }}>
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: c.labelFill }}
            tickLine={false}
            axisLine={false}
            unit="%"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: c.labelFill }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            formatter={(v: number) => [`${v}%`, t("reports.progress")]}
            contentStyle={{
              background: c.tooltipBg,
              border: `1px solid ${c.tooltipBorder}`,
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: c.tooltipColor }}
            itemStyle={{ color: c.tooltipColor }}
          />
          <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.progress >= 75 ? "#10B981" : entry.progress >= 40 ? "#3B82F6" : "#F59E0B"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
