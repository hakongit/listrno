"use client";

import dynamic from "next/dynamic";
import type { HistoricalDataPoint } from "@/lib/types";

const ShortHistoryChart = dynamic(
  () => import("@/components/short-history-chart").then(mod => mod.ShortHistoryChart),
  { ssr: false, loading: () => <div className="h-72 flex items-center justify-center text-[13px]" style={{ color: "var(--an-text-muted)" }}>Laster graf...</div> }
);

interface LazyShortChartProps {
  history: HistoricalDataPoint[];
  companyName: string;
}

export function LazyShortChart({ history, companyName }: LazyShortChartProps) {
  return <ShortHistoryChart history={history} companyName={companyName} />;
}
