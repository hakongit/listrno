import { RawInstrument, ShortPosition, CompanyShortData, ShortDataSummary, HistoricalDataPoint, PositionHolder, HolderCompanyPosition } from "./types";
import { slugify } from "./utils";
import { getTicker } from "./tickers";
import { fetchStockPrices } from "./prices";
import { getShortDataFromDB } from "./data-db";

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

function parseHistoricalData(events: RawInstrument["events"]): HistoricalDataPoint[] {
  // Sort events chronologically (oldest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const history: HistoricalDataPoint[] = [];

  for (const event of sortedEvents) {
    const positions = event.activePositions.map((pos) => ({
      holder: pos.positionHolder,
      pct: parseFloat(pos.shortPercent),
    }));

    const totalShortPct = positions.reduce((sum, p) => sum + p.pct, 0);

    history.push({
      date: event.date,
      totalShortPct: Math.round(totalShortPct * 100) / 100,
      positions,
    });
  }

  return history;
}

export function parseShortPositions(data: RawInstrument[]): ShortDataSummary {
  const companies: CompanyShortData[] = [];
  const holdersMap = new Map<string, HolderCompanyPosition[]>();
  let totalPositions = 0;

  for (const instrument of data) {
    const { isin, issuerName, events } = instrument;
    const companySlug = slugify(issuerName);

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

    // Build holder history for each position holder in this company
    const sortedEventsChronological = [...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Track each holder's positions in this company
    for (const pos of activePositions) {
      const holderHistory = sortedEventsChronological
        .map((event) => {
          const holderPos = event.activePositions.find(
            (p) => p.positionHolder === pos.positionHolder
          );
          if (holderPos) {
            return {
              date: event.date,
              pct: parseFloat(holderPos.shortPercent),
              shares: parseInt(holderPos.shares, 10),
            };
          }
          return null;
        })
        .filter((h): h is NonNullable<typeof h> => h !== null);

      const holderCompanyPos: HolderCompanyPosition = {
        isin,
        issuerName,
        companySlug,
        currentPct: pos.positionPct,
        currentShares: pos.positionShares,
        latestDate: pos.positionDate,
        history: holderHistory,
        stockPrice: null,
        positionValue: null,
      };

      const existing = holdersMap.get(pos.positionHolder) || [];
      existing.push(holderCompanyPos);
      holdersMap.set(pos.positionHolder, existing);
    }

    totalPositions += activePositions.length;

    // Calculate total short percentage
    const totalShortPct = activePositions.reduce((sum, p) => sum + p.positionPct, 0);

    // Parse historical data for company
    const history = parseHistoricalData(events);

    // Calculate change from previous data point
    let previousShortPct: number | null = null;
    let previousDate: string | null = null;
    let change = 0;
    if (history.length >= 2) {
      const prevPoint = history[history.length - 2];
      previousShortPct = prevPoint.totalShortPct;
      previousDate = prevPoint.date;
      change = Math.round((totalShortPct - previousShortPct) * 100) / 100;
    }

    // Get ticker for this company
    const ticker = getTicker(isin, issuerName);

    // Calculate total shares shorted
    const totalShortShares = activePositions.reduce((sum, p) => sum + p.positionShares, 0);

    companies.push({
      isin,
      issuerName,
      slug: companySlug,
      ticker,
      totalShortPct,
      totalShortShares,
      previousShortPct,
      previousDate,
      change,
      positions: activePositions.sort((a, b) => b.positionPct - a.positionPct),
      latestDate: latestEvent.date,
      history,
      stockPrice: null,
      shortValue: null,
    });
  }

  // Sort companies by total short percentage (highest first)
  companies.sort((a, b) => b.totalShortPct - a.totalShortPct);

  // Build holders array
  const holders: PositionHolder[] = Array.from(holdersMap.entries()).map(
    ([name, companyPositions]) => {
      const totalShortPct = companyPositions.reduce((sum, c) => sum + c.currentPct, 0);
      return {
        name,
        slug: slugify(name),
        totalPositions: companyPositions.length,
        totalShortPct: Math.round(totalShortPct * 100) / 100,
        companies: companyPositions.sort((a, b) => b.currentPct - a.currentPct),
      };
    }
  );

  // Sort holders by number of positions (most active first)
  holders.sort((a, b) => b.totalPositions - a.totalPositions);

  return {
    totalCompanies: companies.length,
    totalPositions,
    uniqueHolders: holders.length,
    lastUpdate: new Date().toISOString(),
    companies,
    holders,
  };
}

export async function getShortData(): Promise<ShortDataSummary> {
  return getShortDataFromDB();
}

export async function getCompanyBySlug(slug: string): Promise<CompanyShortData | null> {
  const data = await getShortData();
  return data.companies.find((c) => c.slug === slug) || null;
}

export async function getCompanyByIsin(isin: string): Promise<CompanyShortData | null> {
  const data = await getShortData();
  return data.companies.find((c) => c.isin === isin) || null;
}

export async function getHolderBySlug(slug: string): Promise<PositionHolder | null> {
  const data = await getShortData();
  return data.holders.find((h) => h.slug === slug) || null;
}

export async function getAllHolders(): Promise<PositionHolder[]> {
  const data = await getShortData();
  return data.holders;
}
