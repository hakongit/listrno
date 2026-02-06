"use client";

import { SearchableTable } from "./searchable-table";
import Link from "next/link";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface CompanyRow {
  isin: string;
  slug: string;
  issuerName: string;
  totalShortPct: number;
  change: number;
  previousDate: string | null;
  shortValue: number | null;
  latestDate: string;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)} %`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatNOK(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} mrd`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mill`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} k`;
  return value.toFixed(0);
}

function ChangeIndicator({ change, previousDate }: { change: number; previousDate: string | null }) {
  const dateStr = previousDate ? formatDate(previousDate) : null;

  if (change > 0.01) {
    return (
      <span className="inline-flex items-center gap-1 text-red-500 text-xs">
        <TrendingUp className="w-3 h-3" aria-hidden="true" />
        <span>+{change.toFixed(2)}</span>
        {dateStr && <span className="text-gray-500 hidden lg:inline">({dateStr})</span>}
      </span>
    );
  } else if (change < -0.01) {
    return (
      <span className="inline-flex items-center gap-1 text-green-500 text-xs">
        <TrendingDown className="w-3 h-3" aria-hidden="true" />
        <span>{change.toFixed(2)}</span>
        {dateStr && <span className="text-gray-500 hidden lg:inline">({dateStr})</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-gray-500 text-xs">
      <Minus className="w-3 h-3" aria-hidden="true" />
    </span>
  );
}

export function ShortTable({ companies }: { companies: CompanyRow[] }) {
  const searchableData = companies.map((c) => c.issuerName);

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <h2 className="font-semibold">Alle selskaper</h2>
      </div>
      <SearchableTable
        searchableData={searchableData}
        placeholder="Søk etter selskap..."
        totalLabel="selskaper"
      >
        {(filteredIndices) => (
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Shortposisjoner for alle selskaper">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Selskap
                  </th>
                  <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total short
                  </th>
                  <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    Endring
                  </th>
                  <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">
                    Verdi (NOK)
                  </th>
                  <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                    Sist oppdatert
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredIndices.map((idx) => {
                  const company = companies[idx];
                  return (
                    <tr
                      key={company.isin}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/${company.slug}`} className="flex items-center gap-2 hover:underline">
                          <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden="true" />
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
                  );
                })}
                {filteredIndices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Ingen selskaper funnet
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
