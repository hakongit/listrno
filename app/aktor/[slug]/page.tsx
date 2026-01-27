import { getAllHolders, getHolderBySlug } from "@/lib/data";
import { formatPercent, formatNumber, formatDate, formatNOK } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Building2, TrendingDown, Briefcase, Banknote, Home } from "lucide-react";
import type { Metadata } from "next";
import { HolderHistoryChart } from "@/components/holder-history-chart";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const holder = await getHolderBySlug(slug);

  if (!holder) {
    return { title: "Ikke funnet - Listr" };
  }

  return {
    title: `${holder.name} - Shortposisjoner | Listr`,
    description: `Se alle shortposisjoner fra ${holder.name}. ${holder.totalPositions} aktive posisjoner i norske aksjer.`,
    openGraph: {
      title: `${holder.name} - Shortposisjoner`,
      description: `${holder.totalPositions} aktive posisjoner i norske aksjer`,
    },
  };
}

export async function generateStaticParams() {
  const holders = await getAllHolders();
  return holders.map((holder) => ({
    slug: holder.slug,
  }));
}

export default async function HolderPage({ params }: PageProps) {
  const { slug } = await params;
  const holder = await getHolderBySlug(slug);

  if (!holder) {
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
        <span className="px-2 py-1 rounded-md font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10">
          {holder.name}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-8 h-8 text-gray-400" />
              <h1 className="text-3xl font-bold">{holder.name}</h1>
            </div>
            <p className="text-gray-500">Posisjonsholder</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold font-mono text-gray-900 dark:text-gray-100">
              {holder.totalPositions}
            </div>
            <div className="text-sm text-gray-500">Aktive posisjoner</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {(() => {
        const totalValue = holder.companies.reduce((sum, c) => sum + (c.positionValue || 0), 0);
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center gap-4">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                <Building2 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{holder.companies.length}</div>
                <div className="text-sm text-gray-500">Selskaper</div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center gap-4">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {formatPercent(holder.totalShortPct)}
                </div>
                <div className="text-sm text-gray-500">Total short (sum)</div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center gap-4">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                <TrendingDown className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatPercent(holder.totalShortPct / holder.companies.length)}
                </div>
                <div className="text-sm text-gray-500">Snitt per selskap</div>
              </div>
            </div>
            {totalValue > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center gap-4">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <Banknote className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">
                    {formatNOK(totalValue)}
                  </div>
                  <div className="text-sm text-gray-500">Total verdi</div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Historical Chart */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <h2 className="font-semibold">Historikk per selskap</h2>
        </div>
        <div className="p-4">
          <HolderHistoryChart companies={holder.companies} />
        </div>
      </div>

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
                  Selskap
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
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                  Dato
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {holder.companies.map((company) => (
                <tr
                  key={company.isin}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/${company.companySlug}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="font-medium">{company.issuerName}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-medium text-red-600 dark:text-red-400">
                      {formatPercent(company.currentPct)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 font-mono hidden sm:table-cell">
                    {formatNumber(company.currentShares)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 font-mono text-sm hidden lg:table-cell">
                    {company.positionValue ? formatNOK(company.positionValue) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-sm">
                    {formatDate(company.latestDate)}
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
