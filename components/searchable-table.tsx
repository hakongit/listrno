"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";

interface SearchableTableProps {
  children: (filteredIndices: number[], query: string) => React.ReactNode;
  searchableData: string[];
  pageSize?: number;
  placeholder?: string;
  totalLabel?: string;
}

export function SearchableTable({
  children,
  searchableData,
  pageSize = 50,
  placeholder = "Søk...",
  totalLabel = "resultater",
}: SearchableTableProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filteredIndices = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return searchableData.map((_, i) => i);
    return searchableData
      .map((text, i) => ({ text, i }))
      .filter(({ text }) => text.toLowerCase().includes(q))
      .map(({ i }) => i);
  }, [query, searchableData]);

  const totalPages = Math.ceil(filteredIndices.length / pageSize);
  const pagedIndices = filteredIndices.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(0);
  };

  return (
    <div>
      {/* Search bar */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label={placeholder}
          />
        </div>
        <div className="mt-1 text-xs text-gray-500" aria-live="polite">
          {filteredIndices.length} {totalLabel}
          {query && ` for "${query}"`}
        </div>
      </div>

      {/* Table content */}
      {children(pagedIndices, query)}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            aria-label="Forrige side"
          >
            Forrige
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Side {page + 1} av {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            aria-label="Neste side"
          >
            Neste
          </button>
        </div>
      )}
    </div>
  );
}
