"use client";

import { useState } from "react";
import { HolderCompanyPosition } from "@/lib/types";
import { PeriodSelector, defaultPeriods } from "./ui/period-selector";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

// Navy theme colors (match --an-* CSS vars)
const CHART_THEME = {
  border: "#1c2638",
  textMuted: "#4a5568",
  textSecondary: "#7a8599",
};

// Color palette for different companies (works on dark backgrounds)
const LINE_COLORS = [
  "#c25050", // red
  "#c9a84c", // gold
  "#34a06e", // green
  "#5b8def", // blue
  "#b89040", // amber
  "#14b8a6", // teal
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6366f1", // indigo
  "#06b6d4", // cyan
];

interface HolderHistoryChartProps {
  companies: HolderCompanyPosition[];
}

export function HolderHistoryChart({ companies }: HolderHistoryChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("1M");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter companies history based on selected period
  const periodConfig = defaultPeriods.find(p => p.key === selectedPeriod);
  let cutoffDate: Date | null = null;

  if (periodConfig?.days) {
    cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - periodConfig.days);
  }

  // Collect all unique dates across all companies
  const allDates = new Set<string>();
  companies.forEach((company) => {
    company.history.forEach((h) => {
      if (!cutoffDate || new Date(h.date) >= cutoffDate) {
        allDates.add(h.date);
      }
    });
  });

  // Sort dates chronologically
  const sortedDates = Array.from(allDates).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  if (sortedDates.length < 2) {
    return (
      <div
        className="h-64 flex items-center justify-center text-[13px]"
        style={{ color: "var(--an-text-muted)" }}
      >
        Ikke nok historiske data for graf
      </div>
    );
  }

  // Build chart data with all companies
  const chartData = sortedDates.map((date) => {
    const point: Record<string, string | number> = {
      date,
      displayDate: new Date(date).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      }),
    };

    companies.forEach((company) => {
      const historyPoint = company.history.find((h) => h.date === date);
      if (historyPoint) {
        point[company.issuerName] = historyPoint.pct;
      }
    });

    return point;
  });

  // Fill in gaps with last known values
  companies.forEach((company) => {
    let lastValue: number | undefined;
    chartData.forEach((point) => {
      if (point[company.issuerName] !== undefined) {
        lastValue = point[company.issuerName] as number;
      } else if (lastValue !== undefined) {
        point[company.issuerName] = lastValue;
      }
    });
  });

  // Add today's date with the last known values if the last data point is not today
  if (chartData.length > 0) {
    const lastPoint = chartData[chartData.length - 1];
    const lastDate = new Date(lastPoint.date as string);
    lastDate.setHours(0, 0, 0, 0);

    if (lastDate.getTime() < today.getTime()) {
      const todayPoint: Record<string, string | number> = {
        date: today.toISOString().split("T")[0],
        displayDate: today.toLocaleDateString("nb-NO", {
          day: "numeric",
          month: "short",
          year: "2-digit",
        }),
      };

      companies.forEach((company) => {
        if (lastPoint[company.issuerName] !== undefined) {
          todayPoint[company.issuerName] = lastPoint[company.issuerName];
        }
      });

      chartData.push(todayPoint);
    }
  }

  return (
    <div>
      <div className="mb-3">
        <PeriodSelector selected={selectedPeriod} onSelect={setSelectedPeriod} />
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.border} vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 11, fill: CHART_THEME.textMuted }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              tick={{ fontSize: 11, fill: CHART_THEME.textMuted }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, "auto"]}
              width={40}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div
                      className="rounded-lg shadow-lg p-3 max-w-xs border"
                      style={{
                        background: "var(--an-bg-surface)",
                        borderColor: "var(--an-border)",
                      }}
                    >
                      <p
                        className="text-[12px] font-medium mb-2"
                        style={{ color: "var(--an-text-primary)" }}
                      >
                        {label}
                      </p>
                      <div className="space-y-1">
                        {payload
                          .filter((p) => p.value !== undefined)
                          .sort((a, b) => (b.value as number) - (a.value as number))
                          .map((p, i) => (
                            <div key={i} className="flex items-center justify-between gap-4 text-[12px]">
                              <span
                                className="truncate max-w-[150px]"
                                style={{ color: p.color }}
                              >
                                {p.name}
                              </span>
                              <span className="mono font-medium" style={{ color: "var(--an-text-primary)" }}>
                                {(p.value as number).toFixed(2)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              formatter={(value) => (
                <span
                  className="truncate max-w-[100px] inline-block align-middle"
                  style={{ color: CHART_THEME.textSecondary }}
                >
                  {value}
                </span>
              )}
            />
            {companies.map((company, index) => (
              <Line
                key={company.isin}
                type="monotone"
                dataKey={company.issuerName}
                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
