"use client";

import { useState, useMemo } from "react";

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
      <div
        className="px-3 sm:px-[18px] py-3 border-b"
        style={{ borderColor: "var(--an-border)" }}
      >
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--an-text-muted)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-4 py-2 text-[13px] rounded-lg border focus:outline-none focus:border-[var(--an-accent)] transition-colors"
            style={{
              background: "var(--an-bg-raised)",
              borderColor: "var(--an-border)",
              color: "var(--an-text-primary)",
            }}
            aria-label={placeholder}
          />
        </div>
        <div
          className="mt-1.5 text-[11px]"
          style={{ color: "var(--an-text-muted)" }}
          aria-live="polite"
        >
          {filteredIndices.length} {totalLabel}
          {query && ` for "${query}"`}
        </div>
      </div>

      {/* Table content */}
      {children(pagedIndices, query)}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="px-3 sm:px-[18px] py-3 border-t flex items-center justify-between"
          style={{ borderColor: "var(--an-border)" }}
        >
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-[12px] rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderColor: "var(--an-border)",
              color: "var(--an-text-secondary)",
            }}
            aria-label="Forrige side"
          >
            Forrige
          </button>
          <span
            className="text-[12px]"
            style={{ color: "var(--an-text-muted)" }}
          >
            Side {page + 1} av {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-[12px] rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderColor: "var(--an-border)",
              color: "var(--an-text-secondary)",
            }}
            aria-label="Neste side"
          >
            Neste
          </button>
        </div>
      )}
    </div>
  );
}
