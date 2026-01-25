import { RawInstrument, ShortPosition, CompanyShortData, ShortDataSummary } from "./types";
import { slugify } from "./utils";

const API_URL = "https://ssr.finanstilsynet.no/api/v2/instruments/export-json";

export async function fetchShortPositions(): Promise<RawInstrument[]> {
  const res = await fetch(API_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "listr.no/1.0",
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }

  return res.json();
}

export function parseShortPositions(data: RawInstrument[]): ShortDataSummary {
  const companies: CompanyShortData[] = [];
  const allHolders = new Set<string>();
  let totalPositions = 0;

  for (const instrument of data) {
    const { isin, issuerName, events } = instrument;

    // Sort events by date (newest first for latest positions)
    const sortedEvents = [...events].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Get the latest event to find current active positions
    const latestEvent = sortedEvents[0];
    if (!latestEvent) continue;

    const activePositions: ShortPosition[] = latestEvent.activePositions.map((pos) => ({
      positionHolder: pos.positionHolder,
      isin,
      issuerName,
      positionDate: latestEvent.date,
      positionPct: parseFloat(pos.shortPercent),
      positionShares: parseInt(pos.shares, 10),
      status: "active" as const,
    }));

    if (activePositions.length === 0) continue;

    // Track unique holders
    activePositions.forEach((p) => allHolders.add(p.positionHolder));
    totalPositions += activePositions.length;

    // Calculate total short percentage
    const totalShortPct = activePositions.reduce((sum, p) => sum + p.positionPct, 0);

    companies.push({
      isin,
      issuerName,
      slug: slugify(issuerName),
      totalShortPct,
      positions: activePositions.sort((a, b) => b.positionPct - a.positionPct),
      latestDate: latestEvent.date,
    });
  }

  // Sort companies by total short percentage (highest first)
  companies.sort((a, b) => b.totalShortPct - a.totalShortPct);

  return {
    totalCompanies: companies.length,
    totalPositions,
    uniqueHolders: allHolders.size,
    lastUpdate: new Date().toISOString(),
    companies,
  };
}

export async function getShortData(): Promise<ShortDataSummary> {
  const rawData = await fetchShortPositions();
  return parseShortPositions(rawData);
}

export async function getCompanyBySlug(slug: string): Promise<CompanyShortData | null> {
  const data = await getShortData();
  return data.companies.find((c) => c.slug === slug) || null;
}

export async function getCompanyByIsin(isin: string): Promise<CompanyShortData | null> {
  const data = await getShortData();
  return data.companies.find((c) => c.isin === isin) || null;
}
