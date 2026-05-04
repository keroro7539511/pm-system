import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartColors } from "@/hooks/useChartColors";

function generateTrendData() {
  const weeks = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    weeks.push({
      week: `${month}/${day}`,
      completed: Math.floor(Math.random() * 8) + 3,
      created: Math.floor(Math.random() * 10) + 4,
    });
  }
  return weeks;
}

const data = generateTrendData();

export function TaskTrendChart() {
  const { t } = useTranslation();
  const c = useChartColors();

  return (
    <Card className="animate-fade-in-delay-2">
      <CardHeader>
        <CardTitle>{t("dashboard.charts.taskTrend")}</CardTitle>
      </CardHeader>
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
          <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} dot={false} name={t("tasks.status.done")} />
          <Line type="monotone" dataKey="created" stroke="#3B82F6" strokeWidth={2} dot={false} name={t("tasks.newTask")} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
