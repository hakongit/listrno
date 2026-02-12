import {
  getCachedInvestmentBanks,
  getCachedPublicAnalystReportsByBank,
  initializeAnalystDatabase,
} from "@/lib/analyst-db";
import { getShortData } from "@/lib/data";
import { formatDateShort, formatNumber, slugify } from "@/lib/utils";
import { isinToTicker } from "@/lib/tickers";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function resolveBank(slug: string) {
  const banks = await getCachedInvestmentBanks();
  return banks.find((b) => slugify(b.name) === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  await initializeAnalystDatabase();
  const bank = await resolveBank(slug);

  if (!bank) {
    return { title: "Ikke funnet - Listr" };
  }

  return {
    title: `${bank.name} - Analytikerrapporter | Listr`,
    description: `Se alle analytikerrapporter fra ${bank.name}. ${bank.reportCount} rapporter med kursmål for norske aksjer.`,
    openGraph: {
      title: `${bank.name} - Analytikerrapporter`,
      description: `${bank.reportCount} rapporter med kursmål for norske aksjer`,
    },
  };
}

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

function formatTargetPrice(price?: number, currency?: string): string {
  if (!price) return "-";
  return `${formatNumber(price)} ${currency || "NOK"}`;
}

export default async function BankProfilePage({ params }: PageProps) {
  const { slug } = await params;
  await initializeAnalystDatabase();

  const [bank, shortData] = await Promise.all([
    resolveBank(slug),
    getShortData(),
  ]);

  if (!bank) {
    notFound();
  }

  const allReports = await getCachedPublicAnalystReportsByBank(bank.name);
  const reports = allReports.filter(
    (r) => r.companyName || r.recommendation || r.targetPrice
  );

  // Build ISIN → slug and name → slug maps
  const isinToSlug = new Map<string, string>();
  const nameToSlug = new Map<string, string>();
  for (const company of shortData.companies) {
    isinToSlug.set(company.isin, company.slug);
    nameToSlug.set(company.issuerName.toLowerCase(), company.slug);
  }

  function getCompanySlug(isin?: string, name?: string): string | null {
    if (isin) {
      const s = isinToSlug.get(isin);
      if (s) return s;
    }
    if (name) {
      const s = nameToSlug.get(name.toLowerCase());
      if (s) return s;
    }
    return null;
  }

  function getTickerForReport(isin?: string): string | null {
    if (!isin) return null;
    return isinToTicker[isin] || null;
  }

  // Stats
  const uniqueCompanies = new Set(
    reports.map((r) => r.companyName).filter(Boolean)
  ).size;
  const latestDate = reports.length > 0 ? reports[0].receivedDate : null;

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      {/* Hero */}
      <div className="pt-8 pb-6">
        <h1 className="text-[22px] font-bold tracking-tight mb-1">
          {bank.name}
        </h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div
          className="an-stat-accent rounded-lg p-4 border"
          style={{ borderColor: "var(--an-border)" }}
        >
          <div
            className="text-[26px] font-bold tracking-tight leading-tight mb-0.5"
            style={{ color: "var(--an-accent)" }}
          >
            {bank.reportCount}
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
                  const companySlug = getCompanySlug(
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
                        {companySlug ? (
                          <Link
                            href={`/${companySlug}`}
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
