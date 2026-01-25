"use client";

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

export function ShortHistoryChart({ history, companyName }: ShortHistoryChartProps) {
  // Format data for the chart
  const chartData = history.map((point) => ({
    date: point.date,
    total: point.totalShortPct,
    displayDate: new Date(point.date).toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    }),
  }));

  if (chartData.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        Ikke nok historiske data for graf
      </div>
    );
  }

  return (
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
  );
}
