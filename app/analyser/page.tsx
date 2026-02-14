import {
  getCachedPublicAnalystReports,
  getCachedAnalystStats,
  initializeAnalystDatabase,
  isAggregatorSource,
  normalizeBankName,
} from "@/lib/analyst-db";
import { formatDateShort, formatNumber, slugify } from "@/lib/utils";
import { isinToTicker } from "@/lib/tickers";
import { RecommendationBadge } from "@/components/ui/recommendation-badge";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analyser - Listr",
  description:
    "Analyser og kursmål for norske aksjer fra ledende investeringsbanker.",
  openGraph: {
    title: "Analyser - Listr",
    description: "Analyser og kursmål for norske aksjer",
  },
};

function RecommendationBar({
  label,
  count,
  total,
  type,
}: {
  label: string;
  count: number;
  total: number;
  type: "buy" | "hold" | "sell";
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  const colorMap = {
    buy: { label: "var(--an-green)", fill: "var(--an-green)", count: "var(--an-green)" },
    hold: { label: "var(--an-amber)", fill: "var(--an-amber)", count: "var(--an-amber)" },
    sell: { label: "var(--an-red)", fill: "var(--an-red)", count: "var(--an-red)" },
  };

  const c = colorMap[type];

  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[13px] font-medium w-[68px] shrink-0"
        style={{ color: c.label }}
      >
        {label}
      </span>
      <div className="rec-bar-track flex-1">
        <div
          className="rec-bar-fill"
          style={{ width: `${pct}%`, background: c.fill }}
        />
      </div>
      <span
        className="text-[13px] font-semibold w-7 text-right shrink-0"
        style={{ color: c.count }}
      >
        {count}
      </span>
    </div>
  );
}

function formatTargetPrice(price?: number, currency?: string): string {
  if (!price) return "-";
  return `${formatNumber(price)} ${currency || "NOK"}`;
}

function classifyRec(rec?: string): "buy" | "hold" | "sell" | null {
  const r = rec?.toLowerCase();
  if (r === "buy" || r === "overweight" || r === "outperform") return "buy";
  if (r === "sell" || r === "underweight" || r === "underperform") return "sell";
  if (r === "hold") return "hold";
  return null;
}

export default async function AnalystReportsPage() {
  await initializeAnalystDatabase();

  const [allReports, stats] = await Promise.all([
    getCachedPublicAnalystReports(),
    getCachedAnalystStats(),
  ]);

  function getCompanyLink(name?: string): string | null {
    if (name) {
      return `/analyser/selskap/${slugify(name)}`;
    }
    return null;
  }

  function getTickerForReport(isin?: string): string | null {
    if (!isin) return null;
    return isinToTicker[isin] || null;
  }

  // Filter to reports with extracted data
  const reports = allReports.filter(
    (r) => r.companyName || r.recommendation || r.targetPrice
  );

  // Compute stats
  const latestDate = reports.length > 0 ? reports[0].receivedDate : null;

  // Recommendation counts — total
  const recCounts = { buy: 0, hold: 0, sell: 0 };
  for (const r of reports) {
    const cls = classifyRec(r.recommendation);
    if (cls) recCounts[cls]++;
  }
  const recTotal = recCounts.buy + recCounts.hold + recCounts.sell;

  // Recommendation counts — last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recCountsMonth = { buy: 0, hold: 0, sell: 0 };
  for (const r of reports) {
    if (new Date(r.receivedDate) < thirtyDaysAgo) break; // reports are sorted newest first
    const cls = classifyRec(r.recommendation);
    if (cls) recCountsMonth[cls]++;
  }
  const recTotalMonth = recCountsMonth.buy + recCountsMonth.hold + recCountsMonth.sell;

  // Check if latest report is from today
  const isUpdatedToday = (() => {
    if (!latestDate) return false;
    const latest = new Date(latestDate);
    const now = new Date();
    return (
      latest.getFullYear() === now.getFullYear() &&
      latest.getMonth() === now.getMonth() &&
      latest.getDate() === now.getDate()
    );
  })();

  // Only show the latest 5 reports
  const displayReports = reports.slice(0, 5);

  if (reports.length === 0) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 py-6">
        <div
          className="rounded-lg p-8 text-center border"
          style={{
            background: "var(--an-bg-surface)",
            borderColor: "var(--an-border)",
          }}
        >
          <svg
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "var(--an-text-muted)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <h2
            className="text-lg font-semibold mb-2"
            style={{ color: "var(--an-text-primary)" }}
          >
            Ingen rapporter enn&aring;
          </h2>
          <p className="text-sm" style={{ color: "var(--an-text-secondary)" }}>
            Analyser vil vises her n&aring;r de er tilgjengelige.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      {/* Hero */}
      <div className="pt-8 flex justify-between items-end">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight mb-1">
            Analyser
          </h1>
          <p className="text-[13px]" style={{ color: "var(--an-text-secondary)" }}>
            Kursmål og anbefalinger fra ledende investeringsbanker
          </p>
        </div>
        {isUpdatedToday && (
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap border"
            style={{
              color: "var(--an-green)",
              background: "var(--an-green-bg)",
              borderColor: "var(--an-green-border)",
            }}
          >
            Oppdatert i dag
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        <div
          className="an-stat-accent rounded-lg p-4 border"
          style={{ borderColor: "var(--an-border)" }}
        >
          <div
            className="text-[26px] font-bold tracking-tight leading-tight mb-0.5"
            style={{ color: "var(--an-accent)" }}
          >
            {stats.reportCount}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Analyser
          </div>
        </div>
        <div
          className="rounded-lg p-4 border"
          style={{
            background: "var(--an-bg-surface)",
            borderColor: "var(--an-border)",
          }}
        >
          <div className="text-[26px] font-bold tracking-tight leading-tight mb-0.5">
            {stats.companyCount}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Selskaper dekket
          </div>
        </div>
        <div
          className="rounded-lg p-4 border"
          style={{
            background: "var(--an-bg-surface)",
            borderColor: "var(--an-border)",
          }}
        >
          <div className="text-[20px] font-bold tracking-tight leading-tight mb-0.5 pt-1">
            {latestDate ? formatDateShort(latestDate) : "-"}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Siste rapport
          </div>
        </div>
      </div>

      {/* Recommendations panel */}
      <div className="mt-3">
        <div
          className="rounded-lg overflow-hidden border"
          style={{
            background: "var(--an-bg-surface)",
            borderColor: "var(--an-border)",
          }}
        >
          <div
            className="px-[18px] py-3 border-b flex justify-between items-center"
            style={{ borderColor: "var(--an-border)" }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Anbefalinger
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6 px-[18px] py-4">
            {/* Last 30 days */}
            <div>
              <div
                className="text-[11px] font-medium uppercase tracking-wider mb-2.5"
                style={{ color: "var(--an-text-muted)" }}
              >
                Siste 30 dager
              </div>
              <div className="space-y-3">
                <RecommendationBar
                  label="Kjøp"
                  count={recCountsMonth.buy}
                  total={recTotalMonth}
                  type="buy"
                />
                <RecommendationBar
                  label="Hold"
                  count={recCountsMonth.hold}
                  total={recTotalMonth}
                  type="hold"
                />
                <RecommendationBar
                  label="Selg"
                  count={recCountsMonth.sell}
                  total={recTotalMonth}
                  type="sell"
                />
              </div>
            </div>
            {/* Total */}
            <div
              className="pt-4 md:pt-0 mt-4 md:mt-0"
              style={{ borderTop: "1px solid var(--an-border-subtle)" }}
            >
              <div
                className="text-[11px] font-medium uppercase tracking-wider mb-2.5"
                style={{ color: "var(--an-text-muted)" }}
              >
                Totalt
              </div>
              <div className="space-y-3">
                <RecommendationBar
                  label="Kjøp"
                  count={recCounts.buy}
                  total={recTotal}
                  type="buy"
                />
                <RecommendationBar
                  label="Hold"
                  count={recCounts.hold}
                  total={recTotal}
                  type="hold"
                />
                <RecommendationBar
                  label="Selg"
                  count={recCounts.sell}
                  total={recTotal}
                  type="sell"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table — latest 15 */}
      <div className="mt-3 mb-10">
        <div
          className="rounded-lg overflow-hidden border"
          style={{
            background: "var(--an-bg-surface)",
            borderColor: "var(--an-border)",
          }}
        >
          <div
            className="px-3 sm:px-[18px] py-3 border-b flex justify-between items-center"
            style={{ borderColor: "var(--an-border)" }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Siste analyser
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                      width: "80px",
                    }}
                  >
                    Dato
                  </th>
                  <th
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                    }}
                  >
                    Selskap
                  </th>
                  <th
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden md:table-cell"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                    }}
                  >
                    Bank
                  </th>
                  <th
                    className="text-center text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                      width: "110px",
                    }}
                  >
                    Anbefaling
                  </th>
                  <th
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                      width: "120px",
                    }}
                  >
                    Kursmål
                  </th>
                  <th
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden lg:table-cell"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                      width: "120px",
                    }}
                  >
                    Kurs ved rapp.
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayReports.map((report, i) => {
                  const companyLink = getCompanyLink(report.companyName);
                  const ticker = getTickerForReport(report.companyIsin);
                  const effectiveBank = report.recInvestmentBank || report.investmentBank;
                  const bankName = effectiveBank && !isAggregatorSource(effectiveBank) ? normalizeBankName(effectiveBank) : null;

                  return (
                    <tr
                      key={report.recommendationId}
                      className="an-table-row transition-colors"
                      style={{
                        borderBottom:
                          i < displayReports.length - 1
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
                        {companyLink ? (
                          <Link
                            href={companyLink}
                            className="font-semibold text-[13px] transition-colors hover:text-[var(--an-accent)]"
                            style={{ color: "var(--an-text-primary)" }}
                          >
                            {report.companyName}
                            {ticker && (
                              <span
                                className="font-normal text-[11px] ml-1"
                                style={{ color: "var(--an-text-muted)" }}
                              >
                                ({ticker})
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span
                            className="font-semibold text-[13px]"
                            style={{ color: "var(--an-text-primary)" }}
                          >
                            {report.companyName || ""}
                            {ticker && (
                              <span
                                className="font-normal text-[11px] ml-1"
                                style={{ color: "var(--an-text-muted)" }}
                              >
                                ({ticker})
                              </span>
                            )}
                          </span>
                        )}
                        {/* Bank name on mobile */}
                        {bankName && (
                          <Link
                            href={`/analyser/bank/${slugify(bankName)}`}
                            className="text-[11px] mt-0.5 block md:hidden transition-colors hover:text-[var(--an-accent)]"
                            style={{ color: "var(--an-text-muted)" }}
                          >
                            {bankName}
                          </Link>
                        )}
                      </td>
                      <td className="px-3 sm:px-[18px] py-3 hidden md:table-cell">
                        {bankName ? (
                          <Link
                            href={`/analyser/bank/${slugify(bankName)}`}
                            className="text-[13px] transition-colors hover:text-[var(--an-accent)]"
                            style={{ color: "var(--an-text-secondary)" }}
                          >
                            {bankName}
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-3 sm:px-[18px] py-3 text-center">
                        <RecommendationBadge
                          recommendation={report.recommendation}
                        />
                      </td>
                      <td className="px-3 sm:px-[18px] py-3 text-right">
                        {report.targetPrice ? (
                          <span
                            className="mono text-[13px] font-medium select-none blur-[5px] whitespace-nowrap"
                            style={{ color: "var(--an-text-secondary)" }}
                          >
                            {formatTargetPrice(
                              report.targetPrice,
                              report.targetCurrency
                            )}
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
                            {formatNumber(report.priceAtReport)}{" "}
                            {report.targetCurrency}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {reports.length > 5 && (
            <div
              className="px-3 sm:px-[18px] py-4 text-center border-t"
              style={{ borderColor: "var(--an-border-subtle)" }}
            >
              <span
                className="text-[13px]"
                style={{ color: "var(--an-text-muted)" }}
              >
                +{reports.length - 5} flere analyser
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
