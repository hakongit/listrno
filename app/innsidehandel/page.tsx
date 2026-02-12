import { getInsiderTrades, getInsiderStats, getTopInsiders } from "@/lib/insider-data";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Home,
  ChevronRight,
  User,
  ArrowRight,
} from "lucide-react";
import { InsiderTable } from "@/components/insider-table";
import { Logo } from "@/components/logo";
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

export default async function InsiderTradesPage() {
  const [trades, stats, topInsiders] = await Promise.all([
    getInsiderTrades({ limit: 200 }),
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
          <Link href="/" className="flex-shrink-0">
            <Logo />
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
            <Link href="/analyser" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Analyser
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

        {/* Trades Table with Search & Pagination */}
        <InsiderTable
          trades={trades.map((t) => ({
            messageId: t.messageId,
            issuerName: t.issuerName,
            companySlug: t.companySlug,
            insiderName: t.insiderName,
            insiderSlug: t.insiderSlug,
            insiderRole: t.insiderRole,
            tradeType: t.tradeType,
            tradeDate: t.tradeDate,
            shares: t.shares,
            totalValue: t.totalValue,
            sourceUrl: t.sourceUrl,
          }))}
        />

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
