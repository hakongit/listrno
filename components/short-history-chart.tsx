"use client";

import { useState } from "react";
import { HistoricalDataPoint } from "@/lib/types";
import { PeriodSelector, defaultPeriods } from "./ui/period-selector";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// Navy theme colors (match --an-* CSS vars)
const COLORS = {
  red: "#c25050",
  border: "#1c2638",
  textMuted: "#4a5568",
  surface: "#0e1420",
};

interface ShortHistoryChartProps {
  history: HistoricalDataPoint[];
  companyName: string;
}

export function ShortHistoryChart({ history, companyName }: ShortHistoryChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("1M");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter data based on selected period
  const periodConfig = defaultPeriods.find(p => p.key === selectedPeriod);
  let filteredHistory = history;

  if (periodConfig?.days) {
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - periodConfig.days);
    filteredHistory = history.filter(point => new Date(point.date) >= cutoffDate);
  }

  // Format data for the chart
  const chartData = filteredHistory.map((point) => ({
    date: point.date,
    timestamp: new Date(point.date).getTime(),
    total: point.totalShortPct,
    displayDate: new Date(point.date).toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    }),
  }));

  // Add today's date with the last known value if the last data point is not today
  if (chartData.length > 0) {
    const lastPoint = chartData[chartData.length - 1];
    const lastDate = new Date(lastPoint.date);
    lastDate.setHours(0, 0, 0, 0);

    if (lastDate.getTime() < today.getTime()) {
      chartData.push({
        date: today.toISOString().split("T")[0],
        timestamp: today.getTime(),
        total: lastPoint.total,
        displayDate: today.toLocaleDateString("nb-NO", {
          day: "numeric",
          month: "short",
          year: "2-digit",
        }),
      });
    }
  }

  if (chartData.length < 2) {
    return (
      <div
        className="h-64 flex items-center justify-center text-[13px]"
        style={{ color: "var(--an-text-muted)" }}
      >
        Ikke nok historiske data for graf
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <PeriodSelector selected={selectedPeriod} onSelect={setSelectedPeriod} />
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorShort" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.red} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.red} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 12, fill: COLORS.textMuted }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              tick={{ fontSize: 12, fill: COLORS.textMuted }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, "auto"]}
              width={45}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div
                      className="rounded-lg shadow-lg p-3 border"
                      style={{
                        background: "var(--an-bg-surface)",
                        borderColor: "var(--an-border)",
                      }}
                    >
                      <p className="text-[12px]" style={{ color: "var(--an-text-muted)" }}>
                        {data.displayDate}
                      </p>
                      <p className="text-lg font-bold mono" style={{ color: "var(--an-red)" }}>
                        {data.total.toFixed(2)}%
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--an-text-muted)" }}>
                        Total short
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke={COLORS.red}
              strokeWidth={2}
              fill="url(#colorShort)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
