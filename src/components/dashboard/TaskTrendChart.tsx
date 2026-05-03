import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

// Generate mock 12-week trend data
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

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-2 text-xs">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export function TaskTrendChart() {
  const { t } = useTranslation();
  return (
    <Card className="animate-fade-in-delay-2">
      <CardHeader>
        <CardTitle>{t("dashboard.charts.taskTrend")}</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} dot={false} name="完成" />
          <Line type="monotone" dataKey="created" stroke="#3B82F6" strokeWidth={2} dot={false} name="新增" strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
