import { getCachedInvestmentBanks, getCachedPublicAnalystReportsByBank, initializeAnalystDatabase } from "@/lib/analyst-db";
import { getShortData } from "@/lib/data";
import { formatDate, formatNumber, slugify } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
} from "lucide-react";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";

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
  let color = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  let icon = <Minus className="w-3 h-3" />;

  if (rec === "buy" || rec === "overweight" || rec === "outperform") {
    color = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    icon = <TrendingUp className="w-3 h-3" />;
  } else if (rec === "sell" || rec === "underweight" || rec === "underperform") {
    color = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    icon = <TrendingDown className="w-3 h-3" />;
  }

  const labels: Record<string, string> = {
    buy: "Kjøp",
    hold: "Hold",
    sell: "Selg",
    overweight: "Overvekt",
    underweight: "Undervekt",
    outperform: "Outperform",
    underperform: "Underperform",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon}
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

  // Build ISIN → slug and name → slug maps for company linking
  const isinToSlug = new Map<string, string>();
  const nameToSlug = new Map<string, string>();
  for (const company of shortData.companies) {
    isinToSlug.set(company.isin, company.slug);
    nameToSlug.set(company.issuerName.toLowerCase(), company.slug);
  }

  function getCompanySlug(isin?: string, name?: string): string | null {
    if (isin) {
      const slug = isinToSlug.get(isin);
      if (slug) return slug;
    }
    if (name) {
      const slug = nameToSlug.get(name.toLowerCase());
      if (slug) return slug;
    }
    return null;
  }

  // Stats
  const uniqueCompanies = new Set(reports.map((r) => r.companyName).filter(Boolean)).size;
  const latestDate = reports.length > 0 ? reports[0].receivedDate : null;

  return (
    <div>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" aria-label="Listr.no - Til forsiden">
            <Logo />
          </Link>
          <nav className="flex items-center gap-4 text-sm" aria-label="Hovednavigasjon">
            <Link href="/shortoversikt" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Shortposisjoner
            </Link>
            <Link href="/innsidehandel" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Innsidehandel
            </Link>
            <Link href="/analyser" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Analyser
            </Link>
            <Link href="/om" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Om
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Bank name + stats */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-gray-400" />
            <h1 className="text-2xl font-bold">{bank.name}</h1>
          </div>
          <div className="flex flex-wrap gap-4 text-sm pb-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{bank.reportCount}</span>
              <span className="text-gray-500">rapporter</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{uniqueCompanies}</span>
              <span className="text-gray-500">selskaper</span>
            </div>
            {latestDate && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Siste rapport:</span>
                <span className="font-medium">{formatDate(latestDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <h2 className="font-semibold">Rapporter</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Dato
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Selskap
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Anbefaling
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Kursmål
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                    Kurs ved rapport
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {reports.map((report) => (
                  <tr
                    key={report.recommendationId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm">
                      {formatDate(report.receivedDate)}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const companySlug = getCompanySlug(report.companyIsin, report.companyName);
                        return companySlug ? (
                          <Link href={`/${companySlug}`} className="font-medium hover:underline">
                            {report.companyName}
                          </Link>
                        ) : (
                          <div className="font-medium">{report.companyName || ""}</div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <RecommendationBadge recommendation={report.recommendation} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {report.targetPrice ? (
                        <span className="select-none blur-[6px]">
                          {formatTargetPrice(report.targetPrice, report.targetCurrency)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm hidden lg:table-cell">
                      {report.priceAtReport ? (
                        <span className="select-none blur-[6px]">
                          {formatNumber(report.priceAtReport)} {report.targetCurrency}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-500 text-center">
          Basert p&aring; tips fra brukere, nyhetsbrev fra meglerhus og offentlig tilgjengelige kilder. Ikke finansiell r&aring;dgivning.
        </p>
      </div>
    </div>
  );
}
