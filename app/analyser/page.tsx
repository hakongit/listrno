import { getCachedPublicAnalystReports, getCachedAnalystReportCount, initializeAnalystDatabase } from "@/lib/analyst-db";
import { formatDate, formatNumber } from "@/lib/utils";
import Link from "next/link";
import {
  Home,
  ChevronRight,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
} from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytikerrapporter - Listr",
  description: "Analytikerrapporter og kursmål for norske aksjer fra ledende investeringsbanker.",
  openGraph: {
    title: "Analytikerrapporter - Listr",
    description: "Analytikerrapporter og kursmål for norske aksjer",
  },
};

function RecommendationBadge({ recommendation }: { recommendation?: string }) {
  if (!recommendation) {
    return null;
  }

  const rec = recommendation.toLowerCase();
  let color = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  let icon = <Minus className="w-3 h-3" />;

  if (rec === "buy" || rec === "overweight" || rec === "outperform") {
    color = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    icon = <TrendingUp className="w-3 h-3" />;
  } else if (rec === "sell" || rec === "underweight" || rec === "underperform") {
    color = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    icon = <TrendingDown className="w-3 h-3" />;
  }

  const labels: Record<string, string> = {
    buy: "Kjøp",
    hold: "Hold",
    sell: "Selg",
    overweight: "Overvekt",
    underweight: "Undervekt",
    outperform: "Outperform",
    underperform: "Underperform",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon}
      {labels[rec] || recommendation}
    </span>
  );
}

function formatTargetPrice(price?: number, currency?: string): string {
  if (!price) return "-";
  return `${formatNumber(price)} ${currency || "NOK"}`;
}

export default async function AnalystReportsPage() {
  // Ensure tables exist
  await initializeAnalystDatabase();

  const [reports, totalCount] = await Promise.all([
    getCachedPublicAnalystReports({ limit: 50 }),
    getCachedAnalystReportCount(),
  ]);

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
            <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="font-medium">Analytikerrapporter</span>
          </div>
          <nav className="flex items-center gap-4 text-sm flex-shrink-0">
            <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Dashboard
            </Link>
            <Link href="/innsidehandel" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Innsidehandel
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Analytikerrapporter</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Kursmål og anbefalinger fra analytikere i ledende investeringsbanker.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-2xl font-bold">{totalCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Totalt rapporter</div>
          </div>
        </div>

        {/* Reports Table */}
        {reports.length === 0 ? (
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
            <h2 className="text-lg font-semibold mb-2">Ingen rapporter ennå</h2>
            <p className="text-gray-500 text-sm">
              Analytikerrapporter vil vises her når de er tilgjengelige.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <h2 className="font-semibold">Siste rapporter</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Dato
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Selskap
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      Bank
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Anbefaling
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Kursmål
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                      Kurs ved rapport
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm">
                        {formatDate(report.receivedDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{report.companyName || "-"}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span>{report.investmentBank || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RecommendationBadge recommendation={report.recommendation} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        <span className="select-none blur-[6px]">
                          {report.targetPrice ? formatTargetPrice(report.targetPrice, report.targetCurrency) : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm hidden lg:table-cell">
                        <span className="select-none blur-[6px]">
                          {report.priceAtReport
                            ? `${formatNumber(report.priceAtReport)} ${report.targetCurrency}`
                            : "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data source note */}
        <p className="mt-4 text-sm text-gray-500 text-center">
          Basert på offentlig tilgjengelige analytikerrapporter. Ikke finansiell rådgivning.
        </p>
      </div>
    </div>
  );
}
