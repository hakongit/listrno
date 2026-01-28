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
    <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Compact header with breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          >
            <Home className="w-4 h-4" />
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          <h1 className="text-xl font-bold truncate">{company.issuerName}</h1>
          <span className="text-xs text-gray-400 hidden sm:inline flex-shrink-0">({company.isin})</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className={`text-2xl font-bold font-mono ${
              company.totalShortPct >= 5
                ? "text-red-600 dark:text-red-400"
                : company.totalShortPct >= 2
                ? "text-orange-600 dark:text-orange-400"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {formatPercent(company.totalShortPct)}
          </div>
        </div>
      </div>

      {/* Compact Stats */}
      {(() => {
        const history = company.history;
        const hasHistory = history.length >= 2;
        const firstPoint = history[0];
        const lastPoint = history[history.length - 1];
        const change = hasHistory ? lastPoint.totalShortPct - firstPoint.totalShortPct : 0;
        const changePositive = change > 0;

        return (
          <div className="flex flex-wrap gap-4 text-sm mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{company.positions.length}</span>
              <span className="text-gray-500">aktører</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="font-medium font-mono">
                {formatNumber(company.positions.reduce((sum, p) => sum + p.positionShares, 0))}
              </span>
              <span className="text-gray-500">aksjer</span>
            </div>
            {company.shortValue && (
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-blue-500" />
                <span className="font-medium font-mono">{formatNOK(company.shortValue)}</span>
              </div>
            )}
            {hasHistory && (
              <div className="flex items-center gap-2">
                {changePositive ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                )}
                <span className={`font-medium font-mono ${changePositive ? "text-red-600" : "text-green-600"}`}>
                  {changePositive ? "+" : ""}{change.toFixed(2)}%
                </span>
                <span className="text-gray-500">totalt</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">{formatDate(company.latestDate)}</span>
            </div>
          </div>
        );
      })()}

      {/* Historical Chart */}
      {company.history.length > 1 && (
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-4">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
            <h2 className="font-semibold text-sm">Historikk</h2>
            <span className="text-xs text-gray-500">{company.history.length} datapunkter</span>
          </div>
          <div className="p-3">
            <ShortHistoryChart history={company.history} companyName={company.issuerName} />
          </div>
        </div>
      )}

      {/* Positions table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <h2 className="font-semibold text-sm">Posisjoner</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-3 py-2 font-medium text-gray-500">
                  Posisjonsholder
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">
                  Posisjon
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-500 hidden sm:table-cell">
                  Aksjer
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-500 hidden lg:table-cell">
                  Verdi
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">
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
                  <td className="px-3 py-2">
                    <Link
                      href={`/aktor/${slugify(position.positionHolder)}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Briefcase className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="font-medium truncate">{position.positionHolder}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono font-medium text-red-600 dark:text-red-400">
                      {formatPercent(position.positionPct)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 font-mono hidden sm:table-cell">
                    {formatNumber(position.positionShares)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 font-mono hidden lg:table-cell">
                    {company.stockPrice
                      ? formatNOK(position.positionShares * company.stockPrice)
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    {formatDate(position.positionDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
