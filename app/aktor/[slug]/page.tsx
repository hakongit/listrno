import { getAllHolders, getHolderBySlug } from "@/lib/data";
import { formatPercent, formatNumber, formatDate, formatNOK } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Building2, TrendingDown, Briefcase, Banknote, Home } from "lucide-react";
import type { Metadata } from "next";
import { LazyHolderChart } from "@/components/lazy-holder-chart";
import { Logo } from "@/components/logo";

export const revalidate = 3600; // Cache for 1 hour

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


export default async function HolderPage({ params }: PageProps) {
  const { slug } = await params;
  const holder = await getHolderBySlug(slug);

  if (!holder) {
    notFound();
  }

  const totalValue = holder.companies.reduce((sum, c) => sum + (c.positionValue || 0), 0);

  return (
    <div>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <Link href="/" className="flex-shrink-0">
            <Logo />
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium truncate">{holder.name}</span>
            <span className="font-mono font-bold ml-2">
              {holder.totalPositions} <span className="text-sm font-normal text-gray-500">pos.</span>
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm flex-shrink-0">
            <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Oversikt
            </Link>
            <Link href="/innsidehandel" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Innsidehandel
            </Link>
            <Link href="/om" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Om
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Compact Stats */}
      <div className="flex flex-wrap gap-4 text-sm mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{holder.companies.length}</span>
          <span className="text-gray-500">selskaper</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <span className="font-medium font-mono text-red-600">{formatPercent(holder.totalShortPct)}</span>
          <span className="text-gray-500">total</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium font-mono">{formatPercent(holder.totalShortPct / holder.companies.length)}</span>
          <span className="text-gray-500">snitt</span>
        </div>
        {totalValue > 0 && (
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-blue-500" />
            <span className="font-medium font-mono">{formatNOK(totalValue)}</span>
          </div>
        )}
      </div>

      {/* Historical Chart */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-4">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <h2 className="font-semibold text-sm">Historikk per selskap</h2>
        </div>
        <div className="p-3">
          <LazyHolderChart companies={holder.companies} />
        </div>
      </div>

      {/* Positions table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <h2 className="font-semibold text-sm">Posisjoner</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                  Selskap
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                  Posisjon
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                  Aksjer
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                  Verdi
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
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
                  <td className="px-3 py-2">
                    <Link
                      href={`/${company.companySlug}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <TrendingDown className="w-3 h-3 text-red-500 flex-shrink-0" />
                      <span className="font-medium truncate">{company.issuerName}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono font-medium text-red-600 dark:text-red-400">
                      {formatPercent(company.currentPct)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 font-mono hidden sm:table-cell">
                    {formatNumber(company.currentShares)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 font-mono hidden lg:table-cell">
                    {company.positionValue ? formatNOK(company.positionValue) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    {formatDate(company.latestDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
