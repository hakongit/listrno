import { getShortData } from "@/lib/data";
import { formatPercent, formatNOK, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight, TrendingDown, Briefcase, Home } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600; // Cache for 1 hour

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
    <div>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight flex-shrink-0">
            Listr<span className="text-gray-400">.no</span>
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <Icon className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="font-medium truncate">{category.title}</span>
          </div>
          <nav className="flex items-center gap-4 text-sm flex-shrink-0">
            <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Oversikt
            </Link>
            <Link href="/om" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Om
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        {holders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left px-3 py-2 font-medium text-gray-500 w-8">#</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Aktør</th>
                  <th className={`text-right px-3 py-2 font-medium text-gray-500 ${kategori !== "flest-posisjoner" ? "hidden sm:table-cell" : ""}`}>Pos.</th>
                  <th className={`text-right px-3 py-2 font-medium text-gray-500 ${kategori === "hoyest-short" ? "" : "hidden sm:table-cell"}`}>Short</th>
                  <th className={`text-right px-3 py-2 font-medium text-gray-500 ${kategori === "hoyest-verdi" ? "" : "hidden md:table-cell"}`}>Verdi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {holders.map((holder, index) => (
                  <tr
                    key={holder.slug}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                    <td className="px-3 py-2">
                      <Link href={`/aktor/${holder.slug}`} className="flex items-center gap-2 hover:underline">
                        <Briefcase className="w-3 h-3 text-purple-500 flex-shrink-0" />
                        <span className="font-medium truncate">{holder.name}</span>
                      </Link>
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${kategori !== "flest-posisjoner" ? "hidden sm:table-cell" : ""}`}>
                      {holder.totalPositions}
                    </td>
                    <td className={`px-3 py-2 text-right ${kategori === "hoyest-short" ? "" : "hidden sm:table-cell"}`}>
                      <span className="font-mono font-medium text-purple-600 dark:text-purple-400">
                        {formatPercent(holder.totalShortPct)}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right text-gray-500 font-mono ${kategori === "hoyest-verdi" ? "" : "hidden md:table-cell"}`}>
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
    </div>
  );
}
