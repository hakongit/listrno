import { getShortData } from "@/lib/data";
import { formatPercent, formatNOK, formatDateShort } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CompanyShortData } from "@/lib/types";

export const revalidate = 3600;

const categories = {
  "hoyest-short": {
    title: "Høyest short",
    description: "Selskaper med høyest andel shortposisjoner",
    color: "red" as const,
    hasPeriodFilter: false,
  },
  "storst-okning": {
    title: "Størst økning",
    description: "Selskaper med størst økning i shortposisjoner",
    color: "red" as const,
    hasPeriodFilter: true,
  },
  "storst-nedgang": {
    title: "Størst nedgang",
    description: "Selskaper med størst nedgang i shortposisjoner",
    color: "green" as const,
    hasPeriodFilter: true,
  },
  "hoyest-verdi": {
    title: "Høyest verdi",
    description: "Selskaper med høyest markedsverdi på shortposisjoner",
    color: "blue" as const,
    hasPeriodFilter: false,
  },
} as const;

type CategoryKey = keyof typeof categories;

const periods = {
  alle: { label: "Alle", days: null },
  dag: { label: "Siste dag", days: 0 },
  uke: { label: "Siste uke", days: 7 },
  mnd: { label: "Siste måned", days: 30 },
} as const;

type PeriodKey = keyof typeof periods;

interface PageProps {
  params: Promise<{ kategori: string }>;
  searchParams: Promise<{ periode?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kategori } = await params;
  const category = categories[kategori as CategoryKey];

  if (!category) {
    return { title: "Ikke funnet - Listr" };
  }

  return {
    title: `${category.title} - Top 20 | Listr`,
    description: category.description,
  };
}

export default async function TopListPage({ params, searchParams }: PageProps) {
  const { kategori } = await params;
  const { periode: periodeParam } = await searchParams;
  const category = categories[kategori as CategoryKey];

  if (!category) {
    notFound();
  }

  const data = await getShortData();

  const allDates = data.companies.map(c => new Date(c.latestDate).getTime());
  const mostRecentDate = new Date(Math.max(...allDates));

  const defaultPeriod = category.hasPeriodFilter ? "dag" : "alle";
  const selectedPeriod = (periodeParam && periodeParam in periods)
    ? periodeParam as PeriodKey
    : defaultPeriod;

  const periodConfig = periods[selectedPeriod];
  const showPeriodFilter = category.hasPeriodFilter;

  let companies: CompanyShortData[];

  switch (kategori) {
    case "hoyest-short":
      companies = [...data.companies]
        .sort((a, b) => b.totalShortPct - a.totalShortPct)
        .slice(0, 20);
      break;
    case "storst-okning":
    case "storst-nedgang": {
      let filtered = [...data.companies];

      if (periodConfig.days !== null) {
        const cutoffDate = new Date(mostRecentDate);
        cutoffDate.setDate(cutoffDate.getDate() - periodConfig.days);
        filtered = filtered.filter(c => new Date(c.latestDate) >= cutoffDate);
      }

      if (kategori === "storst-okning") {
        filtered = filtered
          .filter(c => c.change > 0)
          .sort((a, b) => b.change - a.change);
      } else {
        filtered = filtered
          .filter(c => c.change < 0)
          .sort((a, b) => a.change - b.change);
      }

      companies = filtered.slice(0, 20);
      break;
    }
    case "hoyest-verdi":
      companies = [...data.companies]
        .filter((c) => c.shortValue && c.shortValue > 0)
        .sort((a, b) => (b.shortValue || 0) - (a.shortValue || 0))
        .slice(0, 20);
      break;
    default:
      notFound();
  }

  return (
    <div className="max-w-[1120px] mx-auto px-6">
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
          <span style={{ color: "var(--an-text-secondary)" }}>Toppliste</span>
        </div>
        <h1 className="text-[26px] font-bold tracking-tight mb-1">
          {category.title}
        </h1>
        <p
          className="text-[13px]"
          style={{ color: "var(--an-text-secondary)" }}
        >
          {category.description}
        </p>
      </div>

      {/* Period Filter */}
      {showPeriodFilter && (
        <div className="flex gap-1.5 mb-3">
          {Object.entries(periods).map(([key, { label }]) => (
            <Link
              key={key}
              href={`/topp/${kategori}${key === defaultPeriod ? "" : `?periode=${key}`}`}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border"
              style={
                selectedPeriod === key
                  ? {
                      color: "var(--an-accent)",
                      borderColor: "rgba(201, 168, 76, 0.3)",
                      background: "var(--an-accent-dim)",
                    }
                  : {
                      color: "var(--an-text-muted)",
                      borderColor: "var(--an-border)",
                      background: "transparent",
                    }
              }
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden border mb-10"
        style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
      >
        <div
          className="px-[18px] py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--an-border)" }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--an-text-secondary)" }}
          >
            Topp {companies.length}
          </span>
          {showPeriodFilter && (
            <span
              className="text-[11px]"
              style={{ color: "var(--an-text-muted)" }}
            >
              {periods[selectedPeriod].label}
            </span>
          )}
        </div>
        {companies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px]"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "40px" }}
                  >
                    #
                  </th>
                  <th
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px]"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)" }}
                  >
                    Selskap
                  </th>
                  <th
                    className={`text-right text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] ${kategori !== "hoyest-short" ? "hidden sm:table-cell" : ""}`}
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "90px" }}
                  >
                    Short
                  </th>
                  <th
                    className={`text-right text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] ${kategori === "storst-okning" || kategori === "storst-nedgang" ? "" : "hidden sm:table-cell"}`}
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                  >
                    Endring
                  </th>
                  <th
                    className={`text-right text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] ${kategori === "hoyest-verdi" ? "" : "hidden md:table-cell"}`}
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                  >
                    Verdi
                  </th>
                  <th
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px]"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "70px" }}
                  >
                    Dato
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company, index) => {
                  const displayChange = company.change;
                  return (
                    <tr
                      key={company.isin}
                      className="an-table-row transition-colors"
                      style={{
                        borderBottom: index < companies.length - 1
                          ? "1px solid var(--an-border-subtle)"
                          : "none",
                      }}
                    >
                      <td
                        className="px-[18px] py-3 text-[13px]"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {index + 1}
                      </td>
                      <td className="px-[18px] py-3">
                        <Link
                          href={`/${company.slug}`}
                          className="text-[13px] font-medium transition-colors hover:text-[var(--an-accent)] truncate block"
                          style={{ color: "var(--an-text-primary)" }}
                        >
                          {company.issuerName}
                        </Link>
                      </td>
                      <td className={`px-[18px] py-3 text-right ${kategori !== "hoyest-short" ? "hidden sm:table-cell" : ""}`}>
                        <span
                          className="mono text-[13px] font-semibold"
                          style={{ color: "var(--an-red)" }}
                        >
                          {formatPercent(company.totalShortPct)}
                        </span>
                      </td>
                      <td className={`px-[18px] py-3 text-right ${kategori === "storst-okning" || kategori === "storst-nedgang" ? "" : "hidden sm:table-cell"}`}>
                        {displayChange > 0.01 ? (
                          <span
                            className="mono text-[13px] font-semibold"
                            style={{ color: "var(--an-red)" }}
                          >
                            +{displayChange.toFixed(2)}%
                          </span>
                        ) : displayChange < -0.01 ? (
                          <span
                            className="mono text-[13px] font-semibold"
                            style={{ color: "var(--an-green)" }}
                          >
                            {displayChange.toFixed(2)}%
                          </span>
                        ) : (
                          <span style={{ color: "var(--an-text-muted)" }}>-</span>
                        )}
                      </td>
                      <td className={`px-[18px] py-3 text-right ${kategori === "hoyest-verdi" ? "" : "hidden md:table-cell"}`}>
                        <span
                          className="mono text-[13px]"
                          style={{ color: "var(--an-text-muted)" }}
                        >
                          {company.shortValue ? formatNOK(company.shortValue) : "-"}
                        </span>
                      </td>
                      <td
                        className="px-[18px] py-3 text-right text-xs"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {formatDateShort(company.latestDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="px-[18px] py-8 text-center text-[13px]"
            style={{ color: "var(--an-text-muted)" }}
          >
            Ingen selskaper i denne kategorien
            {showPeriodFilter && selectedPeriod !== "alle" && (
              <span> for {periods[selectedPeriod].label.toLowerCase()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
