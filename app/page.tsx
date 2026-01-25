import { getShortData } from "@/lib/data";
import { formatPercent, formatDate, formatNOK } from "@/lib/utils";
import Link from "next/link";
import { TrendingDown, TrendingUp, ArrowRight, Minus } from "lucide-react";

export const revalidate = 3600; // Revalidate every hour

function ChangeIndicator({ change, previousDate }: { change: number; previousDate: string | null }) {
  const dateStr = previousDate
    ? new Date(previousDate).toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : null;

  if (change > 0.01) {
    return (
      <span className="inline-flex items-center gap-1 text-red-500 text-xs">
        <TrendingUp className="w-3 h-3" />
        <span>+{change.toFixed(2)}</span>
        {dateStr && <span className="text-gray-400 hidden lg:inline">({dateStr})</span>}
      </span>
    );
  } else if (change < -0.01) {
    return (
      <span className="inline-flex items-center gap-1 text-green-500 text-xs">
        <TrendingDown className="w-3 h-3" />
        <span>{change.toFixed(2)}</span>
        {dateStr && <span className="text-gray-400 hidden lg:inline">({dateStr})</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-gray-400 text-xs">
      <Minus className="w-3 h-3" />
    </span>
  );
}

export default async function HomePage() {
  const data = await getShortData();

  // Top 5 highest shorts
  const highestShorts = [...data.companies]
    .sort((a, b) => b.totalShortPct - a.totalShortPct)
    .slice(0, 5);

  // Top 5 biggest increases
  const biggestIncreases = [...data.companies]
    .filter((c) => c.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 5);

  // Top 5 biggest decreases
  const biggestDecreases = [...data.companies]
    .filter((c) => c.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, 5);

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
      {(() => {
        const totalShortValue = data.companies.reduce((sum, c) => sum + (c.shortValue || 0), 0);
        return (
          <div className="hidden md:grid grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold">{data.totalCompanies}</div>
              <div className="text-sm text-gray-500">Selskaper</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold">{data.totalPositions}</div>
              <div className="text-sm text-gray-500">Posisjoner</div>
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
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold font-mono">
                {totalShortValue > 0 ? formatNOK(totalShortValue) : "-"}
              </div>
              <div className="text-sm text-gray-500">Total verdi</div>
            </div>
          </div>
        );
      })()}

      {/* Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Highest Shorts */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-950">
            <h2 className="font-semibold text-red-900 dark:text-red-100 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Høyest short
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {highestShorts.map((company) => (
              <Link
                key={company.isin}
                href={`/${company.slug}`}
                className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <span className="text-sm truncate mr-2">{company.issuerName}</span>
                <span className="font-mono text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                  {formatPercent(company.totalShortPct)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Biggest Increases */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-950">
            <h2 className="font-semibold text-red-900 dark:text-red-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Størst økning
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {biggestIncreases.length > 0 ? (
              biggestIncreases.map((company) => (
                <Link
                  key={company.isin}
                  href={`/${company.slug}`}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <span className="text-sm truncate mr-2">{company.issuerName}</span>
                  <span className="font-mono text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                    +{company.change.toFixed(2)}%
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">Ingen økninger registrert</div>
            )}
          </div>
        </div>

        {/* Biggest Decreases */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-green-50 dark:bg-green-950">
            <h2 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Størst nedgang
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {biggestDecreases.length > 0 ? (
              biggestDecreases.map((company) => (
                <Link
                  key={company.isin}
                  href={`/${company.slug}`}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <span className="text-sm truncate mr-2">{company.issuerName}</span>
                  <span className="font-mono text-sm font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                    {company.change.toFixed(2)}%
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">Ingen nedganger registrert</div>
            )}
          </div>
        </div>
      </div>

      {/* Full Table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <h2 className="font-semibold">Alle selskaper</h2>
        </div>
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
                  Endring
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 hidden md:table-cell">
                  Verdi (NOK)
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 hidden lg:table-cell">
                  Sist oppdatert
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {data.companies.map((company) => (
                <tr
                  key={company.isin}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors relative cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <Link href={`/${company.slug}`} className="flex items-center gap-2 after:absolute after:inset-0">
                      <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="font-medium">{company.issuerName}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
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
                      <span className="sm:hidden">
                        <ChangeIndicator change={company.change} previousDate={company.previousDate} />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <ChangeIndicator change={company.change} previousDate={company.previousDate} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 font-mono text-sm hidden md:table-cell">
                    {company.shortValue ? formatNOK(company.shortValue) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-sm hidden lg:table-cell">
                    {formatDate(company.latestDate)}
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
