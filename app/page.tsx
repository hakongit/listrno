import { getShortData } from "@/lib/data";
import { formatPercent, formatDate, formatNOK } from "@/lib/utils";
import Link from "next/link";
import { TrendingDown, TrendingUp, ArrowRight, Minus, Briefcase } from "lucide-react";

export const dynamic = 'force-dynamic'; // Render on each request

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

  // Find the most recent date in the dataset
  const allDates = data.companies.map(c => new Date(c.latestDate).getTime());
  const mostRecentDate = new Date(Math.max(...allDates));
  const mostRecentDateStr = mostRecentDate.toISOString().split('T')[0];

  // Filter to only companies updated on the most recent date
  const recentCompanies = data.companies.filter(c =>
    c.latestDate.startsWith(mostRecentDateStr)
  );

  // Top 5 highest shorts
  const highestShorts = [...data.companies]
    .sort((a, b) => b.totalShortPct - a.totalShortPct)
    .slice(0, 5);

  // Top 5 biggest increases (only from most recent date)
  const biggestIncreases = [...recentCompanies]
    .filter((c) => c.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 5);

  // Top 5 biggest decreases (only from most recent date)
  const biggestDecreases = [...recentCompanies]
    .filter((c) => c.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, 5);

  // Top 5 highest value shorts
  const highestValue = [...data.companies]
    .filter((c) => c.shortValue && c.shortValue > 0)
    .sort((a, b) => (b.shortValue || 0) - (a.shortValue || 0))
    .slice(0, 5);

  // Top 5 holders with most positions
  const mostPositions = [...data.holders]
    .sort((a, b) => b.totalPositions - a.totalPositions)
    .slice(0, 5);

  // Top 5 holders with highest total short %
  const highestTotalShort = [...data.holders]
    .sort((a, b) => b.totalShortPct - a.totalShortPct)
    .slice(0, 5);

  // Top 5 holders with highest value
  const holdersWithValue = data.holders.map((holder) => ({
    ...holder,
    totalValue: holder.companies.reduce((sum, c) => sum + (c.positionValue || 0), 0),
  }));
  const highestHolderValue = [...holdersWithValue]
    .filter((h) => h.totalValue > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  return (
    <div>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Listr<span className="text-gray-400">.no</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-900 dark:text-gray-100 font-medium">
              Oversikt
            </Link>
            <Link href="/om" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Om
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Shortposisjoner i Norge</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Offentliggjorte shortposisjoner i norske aksjer. Data fra Finanstilsynet.
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Biggest Increases */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <Link
            href="/topp/storst-okning"
            className="block px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
          >
            <h2 className="font-semibold text-red-900 dark:text-red-100 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>
                  Størst økning
                  <span className="font-normal text-xs opacity-75 ml-1">({mostRecentDate.toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit", year: "2-digit" })})</span>
                </span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </h2>
          </Link>
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
          <Link
            href="/topp/storst-nedgang"
            className="block px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
          >
            <h2 className="font-semibold text-green-900 dark:text-green-100 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                <span>
                  Størst nedgang
                  <span className="font-normal text-xs opacity-75 ml-1">({mostRecentDate.toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit", year: "2-digit" })})</span>
                </span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </h2>
          </Link>
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

        {/* Highest Shorts */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <Link
            href="/topp/hoyest-short"
            className="block px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
          >
            <h2 className="font-semibold text-red-900 dark:text-red-100 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Høyest short
              </span>
              <ArrowRight className="w-4 h-4" />
            </h2>
          </Link>
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

        {/* Highest Value */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <Link
            href="/topp/hoyest-verdi"
            className="block px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
          >
            <h2 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Høyest verdi
              </span>
              <ArrowRight className="w-4 h-4" />
            </h2>
          </Link>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {highestValue.length > 0 ? (
              highestValue.map((company) => (
                <Link
                  key={company.isin}
                  href={`/${company.slug}`}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <span className="text-sm truncate mr-2">{company.issuerName}</span>
                  <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {formatNOK(company.shortValue!)}
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">Ingen verdier tilgjengelig</div>
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
                  className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link href={`/${company.slug}`} className="flex items-center gap-2 hover:underline">
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

      {/* Holder Highlight Cards */}
      <div className="mt-8 mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Aktører
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Most Positions */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <Link
              href="/topp/aktorer/flest-posisjoner"
              className="block px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
            >
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Flest posisjoner
                </span>
                <ArrowRight className="w-4 h-4" />
              </h3>
            </Link>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {mostPositions.map((holder) => (
                <Link
                  key={holder.slug}
                  href={`/aktor/${holder.slug}`}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <span className="text-sm truncate mr-2">{holder.name}</span>
                  <span className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400 whitespace-nowrap">
                    {holder.totalPositions}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Highest Total Short */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <Link
              href="/topp/aktorer/hoyest-short"
              className="block px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
            >
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Høyest total short
                </span>
                <ArrowRight className="w-4 h-4" />
              </h3>
            </Link>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {highestTotalShort.map((holder) => (
                <Link
                  key={holder.slug}
                  href={`/aktor/${holder.slug}`}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <span className="text-sm truncate mr-2">{holder.name}</span>
                  <span className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400 whitespace-nowrap">
                    {formatPercent(holder.totalShortPct)}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Highest Value */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <Link
              href="/topp/aktorer/hoyest-verdi"
              className="block px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
            >
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Høyest verdi
                </span>
                <ArrowRight className="w-4 h-4" />
              </h3>
            </Link>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {highestHolderValue.length > 0 ? (
                highestHolderValue.map((holder) => (
                  <Link
                    key={holder.slug}
                    href={`/aktor/${holder.slug}`}
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <span className="text-sm truncate mr-2">{holder.name}</span>
                    <span className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      {formatNOK(holder.totalValue)}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">Ingen verdier tilgjengelig</div>
              )}
            </div>
          </div>
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
    </div>
  );
}
