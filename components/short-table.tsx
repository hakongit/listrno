"use client";

import { SearchableTable } from "./searchable-table";
import { ChangeIndicator } from "./ui/change-indicator";
import { formatPercent, formatNOK, formatDateShort } from "@/lib/utils";
import Link from "next/link";

interface CompanyRow {
  isin: string;
  slug: string;
  issuerName: string;
  totalShortPct: number;
  change: number;
  previousDate: string | null;
  shortValue: number | null;
  latestDate: string;
}

export function ShortTable({ companies }: { companies: CompanyRow[] }) {
  const searchableData = companies.map((c) => c.issuerName);

  return (
    <div
      className="rounded-lg overflow-hidden border"
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
          Alle selskaper
        </span>
      </div>
      <SearchableTable
        searchableData={searchableData}
        placeholder="Søk etter selskap..."
        totalLabel="selskaper"
      >
        {(filteredIndices) => (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" aria-label="Shortposisjoner for alle selskaper">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)" }}
                  >
                    Selskap
                  </th>
                  <th
                    scope="col"
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px]"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "90px" }}
                  >
                    Short
                  </th>
                  <th
                    scope="col"
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden sm:table-cell"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                  >
                    Endring
                  </th>
                  <th
                    scope="col"
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden md:table-cell"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                  >
                    Verdi
                  </th>
                  <th
                    scope="col"
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 sm:px-[18px] py-[11px] hidden lg:table-cell"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "80px" }}
                  >
                    Dato
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredIndices.map((idx, i) => {
                  const company = companies[idx];
                  return (
                    <tr
                      key={company.isin}
                      className="an-table-row transition-colors"
                      style={{
                        borderBottom: i < filteredIndices.length - 1
                          ? "1px solid var(--an-border-subtle)"
                          : "none",
                      }}
                    >
                      <td className="px-3 sm:px-[18px] py-3">
                        <Link
                          href={`/${company.slug}`}
                          className="text-[13px] font-medium transition-colors hover:text-[var(--an-accent)] truncate block max-w-[160px] sm:max-w-none"
                          style={{ color: "var(--an-text-primary)" }}
                          title={company.issuerName}
                        >
                          {company.issuerName}
                        </Link>
                        <span className="sm:hidden">
                          <ChangeIndicator change={company.change} previousDate={company.previousDate} />
                        </span>
                      </td>
                      <td className="px-3 sm:px-[18px] py-3 text-right">
                        <span
                          className="mono text-[13px] font-semibold"
                          style={{ color: "var(--an-red)" }}
                        >
                          {formatPercent(company.totalShortPct)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-[18px] py-3 text-right hidden sm:table-cell">
                        <ChangeIndicator change={company.change} previousDate={company.previousDate} showDate />
                      </td>
                      <td
                        className="px-3 sm:px-[18px] py-3 text-right mono text-[13px] hidden md:table-cell"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {company.shortValue ? formatNOK(company.shortValue) : "-"}
                      </td>
                      <td
                        className="px-3 sm:px-[18px] py-3 text-right text-xs hidden lg:table-cell"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {formatDateShort(company.latestDate)}
                      </td>
                    </tr>
                  );
                })}
                {filteredIndices.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 sm:px-[18px] py-8 text-center text-[13px]"
                      style={{ color: "var(--an-text-muted)" }}
                    >
                      Ingen selskaper funnet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SearchableTable>
    </div>
  );
}
