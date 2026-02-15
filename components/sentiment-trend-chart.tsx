"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const COLORS = {
  green: "#4ade80",
  amber: "#d4a843",
  red: "#c25050",
  border: "#1c2638",
  textMuted: "#4a5568",
  surface: "#0e1420",
};

interface MonthlyData {
  month: string;
  buy: number;
  hold: number;
  sell: number;
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  const months = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

export function SentimentTrendChart({ data }: { data: MonthlyData[] }) {
  // Convert to percentage data
  const chartData = data.map((d) => {
    const total = d.buy + d.hold + d.sell;
    return {
      month: formatMonth(d.month),
      buyPct: total > 0 ? Math.round((d.buy / total) * 100) : 0,
      holdPct: total > 0 ? Math.round((d.hold / total) * 100) : 0,
      sellPct: total > 0 ? Math.round((d.sell / total) * 100) : 0,
      total,
    };
  });

  if (chartData.length < 2) return null;

  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer minWidth={0}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={COLORS.border}
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: COLORS.textMuted }}
            tickLine={false}
            axisLine={{ stroke: COLORS.border }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: COLORS.textMuted }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: COLORS.textMuted, marginBottom: 4 }}
            formatter={(value: number | undefined, name: string) => {
              const labels: Record<string, string> = { buyPct: "Kjøp", holdPct: "Hold", sellPct: "Selg" };
              return [`${value ?? 0}%`, labels[name] || name];
            }}
          />
          <Area
            type="monotone"
            dataKey="buyPct"
            stackId="1"
            stroke={COLORS.green}
            fill={COLORS.green}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="holdPct"
            stackId="1"
            stroke={COLORS.amber}
            fill={COLORS.amber}
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="sellPct"
            stackId="1"
            stroke={COLORS.red}
            fill={COLORS.red}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
