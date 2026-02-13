import { getInsiderTrades, getInsiderStats, getTopInsiders } from "@/lib/insider-data";
import Link from "next/link";
import { InsiderTable } from "@/components/insider-table";
import type { Metadata } from "next";
import { formatDateShort } from "@/lib/utils";

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

  const realInsiders = topInsiders.filter(
    (insider) => insider.name !== insider.companies[0] && insider.totalTrades > 1
  );

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
      {/* Hero */}
      <div className="pt-8 pb-6">
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight mb-1">
          Innsidehandel
        </h1>
        <p
          className="text-[13px]"
          style={{ color: "var(--an-text-secondary)" }}
        >
          Meldepliktige handler fra primærinnsidere i norske aksjer
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
            {stats.totalTrades}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Totalt handler
          </div>
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div
            className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5"
            style={{ color: "var(--an-green)" }}
          >
            {stats.buyCount}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Kjøp
          </div>
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div
            className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5"
            style={{ color: "var(--an-red)" }}
          >
            {stats.sellCount}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Salg
          </div>
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5">
            {stats.otherCount}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Annet
          </div>
        </div>
      </div>

      {/* Top Insiders */}
      {realInsiders.length > 0 && (
        <div
          className="rounded-lg overflow-hidden border mt-3"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div
            className="px-3 sm:px-[18px] py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--an-border)" }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Mest aktive innsidere
            </span>
          </div>
          <div>
            {realInsiders.slice(0, 5).map((insider, i) => (
              <Link
                key={insider.slug}
                href={`/innsidehandel/${insider.slug}`}
                className="an-table-row flex items-center justify-between px-3 sm:px-[18px] py-3 transition-colors"
                style={{
                  borderBottom: i < Math.min(realInsiders.length, 5) - 1
                    ? "1px solid var(--an-border-subtle)"
                    : "none",
                }}
              >
                <div className="min-w-0">
                  <div
                    className="text-[13px] font-medium truncate"
                    style={{ color: "var(--an-text-primary)" }}
                  >
                    {insider.name}
                  </div>
                  <div
                    className="text-[11px] truncate"
                    style={{ color: "var(--an-text-muted)" }}
                  >
                    {insider.companies.slice(0, 2).join(", ")}
                    {insider.companies.length > 2 && ` +${insider.companies.length - 2}`}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="text-[13px]">
                    <span style={{ color: "var(--an-green)" }}>{insider.buyCount}</span>
                    <span style={{ color: "var(--an-text-muted)" }} className="mx-1">/</span>
                    <span style={{ color: "var(--an-red)" }}>{insider.sellCount}</span>
                  </div>
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--an-text-muted)" }}
                  >
                    {formatDateShort(insider.latestTrade)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trades Table */}
      <div className="mt-3 mb-6">
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
      </div>

      {/* Data source note */}
      <p
        className="text-[11px] text-center pb-6"
        style={{ color: "var(--an-text-muted)" }}
      >
        Data fra{" "}
        <a
          href="https://live.euronext.com/en/listview/company-press-releases/1061"
          target="_blank"
          rel="noopener noreferrer"
          className="underline transition-colors hover:text-[var(--an-accent)]"
        >
          Euronext Oslo
        </a>
      </p>
    </div>
  );
}
