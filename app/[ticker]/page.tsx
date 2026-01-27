import { getShortData, getCompanyBySlug } from "@/lib/data";
import { formatPercent, formatNumber, formatDate, slugify, formatNOK } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, TrendingDown, Briefcase, Calendar, Users, TrendingUp, Banknote, Home } from "lucide-react";
import type { Metadata } from "next";
import { ShortHistoryChart } from "@/components/short-history-chart";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticker } = await params;
  const company = await getCompanyBySlug(ticker);

  if (!company) {
    return { title: "Ikke funnet - Listr" };
  }

  return {
    title: `${company.issuerName} - Shortposisjoner | Listr`,
    description: `Se alle shortposisjoner i ${company.issuerName}. Total short: ${formatPercent(company.totalShortPct)}. ${company.positions.length} aktive posisjoner.`,
    openGraph: {
      title: `${company.issuerName} - Shortposisjoner`,
      description: `Total short: ${formatPercent(company.totalShortPct)} fra ${company.positions.length} aktører`,
    },
  };
}

export async function generateStaticParams() {
  const data = await getShortData();
  return data.companies.map((company) => ({
    ticker: company.slug,
  }));
}

export default async function CompanyPage({ params }: PageProps) {
  const { ticker } = await params;
  const company = await getCompanyBySlug(ticker);

  if (!company) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link
          href="/"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Oversikt</span>
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="px-2 py-1 rounded-md font-medium text-red-600 dark:text-red-400 bg-red-500/10">
          {company.issuerName}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">{company.issuerName}</h1>
            <p className="text-gray-500">ISIN: {company.isin}</p>
          </div>
          <div className="text-right">
            <div
              className={`text-4xl font-bold font-mono ${
                company.totalShortPct >= 5
                  ? "text-red-600 dark:text-red-400"
                  : company.totalShortPct >= 2
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {formatPercent(company.totalShortPct)}
            </div>
            <div className="text-sm text-gray-500">Total short</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {(() => {
        const history = company.history;
        const hasHistory = history.length >= 2;
        const firstPoint = history[0];
        const lastPoint = history[history.length - 1];
        const change = hasHistory ? lastPoint.totalShortPct - firstPoint.totalShortPct : 0;
        const changePositive = change > 0;

        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center gap-4">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{company.positions.length}</div>
                <div className="text-sm text-gray-500">Aktører</div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center gap-4">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatNumber(
                    company.positions.reduce((sum, p) => sum + p.positionShares, 0)
                  )}
                </div>
                <div className="text-sm text-gray-500">Aksjer shortet</div>
              </div>
            </div>
            {company.shortValue && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center gap-4">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <Banknote className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">
                    {formatNOK(company.shortValue)}
                  </div>
                  <div className="text-sm text-gray-500">Verdi (NOK)</div>
                </div>
              </div>
            )}
            {hasHistory && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center gap-4">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                  {changePositive ? (
                    <TrendingUp className="w-5 h-5 text-red-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div>
                  <div className={`text-2xl font-bold ${changePositive ? "text-red-600" : "text-green-600"}`}>
                    {changePositive ? "+" : ""}{change.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">Endring totalt</div>
                </div>
              </div>
            )}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center gap-4">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatDate(company.latestDate)}</div>
                <div className="text-sm text-gray-500">Sist oppdatert</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Historical Chart */}
      {company.history.length > 1 && (
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
            <h2 className="font-semibold">Historikk</h2>
            <span className="text-sm text-gray-500">{company.history.length} datapunkter</span>
          </div>
          <div className="p-4">
            <ShortHistoryChart history={company.history} companyName={company.issuerName} />
          </div>
        </div>
      )}

      {/* Positions table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <h2 className="font-semibold">Posisjoner</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Posisjonsholder
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                  Posisjon
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 hidden sm:table-cell">
                  Antall aksjer
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 hidden lg:table-cell">
                  Verdi (NOK)
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 hidden md:table-cell">
                  Dato
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {company.positions.map((position, index) => (
                <tr
                  key={`${position.positionHolder}-${index}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/aktor/${slugify(position.positionHolder)}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{position.positionHolder}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-medium text-red-600 dark:text-red-400">
                      {formatPercent(position.positionPct)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 font-mono hidden sm:table-cell">
                    {formatNumber(position.positionShares)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 font-mono text-sm hidden lg:table-cell">
                    {company.stockPrice
                      ? formatNOK(position.positionShares * company.stockPrice)
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-sm hidden md:table-cell">
                    {formatDate(position.positionDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Hva betyr dette?
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Shortposisjoner over 0,5% av utstedte aksjer må rapporteres til Finanstilsynet.
          En høy total shortposisjon kan indikere at mange investorer tror aksjen vil
          falle i verdi. Dette er kun informasjon og ikke investeringsråd.
        </p>
      </div>
    </div>
  );
}
