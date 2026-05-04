import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartColors } from "@/hooks/useChartColors";
import { useTaskTrend } from "@/hooks/useTasks";

export function TaskTrendChart() {
  const { t } = useTranslation();
  const c = useChartColors();
  const { data = [], isLoading } = useTaskTrend();

  return (
    <Card className="animate-fade-in-delay-2">
      <CardHeader>
        <CardTitle>{t("dashboard.charts.taskTrend")}</CardTitle>
      </CardHeader>
      {isLoading ? (
        <div className="h-[180px] flex items-center justify-center text-xs text-text-muted">
          {t("common.loading")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.gridStroke} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: c.tickFill }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: c.tickFill }}
              tickLine={false}
              axisLine={false}
            />
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
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name={t("tasks.status.done")}
            />
            <Line
              type="monotone"
              dataKey="created"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name={t("tasks.newTask")}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
