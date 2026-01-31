"use client";

import { useState } from "react";
import { HolderCompanyPosition } from "@/lib/types";
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

interface HolderHistoryChartProps {
  companies: HolderCompanyPosition[];
}

// Color palette for different companies
const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6366f1", // indigo
  "#06b6d4", // cyan
];

const periods = [
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "6M", label: "6M", days: 180 },
  { key: "1Y", label: "1Å", days: 365 },
  { key: "ALL", label: "Alle", days: null },
] as const;

type PeriodKey = typeof periods[number]["key"];

export function HolderHistoryChart({ companies }: HolderHistoryChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("ALL");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter companies history based on selected period
  const periodConfig = periods.find(p => p.key === selectedPeriod);
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
      <div className="h-64 flex items-center justify-center text-gray-500">
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
      // Use the last known value if no data for this date
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

      // Copy last known values for each company
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
      {/* Period selector */}
      <div className="flex gap-1 mb-3">
        {periods.map((period) => (
          <button
            key={period.key}
            onClick={() => setSelectedPeriod(period.key)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              selectedPeriod === period.key
                ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
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
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-xs">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {label}
                      </p>
                      <div className="space-y-1">
                        {payload
                          .filter((p) => p.value !== undefined)
                          .sort((a, b) => (b.value as number) - (a.value as number))
                          .map((p, i) => (
                            <div key={i} className="flex items-center justify-between gap-4 text-sm">
                              <span
                                className="truncate max-w-[150px]"
                                style={{ color: p.color }}
                              >
                                {p.name}
                              </span>
                              <span className="font-mono font-medium">
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
                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px] inline-block align-middle">
                  {value}
                </span>
              )}
            />
            {companies.map((company, index) => (
              <Line
                key={company.isin}
                type="monotone"
                dataKey={company.issuerName}
                stroke={COLORS[index % COLORS.length]}
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
