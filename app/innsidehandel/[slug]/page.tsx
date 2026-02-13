import { getInsiderPerson, getInsiderTradesByPerson } from "@/lib/insider-data";
import { formatNumber, formatNOK, slugify, formatDateShort } from "@/lib/utils";
import { TradeTypeBadge } from "@/components/ui/trade-type-badge";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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

export default async function InsiderDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [insider, trades] = await Promise.all([
    getInsiderPerson(slug),
    getInsiderTradesByPerson(slug),
  ]);

  if (!insider) {
    notFound();
  }

  const totalBuyValue = trades
    .filter(t => t.tradeType === "buy" && t.totalValue)
    .reduce((sum, t) => sum + (t.totalValue || 0), 0);
  const totalSellValue = trades
    .filter(t => t.tradeType === "sell" && t.totalValue)
    .reduce((sum, t) => sum + (t.totalValue || 0), 0);

  const companySlugMap = new Map<string, string>();
  for (const trade of trades) {
    if (!companySlugMap.has(trade.issuerName)) {
      companySlugMap.set(trade.issuerName, trade.companySlug || slugify(trade.issuerName));
    }
  }

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
      {/* Hero */}
      <div className="pt-8 pb-6">
        <div
          className="text-[11px] font-medium mb-2"
          style={{ color: "var(--an-text-muted)" }}
        >
          <Link
            href="/innsidehandel"
            className="transition-colors hover:text-[var(--an-accent)]"
          >
            Innsidehandel
          </Link>
          <span className="mx-1.5">/</span>
          <span style={{ color: "var(--an-text-secondary)" }}>Profil</span>
        </div>
        <div className="flex items-start gap-4">
          {insider.twitterAvatarUrl && (
            <Image
              src={insider.twitterAvatarUrl}
              alt={insider.name}
              width={56}
              height={56}
              className="rounded-full"
              style={{ background: "var(--an-bg-raised)" }}
            />
          )}
          <div className="flex-1">
            <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight mb-1">
              {insider.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="text-[13px]"
                style={{ color: "var(--an-text-secondary)" }}
              >
                Innsidehandler i {insider.companies.length} selskap{insider.companies.length !== 1 ? "er" : ""}
              </span>
              {insider.twitterHandle && (
                <a
                  href={`https://x.com/${insider.twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium transition-colors hover:text-[var(--an-accent)]"
                  style={{ color: "var(--an-text-muted)" }}
                >
                  @{insider.twitterHandle}
                </a>
              )}
            </div>
          </div>
        </div>
        {insider.bio && (
          <div
            className="mt-4 p-4 rounded-lg text-[13px]"
            style={{
              background: "var(--an-bg-surface)",
              color: "var(--an-text-secondary)",
            }}
          >
            {insider.bio}
          </div>
        )}
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
            {insider.totalTrades}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Handler totalt
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
            {insider.buyCount}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Kjøp
          </div>
          {totalBuyValue > 0 && (
            <div
              className="text-[11px] mono mt-1"
              style={{ color: "var(--an-text-muted)" }}
            >
              {formatNOK(totalBuyValue)}
            </div>
          )}
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div
            className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5"
            style={{ color: "var(--an-red)" }}
          >
            {insider.sellCount}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Salg
          </div>
          {totalSellValue > 0 && (
            <div
              className="text-[11px] mono mt-1"
              style={{ color: "var(--an-text-muted)" }}
            >
              {formatNOK(totalSellValue)}
            </div>
          )}
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5">
            {insider.companies.length}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Selskaper
          </div>
        </div>
      </div>

      {/* Companies */}
      <div
        className="rounded-lg overflow-hidden border mt-3"
        style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
      >
        <div
          className="px-3 sm:px-[18px] py-3 border-b"
          style={{ borderColor: "var(--an-border)" }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Selskaper
          </span>
        </div>
        <div className="px-3 sm:px-[18px] py-4 flex flex-wrap gap-2">
          {insider.companies.map((company) => {
            const companySlug = companySlugMap.get(company) || slugify(company);
            return (
              <Link
                key={company}
                href={`/${companySlug}`}
                className="text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors hover:border-[var(--an-accent)] hover:text-[var(--an-accent)]"
                style={{
                  color: "var(--an-text-secondary)",
                  borderColor: "var(--an-border)",
                }}
              >
                {company}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Trades Table */}
      <div
        className="rounded-lg overflow-hidden border mt-3 mb-6"
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
            Alle handler
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--an-text-muted)" }}
          >
            {trades.length} handler
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th
                  className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "70px" }}
                >
                  Dato
                </th>
                <th
                  className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)" }}
                >
                  Selskap
                </th>
                <th
                  className="text-center text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden sm:table-cell"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "80px" }}
                >
                  Type
                </th>
                <th
                  className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden md:table-cell"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                >
                  Aksjer
                </th>
                <th
                  className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden lg:table-cell"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                >
                  Pris
                </th>
                <th
                  className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                >
                  Verdi
                </th>
                <th
                  className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden sm:table-cell"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "40px" }}
                >
                  <span className="sr-only">Kilde</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, i) => (
                <tr
                  key={trade.messageId}
                  className="an-table-row transition-colors"
                  style={{
                    borderBottom: i < trades.length - 1
                      ? "1px solid var(--an-border-subtle)"
                      : "none",
                  }}
                >
                  <td
                    className="px-3 sm:px-[18px] py-3 text-xs whitespace-nowrap"
                    style={{ color: "var(--an-text-muted)" }}
                  >
                    {formatDateShort(trade.tradeDate)}
                  </td>
                  <td className="px-3 sm:px-[18px] py-3">
                    {trade.companySlug ? (
                      <Link
                        href={`/${trade.companySlug}`}
                        className="text-[13px] font-medium truncate max-w-[120px] sm:max-w-[200px] block transition-colors hover:text-[var(--an-accent)]"
                        style={{ color: "var(--an-text-primary)" }}
                        title={trade.issuerName}
                      >
                        {trade.issuerName}
                      </Link>
                    ) : (
                      <span
                        className="text-[13px] font-medium truncate max-w-[120px] sm:max-w-[200px] block"
                        style={{ color: "var(--an-text-primary)" }}
                        title={trade.issuerName}
                      >
                        {trade.issuerName}
                      </span>
                    )}
                  </td>
                  <td className="px-3 sm:px-[18px] py-3 text-center hidden sm:table-cell">
                    <TradeTypeBadge type={trade.tradeType} />
                  </td>
                  <td
                    className="px-3 sm:px-[18px] py-3 text-right mono text-[13px] hidden md:table-cell"
                    style={{ color: "var(--an-text-muted)" }}
                  >
                    {trade.shares ? formatNumber(trade.shares) : "-"}
                  </td>
                  <td
                    className="px-3 sm:px-[18px] py-3 text-right mono text-[13px] hidden lg:table-cell"
                    style={{ color: "var(--an-text-muted)" }}
                  >
                    {trade.price ? `${trade.currency} ${trade.price.toFixed(2)}` : "-"}
                  </td>
                  <td
                    className="px-3 sm:px-[18px] py-3 text-right mono text-[13px] whitespace-nowrap"
                    style={{ color: "var(--an-text-muted)" }}
                  >
                    {trade.totalValue ? `${trade.currency} ${formatNOK(trade.totalValue)}` : "-"}
                  </td>
                  <td className="px-3 sm:px-[18px] py-3 text-right hidden sm:table-cell">
                    <a
                      href={trade.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] transition-colors hover:text-[var(--an-accent)]"
                      style={{ color: "var(--an-text-muted)" }}
                    >
                      ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data source + AI disclaimer */}
      <div className="text-center pb-6 space-y-1">
        <p
          className="text-[11px]"
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
        {insider.bio && (
          <p
            className="text-[11px]"
            style={{ color: "var(--an-text-muted)" }}
          >
            Biografier er AI-generert og kan inneholde feil.
          </p>
        )}
      </div>
    </div>
  );
}
