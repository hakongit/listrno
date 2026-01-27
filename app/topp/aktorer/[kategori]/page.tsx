import { getShortData } from "@/lib/data";
import { formatPercent, formatNOK, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight, TrendingDown, Briefcase, Home } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

const categories = {
  "flest-posisjoner": {
    title: "Flest posisjoner",
    description: "Aktører med flest forskjellige shortposisjoner",
    icon: Briefcase,
  },
  "hoyest-short": {
    title: "Høyest total short",
    description: "Aktører med høyest sum av shortposisjoner",
    icon: TrendingDown,
  },
  "hoyest-verdi": {
    title: "Høyest verdi",
    description: "Aktører med høyest markedsverdi på shortposisjoner",
    icon: TrendingDown,
  },
} as const;

type CategoryKey = keyof typeof categories;

interface PageProps {
  params: Promise<{ kategori: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kategori } = await params;
  const category = categories[kategori as CategoryKey];

  if (!category) {
    return { title: "Ikke funnet - Listr" };
  }

  return {
    title: `${category.title} - Aktører Top 20 | Listr`,
    description: category.description,
  };
}

export async function generateStaticParams() {
  return Object.keys(categories).map((kategori) => ({ kategori }));
}

export default async function ActorTopListPage({ params }: PageProps) {
  const { kategori } = await params;
  const category = categories[kategori as CategoryKey];

  if (!category) {
    notFound();
  }

  const data = await getShortData();

  // Calculate total value for each holder
  const holdersWithValue = data.holders.map((holder) => ({
    ...holder,
    totalValue: holder.companies.reduce((sum, c) => sum + (c.positionValue || 0), 0),
  }));

  let holders;

  switch (kategori) {
    case "flest-posisjoner":
      holders = [...holdersWithValue]
        .sort((a, b) => b.totalPositions - a.totalPositions)
        .slice(0, 20);
      break;
    case "hoyest-short":
      holders = [...holdersWithValue]
        .sort((a, b) => b.totalShortPct - a.totalShortPct)
        .slice(0, 20);
      break;
    case "hoyest-verdi":
      holders = [...holdersWithValue]
        .filter((h) => h.totalValue > 0)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 20);
      break;
    default:
      notFound();
  }

  const Icon = category.icon;

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
        <span className="px-2 py-1 rounded-md font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10">
          {category.title}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Icon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          <h1 className="text-3xl font-bold">{category.title}</h1>
        </div>
        <p className="text-gray-500">{category.description}</p>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-purple-50 dark:bg-purple-950">
          <h2 className="font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
            <Icon className="w-4 h-4" />
            Top 20 Aktører
          </h2>
        </div>
        {holders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 w-8">#</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Aktør</th>
                  <th className={`text-right px-4 py-3 text-sm font-medium text-gray-500 ${kategori !== "flest-posisjoner" ? "hidden sm:table-cell" : ""}`}>Posisjoner</th>
                  <th className={`text-right px-4 py-3 text-sm font-medium text-gray-500 ${kategori === "hoyest-short" ? "" : "hidden sm:table-cell"}`}>Total short</th>
                  <th className={`text-right px-4 py-3 text-sm font-medium text-gray-500 ${kategori === "hoyest-verdi" ? "" : "hidden md:table-cell"}`}>Verdi (NOK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {holders.map((holder, index) => (
                  <tr
                    key={holder.slug}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/aktor/${holder.slug}`} className="flex items-center gap-2 hover:underline">
                        <Briefcase className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <span className="font-medium">{holder.name}</span>
                      </Link>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-sm ${kategori !== "flest-posisjoner" ? "hidden sm:table-cell" : ""}`}>
                      {holder.totalPositions}
                    </td>
                    <td className={`px-4 py-3 text-right ${kategori === "hoyest-short" ? "" : "hidden sm:table-cell"}`}>
                      <span className="font-mono font-medium text-purple-600 dark:text-purple-400">
                        {formatPercent(holder.totalShortPct)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right text-gray-500 font-mono text-sm ${kategori === "hoyest-verdi" ? "" : "hidden md:table-cell"}`}>
                      {holder.totalValue > 0 ? formatNOK(holder.totalValue) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
            Ingen aktører i denne kategorien
          </div>
        )}
      </div>
    </div>
  );
}
