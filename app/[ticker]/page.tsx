import { getCompanyBySlug } from "@/lib/data";
import { getCompanyInsiderTrades } from "@/lib/insider-data";
import { getCachedPublicAnalystReportsByCompany, getCachedAnalystCompanies, initializeAnalystDatabase, isAggregatorSource, normalizeBankName } from "@/lib/analyst-db";
import type { AnalystCompanySummary } from "@/lib/analyst-db";
import { resolveTicker } from "@/lib/tickers";
import { fetchStockQuotes, StockQuote, formatMarketValue } from "@/lib/prices";
import { formatPercent, formatNumber, formatDate, slugify, formatNOK, formatVolume, formatDateShort } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LazyShortChart } from "@/components/lazy-short-chart";
import { TradeTypeBadge } from "@/components/ui/trade-type-badge";
import { AnalystReportsTable } from "@/components/analyst-reports-table";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ ticker: string }>;
}

// Strip parenthetical ticker suffixes from analyst company names
function cleanCompanyName(name: string): string {
  return name
    .replace(/\s*\((?:NO|OSE|XOSL|OB)[:\s]?\s*\w+\)\s*$/i, "")
    .replace(/\s+(?:NO|ASA)$/i, "")
    .trim();
}

async function resolveAnalystCompany(slug: string): Promise<AnalystCompanySummary | null> {
  const companies = await getCachedAnalystCompanies();
  return companies.find((c) => slugify(cleanCompanyName(c.name)) === slug) ??
    companies.find((c) => slugify(c.name) === slug) ??
    companies.find((c) => slugify(c.name).startsWith(slug)) ?? null;
}

function toReportRows(reports: import("@/lib/analyst-types").PublicAnalystReport[]) {
  return reports.map((r) => {
    const effectiveBank = r.recInvestmentBank || r.investmentBank;
    const bank = effectiveBank && !isAggregatorSource(effectiveBank) ? normalizeBankName(effectiveBank) : null;
    return {
      recommendationId: r.recommendationId,
      receivedDate: r.receivedDate,
      bankName: bank,
      bankSlug: bank ? `/analyser/bank/${slugify(bank)}` : null,
      recommendation: r.recommendation,
      targetPrice: r.targetPrice,
      targetCurrency: r.targetCurrency,
      previousTargetPrice: r.previousTargetPrice,
      priceAtReport: r.priceAtReport,
    };
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticker } = await params;
  const [company, insiderTrades] = await Promise.all([
    getCompanyBySlug(ticker),
    getCompanyInsiderTrades(ticker),
  ]);

  if (company) {
    return {
      title: `${company.issuerName} - Shortposisjoner | Listr`,
      description: `Se alle shortposisjoner i ${company.issuerName}. Total short: ${formatPercent(company.totalShortPct)}. ${company.positions.length} aktive posisjoner.`,
      openGraph: {
        title: `${company.issuerName} - Shortposisjoner`,
        description: `Total short: ${formatPercent(company.totalShortPct)} fra ${company.positions.length} aktører`,
      },
    };
  }

  if (insiderTrades.length > 0) {
    const companyName = insiderTrades[0].issuerName;
    return {
      title: `${companyName} - Innsidehandel | Listr`,
      description: `Se innsidehandler i ${companyName}. ${insiderTrades.length} handler registrert.`,
      openGraph: {
        title: `${companyName} - Innsidehandel`,
        description: `${insiderTrades.length} innsidehandler registrert`,
      },
    };
  }

  await initializeAnalystDatabase();
  const analystCompany = await resolveAnalystCompany(ticker);
  if (analystCompany) {
    return {
      title: `${analystCompany.name} - Analyser | Listr`,
      description: `Se alle analyser for ${analystCompany.name}. ${analystCompany.reportCount} analyser med kursmål fra ledende investeringsbanker.`,
      openGraph: {
        title: `${analystCompany.name} - Analyser`,
        description: `${analystCompany.reportCount} analyser med kursmål fra ledende investeringsbanker`,
      },
    };
  }

  return { title: "Ikke funnet - Listr" };
}

export default async function CompanyPage({ params }: PageProps) {
  const { ticker } = await params;
  const [company, insiderTrades] = await Promise.all([
    getCompanyBySlug(ticker),
    getCompanyInsiderTrades(ticker),
  ]);

  await initializeAnalystDatabase();

  // If no short positions AND no insider trades, try analyst-only resolution
  if (!company && insiderTrades.length === 0) {
    const analystCompany = await resolveAnalystCompany(ticker);
    if (!analystCompany) {
      notFound();
    }
    // Render analyst-only view
    return renderAnalystOnlyView(analystCompany);
  }

  const companyName = company?.issuerName || insiderTrades[0]?.issuerName;
  const companyIsin = company?.isin || insiderTrades[0]?.isin;
  const analystReports = companyIsin
    ? await getCachedPublicAnalystReportsByCompany(companyName || "", companyIsin)
    : companyName
      ? await getCachedPublicAnalystReportsByCompany(companyName)
      : [];
  const filteredReports = analystReports.filter(
    (r) => r.companyName || r.recommendation || r.targetPrice
  );

  // Analyst consensus
  const recCounts = { buy: 0, hold: 0, sell: 0 };
  for (const r of filteredReports) {
    const rec = r.recommendation?.toLowerCase();
    if (rec === "buy" || rec === "overweight" || rec === "outperform") recCounts.buy++;
    else if (rec === "sell" || rec === "underweight" || rec === "underperform") recCounts.sell++;
    else if (rec === "hold") recCounts.hold++;
  }
  const recTotal = recCounts.buy + recCounts.hold + recCounts.sell;

  // Insider stats
  const buyTrades = insiderTrades.filter((t) => t.tradeType === "buy").length;
  const sellTrades = insiderTrades.filter((t) => t.tradeType === "sell").length;

  // Company with short positions data
  if (company) {
    const history = company.history;
    const hasHistory = history.length >= 2;
    const firstPoint = history[0];
    const lastPoint = history[history.length - 1];
    const change = hasHistory ? lastPoint.totalShortPct - firstPoint.totalShortPct : 0;
    const changePositive = change > 0;

    return (
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
        {/* Hero */}
        <div className="pt-8 pb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight mb-2">
              {company.issuerName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {company.ticker && (
                <span
                  className="text-[12px] sm:text-[13px] mono font-medium px-2 sm:px-2.5 py-1 rounded border"
                  style={{
                    color: "var(--an-text-secondary)",
                    borderColor: "var(--an-border)",
                    background: "var(--an-bg-surface)",
                  }}
                >
                  {company.ticker.replace(".OL", "")}
                </span>
              )}
              {company.stockPrice && (
                <span
                  className="text-[14px] sm:text-[15px] mono font-semibold"
                  style={{ color: "var(--an-text-primary)" }}
                >
                  {company.stockPrice.toFixed(2)} NOK
                </span>
              )}
              {company.isin && (
                <span
                  className="text-[11px] sm:text-[12px] mono hidden sm:inline"
                  style={{ color: "var(--an-text-muted)" }}
                >
                  {company.isin}
                </span>
              )}
            </div>
          </div>

          {/* Company Info (inline) */}
          <div
            className="rounded-lg border shrink-0 lg:min-w-[280px]"
            style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
          >
            <div className="px-3 sm:px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
              {company.ticker && (
                <div>
                  <div style={{ color: "var(--an-text-muted)" }} className="text-[11px] mb-0.5">Ticker</div>
                  <div className="mono font-medium">{company.ticker.replace(".OL", "")}</div>
                </div>
              )}
              {company.marketCap && (
                <div>
                  <div style={{ color: "var(--an-text-muted)" }} className="text-[11px] mb-0.5">Markedsverdi</div>
                  <div className="mono font-medium">{formatMarketValue(company.marketCap)}</div>
                </div>
              )}
              {company.regularMarketVolume && (
                <div>
                  <div style={{ color: "var(--an-text-muted)" }} className="text-[11px] mb-0.5">Daglig volum</div>
                  <div className="mono font-medium">{formatVolume(company.regularMarketVolume)}</div>
                </div>
              )}
              {company.shortValue && (
                <div>
                  <div style={{ color: "var(--an-text-muted)" }} className="text-[11px] mb-0.5">Short verdi</div>
                  <div className="mono font-medium">{formatNOK(company.shortValue)}</div>
                </div>
              )}
              <div>
                <div style={{ color: "var(--an-text-muted)" }} className="text-[11px] mb-0.5">Siste oppdatering</div>
                <div>{formatDate(company.latestDate)}</div>
              </div>
              <div>
                <div style={{ color: "var(--an-text-muted)" }} className="text-[11px] mb-0.5">Markedsplass</div>
                <div className="font-medium">Oslo Børs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total short */}
          <div
            className="an-stat-accent rounded-lg p-3 sm:p-4 border"
            style={{ borderColor: "var(--an-border)" }}
          >
            <div
              className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5 mono"
              style={{ color: "var(--an-accent)" }}
            >
              {formatPercent(company.totalShortPct)}
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Total short
            </div>
            {hasHistory && (
              <div
                className="text-[11px] mono mt-1"
                style={{ color: changePositive ? "var(--an-red)" : "var(--an-green)" }}
              >
                {changePositive ? "+" : ""}{change.toFixed(2)}%
              </div>
            )}
          </div>

          {/* Stock price + 52-week */}
          <div
            className="rounded-lg p-3 sm:p-4 border"
            style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
          >
            <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5 mono">
              {company.stockPrice ? `${company.stockPrice.toFixed(2)}` : "-"}
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Aksjekurs (NOK)
            </div>
            {company.fiftyTwoWeekLow !== null && company.fiftyTwoWeekHigh !== null && (
              <div
                className="text-[11px] mono mt-1"
                style={{ color: "var(--an-text-muted)" }}
              >
                52u: {company.fiftyTwoWeekLow.toFixed(2)} – {company.fiftyTwoWeekHigh.toFixed(2)}
              </div>
            )}
          </div>

          {/* Insider activity */}
          <div
            className="rounded-lg p-3 sm:p-4 border"
            style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
          >
            <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5">
              {insiderTrades.length}
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Innsidehandler
            </div>
            {(buyTrades > 0 || sellTrades > 0) && (
              <div className="text-[11px] mt-1 flex gap-2">
                {buyTrades > 0 && (
                  <span style={{ color: "var(--an-green)" }}>{buyTrades} kjøp</span>
                )}
                {sellTrades > 0 && (
                  <span style={{ color: "var(--an-red)" }}>{sellTrades} salg</span>
                )}
              </div>
            )}
          </div>

          {/* Analyst consensus */}
          <div
            className="rounded-lg p-3 sm:p-4 border"
            style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
          >
            <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5">
              {filteredReports.length}
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Analytikerrapporter
            </div>
            {recTotal > 0 && (
              <div className="text-[11px] mt-1 flex gap-2">
                {recCounts.buy > 0 && (
                  <span style={{ color: "var(--an-green)" }}>{recCounts.buy} kjøp</span>
                )}
                {recCounts.hold > 0 && (
                  <span style={{ color: "var(--an-amber)" }}>{recCounts.hold} hold</span>
                )}
                {recCounts.sell > 0 && (
                  <span style={{ color: "var(--an-red)" }}>{recCounts.sell} selg</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Analyst Reports Table (before short info) */}
        {filteredReports.length > 0 && (
          <AnalystReportsTable reports={toReportRows(filteredReports)} collapsedCount={5} />
        )}

        {/* Chart + Positions side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
          {/* Short History Chart */}
          {company.history.length > 1 && (
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
                  Short-historikk
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--an-text-muted)" }}
                >
                  Total short % over tid
                </span>
              </div>
              <div className="p-4">
                <LazyShortChart history={company.history} companyName={company.issuerName} />
              </div>
            </div>
          )}

          {/* Positions table */}
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
                Aktive shortposisjoner
              </span>
              <span
                className="text-[11px]"
                style={{ color: "var(--an-text-muted)" }}
              >
                {company.positions.length} aktører
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th
                      className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                      style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)" }}
                    >
                      Posisjonsholder
                    </th>
                    <th
                      className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                      style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "90px" }}
                    >
                      Posisjon
                    </th>
                    <th
                      className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden sm:table-cell"
                      style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                    >
                      Aksjer
                    </th>
                    <th
                      className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                      style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "80px" }}
                    >
                      Dato
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {company.positions.map((position, i) => (
                    <tr
                      key={`${position.positionHolder}-${i}`}
                      className="an-table-row transition-colors"
                      style={{
                        borderBottom: i < company.positions.length - 1
                          ? "1px solid var(--an-border-subtle)"
                          : "none",
                      }}
                    >
                      <td className="px-3 sm:px-[18px] py-3">
                        <Link
                          href={`/aktor/${slugify(position.positionHolder)}`}
                          className="text-[13px] font-medium transition-colors hover:text-[var(--an-accent)] truncate block max-w-[140px] sm:max-w-none"
                          style={{ color: "var(--an-text-primary)" }}
                          title={position.positionHolder}
                        >
                          {position.positionHolder}
                        </Link>
                      </td>
                      <td className="px-3 sm:px-[18px] py-3 text-right">
                        <span
                          className="mono text-[13px] font-semibold"
                          style={{ color: "var(--an-red)" }}
                        >
                          {formatPercent(position.positionPct)}
                        </span>
                      </td>
                      <td
                        className="px-3 sm:px-[18px] py-3 text-right mono text-[13px] hidden sm:table-cell"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {formatNumber(position.positionShares)}
                      </td>
                      <td
                        className="px-3 sm:px-[18px] py-3 text-right text-xs"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {formatDateShort(position.positionDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Insider Trades Panel */}
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
              Siste innsidehandler
            </span>
            <Link
              href="/innsidehandel"
              className="text-[11px] font-medium transition-colors hover:text-[var(--an-accent)]"
              style={{ color: "var(--an-text-muted)" }}
            >
              Se alle
            </Link>
          </div>
          {insiderTrades.length > 0 ? (
            <div>
              {insiderTrades.slice(0, 5).map((trade, i) => (
                <div
                  key={trade.messageId}
                  className="an-table-row px-3 sm:px-[18px] py-3 transition-colors"
                  style={{
                    borderBottom: i < Math.min(insiderTrades.length, 5) - 1
                      ? "1px solid var(--an-border-subtle)"
                      : "none",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      {trade.insiderName !== trade.issuerName ? (
                        <Link
                          href={`/innsidehandel/${trade.insiderSlug}`}
                          className="text-[13px] font-medium transition-colors hover:text-[var(--an-accent)] block truncate"
                          style={{ color: "var(--an-text-primary)" }}
                        >
                          {trade.insiderName}
                        </Link>
                      ) : (
                        <span
                          className="text-[13px]"
                          style={{ color: "var(--an-text-muted)" }}
                        >
                          -
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        {trade.insiderRole && (
                          <span
                            className="text-[11px]"
                            style={{ color: "var(--an-text-muted)" }}
                          >
                            {trade.insiderRole}
                          </span>
                        )}
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--an-text-muted)" }}
                        >
                          {formatDateShort(trade.tradeDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <TradeTypeBadge type={trade.tradeType} />
                      {trade.totalValue && (
                        <span
                          className="mono text-[12px]"
                          style={{ color: "var(--an-text-muted)" }}
                        >
                          {formatNOK(trade.totalValue)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="px-3 sm:px-[18px] py-8 text-center text-[13px]"
              style={{ color: "var(--an-text-muted)" }}
            >
              Ingen innsidehandler registrert
            </div>
          )}
        </div>

      </div>
    );
  }

  // ─── Insider-only fallback (no short positions) ───
  const insiderOnlyCompanyName = insiderTrades[0].issuerName;
  const isin = insiderTrades[0].isin;

  let tickerSymbol = insiderTrades[0].ticker;
  if (!tickerSymbol) {
    tickerSymbol = await resolveTicker(isin || "", insiderOnlyCompanyName);
  }

  let stockQuote: StockQuote | null = null;
  if (tickerSymbol) {
    const quotes = await fetchStockQuotes([tickerSymbol]);
    stockQuote = quotes.get(tickerSymbol) || null;
  }

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
      {/* Hero */}
      <div className="pt-8 pb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight mb-2">
            {insiderOnlyCompanyName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {tickerSymbol && (
              <span
                className="text-[12px] sm:text-[13px] mono font-medium px-2 sm:px-2.5 py-1 rounded border"
                style={{
                  color: "var(--an-text-secondary)",
                  borderColor: "var(--an-border)",
                  background: "var(--an-bg-surface)",
                }}
              >
                {tickerSymbol.replace(".OL", "")}
              </span>
            )}
            {stockQuote?.price && (
              <span
                className="text-[14px] sm:text-[15px] mono font-semibold"
                style={{ color: "var(--an-text-primary)" }}
              >
                {stockQuote.price.toFixed(2)} NOK
              </span>
            )}
            {isin && (
              <span
                className="hidden sm:inline text-[12px] mono"
                style={{ color: "var(--an-text-muted)" }}
              >
                {isin}
              </span>
            )}
            <span
              className="text-[11px] sm:text-[12px] font-medium px-2 sm:px-2.5 py-1 rounded-full border"
              style={{
                color: "var(--an-text-muted)",
                borderColor: "var(--an-border)",
              }}
            >
              Ingen aktive shortposisjoner
            </span>
          </div>
        </div>

        {/* Company Info (inline) */}
        <div
          className="rounded-lg border shrink-0 lg:min-w-[280px]"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="px-3 sm:px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
            {stockQuote?.price && (
              <div>
                <div style={{ color: "var(--an-text-muted)" }} className="text-[11px] mb-0.5">Aksjekurs</div>
                <div className="mono font-medium">{stockQuote.price.toFixed(2)} NOK</div>
              </div>
            )}
            <div>
              <div style={{ color: "var(--an-text-muted)" }} className="text-[11px] mb-0.5">Markedsplass</div>
              <div className="font-medium">Oslo Børs</div>
            </div>
            {isin && (
              <div>
                <div style={{ color: "var(--an-text-muted)" }} className="text-[11px] mb-0.5">ISIN</div>
                <div className="mono text-[11px]">{isin}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Stock price */}
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5 mono">
            {stockQuote?.price ? `${stockQuote.price.toFixed(2)}` : "-"}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Aksjekurs (NOK)
          </div>
          {stockQuote?.fiftyTwoWeekLow && stockQuote?.fiftyTwoWeekHigh && (
            <div
              className="text-[11px] mono mt-1"
              style={{ color: "var(--an-text-muted)" }}
            >
              52u: {stockQuote.fiftyTwoWeekLow.toFixed(2)} – {stockQuote.fiftyTwoWeekHigh.toFixed(2)}
            </div>
          )}
        </div>

        {/* Insider activity */}
        <div
          className="an-stat-accent rounded-lg p-3 sm:p-4 border"
          style={{ borderColor: "var(--an-border)" }}
        >
          <div
            className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5"
            style={{ color: "var(--an-accent)" }}
          >
            {insiderTrades.length}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Innsidehandler
          </div>
          {(buyTrades > 0 || sellTrades > 0) && (
            <div className="text-[11px] mt-1 flex gap-2">
              {buyTrades > 0 && (
                <span style={{ color: "var(--an-green)" }}>{buyTrades} kjøp</span>
              )}
              {sellTrades > 0 && (
                <span style={{ color: "var(--an-red)" }}>{sellTrades} salg</span>
              )}
            </div>
          )}
        </div>

        {/* Analyst reports */}
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5">
            {filteredReports.length}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Analytikerrapporter
          </div>
          {recTotal > 0 && (
            <div className="text-[11px] mt-1 flex gap-2">
              {recCounts.buy > 0 && (
                <span style={{ color: "var(--an-green)" }}>{recCounts.buy} kjøp</span>
              )}
              {recCounts.hold > 0 && (
                <span style={{ color: "var(--an-amber)" }}>{recCounts.hold} hold</span>
              )}
              {recCounts.sell > 0 && (
                <span style={{ color: "var(--an-red)" }}>{recCounts.sell} selg</span>
              )}
            </div>
          )}
        </div>

        {/* Market info */}
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] font-bold tracking-tight leading-tight mb-0.5 pt-1">
            {tickerSymbol ? tickerSymbol.replace(".OL", "") : "-"}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Oslo Børs
          </div>
        </div>
      </div>

      {/* Analyst Reports Table (before insider trades) */}
      {filteredReports.length > 0 && (
        <AnalystReportsTable reports={toReportRows(filteredReports)} collapsedCount={5} />
      )}

      {/* Content */}
      <div className="mt-3">
        {/* Insider Trades table */}
        <div>
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
                Innsidehandel
              </span>
              <span
                className="text-[11px]"
                style={{ color: "var(--an-text-muted)" }}
              >
                {insiderTrades.length} handler
              </span>
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
                      Innsider
                    </th>
                    <th
                      className="text-center text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                      style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "80px" }}
                    >
                      Type
                    </th>
                    <th
                      className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                      style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                    >
                      Verdi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {insiderTrades.map((trade, i) => (
                    <tr
                      key={trade.messageId}
                      className="an-table-row transition-colors"
                      style={{
                        borderBottom: i < insiderTrades.length - 1
                          ? "1px solid var(--an-border-subtle)"
                          : "none",
                      }}
                    >
                      <td
                        className="px-3 sm:px-[18px] py-3 text-xs whitespace-nowrap"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {formatDateShort(trade.tradeDate)}
                      </td>
                      <td className="px-3 sm:px-[18px] py-3">
                        {trade.insiderName !== trade.issuerName ? (
                          <Link
                            href={`/innsidehandel/${trade.insiderSlug}`}
                            className="text-[13px] font-medium transition-colors hover:text-[var(--an-accent)] block truncate max-w-[120px] sm:max-w-[200px]"
                            style={{ color: "var(--an-text-primary)" }}
                          >
                            {trade.insiderName}
                          </Link>
                        ) : (
                          <span style={{ color: "var(--an-text-muted)" }}>-</span>
                        )}
                        {trade.insiderRole && (
                          <div
                            className="text-[11px]"
                            style={{ color: "var(--an-text-muted)" }}
                          >
                            {trade.insiderRole}
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-[18px] py-3 text-center">
                        <TradeTypeBadge type={trade.tradeType} />
                      </td>
                      <td
                        className="px-3 sm:px-[18px] py-3 text-right mono text-[13px]"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {trade.totalValue ? formatNOK(trade.totalValue) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Analyst-only company view ───

async function renderAnalystOnlyView(company: AnalystCompanySummary) {
  const allReports = await getCachedPublicAnalystReportsByCompany(company.name, company.isin ?? undefined);
  const reports = allReports.filter(
    (r) => r.companyName || r.recommendation || r.targetPrice
  );

  // Resolve ticker
  const isin = company.isin ?? (reports.length > 0 ? reports[0].companyIsin : null);
  const ticker = await resolveTicker(isin || "", company.name);

  // Fetch stock quote
  let stockQuote: StockQuote | null = null;
  if (ticker) {
    const quotes = await fetchStockQuotes([ticker]);
    stockQuote = quotes.get(ticker) || null;
  }

  // Stats
  const uniqueBanks = new Set(
    reports
      .map((r) => r.recInvestmentBank || r.investmentBank)
      .filter((b): b is string => !!b && !isAggregatorSource(b))
      .map(normalizeBankName)
  ).size;

  // Recommendation consensus
  const recCounts = { buy: 0, hold: 0, sell: 0 };
  for (const r of reports) {
    const rec = r.recommendation?.toLowerCase();
    if (rec === "buy" || rec === "overweight" || rec === "outperform") recCounts.buy++;
    else if (rec === "sell" || rec === "underweight" || rec === "underperform") recCounts.sell++;
    else if (rec === "hold") recCounts.hold++;
  }
  const recTotal = recCounts.buy + recCounts.hold + recCounts.sell;

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
      {/* Hero */}
      <div className="pt-8 pb-6">
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight mb-2">
          {company.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {ticker && (
            <span
              className="text-[12px] sm:text-[13px] mono font-medium px-2 sm:px-2.5 py-1 rounded border"
              style={{
                color: "var(--an-text-secondary)",
                borderColor: "var(--an-border)",
                background: "var(--an-bg-surface)",
              }}
            >
              {ticker.replace(".OL", "")}
            </span>
          )}
          {stockQuote?.price && (
            <span
              className="text-[14px] sm:text-[15px] mono font-semibold"
              style={{ color: "var(--an-text-primary)" }}
            >
              {stockQuote.price.toFixed(2)} NOK
            </span>
          )}
          {isin && (
            <span
              className="text-[11px] sm:text-[12px] mono hidden sm:inline"
              style={{ color: "var(--an-text-muted)" }}
            >
              {isin}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Analyst reports count */}
        <div
          className="an-stat-accent rounded-lg p-3 sm:p-4 border"
          style={{ borderColor: "var(--an-border)" }}
        >
          <div
            className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5"
            style={{ color: "var(--an-accent)" }}
          >
            {company.reportCount}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Analyser
          </div>
          {recTotal > 0 && (
            <div className="text-[11px] mt-1 flex gap-2">
              {recCounts.buy > 0 && (
                <span style={{ color: "var(--an-green)" }}>{recCounts.buy} kjøp</span>
              )}
              {recCounts.hold > 0 && (
                <span style={{ color: "var(--an-amber)" }}>{recCounts.hold} hold</span>
              )}
              {recCounts.sell > 0 && (
                <span style={{ color: "var(--an-red)" }}>{recCounts.sell} selg</span>
              )}
            </div>
          )}
        </div>

        {/* Stock price + 52-week */}
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5 mono">
            {stockQuote?.price ? stockQuote.price.toFixed(2) : "-"}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Aksjekurs (NOK)
          </div>
          {stockQuote?.fiftyTwoWeekLow && stockQuote?.fiftyTwoWeekHigh && (
            <div
              className="text-[11px] mono mt-1"
              style={{ color: "var(--an-text-muted)" }}
            >
              52u: {stockQuote.fiftyTwoWeekLow.toFixed(2)} – {stockQuote.fiftyTwoWeekHigh.toFixed(2)}
            </div>
          )}
        </div>

        {/* Banks */}
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5">
            {uniqueBanks}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Investeringsbanker
          </div>
        </div>

        {/* Latest report date */}
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[18px] sm:text-[20px] font-bold tracking-tight leading-tight mb-0.5 pt-1">
            {reports.length > 0 ? formatDateShort(reports[0].receivedDate) : "-"}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Siste rapport
          </div>
        </div>
      </div>

      {/* Reports Table */}
      {reports.length > 0 && (
        <AnalystReportsTable reports={toReportRows(reports)} collapsedCount={5} />
      )}
    </div>
  );
}
