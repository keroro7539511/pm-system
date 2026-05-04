import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartColors } from "@/hooks/useChartColors";
import type { TaskStats } from "@/types";

const COLORS = ["#6B7280", "#3B82F6", "#8B5CF6", "#10B981"];

interface StatusPieChartProps {
  stats?: TaskStats;
}

export function StatusPieChart({ stats }: StatusPieChartProps) {
  const { t } = useTranslation();
  const c = useChartColors();

  const data = [
    { name: t("tasks.status.todo"),        value: stats?.todo ?? 3 },
    { name: t("tasks.status.in_progress"), value: stats?.in_progress ?? 2 },
    { name: t("tasks.status.review"),      value: 1 },
    { name: t("tasks.status.done"),        value: stats?.done ?? 4 },
  ].filter((d) => d.value > 0);

  return (
    <Card className="animate-fade-in-delay-3">
      <CardHeader>
        <CardTitle>{t("dashboard.charts.statusDist")}</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: c.tooltipBg,
              border: `1px solid ${c.tooltipBorder}`,
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: c.tooltipColor }}
            itemStyle={{ color: c.tooltipColor }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: "11px", color: c.labelFill }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
