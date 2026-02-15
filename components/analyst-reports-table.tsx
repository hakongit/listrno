"use client";

import { useState } from "react";
import Link from "next/link";
import { RecommendationBadge } from "@/components/ui/recommendation-badge";

interface ReportRow {
  recommendationId: number;
  receivedDate: string;
  bankName: string | null;
  bankSlug: string | null;
  recommendation?: string;
  targetPrice?: number;
  targetCurrency: string;
  previousTargetPrice?: number;
  priceAtReport?: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString("nb-NO", { maximumFractionDigits: 0 });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

function formatTargetPrice(price?: number, currency?: string): string {
  if (!price) return "-";
  return `${formatNumber(price)} ${currency || "NOK"}`;
}

export function AnalystReportsTable({
  reports,
  collapsedCount = 5,
}: {
  reports: ReportRow[];
  collapsedCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = reports.length > collapsedCount;
  const visibleReports = expanded ? reports : reports.slice(0, collapsedCount);

  return (
    <div
      className="rounded-lg overflow-hidden border mt-3"
      style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
    >
      <div
        className="px-3 sm:px-[18px] py-3 border-b flex items-center justify-between"
        style={{ borderColor: "var(--an-border)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--an-text-secondary)" }}
        >
          Analyser
        </span>
        <Link
          href="/analyser"
          className="text-[11px] font-medium transition-colors hover:text-[var(--an-accent)]"
          style={{ color: "var(--an-text-muted)" }}
        >
          Alle analyser
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "80px" }}
              >
                Dato
              </th>
              <th
                className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)" }}
              >
                Bank
              </th>
              <th
                className="text-center text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "110px" }}
              >
                Anbefaling
              </th>
              <th
                className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "120px" }}
              >
                Kursmål
              </th>
              <th
                className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden lg:table-cell"
                style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "120px" }}
              >
                Kurs ved rapp.
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleReports.map((report, i) => (
              <tr
                key={report.recommendationId}
                className="an-table-row transition-colors"
                style={{
                  borderBottom: i < visibleReports.length - 1
                    ? "1px solid var(--an-border-subtle)"
                    : "none",
                }}
              >
                <td
                  className="px-3 sm:px-[18px] py-3 text-xs whitespace-nowrap"
                  style={{ color: "var(--an-text-muted)" }}
                >
                  {formatDateShort(report.receivedDate)}
                </td>
                <td className="px-3 sm:px-[18px] py-3">
                  {report.bankName && report.bankSlug ? (
                    <Link
                      href={report.bankSlug}
                      className="text-[13px] font-medium transition-colors hover:text-[var(--an-accent)]"
                      style={{ color: "var(--an-text-primary)" }}
                    >
                      {report.bankName}
                    </Link>
                  ) : null}
                </td>
                <td className="px-3 sm:px-[18px] py-3 text-center">
                  <RecommendationBadge recommendation={report.recommendation} />
                </td>
                <td className="px-3 sm:px-[18px] py-3 text-right">
                  {report.targetPrice ? (
                    <span
                      className="mono text-[13px] font-medium select-none blur-[5px] whitespace-nowrap"
                      style={{ color: "var(--an-text-secondary)" }}
                    >
                      {formatTargetPrice(report.targetPrice, report.targetCurrency)}
                      {report.previousTargetPrice && (
                        <span className="text-[10px] ml-1" style={{ color: "var(--an-text-muted)" }}>
                          ({formatNumber(report.previousTargetPrice)})
                        </span>
                      )}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 sm:px-[18px] py-3 text-right hidden lg:table-cell">
                  {report.priceAtReport ? (
                    <span
                      className="mono text-[13px] font-medium select-none blur-[5px] whitespace-nowrap"
                      style={{ color: "var(--an-text-secondary)" }}
                    >
                      {formatNumber(report.priceAtReport)} {report.targetCurrency}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canExpand && (
        <div
          className="px-3 sm:px-[18px] py-3 text-center border-t"
          style={{ borderColor: "var(--an-border-subtle)" }}
        >
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[13px] font-medium transition-colors hover:text-[var(--an-accent)]"
            style={{ color: "var(--an-text-muted)" }}
          >
            {expanded ? "Vis færre" : `Vis alle ${reports.length} analyser`}
          </button>
        </div>
      )}
    </div>
  );
}
