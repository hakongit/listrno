import {
  getCachedAnalystCompanies,
  getCachedPublicAnalystReportsByCompany,
  initializeAnalystDatabase,
  isAggregatorSource,
  normalizeBankName,
} from "@/lib/analyst-db";
import { getShortData } from "@/lib/data";
import { formatDateShort, formatNumber, slugify } from "@/lib/utils";
import { isinToTicker, getTicker } from "@/lib/tickers";
import { fetchStockQuotes, StockQuote } from "@/lib/prices";
import { RecommendationBadge } from "@/components/ui/recommendation-badge";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function resolveCompany(slug: string) {
  const companies = await getCachedAnalystCompanies();
  return companies.find((c) => slugify(c.name) === slug) ??
    companies.find((c) => slugify(c.name).startsWith(slug)) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  await initializeAnalystDatabase();
  const company = await resolveCompany(slug);

  if (!company) {
    return { title: "Ikke funnet - Listr" };
  }

  return {
    title: `${company.name} - Analyser | Listr`,
    description: `Se alle analyser for ${company.name}. ${company.reportCount} analyser med kursmål fra ledende investeringsbanker.`,
    openGraph: {
      title: `${company.name} - Analyser`,
      description: `${company.reportCount} analyser med kursmål fra ledende investeringsbanker`,
    },
  };
}

function formatTargetPrice(price?: number, currency?: string): string {
  if (!price) return "-";
  return `${formatNumber(price)} ${currency || "NOK"}`;
}

export default async function CompanyProfilePage({ params }: PageProps) {
  const { slug } = await params;
  await initializeAnalystDatabase();

  const [company, shortData] = await Promise.all([
    resolveCompany(slug),
    getShortData(),
  ]);

  if (!company) {
    notFound();
  }

  const allReports = await getCachedPublicAnalystReportsByCompany(company.name, company.isin ?? undefined);
  const reports = allReports.filter(
    (r) => r.companyName || r.recommendation || r.targetPrice
  );

  // Check if company has a short-data page
  const shortCompany = shortData.companies.find(
    (c) => c.issuerName.toLowerCase() === company.name.toLowerCase()
  ) || shortData.companies.find(
    (c) => reports.some((r) => r.companyIsin && c.isin === r.companyIsin)
  );

  // Resolve ticker
  const isin = company.isin ?? (reports.length > 0 ? reports[0].companyIsin : null);
  let ticker = isin ? isinToTicker[isin] : null;
  if (!ticker && isin) {
    ticker = getTicker(isin, company.name);
  }
  if (!ticker) {
    ticker = getTicker("", company.name);
  }

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
          {shortCompany && (
            <Link
              href={`/${shortCompany.slug}`}
              className="text-[11px] sm:text-[12px] font-medium px-2 sm:px-2.5 py-1 rounded-full border transition-colors hover:text-[var(--an-accent)] hover:border-[var(--an-accent)]"
              style={{
                color: "var(--an-text-secondary)",
                borderColor: "var(--an-border)",
              }}
            >
              Se shortposisjoner
            </Link>
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
      <div className="mt-3 mb-10">
        <div
          className="rounded-lg overflow-hidden border"
          style={{
            background: "var(--an-bg-surface)",
            borderColor: "var(--an-border)",
          }}
        >
          <div
            className="px-3 sm:px-[18px] py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--an-border)" }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Alle analyser
            </span>
            <Link
              href="/analyser"
              className="text-[11px] font-medium transition-colors hover:text-[var(--an-accent)]"
              style={{ color: "var(--an-text-muted)" }}
            >
              Tilbake til oversikt
            </Link>
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
                {reports.map((report, i) => {
                  const effectiveBank = report.recInvestmentBank || report.investmentBank;
                  const bankName = effectiveBank && !isAggregatorSource(effectiveBank) ? normalizeBankName(effectiveBank) : null;

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
                      className="px-3 sm:px-[18px] py-3 text-xs whitespace-nowrap"
                      style={{ color: "var(--an-text-muted)" }}
                    >
                      {formatDateShort(report.receivedDate)}
                    </td>
                    <td className="px-3 sm:px-[18px] py-3">
                      {bankName ? (
                        <Link
                          href={`/analyser/bank/${slugify(bankName)}`}
                          className="text-[13px] font-medium transition-colors hover:text-[var(--an-accent)]"
                          style={{ color: "var(--an-text-primary)" }}
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
        </div>
      </div>
    </div>
  );
}
