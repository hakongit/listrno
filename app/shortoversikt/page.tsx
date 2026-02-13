import { getShortData } from "@/lib/data";
import { formatPercent, formatNOK, formatDateShort } from "@/lib/utils";
import { ChangeIndicator } from "@/components/ui/change-indicator";
import Link from "next/link";
import { ShortTable } from "@/components/short-table";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Shortposisjoner - Listr",
  description: "Offentliggjorte shortposisjoner i norske aksjer. Data fra Finanstilsynet.",
  openGraph: {
    title: "Shortposisjoner - Listr",
    description: "Offentliggjorte shortposisjoner i norske aksjer",
  },
};

export default async function ShortOverviewPage() {
  const data = await getShortData();

  const allDates = data.companies.map(c => new Date(c.latestDate).getTime());
  const mostRecentDate = new Date(Math.max(...allDates));

  const uniqueDates = [...new Set(data.companies.map(c => c.latestDate))].sort().reverse();

  // Biggest increases (from most recent date with increases)
  let biggestIncreases: typeof data.companies = [];
  for (const dateStr of uniqueDates) {
    const companiesOnDate = data.companies.filter(c => c.latestDate === dateStr && c.change > 0);
    if (companiesOnDate.length > 0) {
      biggestIncreases = companiesOnDate.sort((a, b) => b.change - a.change).slice(0, 5);
      break;
    }
  }

  // Biggest decreases
  let biggestDecreases: typeof data.companies = [];
  for (const dateStr of uniqueDates) {
    const companiesOnDate = data.companies.filter(c => c.latestDate === dateStr && c.change < 0);
    if (companiesOnDate.length > 0) {
      biggestDecreases = companiesOnDate.sort((a, b) => a.change - b.change).slice(0, 5);
      break;
    }
  }

  const highestShorts = [...data.companies]
    .sort((a, b) => b.totalShortPct - a.totalShortPct)
    .slice(0, 5);

  const highestValue = [...data.companies]
    .filter((c) => c.shortValue && c.shortValue > 0)
    .sort((a, b) => (b.shortValue || 0) - (a.shortValue || 0))
    .slice(0, 5);

  const mostPositions = [...data.holders]
    .sort((a, b) => b.totalPositions - a.totalPositions)
    .slice(0, 5);

  const highestTotalShort = [...data.holders]
    .sort((a, b) => b.totalShortPct - a.totalShortPct)
    .slice(0, 5);

  const holdersWithValue = data.holders.map((holder) => ({
    ...holder,
    totalValue: holder.companies.reduce((sum, c) => sum + (c.positionValue || 0), 0),
  }));
  const highestHolderValue = [...holdersWithValue]
    .filter((h) => h.totalValue > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  const totalShortValue = data.companies.reduce((sum, c) => sum + (c.shortValue || 0), 0);

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
      {/* Hero */}
      <div className="pt-8 pb-6">
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight mb-1">
          Shortposisjoner i Norge
        </h1>
        <p
          className="text-[13px]"
          style={{ color: "var(--an-text-secondary)" }}
        >
          Offentliggjorte shortposisjoner i norske aksjer. Data fra Finanstilsynet.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          className="an-stat-accent rounded-lg p-3 sm:p-4 border"
          style={{ borderColor: "var(--an-border)" }}
        >
          <div
            className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5"
            style={{ color: "var(--an-accent)" }}
          >
            {data.totalCompanies}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Selskaper
          </div>
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5">
            {data.totalPositions}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Posisjoner
          </div>
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5 mono">
            {formatPercent(
              data.companies.reduce((sum, c) => sum + c.totalShortPct, 0) /
                data.companies.length
            )}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Snitt short
          </div>
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5 mono">
            {totalShortValue > 0 ? formatNOK(totalShortValue) : "-"}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Total verdi
          </div>
        </div>
      </div>

      {/* Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        {/* Biggest Increases */}
        <HighlightCard
          title="Størst økning"
          href="/topp/storst-okning"
          items={biggestIncreases.map((c) => ({
            key: c.isin,
            href: `/${c.slug}`,
            label: c.issuerName,
            value: <span style={{ color: "var(--an-red)" }}>+{c.change.toFixed(2)}%</span>,
          }))}
          emptyText="Ingen økninger registrert"
        />

        {/* Biggest Decreases */}
        <HighlightCard
          title="Størst nedgang"
          href="/topp/storst-nedgang"
          items={biggestDecreases.map((c) => ({
            key: c.isin,
            href: `/${c.slug}`,
            label: c.issuerName,
            value: <span style={{ color: "var(--an-green)" }}>{c.change.toFixed(2)}%</span>,
          }))}
          emptyText="Ingen nedganger registrert"
        />

        {/* Highest Shorts */}
        <HighlightCard
          title="Høyest short"
          href="/topp/hoyest-short"
          items={highestShorts.map((c) => ({
            key: c.isin,
            href: `/${c.slug}`,
            label: c.issuerName,
            value: <span style={{ color: "var(--an-red)" }}>{formatPercent(c.totalShortPct)}</span>,
          }))}
        />

        {/* Highest Value */}
        <HighlightCard
          title="Høyest verdi"
          href="/topp/hoyest-verdi"
          items={highestValue.map((c) => ({
            key: c.isin,
            href: `/${c.slug}`,
            label: c.issuerName,
            value: <span className="mono" style={{ color: "var(--an-text-secondary)" }}>{formatNOK(c.shortValue!)}</span>,
          }))}
          emptyText="Ingen verdier tilgjengelig"
        />
      </div>

      {/* Full Table */}
      <div className="mt-3">
        <ShortTable
          companies={data.companies.map((c) => ({
            isin: c.isin,
            slug: c.slug,
            issuerName: c.issuerName,
            totalShortPct: c.totalShortPct,
            change: c.change,
            previousDate: c.previousDate,
            shortValue: c.shortValue,
            latestDate: c.latestDate,
          }))}
        />
      </div>

      {/* Aktører section */}
      <div className="flex items-center justify-between pt-6 pb-3">
        <span
          className="text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--an-text-secondary)" }}
        >
          Aktører
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <HighlightCard
          title="Flest posisjoner"
          href="/topp/aktorer/flest-posisjoner"
          items={mostPositions.map((h) => ({
            key: h.slug,
            href: `/aktor/${h.slug}`,
            label: h.name,
            value: <span className="mono" style={{ color: "var(--an-text-secondary)" }}>{h.totalPositions}</span>,
          }))}
        />
        <HighlightCard
          title="Høyest total short"
          href="/topp/aktorer/hoyest-short"
          items={highestTotalShort.map((h) => ({
            key: h.slug,
            href: `/aktor/${h.slug}`,
            label: h.name,
            value: <span className="mono" style={{ color: "var(--an-red)" }}>{formatPercent(h.totalShortPct)}</span>,
          }))}
        />
        <HighlightCard
          title="Høyest verdi"
          href="/topp/aktorer/hoyest-verdi"
          items={highestHolderValue.map((h) => ({
            key: h.slug,
            href: `/aktor/${h.slug}`,
            label: h.name,
            value: <span className="mono" style={{ color: "var(--an-text-secondary)" }}>{formatNOK(h.totalValue)}</span>,
          }))}
          emptyText="Ingen verdier tilgjengelig"
        />
      </div>

      {/* Data source note */}
      <p
        className="text-[11px] text-center pb-6"
        style={{ color: "var(--an-text-muted)" }}
      >
        Data oppdateres hver time. Kilde:{" "}
        <a
          href="https://www.finanstilsynet.no/en/publications/short-selling-/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline transition-colors hover:text-[var(--an-accent)]"
        >
          Finanstilsynet
        </a>
      </p>
    </div>
  );
}

// Shared highlight card used for all top-list preview sections
function HighlightCard({
  title,
  href,
  items,
  emptyText,
}: {
  title: string;
  href: string;
  items: { key: string; href: string; label: string; value: React.ReactNode }[];
  emptyText?: string;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
    >
      <Link
        href={href}
        className="block px-3 sm:px-[18px] py-3 border-b transition-colors hover:bg-[var(--an-bg-hover)]"
        style={{ borderColor: "var(--an-border)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
          <span style={{ color: "var(--an-text-secondary)" }}>{title}</span>
          <span style={{ color: "var(--an-text-muted)" }}>→</span>
        </span>
      </Link>
      <div>
        {items.length > 0 ? (
          items.map((item, i) => (
            <Link
              key={item.key}
              href={item.href}
              className="an-table-row flex items-center justify-between px-3 sm:px-[18px] py-2.5 transition-colors"
              style={{
                borderBottom: i < items.length - 1
                  ? "1px solid var(--an-border-subtle)"
                  : "none",
              }}
            >
              <span
                className="text-[13px] truncate mr-3"
                style={{ color: "var(--an-text-primary)" }}
                title={item.label}
              >
                {item.label}
              </span>
              <span className="text-[13px] font-medium shrink-0 mono">
                {item.value}
              </span>
            </Link>
          ))
        ) : (
          <div
            className="px-3 sm:px-[18px] py-3 text-[13px]"
            style={{ color: "var(--an-text-muted)" }}
          >
            {emptyText || "Ingen data"}
          </div>
        )}
      </div>
    </div>
  );
}
