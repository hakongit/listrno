import {
  getCachedPublicAnalystReports,
  getCachedAnalystReportCount,
  getCachedInvestmentBanks,
  initializeAnalystDatabase,
} from "@/lib/analyst-db";
import { getShortData } from "@/lib/data";
import { formatDateShort, formatNumber, slugify } from "@/lib/utils";
import { isinToTicker } from "@/lib/tickers";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytikerrapporter - Listr",
  description:
    "Analytikerrapporter og kursmål for norske aksjer fra ledende investeringsbanker.",
  openGraph: {
    title: "Analytikerrapporter - Listr",
    description: "Analytikerrapporter og kursmål for norske aksjer",
  },
};

function RecommendationBadge({ recommendation }: { recommendation?: string }) {
  if (!recommendation) return null;

  const rec = recommendation.toLowerCase();

  const labels: Record<string, string> = {
    buy: "Kjøp",
    hold: "Hold",
    sell: "Selg",
    overweight: "Overvekt",
    underweight: "Undervekt",
    outperform: "Outperform",
    underperform: "Underperform",
  };

  let colorStyle: React.CSSProperties;
  if (rec === "buy" || rec === "overweight" || rec === "outperform") {
    colorStyle = {
      color: "var(--an-green)",
      background: "var(--an-green-bg)",
      borderColor: "var(--an-green-border)",
    };
  } else if (rec === "sell" || rec === "underweight" || rec === "underperform") {
    colorStyle = {
      color: "var(--an-red)",
      background: "var(--an-red-bg)",
      borderColor: "var(--an-red-border)",
    };
  } else {
    colorStyle = {
      color: "var(--an-amber)",
      background: "var(--an-amber-bg)",
      borderColor: "var(--an-amber-border)",
    };
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-[3px] rounded border tracking-wide"
      style={colorStyle}
    >
      {labels[rec] || recommendation}
    </span>
  );
}

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

export default async function AnalystReportsPage() {
  await initializeAnalystDatabase();

  const [allReports, totalCount, banks, shortData] = await Promise.all([
    getCachedPublicAnalystReports({ limit: 200 }),
    getCachedAnalystReportCount(),
    getCachedInvestmentBanks(),
    getShortData(),
  ]);

  // Build ISIN → slug and name → slug maps
  const isinToSlug = new Map<string, string>();
  const nameToSlug = new Map<string, string>();
  for (const company of shortData.companies) {
    isinToSlug.set(company.isin, company.slug);
    nameToSlug.set(company.issuerName.toLowerCase(), company.slug);
  }

  function getCompanyLink(isin?: string, name?: string): string | null {
    // First try short-data pages
    if (isin) {
      const slug = isinToSlug.get(isin);
      if (slug) return `/${slug}`;
    }
    if (name) {
      const slug = nameToSlug.get(name.toLowerCase());
      if (slug) return `/${slug}`;
    }
    // Fall back to analyst company page
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
  const uniqueCompanies = new Set(
    reports.map((r) => r.companyName).filter(Boolean)
  ).size;
  const latestDate = reports.length > 0 ? reports[0].receivedDate : null;

  // Recommendation counts
  const recCounts = { buy: 0, hold: 0, sell: 0 };
  for (const r of reports) {
    const rec = r.recommendation?.toLowerCase();
    if (rec === "buy" || rec === "overweight" || rec === "outperform") {
      recCounts.buy++;
    } else if (rec === "sell" || rec === "underweight" || rec === "underperform") {
      recCounts.sell++;
    } else if (rec === "hold") {
      recCounts.hold++;
    }
  }
  const recTotal = recCounts.buy + recCounts.hold + recCounts.sell;

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
            Analytikerrapporter vil vises her n&aring;r de er tilgjengelige.
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
            Analytikerrapporter
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <div
          className="an-stat-accent rounded-lg p-4 border"
          style={{ borderColor: "var(--an-border)" }}
        >
          <div
            className="text-[26px] font-bold tracking-tight leading-tight mb-0.5"
            style={{ color: "var(--an-accent)" }}
          >
            {totalCount}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Rapporter
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
            {banks.length}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Investeringsbanker
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
            {uniqueCompanies}
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

      {/* Insights: Recommendations + Banks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {/* Recommendations panel */}
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
          <div className="px-[18px] py-4 space-y-3.5">
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

        {/* Banks panel */}
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
              Banker
            </span>
            <span className="text-[11px]" style={{ color: "var(--an-text-muted)" }}>
              etter antall
            </span>
          </div>
          <div className="px-[18px] py-2">
            {banks.map((bank, i) => (
              <div
                key={bank.name}
                className="flex items-center justify-between py-[9px]"
                style={{
                  borderBottom:
                    i < banks.length - 1
                      ? "1px solid var(--an-border-subtle)"
                      : "none",
                }}
              >
                <Link
                  href={`/analyser/bank/${slugify(bank.name)}`}
                  className="text-[13px] font-medium transition-colors hover:text-[var(--an-accent)]"
                  style={{ color: "var(--an-text-primary)" }}
                >
                  {bank.name}
                </Link>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-[10px]"
                  style={{
                    color: "var(--an-text-muted)",
                    background: "var(--an-bg-base)",
                  }}
                >
                  {bank.reportCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="mt-3 mb-10">
        <div
          className="rounded-lg overflow-hidden border"
          style={{
            background: "var(--an-bg-surface)",
            borderColor: "var(--an-border)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] sticky top-12"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                      background: "var(--an-bg-surface)",
                      width: "80px",
                    }}
                  >
                    Dato
                  </th>
                  <th
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] sticky top-12"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                      background: "var(--an-bg-surface)",
                    }}
                  >
                    Selskap
                  </th>
                  <th
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] sticky top-12 hidden md:table-cell"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                      background: "var(--an-bg-surface)",
                    }}
                  >
                    Bank
                  </th>
                  <th
                    className="text-center text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] sticky top-12"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                      background: "var(--an-bg-surface)",
                      width: "110px",
                    }}
                  >
                    Anbefaling
                  </th>
                  <th
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] sticky top-12"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                      background: "var(--an-bg-surface)",
                      width: "120px",
                    }}
                  >
                    Kursmål
                  </th>
                  <th
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] sticky top-12 hidden lg:table-cell"
                    style={{
                      color: "var(--an-text-muted)",
                      borderBottom: "1px solid var(--an-border)",
                      background: "var(--an-bg-surface)",
                      width: "120px",
                    }}
                  >
                    Kurs ved rapp.
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, i) => {
                  const companyLink = getCompanyLink(
                    report.companyIsin,
                    report.companyName
                  );
                  const ticker = getTickerForReport(report.companyIsin);

                  return (
                    <tr
                      key={report.recommendationId}
                      className="an-table-row transition-colors"
                      style={{
                        borderBottom:
                          i < reports.length - 1
                            ? "1px solid var(--an-border-subtle)"
                            : "none",
                      }}
                    >
                      <td
                        className="px-[18px] py-3 text-xs whitespace-nowrap"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {formatDateShort(report.receivedDate)}
                      </td>
                      <td className="px-[18px] py-3">
                        {companyLink ? (
                          <Link
                            href={companyLink}
                            className="font-semibold text-[13px] transition-colors hover:text-[var(--an-accent)]"
                            style={{ color: "var(--an-text-primary)" }}
                          >
                            {report.companyName}
                          </Link>
                        ) : (
                          <span
                            className="font-semibold text-[13px]"
                            style={{ color: "var(--an-text-primary)" }}
                          >
                            {report.companyName || ""}
                          </span>
                        )}
                        {ticker && (
                          <div
                            className="text-[11px] mt-px"
                            style={{ color: "var(--an-text-muted)" }}
                          >
                            {ticker}
                          </div>
                        )}
                        {/* Bank name on mobile */}
                        {report.investmentBank && (
                          <Link
                            href={`/analyser/bank/${slugify(report.investmentBank)}`}
                            className="text-[11px] mt-0.5 block md:hidden transition-colors hover:text-[var(--an-accent)]"
                            style={{ color: "var(--an-text-muted)" }}
                          >
                            {report.investmentBank}
                          </Link>
                        )}
                      </td>
                      <td className="px-[18px] py-3 hidden md:table-cell">
                        {report.investmentBank ? (
                          <Link
                            href={`/analyser/bank/${slugify(report.investmentBank)}`}
                            className="text-[13px] transition-colors hover:text-[var(--an-accent)]"
                            style={{ color: "var(--an-text-secondary)" }}
                          >
                            {report.investmentBank}
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-[18px] py-3 text-center">
                        <RecommendationBadge
                          recommendation={report.recommendation}
                        />
                      </td>
                      <td className="px-[18px] py-3 text-right">
                        {report.targetPrice ? (
                          <span
                            className="mono text-[13px] font-medium select-none blur-[5px] whitespace-nowrap"
                            style={{ color: "var(--an-text-secondary)" }}
                          >
                            {formatTargetPrice(
                              report.targetPrice,
                              report.targetCurrency
                            )}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-[18px] py-3 text-right hidden lg:table-cell">
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
        </div>
      </div>
    </div>
  );
}
