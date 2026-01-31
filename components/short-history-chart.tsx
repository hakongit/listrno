"use client";

import { useState } from "react";
import { HistoricalDataPoint } from "@/lib/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface ShortHistoryChartProps {
  history: HistoricalDataPoint[];
  companyName: string;
}

const periods = [
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "6M", label: "6M", days: 180 },
  { key: "1Y", label: "1Å", days: 365 },
  { key: "ALL", label: "Alle", days: null },
] as const;

type PeriodKey = typeof periods[number]["key"];

export function ShortHistoryChart({ history, companyName }: ShortHistoryChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("ALL");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter data based on selected period
  const periodConfig = periods.find(p => p.key === selectedPeriod);
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
      <div className="h-64 flex items-center justify-center text-gray-500">
        Ikke nok historiske data for graf
      </div>
    );
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
                ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorShort" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6b7280" }}
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
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                      <p className="text-sm text-gray-500">{data.displayDate}</p>
                      <p className="text-lg font-bold text-red-600">
                        {data.total.toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-400">Total short</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#colorShort)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
