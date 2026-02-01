import { getInsiderTrades, getInsiderStats, getTopInsiders } from "@/lib/insider-data";
import { formatDate, formatNumber, formatNOK } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ExternalLink,
  Users,
  TrendingUp,
  TrendingDown,
  Home,
  ChevronRight,
  User,
  ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Innsidehandel - Listr",
  description: "Oversikt over innsidehandler i norske aksjer. Se kjøp og salg fra primærinnsidere.",
  openGraph: {
    title: "Innsidehandel - Listr",
    description: "Oversikt over innsidehandler i norske aksjer",
  },
};

function TradeTypeIcon({ type }: { type: string }) {
  if (type === "buy") {
    return <ArrowUpRight className="w-4 h-4 text-green-500" />;
  } else if (type === "sell") {
    return <ArrowDownRight className="w-4 h-4 text-red-500" />;
  }
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function TradeTypeBadge({ type }: { type: string }) {
  if (type === "buy") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <ArrowUpRight className="w-3 h-3" />
        Kjøp
      </span>
    );
  } else if (type === "sell") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <ArrowDownRight className="w-3 h-3" />
        Salg
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
      Annet
    </span>
  );
}

export default async function InsiderTradesPage() {
  const [trades, stats, topInsiders] = await Promise.all([
    getInsiderTrades({ limit: 50 }),
    getInsiderStats(),
    getTopInsiders(10),
  ]);

  // Filter to insiders with actual names (not company names as fallback)
  const realInsiders = topInsiders.filter(
    (insider) => insider.name !== insider.companies[0] && insider.totalTrades > 1
  );

  return (
    <div>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight flex-shrink-0">
            Listr<span className="text-gray-400">.no</span>
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="font-medium">Innsidehandel</span>
          </div>
          <nav className="flex items-center gap-4 text-sm flex-shrink-0">
            <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Dashboard
            </Link>
            <Link href="/shortoversikt" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Shortposisjoner
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Innsidehandel</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Meldepliktige handler fra primærinnsidere i norske aksjer. Data fra Euronext Oslo.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.totalTrades}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Totalt handler</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {stats.buyCount}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Kjøp</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              {stats.sellCount}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Salg</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.otherCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Annet</div>
          </div>
        </div>

        {/* Top Insiders Card */}
        {realInsiders.length > 0 && (
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-950">
              <h2 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <User className="w-4 h-4" />
                Mest aktive innsidere
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {realInsiders.slice(0, 5).map((insider) => (
                <Link
                  key={insider.slug}
                  href={`/innsidehandel/${insider.slug}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div>
                    <span className="font-medium">{insider.name}</span>
                    <div className="text-xs text-gray-500">
                      {insider.companies.slice(0, 2).join(", ")}
                      {insider.companies.length > 2 && ` +${insider.companies.length - 2}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      <span className="text-green-600 dark:text-green-400">{insider.buyCount}</span>
                      {" / "}
                      <span className="text-red-600 dark:text-red-400">{insider.sellCount}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trades Table */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <h2 className="font-semibold">Siste handler</h2>
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
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">
                    Innsider
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Type
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                    Aksjer
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden xl:table-cell">
                    Verdi
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Kilde
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {trades.map((trade) => (
                  <tr
                    key={trade.messageId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm">
                      {formatDate(trade.tradeDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TradeTypeIcon type={trade.tradeType} />
                        {trade.companySlug ? (
                          <Link
                            href={`/${trade.companySlug}`}
                            className="font-medium truncate max-w-[200px] hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                          >
                            {trade.issuerName}
                          </Link>
                        ) : (
                          <span className="font-medium truncate max-w-[200px]">
                            {trade.issuerName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {trade.insiderName !== trade.issuerName ? (
                        <Link
                          href={`/innsidehandel/${trade.insiderSlug}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                        >
                          <div className="truncate max-w-[200px]">{trade.insiderName}</div>
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                      {trade.insiderRole && (
                        <div className="text-xs text-gray-400">{trade.insiderRole}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TradeTypeBadge type={trade.tradeType} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm hidden lg:table-cell">
                      {trade.shares ? formatNumber(trade.shares) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm hidden xl:table-cell">
                      {trade.totalValue ? formatNOK(trade.totalValue) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={trade.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data source note */}
        <p className="mt-4 text-sm text-gray-500 text-center">
          Data fra{" "}
          <a
            href="https://live.euronext.com/en/listview/company-press-releases/1061"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Euronext Oslo
          </a>
          . Oppdateres ved deploy.
        </p>
      </div>
    </div>
  );
}
