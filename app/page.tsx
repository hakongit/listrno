import { getShortData } from "@/lib/data";
import { formatPercent, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowUpRight, TrendingDown } from "lucide-react";

export const revalidate = 3600; // Revalidate every hour

export default async function HomePage() {
  const data = await getShortData();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shortposisjoner i Norge</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Alle offentliggjorte shortposisjoner i norske aksjer. Data fra Finanstilsynet.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="text-2xl font-bold">{data.totalCompanies}</div>
          <div className="text-sm text-gray-500">Selskaper</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="text-2xl font-bold">{data.totalPositions}</div>
          <div className="text-sm text-gray-500">Posisjoner</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="text-2xl font-bold">{data.uniqueHolders}</div>
          <div className="text-sm text-gray-500">Aktører</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="text-2xl font-bold">
            {formatPercent(
              data.companies.reduce((sum, c) => sum + c.totalShortPct, 0) /
                data.companies.length
            )}
          </div>
          <div className="text-sm text-gray-500">Snitt short</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Selskap
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                  Total short
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 hidden sm:table-cell">
                  Antall posisjoner
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 hidden md:table-cell">
                  Sist oppdatert
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {data.companies.map((company) => (
                <tr
                  key={company.isin}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="font-medium">{company.issuerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-mono font-medium ${
                        company.totalShortPct >= 5
                          ? "text-red-600 dark:text-red-400"
                          : company.totalShortPct >= 2
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {formatPercent(company.totalShortPct)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                    {company.positions.length}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-sm hidden md:table-cell">
                    {formatDate(company.latestDate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${company.slug}`}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Detaljer
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data source note */}
      <p className="mt-4 text-sm text-gray-500 text-center">
        Data oppdateres hver time. Kilde:{" "}
        <a
          href="https://www.finanstilsynet.no/en/publications/short-selling-/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Finanstilsynet
        </a>
      </p>
    </div>
  );
}
