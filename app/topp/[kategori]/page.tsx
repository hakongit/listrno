import { getShortData } from "@/lib/data";
import { formatPercent, formatNOK, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight, TrendingDown, TrendingUp, Home, Minus } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CompanyShortData } from "@/lib/types";

export const revalidate = 3600;

const categories = {
  "hoyest-short": {
    title: "Høyest short",
    description: "Selskaper med høyest andel shortposisjoner",
    icon: TrendingDown,
    color: "red",
    hasPeriodFilter: false,
  },
  "storst-okning": {
    title: "Størst økning",
    description: "Selskaper med størst økning i shortposisjoner",
    icon: TrendingUp,
    color: "red",
    hasPeriodFilter: true,
  },
  "storst-nedgang": {
    title: "Størst nedgang",
    description: "Selskaper med størst nedgang i shortposisjoner",
    icon: TrendingDown,
    color: "green",
    hasPeriodFilter: true,
  },
  "hoyest-verdi": {
    title: "Høyest verdi",
    description: "Selskaper med høyest markedsverdi på shortposisjoner",
    icon: TrendingDown,
    color: "blue",
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

export async function generateStaticParams() {
  return Object.keys(categories).map((kategori) => ({ kategori }));
}

function calculatePeriodChange(company: CompanyShortData, cutoffDate: Date): number | null {
  const history = company.history;
  if (history.length < 2) return null;

  // Find the data point closest to but not after the cutoff date
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latestPoint = sortedHistory[0];
  const latestPct = latestPoint.totalShortPct;

  // Find the point closest to cutoff date
  let previousPoint = null;
  for (const point of sortedHistory) {
    const pointDate = new Date(point.date);
    if (pointDate <= cutoffDate) {
      previousPoint = point;
      break;
    }
  }

  if (!previousPoint || previousPoint === latestPoint) {
    // Try to get the previous point in history
    if (sortedHistory.length >= 2) {
      previousPoint = sortedHistory[1];
    } else {
      return null;
    }
  }

  return Math.round((latestPct - previousPoint.totalShortPct) * 100) / 100;
}

export default async function TopListPage({ params, searchParams }: PageProps) {
  const { kategori } = await params;
  const { periode: periodeParam } = await searchParams;
  const category = categories[kategori as CategoryKey];

  if (!category) {
    notFound();
  }

  const data = await getShortData();

  // Find the most recent date in the dataset
  const allDates = data.companies.map(c => new Date(c.latestDate).getTime());
  const mostRecentDate = new Date(Math.max(...allDates));

  // Determine selected period (default to "dag" for change categories)
  const defaultPeriod = category.hasPeriodFilter ? "dag" : "alle";
  const selectedPeriod = (periodeParam && periodeParam in periods)
    ? periodeParam as PeriodKey
    : defaultPeriod;

  const periodConfig = periods[selectedPeriod];
  const showPeriodFilter = category.hasPeriodFilter;

  let companies: (CompanyShortData & { periodChange?: number })[];

  switch (kategori) {
    case "hoyest-short":
      companies = [...data.companies]
        .sort((a, b) => b.totalShortPct - a.totalShortPct)
        .slice(0, 20);
      break;
    case "storst-okning":
    case "storst-nedgang": {
      type CompanyWithPeriodChange = CompanyShortData & { periodChange?: number };
      let filtered: CompanyWithPeriodChange[] = [...data.companies];

      if (periodConfig.days !== null) {
        // Calculate cutoff date
        const cutoffDate = new Date(mostRecentDate);
        cutoffDate.setDate(cutoffDate.getDate() - periodConfig.days);

        // Filter to only companies updated since cutoff
        filtered = filtered.filter(c => new Date(c.latestDate) >= cutoffDate);

        // Calculate period-specific change
        filtered = filtered.map(c => ({
          ...c,
          periodChange: calculatePeriodChange(c, cutoffDate) ?? c.change,
        }));

        if (kategori === "storst-okning") {
          filtered = filtered
            .filter(c => (c.periodChange ?? c.change) > 0)
            .sort((a, b) => (b.periodChange ?? b.change) - (a.periodChange ?? a.change));
        } else {
          filtered = filtered
            .filter(c => (c.periodChange ?? c.change) < 0)
            .sort((a, b) => (a.periodChange ?? a.change) - (b.periodChange ?? b.change));
        }
      } else {
        // No period filter - use default change
        if (kategori === "storst-okning") {
          filtered = filtered
            .filter(c => c.change > 0)
            .sort((a, b) => b.change - a.change);
        } else {
          filtered = filtered
            .filter(c => c.change < 0)
            .sort((a, b) => a.change - b.change);
        }
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

  const Icon = category.icon;
  const colorClasses = {
    red: {
      header: "bg-red-50 dark:bg-red-950",
      text: "text-red-900 dark:text-red-100",
      value: "text-red-600 dark:text-red-400",
    },
    green: {
      header: "bg-green-50 dark:bg-green-950",
      text: "text-green-900 dark:text-green-100",
      value: "text-green-600 dark:text-green-400",
    },
    blue: {
      header: "bg-blue-50 dark:bg-blue-950",
      text: "text-blue-900 dark:text-blue-100",
      value: "text-blue-600 dark:text-blue-400",
    },
  };
  const colors = colorClasses[category.color];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link
          href="/"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Oversikt</span>
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className={`px-2 py-1 rounded-md font-medium ${colors.value} bg-opacity-10 ${
          category.color === 'red' ? 'bg-red-500/10' :
          category.color === 'green' ? 'bg-green-500/10' : 'bg-blue-500/10'
        }`}>
          {category.title}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Icon className={`w-8 h-8 ${colors.value}`} />
          <h1 className="text-3xl font-bold">{category.title}</h1>
        </div>
        <p className="text-gray-500">{category.description}</p>
      </div>

      {/* Period Filter */}
      {showPeriodFilter && (
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(periods).map(([key, { label }]) => (
            <Link
              key={key}
              href={`/topp/${kategori}${key === defaultPeriod ? "" : `?periode=${key}`}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === key
                  ? `${colors.header} ${colors.text}`
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-800 ${colors.header}`}>
          <h2 className={`font-semibold ${colors.text} flex items-center gap-2`}>
            <Icon className="w-4 h-4" />
            Top 20
            {showPeriodFilter && selectedPeriod !== "alle" && (
              <span className="text-sm font-normal opacity-75">
                ({periods[selectedPeriod].label.toLowerCase()})
              </span>
            )}
          </h2>
        </div>
        {companies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 w-8">#</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Selskap</th>
                  <th className={`text-right px-4 py-3 text-sm font-medium text-gray-500 ${kategori !== "hoyest-short" ? "hidden sm:table-cell" : ""}`}>Total short</th>
                  <th className={`text-right px-4 py-3 text-sm font-medium text-gray-500 ${kategori === "storst-okning" || kategori === "storst-nedgang" ? "" : "hidden sm:table-cell"}`}>Endring</th>
                  <th className={`text-right px-4 py-3 text-sm font-medium text-gray-500 ${kategori === "hoyest-verdi" ? "" : "hidden md:table-cell"}`}>Verdi (NOK)</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 hidden lg:table-cell">Sist oppdatert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {companies.map((company, index) => {
                  const displayChange = (company as { periodChange?: number }).periodChange ?? company.change;
                  return (
                    <tr
                      key={company.isin}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/${company.slug}`} className="flex items-center gap-2 hover:underline">
                          <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <span className="font-medium">{company.issuerName}</span>
                        </Link>
                      </td>
                      <td className={`px-4 py-3 text-right ${kategori !== "hoyest-short" ? "hidden sm:table-cell" : ""}`}>
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
                      </td>
                      <td className={`px-4 py-3 text-right ${kategori === "storst-okning" || kategori === "storst-nedgang" ? "" : "hidden sm:table-cell"}`}>
                        {displayChange > 0.01 ? (
                          <span className="inline-flex items-center gap-1 text-red-500 text-sm font-mono">
                            <TrendingUp className="w-3 h-3" />
                            <span>+{displayChange.toFixed(2)}%</span>
                          </span>
                        ) : displayChange < -0.01 ? (
                          <span className="inline-flex items-center gap-1 text-green-500 text-sm font-mono">
                            <TrendingDown className="w-3 h-3" />
                            <span>{displayChange.toFixed(2)}%</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-gray-400 text-xs">
                            <Minus className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right text-gray-500 font-mono text-sm ${kategori === "hoyest-verdi" ? "" : "hidden md:table-cell"}`}>
                        {company.shortValue ? formatNOK(company.shortValue) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-sm hidden lg:table-cell">
                        {formatDate(company.latestDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
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
