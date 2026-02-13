import {
  getCachedAnalystCompanies,
  getCachedPublicAnalystReportsByCompany,
  initializeAnalystDatabase,
  isAggregatorSource,
  normalizeBankName,
} from "@/lib/analyst-db";
import { getShortData } from "@/lib/data";
import { formatDateShort, formatNumber, slugify } from "@/lib/utils";
import { isinToTicker } from "@/lib/tickers";
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
    title: `${company.name} - Analytikerrapporter | Listr`,
    description: `Se alle analytikerrapporter for ${company.name}. ${company.reportCount} rapporter med kursmål fra ledende investeringsbanker.`,
    openGraph: {
      title: `${company.name} - Analytikerrapporter`,
      description: `${company.reportCount} rapporter med kursmål fra ledende investeringsbanker`,
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

  function getTickerForReport(isin?: string): string | null {
    if (!isin) return null;
    return isinToTicker[isin] || null;
  }

  // Stats
  const uniqueBanks = new Set(
    reports
      .map((r) => r.recInvestmentBank || r.investmentBank)
      .filter((b): b is string => !!b && !isAggregatorSource(b))
      .map(normalizeBankName)
  ).size;
  const latestDate = reports.length > 0 ? reports[0].receivedDate : null;
  const ticker = reports.length > 0 ? getTickerForReport(reports[0].companyIsin) : null;

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      {/* Hero */}
      <div className="pt-8 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/analyser"
            className="text-[13px] transition-colors hover:text-[var(--an-accent)]"
            style={{ color: "var(--an-text-muted)" }}
          >
            Analytikerrapporter
          </Link>
          <span style={{ color: "var(--an-text-muted)" }}>/</span>
        </div>
        <h1 className="text-[22px] font-bold tracking-tight mb-1">
          {company.name}
        </h1>
        <div className="flex items-center gap-3">
          {ticker && (
            <span
              className="text-[13px] mono"
              style={{ color: "var(--an-text-muted)" }}
            >
              {ticker}
            </span>
          )}
          {shortCompany && (
            <Link
              href={`/${shortCompany.slug}`}
              className="text-[12px] font-medium px-2.5 py-1 rounded-full border transition-colors hover:text-[var(--an-accent)] hover:border-[var(--an-accent)]"
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
            {company.reportCount}
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
            {uniqueBanks}
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
                      className="px-[18px] py-3 text-xs whitespace-nowrap"
                      style={{ color: "var(--an-text-muted)" }}
                    >
                      {formatDateShort(report.receivedDate)}
                    </td>
                    <td className="px-[18px] py-3">
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
                          {report.previousTargetPrice && (
                            <span className="text-[10px] ml-1" style={{ color: "var(--an-text-muted)" }}>
                              ({formatNumber(report.previousTargetPrice)})
                            </span>
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
