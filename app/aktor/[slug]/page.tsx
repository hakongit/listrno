import { getAllHolders, getHolderBySlug } from "@/lib/data";
import { formatPercent, formatNumber, formatDate, formatNOK, formatDateShort } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LazyHolderChart } from "@/components/lazy-holder-chart";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const holder = await getHolderBySlug(slug);

  if (!holder) {
    return { title: "Ikke funnet - Listr" };
  }

  return {
    title: `${holder.name} - Shortposisjoner | Listr`,
    description: `Se alle shortposisjoner fra ${holder.name}. ${holder.totalPositions} aktive posisjoner i norske aksjer.`,
    openGraph: {
      title: `${holder.name} - Shortposisjoner`,
      description: `${holder.totalPositions} aktive posisjoner i norske aksjer`,
    },
  };
}

export default async function HolderPage({ params }: PageProps) {
  const { slug } = await params;
  const holder = await getHolderBySlug(slug);

  if (!holder) {
    notFound();
  }

  const totalValue = holder.companies.reduce((sum, c) => sum + (c.positionValue || 0), 0);
  const avgPct = holder.companies.length > 0 ? holder.totalShortPct / holder.companies.length : 0;

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
      {/* Hero */}
      <div className="pt-8 pb-6">
        <div
          className="text-[11px] font-medium mb-2"
          style={{ color: "var(--an-text-muted)" }}
        >
          <Link
            href="/"
            className="transition-colors hover:text-[var(--an-accent)]"
          >
            Hjem
          </Link>
          <span className="mx-1.5">/</span>
          <span style={{ color: "var(--an-text-secondary)" }}>Aktør</span>
        </div>
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight mb-2">
          {holder.name}
        </h1>
        <p
          className="text-[13px]"
          style={{ color: "var(--an-text-secondary)" }}
        >
          Shortposisjoner i norske aksjer
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
            {holder.companies.length}
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
          <div
            className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5 mono"
            style={{ color: "var(--an-red)" }}
          >
            {formatPercent(holder.totalShortPct)}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Total short
          </div>
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5 mono">
            {formatPercent(avgPct)}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Snitt per selskap
          </div>
        </div>
        <div
          className="rounded-lg p-3 sm:p-4 border"
          style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
        >
          <div className="text-[20px] sm:text-[26px] font-bold tracking-tight leading-tight mb-0.5 mono">
            {totalValue > 0 ? formatNOK(totalValue) : "-"}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Total shortverdi
          </div>
        </div>
      </div>

      {/* Historical Chart */}
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
            Short-historikk per selskap
          </span>
        </div>
        <div className="p-4">
          <LazyHolderChart companies={holder.companies} />
        </div>
      </div>

      {/* Positions table */}
      <div
        className="rounded-lg overflow-hidden border mt-3 mb-10"
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
            Aktive shortposisjoner
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--an-text-muted)" }}
          >
            {holder.companies.length} selskaper
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th
                  className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)" }}
                >
                  Selskap
                </th>
                <th
                  className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "90px" }}
                >
                  Posisjon
                </th>
                <th
                  className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden sm:table-cell"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                >
                  Aksjer
                </th>
                <th
                  className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden lg:table-cell"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                >
                  Verdi
                </th>
                <th
                  className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                  style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "80px" }}
                >
                  Dato
                </th>
              </tr>
            </thead>
            <tbody>
              {holder.companies.map((company, i) => (
                <tr
                  key={company.isin}
                  className="an-table-row transition-colors"
                  style={{
                    borderBottom: i < holder.companies.length - 1
                      ? "1px solid var(--an-border-subtle)"
                      : "none",
                  }}
                >
                  <td className="px-3 sm:px-[18px] py-3">
                    <Link
                      href={`/${company.companySlug}`}
                      className="text-[13px] font-medium transition-colors hover:text-[var(--an-accent)] truncate block max-w-[160px] sm:max-w-none"
                      style={{ color: "var(--an-text-primary)" }}
                      title={company.issuerName}
                    >
                      {company.issuerName}
                    </Link>
                  </td>
                  <td className="px-3 sm:px-[18px] py-3 text-right">
                    <span
                      className="mono text-[13px] font-semibold"
                      style={{ color: "var(--an-red)" }}
                    >
                      {formatPercent(company.currentPct)}
                    </span>
                  </td>
                  <td
                    className="px-3 sm:px-[18px] py-3 text-right mono text-[13px] hidden sm:table-cell"
                    style={{ color: "var(--an-text-muted)" }}
                  >
                    {formatNumber(company.currentShares)}
                  </td>
                  <td
                    className="px-3 sm:px-[18px] py-3 text-right mono text-[13px] hidden lg:table-cell"
                    style={{ color: "var(--an-text-muted)" }}
                  >
                    {company.positionValue ? formatNOK(company.positionValue) : "-"}
                  </td>
                  <td
                    className="px-3 sm:px-[18px] py-3 text-right text-xs"
                    style={{ color: "var(--an-text-muted)" }}
                  >
                    {formatDateShort(company.latestDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
