"use client";

import { SearchableTable } from "./searchable-table";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Minus, ExternalLink } from "lucide-react";

interface TradeRow {
  messageId: string;
  issuerName: string;
  companySlug: string | null;
  insiderName: string;
  insiderSlug: string | null;
  insiderRole: string | null;
  tradeType: string;
  tradeDate: string;
  shares: number | null;
  totalValue: number | null;
  sourceUrl: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatNumber(num: number): string {
  return num.toLocaleString("nb-NO");
}

function formatNOK(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} mrd`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mill`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} k`;
  return value.toFixed(0);
}

function TradeTypeIcon({ type }: { type: string }) {
  if (type === "buy") {
    return <ArrowUpRight className="w-4 h-4 text-green-500" aria-hidden="true" />;
  } else if (type === "sell") {
    return <ArrowDownRight className="w-4 h-4 text-red-500" aria-hidden="true" />;
  }
  return <Minus className="w-4 h-4 text-gray-400" aria-hidden="true" />;
}

function TradeTypeBadge({ type }: { type: string }) {
  if (type === "buy") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
        Kjøp
      </span>
    );
  } else if (type === "sell") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <ArrowDownRight className="w-3 h-3" aria-hidden="true" />
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

export function InsiderTable({ trades }: { trades: TradeRow[] }) {
  const searchableData = trades.map(
    (t) => `${t.issuerName} ${t.insiderName} ${t.tradeType === "buy" ? "kjøp" : t.tradeType === "sell" ? "salg" : ""}`
  );

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <h2 className="font-semibold">Siste handler</h2>
      </div>
      <SearchableTable
        searchableData={searchableData}
        placeholder="Søk etter selskap, innsider..."
        totalLabel="handler"
        pageSize={30}
      >
        {(filteredIndices) => (
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Innsidehandler i norske aksjer">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Dato
                  </th>
                  <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Selskap
                  </th>
                  <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">
                    Innsider
                  </th>
                  <th scope="col" className="text-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Type
                  </th>
                  <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                    Aksjer
                  </th>
                  <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden xl:table-cell">
                    Verdi
                  </th>
                  <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <span className="sr-only">Kilde</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredIndices.map((idx) => {
                  const trade = trades[idx];
                  return (
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
                              className="font-medium truncate max-w-[150px] sm:max-w-[200px] hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                              title={trade.issuerName}
                            >
                              {trade.issuerName}
                            </Link>
                          ) : (
                            <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]" title={trade.issuerName}>
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
                            <div className="truncate max-w-[150px] sm:max-w-[200px]" title={trade.insiderName}>
                              {trade.insiderName}
                            </div>
                          </Link>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                        {trade.insiderRole && (
                          <div className="text-xs text-gray-500">{trade.insiderRole}</div>
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
                          aria-label={`Kilde for ${trade.issuerName} handel`}
                        >
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {filteredIndices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Ingen handler funnet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SearchableTable>
    </div>
  );
}
