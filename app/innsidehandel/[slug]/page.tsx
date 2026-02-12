import { getInsiderPerson, getInsiderTradesByPerson } from "@/lib/insider-data";
import { formatDate, formatNumber, formatNOK, slugify } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Twitter,
  Banknote,
} from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const insider = await getInsiderPerson(slug);

  if (!insider) {
    return { title: "Ikke funnet - Listr" };
  }

  return {
    title: `${insider.name} - Innsidehandel | Listr`,
    description: `Se alle innsidehandler fra ${insider.name}. ${insider.totalTrades} handler i ${insider.companies.length} selskaper.`,
    openGraph: {
      title: `${insider.name} - Innsidehandel`,
      description: `${insider.totalTrades} handler i ${insider.companies.length} selskaper`,
    },
  };
}

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

export default async function InsiderDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [insider, trades] = await Promise.all([
    getInsiderPerson(slug),
    getInsiderTradesByPerson(slug),
  ]);

  if (!insider) {
    notFound();
  }

  // Calculate total buy and sell values
  const totalBuyValue = trades
    .filter(t => t.tradeType === "buy" && t.totalValue)
    .reduce((sum, t) => sum + (t.totalValue || 0), 0);
  const totalSellValue = trades
    .filter(t => t.tradeType === "sell" && t.totalValue)
    .reduce((sum, t) => sum + (t.totalValue || 0), 0);

  // Build map of company name -> slug for linking
  // Use companySlug if available, otherwise generate from issuer name
  const companySlugMap = new Map<string, string>();
  for (const trade of trades) {
    if (!companySlugMap.has(trade.issuerName)) {
      companySlugMap.set(trade.issuerName, trade.companySlug || slugify(trade.issuerName));
    }
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="mb-6">
          <div className="flex items-start gap-4">
            {insider.twitterAvatarUrl && (
              <Image
                src={insider.twitterAvatarUrl}
                alt={insider.name}
                width={64}
                height={64}
                className="rounded-full bg-gray-200 dark:bg-gray-800"
              />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{insider.name}</h1>
              <div className="flex items-center gap-3">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Innsidehandler i {insider.companies.length} selskap{insider.companies.length !== 1 ? "er" : ""}
                </p>
                {insider.twitterHandle && (
                  <a
                    href={`https://x.com/${insider.twitterHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Twitter className="w-4 h-4" />
                    @{insider.twitterHandle}
                  </a>
                )}
              </div>
            </div>
          </div>
          {insider.bio && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">{insider.bio}</p>
            </div>
          )}
        </div>

        {/* Stats - compact on mobile, grid on desktop */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-6 md:hidden">
          <span><strong>{insider.totalTrades}</strong> handler</span>
          <span className="text-green-600 dark:text-green-400">
            <strong>{insider.buyCount}</strong> kjøp{totalBuyValue > 0 && ` · ${formatNOK(totalBuyValue)}`}
          </span>
          <span className="text-red-600 dark:text-red-400">
            <strong>{insider.sellCount}</strong> salg{totalSellValue > 0 && ` · ${formatNOK(totalSellValue)}`}
          </span>
          <span><strong>{insider.companies.length}</strong> selskap{insider.companies.length !== 1 ? "er" : ""}</span>
        </div>
        <div className="hidden md:grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-2xl font-bold">{insider.totalTrades}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Handler</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {insider.buyCount}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Kjøp{totalBuyValue > 0 && <span className="ml-1">· {formatNOK(totalBuyValue)}</span>}
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              {insider.sellCount}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Salg{totalSellValue > 0 && <span className="ml-1">· {formatNOK(totalSellValue)}</span>}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              {insider.companies.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Selskaper</div>
          </div>
        </div>

        {/* Companies */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <h2 className="font-semibold">Selskaper</h2>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {insider.companies.map((company) => {
              const slug = companySlugMap.get(company) || slugify(company);
              return (
                <Link
                  key={company}
                  href={`/${slug}`}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  {company}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Trades Table */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <h2 className="font-semibold">Alle handler</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left px-2 sm:px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Dato
                  </th>
                  <th className="text-left px-2 sm:px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Selskap
                  </th>
                  <th className="text-center px-2 sm:px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-right px-2 sm:px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">
                    Aksjer
                  </th>
                  <th className="text-right px-2 sm:px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                    Pris
                  </th>
                  <th className="text-right px-2 sm:px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Verdi
                  </th>
                  <th className="text-right px-2 sm:px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">
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
                    <td className="px-2 sm:px-4 py-2 text-sm">
                      {formatDate(trade.tradeDate)}
                    </td>
                    <td className="px-2 sm:px-4 py-2">
                      <div className="flex items-center gap-1">
                        <TradeTypeIcon type={trade.tradeType} />
                        {trade.companySlug ? (
                          <Link
                            href={`/${trade.companySlug}`}
                            className="font-medium truncate max-w-[120px] sm:max-w-[200px] hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-sm"
                          >
                            {trade.issuerName}
                          </Link>
                        ) : (
                          <span className="font-medium truncate max-w-[120px] sm:max-w-[200px] text-sm">
                            {trade.issuerName}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 ml-5 font-mono">
                        {trade.shares ? formatNumber(trade.shares) : "?"} @ {trade.price ? trade.price.toFixed(2) : "?"}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 text-center hidden sm:table-cell">
                      <TradeTypeBadge type={trade.tradeType} />
                    </td>
                    <td className="px-2 sm:px-4 py-2 text-right font-mono text-sm hidden md:table-cell">
                      {trade.shares ? formatNumber(trade.shares) : "-"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 text-right font-mono text-sm hidden lg:table-cell">
                      {trade.price ? `${trade.currency} ${trade.price.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 text-right font-mono text-sm whitespace-nowrap">
                      {trade.totalValue ? `${trade.currency} ${formatNOK(trade.totalValue)}` : "-"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 text-right hidden sm:table-cell">
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
        </p>

        {/* AI disclaimer - only show if bio is present */}
        {insider.bio && (
          <p className="mt-2 text-xs text-gray-400 text-center">
            Biografier er AI-generert og kan inneholde feil.
          </p>
        )}
      </div>
    </div>
  );
}
