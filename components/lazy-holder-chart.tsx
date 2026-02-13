"use client";

import dynamic from "next/dynamic";
import type { HolderCompanyPosition } from "@/lib/types";

const HolderHistoryChart = dynamic(
  () => import("@/components/holder-history-chart").then(mod => mod.HolderHistoryChart),
  { ssr: false, loading: () => <div className="h-72 flex items-center justify-center text-[13px]" style={{ color: "var(--an-text-muted)" }}>Laster graf...</div> }
);

interface LazyHolderChartProps {
  companies: HolderCompanyPosition[];
}

export function LazyHolderChart({ companies }: LazyHolderChartProps) {
  return <HolderHistoryChart companies={companies} />;
}
