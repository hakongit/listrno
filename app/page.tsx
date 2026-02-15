import { getShortData } from "@/lib/data";
import { getInsiderTrades, getInsiderStats, getTopInsiders } from "@/lib/insider-data";
import { getCachedAnalystStats, getCachedPublicAnalystReports, initializeAnalystDatabase, normalizeBankName, isAggregatorSource } from "@/lib/analyst-db";
import { formatPercent, formatNOK, formatNumber, formatDateShort, slugify } from "@/lib/utils";
import { isinToTicker } from "@/lib/tickers";
import { TradeTypeBadge } from "@/components/ui/trade-type-badge";
import { RecommendationBadge } from "@/components/ui/recommendation-badge";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Listr - Shortposisjoner, innsidehandel og analyser",
  description:
    "Shortposisjoner, innsidehandel og analytikerrapporter for norske aksjer. Data fra Finanstilsynet og Euronext Oslo.",
  openGraph: {
    title: "Listr - Shortposisjoner, innsidehandel og analyser",
    description: "Shortposisjoner, innsidehandel og analytikerrapporter for norske aksjer",
    type: "website",
    locale: "nb_NO",
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
    buy: { label: "var(--an-green)", fill: "var(--an-green)" },
    hold: { label: "var(--an-amber)", fill: "var(--an-amber)" },
    sell: { label: "var(--an-red)", fill: "var(--an-red)" },
  };

  const c = colorMap[type];

  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[13px] font-medium w-[52px] shrink-0"
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
        className="text-[13px] font-semibold w-[60px] text-right shrink-0"
        style={{ color: c.label }}
      >
        {count}{" "}
        <span className="font-normal text-[11px]" style={{ color: "var(--an-text-muted)" }}>
          {Math.round(pct)}%
        </span>
      </span>
    </div>
  );
}

function formatTargetPrice(price?: number, currency?: string): string {
  if (!price) return "-";
  return `${formatNumber(price)} ${currency || "NOK"}`;
}

export default async function DashboardPage() {
  await initializeAnalystDatabase();
  const [shortData, insiderTrades, insiderStats, topInsiders, analystStats, analystReports] = await Promise.all([
    getShortData(),
    getInsiderTrades({ limit: 5 }),
    getInsiderStats(),
    getTopInsiders(5),
    getCachedAnalystStats(),
    getCachedPublicAnalystReports(),
  ]);

  // Short data calculations
  const uniqueDates = [...new Set(shortData.companies.map((c) => c.latestDate))].sort().reverse();

  // Biggest short increases
  let biggestIncreases: typeof shortData.companies = [];
  for (const dateStr of uniqueDates) {
    const companiesOnDate = shortData.companies.filter((c) => c.latestDate === dateStr && c.change > 0);
    if (companiesOnDate.length > 0) {
      biggestIncreases = companiesOnDate.sort((a, b) => b.change - a.change).slice(0, 3);
      break;
    }
  }

  // Highest shorts
  const highestShorts = [...shortData.companies]
    .sort((a, b) => b.totalShortPct - a.totalShortPct)
    .slice(0, 3);

  // Top holders
  const topHolders = [...shortData.holders]
    .sort((a, b) => b.totalPositions - a.totalPositions)
    .slice(0, 3);

  // Filter to real insiders (not company names as fallback)
  const realInsiders = topInsiders.filter(
    (insider) => insider.name !== insider.companies[0] && insider.totalTrades > 1
  );

  // Biggest insider trades by value
  const biggestTrades = [...insiderTrades]
    .filter((t) => t.totalValue && t.totalValue > 0)
    .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
    .slice(0, 3);

  // Analyst data
  const { recCountsMonth } = analystStats;
  const recTotalMonth = recCountsMonth.buy + recCountsMonth.hold + recCountsMonth.sell;
  const displayReports = analystReports
    .filter((r) => r.companyName && r.recommendation)
    .slice(0, 5);

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
      {/* Stats Grid */}
      <div className="pt-8"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          className="an-stat-accent rounded-lg p-3 sm:p-4 border"
          style={{ borderColor: "var(--an-border)" }}
        >
          <div
            className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5"
            style={{ color: "var(--an-accent)" }}
          >
            {analystStats.reportCount}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Analyser
          </div>
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5">
            <span style={{ color: "var(--an-green)" }}>{analystStats.recCounts.buy}</span>
            <span style={{ color: "var(--an-text-muted)" }} className="mx-1 text-[18px]">/</span>
            <span style={{ color: "var(--an-amber)" }}>{analystStats.recCounts.hold}</span>
            <span style={{ color: "var(--an-text-muted)" }} className="mx-1 text-[18px]">/</span>
            <span style={{ color: "var(--an-red)" }}>{analystStats.recCounts.sell}</span>
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Kjøp / Hold / Selg
          </div>
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5">
            {shortData.totalCompanies}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Shortede selskaper
          </div>
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5">
            {insiderStats.totalTrades}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Innsidehandler
          </div>
        </div>
      </div>

      {/* Analyser Section — promoted to top */}
      <div className="mt-3">
        {/* Section Header */}
        <div className="flex items-center justify-between pt-3 mb-3">
          <Link
            href="/analyser"
            className="text-[13px] font-semibold uppercase tracking-wider transition-colors hover:text-[var(--an-accent)]"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Analyser
          </Link>
          <Link
            href="/analyser"
            className="text-[11px] font-medium transition-colors hover:text-[var(--an-accent)]"
            style={{ color: "var(--an-text-muted)" }}
          >
            Se alle
          </Link>
        </div>

        {/* Recommendation bars + Latest reports in two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3">
          {/* Left: Recommendation breakdown (last 30 days) */}
          <div
            className="rounded-lg overflow-hidden border"
            style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
          >
            <div
              className="px-3 sm:px-[18px] py-3 border-b"
              style={{ borderColor: "var(--an-border)" }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--an-text-secondary)" }}
              >
                Siste 30 dager
              </span>
            </div>
            <div className="px-3 sm:px-[18px] py-4 space-y-3">
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
            {/* Compact stats row */}
            <div
              className="px-3 sm:px-[18px] py-3 flex items-center justify-between border-t"
              style={{ borderColor: "var(--an-border-subtle)" }}
            >
              <span className="text-[11px]" style={{ color: "var(--an-text-muted)" }}>
                {analystStats.companyCount} selskaper dekket
              </span>
              <span className="text-[11px] font-medium" style={{ color: "var(--an-text-muted)" }}>
                {recTotalMonth} siste 30d
              </span>
            </div>
          </div>

          {/* Right: Latest analyst reports table */}
          <div
            className="rounded-lg overflow-hidden border"
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
                        width: "70px",
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
                        width: "100px",
                      }}
                    >
                      Anbefaling
                    </th>
                    <th
                      className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden lg:table-cell"
                      style={{
                        color: "var(--an-text-muted)",
                        borderBottom: "1px solid var(--an-border)",
                        width: "110px",
                      }}
                    >
                      Kursmål
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayReports.map((report, i) => {
                    const effectiveBank = report.recInvestmentBank || report.investmentBank;
                    const bankName = effectiveBank && !isAggregatorSource(effectiveBank) ? normalizeBankName(effectiveBank) : null;
                    const ticker = report.companyIsin ? isinToTicker[report.companyIsin] : null;

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
                          <Link
                            href={`/${slugify(report.companyName!)}`}
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
                          {/* Bank name on mobile */}
                          {bankName && (
                            <div
                              className="text-[11px] mt-0.5 block md:hidden"
                              style={{ color: "var(--an-text-muted)" }}
                            >
                              {bankName}
                            </div>
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
                        <td className="px-3 sm:px-[18px] py-3 text-right hidden lg:table-cell">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: Shorts + Insider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        {/* Left: Short Positions */}
        <div className="flex flex-col gap-3">
          {/* Section Header */}
          <div className="flex items-center justify-between pt-3">
            <Link
              href="/shortoversikt"
              className="text-[13px] font-semibold uppercase tracking-wider transition-colors hover:text-[var(--an-accent)]"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Shortposisjoner
            </Link>
            <Link
              href="/shortoversikt"
              className="text-[11px] font-medium transition-colors hover:text-[var(--an-accent)]"
              style={{ color: "var(--an-text-muted)" }}
            >
              Se alle
            </Link>
          </div>

          {/* Highest Shorts */}
          <div
            className="rounded-lg overflow-hidden border"
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
                Høyest short %
              </span>
            </div>
            <div>
              {highestShorts.map((company, i) => (
                <Link
                  key={company.isin}
                  href={`/${company.slug}`}
                  className="an-table-row flex items-center justify-between px-3 sm:px-[18px] py-3 transition-colors"
                  style={{
                    borderBottom: i < highestShorts.length - 1
                      ? "1px solid var(--an-border-subtle)"
                      : "none",
                  }}
                >
                  <span
                    className="text-[13px] font-medium truncate mr-3"
                    style={{ color: "var(--an-text-primary)" }}
                  >
                    {company.issuerName}
                  </span>
                  <div className="text-right shrink-0">
                    <div
                      className="mono text-[13px] font-semibold"
                      style={{ color: "var(--an-red)" }}
                    >
                      {formatPercent(company.totalShortPct)}
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: "var(--an-text-muted)" }}
                    >
                      {formatDateShort(company.latestDate)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Biggest Increases */}
          {biggestIncreases.length > 0 && (
            <div
              className="rounded-lg overflow-hidden border"
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
                  Siste økninger
                </span>
              </div>
              <div>
                {biggestIncreases.map((company, i) => (
                  <Link
                    key={company.isin}
                    href={`/${company.slug}`}
                    className="an-table-row flex items-center justify-between px-3 sm:px-[18px] py-3 transition-colors"
                    style={{
                      borderBottom: i < biggestIncreases.length - 1
                        ? "1px solid var(--an-border-subtle)"
                        : "none",
                    }}
                  >
                    <span
                      className="text-[13px] font-medium truncate mr-3"
                      style={{ color: "var(--an-text-primary)" }}
                    >
                      {company.issuerName}
                    </span>
                    <div className="text-right shrink-0">
                      <div
                        className="mono text-[13px] font-semibold"
                        style={{ color: "var(--an-red)" }}
                      >
                        +{company.change.toFixed(2)}%
                      </div>
                      <div
                        className="text-[11px]"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {formatDateShort(company.latestDate)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Top Holders */}
          <div
            className="rounded-lg overflow-hidden border"
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
                Mest aktive shortere
              </span>
            </div>
            <div>
              {topHolders.map((holder, i) => (
                <Link
                  key={holder.slug}
                  href={`/aktor/${holder.slug}`}
                  className="an-table-row flex items-center justify-between px-3 sm:px-[18px] py-3 transition-colors"
                  style={{
                    borderBottom: i < topHolders.length - 1
                      ? "1px solid var(--an-border-subtle)"
                      : "none",
                  }}
                >
                  <span
                    className="text-[13px] font-medium truncate mr-3"
                    style={{ color: "var(--an-text-primary)" }}
                  >
                    {holder.name}
                  </span>
                  <span
                    className="mono text-[13px] font-medium shrink-0"
                    style={{ color: "var(--an-text-secondary)" }}
                  >
                    {holder.totalPositions} pos
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Insider Trading */}
        <div className="flex flex-col gap-3">
          {/* Section Header */}
          <div className="flex items-center justify-between pt-3">
            <Link
              href="/innsidehandel"
              className="text-[13px] font-semibold uppercase tracking-wider transition-colors hover:text-[var(--an-accent)]"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Innsidehandel
            </Link>
            <Link
              href="/innsidehandel"
              className="text-[11px] font-medium transition-colors hover:text-[var(--an-accent)]"
              style={{ color: "var(--an-text-muted)" }}
            >
              Se alle
            </Link>
          </div>

          {/* Recent Trades */}
          <div
            className="rounded-lg overflow-hidden border"
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
                Siste handler
              </span>
            </div>
            <div>
              {insiderTrades.map((trade, i) => (
                <Link
                  key={trade.messageId}
                  href={trade.companySlug ? `/${trade.companySlug}` : "#"}
                  className="an-table-row flex items-center justify-between px-3 sm:px-[18px] py-3 transition-colors"
                  style={{
                    borderBottom: i < insiderTrades.length - 1
                      ? "1px solid var(--an-border-subtle)"
                      : "none",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0"><TradeTypeBadge type={trade.tradeType} /></span>
                    <div className="min-w-0">
                      <div
                        className="text-[13px] font-medium truncate"
                        style={{ color: "var(--an-text-primary)" }}
                      >
                        {trade.issuerName}
                      </div>
                      <div
                        className="text-[11px] truncate"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {trade.insiderName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div
                      className="mono text-[13px] font-medium"
                      style={{
                        color: trade.tradeType === "buy"
                          ? "var(--an-green)"
                          : trade.tradeType === "sell"
                          ? "var(--an-red)"
                          : "var(--an-text-secondary)",
                      }}
                    >
                      {trade.totalValue ? formatNOK(trade.totalValue) : "-"}
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: "var(--an-text-muted)" }}
                    >
                      {formatDateShort(trade.tradeDate)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Biggest Trades */}
          {biggestTrades.length > 0 && (
            <div
              className="rounded-lg overflow-hidden border"
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
                  Største handler
                </span>
              </div>
              <div>
                {biggestTrades.map((trade, i) => (
                  <Link
                    key={trade.messageId}
                    href={trade.companySlug ? `/${trade.companySlug}` : "#"}
                    className="an-table-row flex items-center justify-between px-3 sm:px-[18px] py-3 transition-colors"
                    style={{
                      borderBottom: i < biggestTrades.length - 1
                        ? "1px solid var(--an-border-subtle)"
                        : "none",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0"><TradeTypeBadge type={trade.tradeType} /></span>
                      <span
                        className="text-[13px] font-medium truncate"
                        style={{ color: "var(--an-text-primary)" }}
                      >
                        {trade.issuerName}
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div
                        className="mono text-[13px] font-semibold"
                        style={{
                          color: trade.tradeType === "buy"
                            ? "var(--an-green)"
                            : "var(--an-red)",
                        }}
                      >
                        {formatNOK(trade.totalValue!)}
                      </div>
                      <div
                        className="text-[11px]"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {formatDateShort(trade.tradeDate)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Top Insiders */}
          {realInsiders.length > 0 && (
            <div
              className="rounded-lg overflow-hidden border"
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
                  Mest aktive innsidere
                </span>
              </div>
              <div>
                {realInsiders.slice(0, 3).map((insider, i) => (
                  <Link
                    key={insider.slug}
                    href={`/innsidehandel/${insider.slug}`}
                    className="an-table-row flex items-center justify-between px-3 sm:px-[18px] py-3 transition-colors"
                    style={{
                      borderBottom: i < Math.min(realInsiders.length, 3) - 1
                        ? "1px solid var(--an-border-subtle)"
                        : "none",
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="text-[13px] font-medium truncate"
                        style={{ color: "var(--an-text-primary)" }}
                      >
                        {insider.name}
                      </div>
                      <div
                        className="text-[11px] truncate"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {insider.companies.slice(0, 2).join(", ")}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-[13px]">
                        <span style={{ color: "var(--an-green)" }}>{insider.buyCount}</span>
                        <span style={{ color: "var(--an-text-muted)" }} className="mx-1">/</span>
                        <span style={{ color: "var(--an-red)" }}>{insider.sellCount}</span>
                      </div>
                      <div
                        className="text-[11px]"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {formatDateShort(insider.latestTrade)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 mb-6">
        <Link
          href="/analyser"
          className="flex items-center justify-between p-4 rounded-lg border transition-colors hover:border-[var(--an-accent)]"
          style={{
            background: "var(--an-bg-surface)",
            borderColor: "var(--an-border)",
          }}
        >
          <div>
            <div
              className="text-[13px] font-semibold mb-0.5"
              style={{ color: "var(--an-text-primary)" }}
            >
              Alle analyser
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--an-text-muted)" }}
            >
              {analystStats.reportCount} analyser, {analystStats.companyCount} selskaper
            </div>
          </div>
          <span
            className="text-[13px]"
            style={{ color: "var(--an-text-muted)" }}
          >
            →
          </span>
        </Link>
        <Link
          href="/shortoversikt"
          className="flex items-center justify-between p-4 rounded-lg border transition-colors hover:border-[var(--an-accent)]"
          style={{
            background: "var(--an-bg-surface)",
            borderColor: "var(--an-border)",
          }}
        >
          <div>
            <div
              className="text-[13px] font-semibold mb-0.5"
              style={{ color: "var(--an-text-primary)" }}
            >
              Alle shortposisjoner
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--an-text-muted)" }}
            >
              {shortData.totalCompanies} selskaper, {shortData.totalPositions} posisjoner
            </div>
          </div>
          <span
            className="text-[13px]"
            style={{ color: "var(--an-text-muted)" }}
          >
            →
          </span>
        </Link>
        <Link
          href="/innsidehandel"
          className="flex items-center justify-between p-4 rounded-lg border transition-colors hover:border-[var(--an-accent)]"
          style={{
            background: "var(--an-bg-surface)",
            borderColor: "var(--an-border)",
          }}
        >
          <div>
            <div
              className="text-[13px] font-semibold mb-0.5"
              style={{ color: "var(--an-text-primary)" }}
            >
              Alle innsidehandler
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--an-text-muted)" }}
            >
              {insiderStats.totalTrades} handler fra primærinnsidere
            </div>
          </div>
          <span
            className="text-[13px]"
            style={{ color: "var(--an-text-muted)" }}
          >
            →
          </span>
        </Link>
      </div>

      {/* Data source note */}
      <p
        className="text-[11px] text-center pb-6"
        style={{ color: "var(--an-text-muted)" }}
      >
        Data fra{" "}
        <a
          href="https://www.finanstilsynet.no/en/publications/short-selling-/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline transition-colors hover:text-[var(--an-accent)]"
        >
          Finanstilsynet
        </a>
        {" og "}
        <a
          href="https://live.euronext.com/en/listview/company-press-releases/1061"
          target="_blank"
          rel="noopener noreferrer"
          className="underline transition-colors hover:text-[var(--an-accent)]"
        >
          Euronext Oslo
        </a>
      </p>
    </div>
  );
}
