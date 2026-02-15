"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  name: string;
  slug: string;
  ticker: string | null;
  type: string;
}

export function CompanySearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allCompanies, setAllCompanies] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch companies on first open
  const fetchCompanies = useCallback(async () => {
    if (allCompanies.length > 0) return;
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setAllCompanies(data);
      }
    } catch {
      // silently fail
    }
  }, [allCompanies.length]);

  // Filter results as query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }
    const q = query.toLowerCase();
    const filtered = allCompanies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.ticker && c.ticker.toLowerCase().includes(q))
    );
    setResults(filtered.slice(0, 8));
    setSelectedIndex(0);
  }, [query, allCompanies]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        fetchCompanies();
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [fetchCompanies]);

  function navigate(result: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(result.slug);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Collapsed: search button */}
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            fetchCompanies();
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="flex items-center gap-1.5 text-[13px] px-2.5 py-1.5 rounded-[5px] transition-colors"
          style={{ color: "var(--an-text-muted)" }}
          aria-label="Søk etter selskap"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="hidden sm:inline">Søk</span>
          <kbd
            className="hidden sm:inline-flex items-center text-[10px] mono px-1.5 py-0.5 rounded border"
            style={{
              color: "var(--an-text-muted)",
              borderColor: "var(--an-border)",
              background: "var(--an-bg-main)",
            }}
          >
            ⌘K
          </kbd>
        </button>
      )}

      {/* Expanded: search input + dropdown */}
      {open && (
        <div className="flex items-center">
          <div
            className="flex items-center rounded-[5px] border px-2.5 py-1"
            style={{
              background: "var(--an-bg-main)",
              borderColor: "var(--an-border)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--an-text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Søk selskap..."
              className="bg-transparent outline-none text-[13px] ml-2 w-[140px] sm:w-[200px]"
              style={{ color: "var(--an-text-primary)" }}
            />
          </div>

          {/* Results dropdown */}
          {results.length > 0 && (
            <div
              className="absolute top-full right-0 mt-1 w-[280px] sm:w-[320px] rounded-lg border overflow-hidden shadow-xl z-50"
              style={{
                background: "var(--an-bg-surface)",
                borderColor: "var(--an-border)",
              }}
            >
              {results.map((result, i) => (
                <button
                  key={result.slug}
                  onClick={() => navigate(result)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors"
                  style={{
                    background: i === selectedIndex ? "var(--an-bg-main)" : "transparent",
                    borderBottom: i < results.length - 1 ? "1px solid var(--an-border-subtle)" : "none",
                  }}
                >
                  <span
                    className="text-[13px] font-medium truncate"
                    style={{ color: "var(--an-text-primary)" }}
                  >
                    {result.name}
                  </span>
                  {result.ticker && (
                    <span
                      className="text-[11px] mono shrink-0"
                      style={{ color: "var(--an-text-muted)" }}
                    >
                      {result.ticker}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {query.trim().length > 0 && results.length === 0 && allCompanies.length > 0 && (
            <div
              className="absolute top-full right-0 mt-1 w-[280px] sm:w-[320px] rounded-lg border overflow-hidden shadow-xl z-50 px-3 py-4 text-center text-[13px]"
              style={{
                background: "var(--an-bg-surface)",
                borderColor: "var(--an-border)",
                color: "var(--an-text-muted)",
              }}
            >
              Ingen treff
            </div>
          )}
        </div>
      )}
    </div>
  );
}
