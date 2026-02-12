import { getCompanyBySlug } from "@/lib/data";
import { getCompanyInsiderTrades } from "@/lib/insider-data";
import { getCachedPublicAnalystReports, initializeAnalystDatabase } from "@/lib/analyst-db";
import { getTicker } from "@/lib/tickers";
import { fetchStockQuotes, StockQuote } from "@/lib/prices";
import { formatPercent, formatNumber, formatDate, slugify, formatNOK, formatVolume } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, TrendingDown, Briefcase, Calendar, Users, TrendingUp, Banknote, Home, ArrowUpRight, ArrowDownRight, ExternalLink, BarChart2, Activity, Building2, FileText } from "lucide-react";
import type { Metadata } from "next";
import { LazyShortChart } from "@/components/lazy-short-chart";
import { Logo } from "@/components/logo";

export const revalidate = 3600; // Cache for 1 hour

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticker } = await params;
  const [company, insiderTrades] = await Promise.all([
    getCompanyBySlug(ticker),
    getCompanyInsiderTrades(ticker),
  ]);

  // Company with short positions
  if (company) {
    return {
      title: `${company.issuerName} - Shortposisjoner | Listr`,
      description: `Se alle shortposisjoner i ${company.issuerName}. Total short: ${formatPercent(company.totalShortPct)}. ${company.positions.length} aktive posisjoner.`,
      openGraph: {
        title: `${company.issuerName} - Shortposisjoner`,
        description: `Total short: ${formatPercent(company.totalShortPct)} fra ${company.positions.length} aktører`,
      },
    };
  }

  // Company with only insider trades
  if (insiderTrades.length > 0) {
    const companyName = insiderTrades[0].issuerName;
    return {
      title: `${companyName} - Innsidehandel | Listr`,
      description: `Se innsidehandler i ${companyName}. ${insiderTrades.length} handler registrert.`,
      openGraph: {
        title: `${companyName} - Innsidehandel`,
        description: `${insiderTrades.length} innsidehandler registrert`,
      },
    };
  }

  return { title: "Ikke funnet - Listr" };
}


export default async function CompanyPage({ params }: PageProps) {
  const { ticker } = await params;
  const [company, insiderTrades] = await Promise.all([
    getCompanyBySlug(ticker),
    getCompanyInsiderTrades(ticker),
  ]);

  // No data at all - 404
  if (!company && insiderTrades.length === 0) {
    notFound();
  }

  // Ensure analyst tables exist and get reports for this company
  await initializeAnalystDatabase();
  const companyName = company?.issuerName || insiderTrades[0]?.issuerName;
  const companyIsin = company?.isin || insiderTrades[0]?.isin;
  const analystReports = await getCachedPublicAnalystReports({
    limit: 5,
    companyIsin: companyIsin || undefined,
  });

  // Company with short positions data
  if (company) {
    const history = company.history;
    const hasHistory = history.length >= 2;
    const firstPoint = history[0];
    const lastPoint = history[history.length - 1];
    const change = hasHistory ? lastPoint.totalShortPct - firstPoint.totalShortPct : 0;
    const changePositive = change > 0;

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
              <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="font-medium truncate">{company.issuerName}</span>
              {company.ticker && (
                <span className="text-xs text-gray-500 font-mono">
                  {company.ticker.replace(".OL", "")}
                </span>
              )}
              <span
                className={`font-mono font-bold ${
                  company.totalShortPct >= 5
                    ? "text-red-600 dark:text-red-400"
                    : company.totalShortPct >= 2
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {formatPercent(company.totalShortPct)}
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
              {company.regularMarketVolume && (
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-purple-500" />
                  <span className="font-medium font-mono">{formatVolume(company.regularMarketVolume)}</span>
                  <span className="text-gray-500">volum</span>
                </div>
              )}
              {company.fiftyTwoWeekLow !== null && company.fiftyTwoWeekHigh !== null && (
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <span className="font-medium font-mono">
                    {company.fiftyTwoWeekLow.toFixed(2)} - {company.fiftyTwoWeekHigh.toFixed(2)}
                  </span>
                  <span className="text-gray-500">52-uke</span>
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
              {company.ticker && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="font-mono text-gray-500">{company.ticker.replace(".OL", "")}</span>
                  <span className="text-gray-400">Oslo Børs</span>
                </div>
              )}
            </div>

        {/* Historical Chart */}
        {company.history.length > 1 && (
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-4">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
              <h2 className="font-semibold text-sm">Historikk</h2>
              <span className="text-xs text-gray-500">{company.history.length} datapunkter</span>
            </div>
            <div className="p-3">
              <LazyShortChart history={company.history} companyName={company.issuerName} />
            </div>
          </div>
        )}

        {/* Positions table */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <h2 className="font-semibold text-sm">Posisjoner</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label={`Shortposisjoner i ${company.issuerName}`}>
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th scope="col" className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                    Posisjonsholder
                  </th>
                  <th scope="col" className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                    Posisjon
                  </th>
                  <th scope="col" className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    Aksjer
                  </th>
                  <th scope="col" className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                    Verdi
                  </th>
                  <th scope="col" className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
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

        {/* Company Info */}
        {company.ticker && (
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mt-4">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <h2 className="font-semibold text-sm">Selskapsinfo</h2>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Ticker</div>
                <div className="font-mono font-medium">{company.ticker.replace(".OL", "")}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Markedsplass</div>
                <div className="font-medium">Oslo Børs</div>
              </div>
              {company.stockPrice && (
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Aksjekurs</div>
                  <div className="font-mono font-medium">{company.stockPrice.toFixed(2)} NOK</div>
                </div>
              )}
              <div>
                <div className="text-gray-500 dark:text-gray-400">ISIN</div>
                <div className="font-mono text-xs">{company.isin}</div>
              </div>
            </div>
          </div>
        )}

        {/* Insider Trades Section */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mt-4">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-950 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Innsidehandel
            </h2>
            <Link
              href="/innsidehandel"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Se alle
            </Link>
          </div>
          {insiderTrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                      Dato
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                      Innsider
                    </th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                      Type
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                      Aksjer
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                      Kilde
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {insiderTrades.slice(0, 5).map((trade) => (
                    <tr
                      key={trade.messageId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <td className="px-3 py-2 text-gray-500">
                        {formatDate(trade.tradeDate)}
                      </td>
                      <td className="px-3 py-2">
                        {trade.insiderName !== trade.issuerName ? (
                          <Link
                            href={`/innsidehandel/${trade.insiderSlug}`}
                            className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline truncate block max-w-[150px]"
                          >
                            {trade.insiderName}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        {trade.insiderRole && (
                          <div className="text-xs text-gray-500">{trade.insiderRole}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {trade.tradeType === "buy" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <ArrowUpRight className="w-3 h-3" />
                            Kjøp
                          </span>
                        ) : trade.tradeType === "sell" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            <ArrowDownRight className="w-3 h-3" />
                            Salg
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            Annet
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-500 hidden sm:table-cell">
                        {trade.shares ? formatNumber(trade.shares) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <a
                          href={trade.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          <span className="sr-only">Vis kilde</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Ingen innsidehandler registrert</p>
            </div>
          )}
        </div>

        {/* Analyst Reports Section */}
        {analystReports.length > 0 && (
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mt-4">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-purple-50 dark:bg-purple-950 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-purple-900 dark:text-purple-100 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Analytikerrapporter
              </h2>
              <Link
                href="/analyser"
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
              >
                Se alle
              </Link>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {analystReports.map((report) => (
                <div
                  key={report.recommendationId}
                  className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{report.investmentBank || "Ukjent bank"}</div>
                      {report.summary && (
                        <div className="text-xs text-gray-500 truncate max-w-sm mt-0.5">{report.summary}</div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      {report.recommendation && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          report.recommendation === "buy" || report.recommendation === "overweight" || report.recommendation === "outperform"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : report.recommendation === "sell" || report.recommendation === "underweight" || report.recommendation === "underperform"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}>
                          {report.recommendation === "buy" ? "Kjøp" :
                           report.recommendation === "sell" ? "Selg" :
                           report.recommendation === "hold" ? "Hold" :
                           report.recommendation}
                        </span>
                      )}
                      {report.targetPrice && (
                        <div className="font-mono text-sm mt-0.5">
                          {formatNumber(report.targetPrice)} {report.targetCurrency}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

  // Company with only insider trades (no short positions)
  const insiderOnlyCompanyName = insiderTrades[0].issuerName;
  const isin = insiderTrades[0].isin;

  // Try to get ticker from trades or look it up
  let tickerSymbol = insiderTrades[0].ticker;
  if (!tickerSymbol && isin) {
    tickerSymbol = getTicker(isin, insiderOnlyCompanyName);
  }
  if (!tickerSymbol) {
    tickerSymbol = getTicker("", insiderOnlyCompanyName);
  }

  // Fetch stock data if we have a ticker
  let stockQuote: StockQuote | null = null;
  if (tickerSymbol) {
    const quotes = await fetchStockQuotes([tickerSymbol]);
    stockQuote = quotes.get(tickerSymbol) || null;
  }

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
            <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="font-medium truncate">{insiderOnlyCompanyName}</span>
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
        {/* Company title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{insiderOnlyCompanyName}</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Ingen aktive shortposisjoner registrert
          </p>
        </div>

        {/* Company Info */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-4">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <h2 className="font-semibold text-sm">Selskapsinfo</h2>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {tickerSymbol && (
              <>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Ticker</div>
                  <div className="font-mono font-medium">{tickerSymbol.replace(".OL", "")}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Markedsplass</div>
                  <div className="font-medium">Oslo Børs</div>
                </div>
              </>
            )}
            {stockQuote?.price && (
              <div>
                <div className="text-gray-500 dark:text-gray-400">Aksjekurs</div>
                <div className="font-mono font-medium">{stockQuote.price.toFixed(2)} NOK</div>
              </div>
            )}
            {stockQuote?.fiftyTwoWeekLow && stockQuote?.fiftyTwoWeekHigh && (
              <div>
                <div className="text-gray-500 dark:text-gray-400">52-uke</div>
                <div className="font-mono font-medium">{stockQuote.fiftyTwoWeekLow.toFixed(2)} - {stockQuote.fiftyTwoWeekHigh.toFixed(2)}</div>
              </div>
            )}
            {isin && (
              <div>
                <div className="text-gray-500 dark:text-gray-400">ISIN</div>
                <div className="font-mono text-xs">{isin}</div>
              </div>
            )}
            {!tickerSymbol && !isin && (
              <div className="col-span-2 text-gray-400">
                Ingen markedsdata tilgjengelig
              </div>
            )}
          </div>
        </div>

        {/* Insider Trades Section */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-950 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Innsidehandel ({insiderTrades.length} handler)
            </h2>
            <Link
              href="/innsidehandel"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Se alle
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                    Dato
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                    Innsider
                  </th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                    Type
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                    Verdi
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    Kilde
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {insiderTrades.map((trade) => (
                  <tr
                    key={trade.messageId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-3 py-2 text-gray-500">
                      {formatDate(trade.tradeDate)}
                    </td>
                    <td className="px-3 py-2">
                      {trade.insiderName !== trade.issuerName ? (
                        <Link
                          href={`/innsidehandel/${trade.insiderSlug}`}
                          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline truncate block max-w-[150px]"
                        >
                          {trade.insiderName}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                      {trade.insiderRole && (
                        <div className="text-xs text-gray-500">{trade.insiderRole}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {trade.tradeType === "buy" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <ArrowUpRight className="w-3 h-3" />
                          Kjøp
                        </span>
                      ) : trade.tradeType === "sell" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <ArrowDownRight className="w-3 h-3" />
                          Salg
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          Annet
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm">
                      {trade.totalValue ? formatNOK(trade.totalValue) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right hidden sm:table-cell">
                      <a
                        href={trade.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
      </div>
    </div>
  );
}
