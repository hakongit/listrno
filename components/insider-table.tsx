"use client";

import { SearchableTable } from "./searchable-table";
import Link from "next/link";

interface TradeRow {
  messageId: string;
  issuerName: string;
  companySlug: string | null;
  insiderName: string;
  insiderSlug: string | null;
  insiderRole: string | null;
  tradeType: string;
  tradeDate: string;
  shares: number | null;
  totalValue: number | null;
  sourceUrl: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatNumber(num: number): string {
  return num.toLocaleString("nb-NO");
}

function formatNOK(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} mrd`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mill`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} k`;
  return value.toFixed(0);
}

function TradeTypeBadge({ type }: { type: string }) {
  if (type === "buy") {
    return (
      <span
        className="text-[11px] font-semibold px-2 py-[2px] rounded border"
        style={{
          color: "var(--an-green)",
          background: "var(--an-green-bg)",
          borderColor: "var(--an-green-border)",
        }}
      >
        Kjøp
      </span>
    );
  } else if (type === "sell") {
    return (
      <span
        className="text-[11px] font-semibold px-2 py-[2px] rounded border"
        style={{
          color: "var(--an-red)",
          background: "var(--an-red-bg)",
          borderColor: "var(--an-red-border)",
        }}
      >
        Salg
      </span>
    );
  }
  return (
    <span
      className="text-[11px] font-semibold px-2 py-[2px] rounded border"
      style={{
        color: "var(--an-text-muted)",
        background: "var(--an-bg-raised)",
        borderColor: "var(--an-border)",
      }}
    >
      Annet
    </span>
  );
}

export function InsiderTable({ trades }: { trades: TradeRow[] }) {
  const searchableData = trades.map(
    (t) => `${t.issuerName} ${t.insiderName} ${t.tradeType === "buy" ? "kjøp" : t.tradeType === "sell" ? "salg" : ""}`
  );

  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{ background: "var(--an-bg-surface)", borderColor: "var(--an-border)" }}
    >
      <div
        className="px-[18px] py-3 border-b"
        style={{ borderColor: "var(--an-border)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--an-text-secondary)" }}
        >
          Alle handler
        </span>
      </div>
      <SearchableTable
        searchableData={searchableData}
        placeholder="Søk etter selskap, innsider..."
        totalLabel="handler"
        pageSize={30}
      >
        {(filteredIndices) => (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" aria-label="Innsidehandler i norske aksjer">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px]"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "70px" }}
                  >
                    Dato
                  </th>
                  <th
                    scope="col"
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px]"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)" }}
                  >
                    Selskap
                  </th>
                  <th
                    scope="col"
                    className="text-left text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] hidden md:table-cell"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)" }}
                  >
                    Innsider
                  </th>
                  <th
                    scope="col"
                    className="text-center text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px]"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "80px" }}
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] hidden lg:table-cell"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                  >
                    Aksjer
                  </th>
                  <th
                    scope="col"
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px] hidden xl:table-cell"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "100px" }}
                  >
                    Verdi
                  </th>
                  <th
                    scope="col"
                    className="text-right text-[11px] font-semibold uppercase tracking-wider px-[18px] py-[11px]"
                    style={{ color: "var(--an-text-muted)", borderBottom: "1px solid var(--an-border)", width: "40px" }}
                  >
                    <span className="sr-only">Kilde</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredIndices.map((idx, i) => {
                  const trade = trades[idx];
                  return (
                    <tr
                      key={trade.messageId}
                      className="an-table-row transition-colors"
                      style={{
                        borderBottom: i < filteredIndices.length - 1
                          ? "1px solid var(--an-border-subtle)"
                          : "none",
                      }}
                    >
                      <td
                        className="px-[18px] py-3 text-xs whitespace-nowrap"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {formatDate(trade.tradeDate)}
                      </td>
                      <td className="px-[18px] py-3">
                        {trade.companySlug ? (
                          <Link
                            href={`/${trade.companySlug}`}
                            className="text-[13px] font-medium truncate max-w-[150px] sm:max-w-[200px] block transition-colors hover:text-[var(--an-accent)]"
                            style={{ color: "var(--an-text-primary)" }}
                            title={trade.issuerName}
                          >
                            {trade.issuerName}
                          </Link>
                        ) : (
                          <span
                            className="text-[13px] font-medium truncate max-w-[150px] sm:max-w-[200px] block"
                            style={{ color: "var(--an-text-primary)" }}
                            title={trade.issuerName}
                          >
                            {trade.issuerName}
                          </span>
                        )}
                      </td>
                      <td className="px-[18px] py-3 hidden md:table-cell">
                        {trade.insiderName !== trade.issuerName ? (
                          <Link
                            href={`/innsidehandel/${trade.insiderSlug}`}
                            className="text-[13px] transition-colors hover:text-[var(--an-accent)] block truncate max-w-[150px] sm:max-w-[200px]"
                            style={{ color: "var(--an-text-secondary)" }}
                            title={trade.insiderName}
                          >
                            {trade.insiderName}
                          </Link>
                        ) : (
                          <span style={{ color: "var(--an-text-muted)" }}>-</span>
                        )}
                        {trade.insiderRole && (
                          <div
                            className="text-[11px]"
                            style={{ color: "var(--an-text-muted)" }}
                          >
                            {trade.insiderRole}
                          </div>
                        )}
                      </td>
                      <td className="px-[18px] py-3 text-center">
                        <TradeTypeBadge type={trade.tradeType} />
                      </td>
                      <td
                        className="px-[18px] py-3 text-right mono text-[13px] hidden lg:table-cell"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {trade.shares ? formatNumber(trade.shares) : "-"}
                      </td>
                      <td
                        className="px-[18px] py-3 text-right mono text-[13px] hidden xl:table-cell"
                        style={{ color: "var(--an-text-muted)" }}
                      >
                        {trade.totalValue ? formatNOK(trade.totalValue) : "-"}
                      </td>
                      <td className="px-[18px] py-3 text-right">
                        <a
                          href={trade.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] transition-colors hover:text-[var(--an-accent)]"
                          style={{ color: "var(--an-text-muted)" }}
                          aria-label={`Kilde for ${trade.issuerName} handel`}
                        >
                          ↗
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {filteredIndices.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-[18px] py-8 text-center text-[13px]"
                      style={{ color: "var(--an-text-muted)" }}
                    >
                      Ingen handler funnet
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
