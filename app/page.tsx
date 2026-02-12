import { getShortData } from "@/lib/data";
import { getInsiderTrades, getInsiderStats, getTopInsiders } from "@/lib/insider-data";
import { formatPercent, formatDate, formatNOK } from "@/lib/utils";
import Link from "next/link";
import {
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Briefcase,
  BarChart3,
  User,
} from "lucide-react";
export const revalidate = 3600;

function TradeTypeIcon({ type }: { type: string }) {
  if (type === "buy") {
    return <ArrowUpRight className="w-4 h-4 text-green-500" />;
  } else if (type === "sell") {
    return <ArrowDownRight className="w-4 h-4 text-red-500" />;
  }
  return null;
}

export default async function DashboardPage() {
  const [shortData, insiderTrades, insiderStats, topInsiders] = await Promise.all([
    getShortData(),
    getInsiderTrades({ limit: 5 }),
    getInsiderStats(),
    getTopInsiders(5),
  ]);

  // Short data calculations
  const uniqueDates = [...new Set(shortData.companies.map((c) => c.latestDate))].sort().reverse();

  // Biggest short increases
  let biggestIncreases: typeof shortData.companies = [];
  for (const dateStr of uniqueDates) {
    const companiesOnDate = shortData.companies.filter((c) => c.latestDate === dateStr && c.change > 0);
    if (companiesOnDate.length > 0) {
      biggestIncreases = companiesOnDate.sort((a, b) => b.change - a.change).slice(0, 3);
      break;
    }
  }

  // Highest shorts
  const highestShorts = [...shortData.companies]
    .sort((a, b) => b.totalShortPct - a.totalShortPct)
    .slice(0, 3);

  // Top holders
  const topHolders = [...shortData.holders]
    .sort((a, b) => b.totalPositions - a.totalPositions)
    .slice(0, 3);

  // Total short value
  const totalShortValue = shortData.companies.reduce((sum, c) => sum + (c.shortValue || 0), 0);

  // Filter to real insiders (not company names as fallback)
  const realInsiders = topInsiders.filter(
    (insider) => insider.name !== insider.companies[0] && insider.totalTrades > 1
  );

  // Biggest insider trades by value
  const biggestTrades = [...insiderTrades]
    .filter((t) => t.totalValue && t.totalValue > 0)
    .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
    .slice(0, 3);

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Norsk aksjemarked</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Shortposisjoner og innsidehandler i norske aksjer
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{shortData.totalCompanies}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Shortede selskaper</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-600 dark:text-red-400 font-mono">
              {totalShortValue > 0 ? formatNOK(totalShortValue) : "-"}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total shortverdi</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{insiderStats.totalTrades}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Innsidehandler</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">
              <span className="text-green-600 dark:text-green-400">{insiderStats.buyCount}</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-red-600 dark:text-red-400">{insiderStats.sellCount}</span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Kjøp / Salg</div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Short Positions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Link href="/shortoversikt" className="group">
                <h2 className="text-xl font-bold flex items-center gap-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  Shortposisjoner
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
              </Link>
            </div>

            {/* Highest Shorts */}
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-950">
                <h3 className="font-semibold text-red-900 dark:text-red-100 text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Høyest short %
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {highestShorts.map((company) => (
                  <Link
                    key={company.isin}
                    href={`/${company.slug}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <span className="text-sm truncate mr-2" title={company.issuerName}>{company.issuerName}</span>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                        {formatPercent(company.totalShortPct)}
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(company.latestDate)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Biggest Increases */}
            {biggestIncreases.length > 0 && (
              <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-950">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" aria-hidden="true" />
                    Siste økninger
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {biggestIncreases.map((company) => (
                    <Link
                      key={company.isin}
                      href={`/${company.slug}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <span className="text-sm truncate mr-2" title={company.issuerName}>{company.issuerName}</span>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                          +{company.change.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(company.latestDate)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Top Holders */}
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-purple-50 dark:bg-purple-950">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Mest aktive shortere
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {topHolders.map((holder) => (
                  <Link
                    key={holder.slug}
                    href={`/aktor/${holder.slug}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <span className="text-sm truncate mr-2" title={holder.name}>{holder.name}</span>
                    <span className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      {holder.totalPositions} pos
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Insider Trading Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Link href="/innsidehandel" className="group">
                <h2 className="text-xl font-bold flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <Users className="w-5 h-5 text-blue-500" />
                  Innsidehandel
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
              </Link>
            </div>

            {/* Recent Trades */}
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  Siste handler
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {insiderTrades.map((trade) => (
                  <Link
                    key={trade.messageId}
                    href={trade.companySlug ? `/${trade.companySlug}` : "#"}
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <TradeTypeIcon type={trade.tradeType} />
                      <div className="min-w-0">
                        <div className="text-sm truncate">{trade.issuerName}</div>
                        <div className="text-xs text-gray-500 truncate">{trade.insiderName}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className={`font-mono text-sm font-medium ${
                        trade.tradeType === "buy"
                          ? "text-green-600 dark:text-green-400"
                          : trade.tradeType === "sell"
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-600 dark:text-gray-400"
                      }`}>
                        {trade.totalValue ? formatNOK(trade.totalValue) : "-"}
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(trade.tradeDate)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Biggest Trades */}
            {biggestTrades.length > 0 && (
              <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-950">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Største handler
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {biggestTrades.map((trade) => (
                    <Link
                      key={trade.messageId}
                      href={trade.companySlug ? `/${trade.companySlug}` : "#"}
                      className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <TradeTypeIcon type={trade.tradeType} />
                        <span className="text-sm truncate">{trade.issuerName}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-mono text-sm font-medium whitespace-nowrap ${
                          trade.tradeType === "buy"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          {formatNOK(trade.totalValue!)}
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(trade.tradeDate)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Top Insiders */}
            {realInsiders.length > 0 && (
              <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-950">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Mest aktive innsidere
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {realInsiders.slice(0, 3).map((insider) => (
                    <Link
                      key={insider.slug}
                      href={`/innsidehandel/${insider.slug}`}
                      className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm truncate">{insider.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {insider.companies.slice(0, 2).join(", ")}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-sm">
                          <span className="text-green-600 dark:text-green-400">{insider.buyCount}</span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-red-600 dark:text-red-400">{insider.sellCount}</span>
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(insider.latestTrade)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/shortoversikt"
            className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingDown className="w-6 h-6 text-red-500" />
              <div>
                <div className="font-semibold text-red-900 dark:text-red-100">Alle shortposisjoner</div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  {shortData.totalCompanies} selskaper, {shortData.totalPositions} posisjoner
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-red-500" />
          </Link>
          <Link
            href="/innsidehandel"
            className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-500" />
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">Alle innsidehandler</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {insiderStats.totalTrades} handler fra primærinnsidere
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-500" />
          </Link>
        </div>

        {/* Data source note */}
        <p className="mt-6 text-sm text-gray-500 text-center">
          Data fra{" "}
          <a
            href="https://www.finanstilsynet.no/en/publications/short-selling-/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Finanstilsynet
          </a>
          {" og "}
          <a
            href="https://live.euronext.com/en/listview/company-press-releases/1061"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Euronext Oslo
          </a>
        </p>
      </div>
    </div>
  );
}
