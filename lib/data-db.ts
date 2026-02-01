import { getDb } from "./db";
import { ShortPosition, CompanyShortData, ShortDataSummary, HistoricalDataPoint, PositionHolder, HolderCompanyPosition } from "./types";
import { slugify } from "./utils";
import { getTicker } from "./tickers";
import { fetchStockQuotes } from "./prices";
import { unstable_cache } from "next/cache";

interface DBPosition {
  isin: string;
  holder_name: string;
  position_pct: number;
  position_shares: number;
  position_date: string;
}

interface DBCompany {
  isin: string;
  issuer_name: string;
  slug: string;
}

export async function getShortDataFromDB(): Promise<ShortDataSummary> {
  // Get all companies
  let companiesResult;
  try {
    companiesResult = await getDb().execute("SELECT isin, issuer_name, slug FROM companies");
  } catch (error: unknown) {
    const url = process.env.TURSO_DATABASE_URL || 'NOT_SET';
    const tokenLen = process.env.TURSO_AUTH_TOKEN?.length || 0;
    const errMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`DB Error: ${errMsg} | URL: ${url} | Token length: ${tokenLen}`);
  }
  const companies = companiesResult.rows as unknown as DBCompany[];

  // Get all positions ordered by date
  const positionsResult = await getDb().execute(`
    SELECT isin, holder_name, position_pct, position_shares, position_date
    FROM positions
    ORDER BY position_date ASC
  `);
  const allPositions = positionsResult.rows as unknown as DBPosition[];

  // Group positions by company ISIN
  const positionsByIsin = new Map<string, DBPosition[]>();
  for (const pos of allPositions) {
    const existing = positionsByIsin.get(pos.isin) || [];
    existing.push(pos);
    positionsByIsin.set(pos.isin, existing);
  }

  const companyDataList: CompanyShortData[] = [];
  const holdersMap = new Map<string, HolderCompanyPosition[]>();
  let totalPositionsCount = 0;

  for (const company of companies) {
    const positions = positionsByIsin.get(company.isin) || [];
    if (positions.length === 0) continue;

    // Group positions by holder to get latest position per holder
    const latestByHolder = new Map<string, DBPosition>();
    for (const pos of positions) {
      const existing = latestByHolder.get(pos.holder_name);
      if (!existing || pos.position_date > existing.position_date) {
        latestByHolder.set(pos.holder_name, pos);
      }
    }

    // Filter out closed positions (0% or null)
    const currentPositions = Array.from(latestByHolder.values())
      .filter(p => p.position_pct > 0);

    if (currentPositions.length === 0) continue;

    // Group all positions by date for history
    const positionsByDate = new Map<string, DBPosition[]>();
    for (const pos of positions) {
      const existing = positionsByDate.get(pos.position_date) || [];
      existing.push(pos);
      positionsByDate.set(pos.position_date, existing);
    }

    // Sort dates chronologically
    const dates = Array.from(positionsByDate.keys()).sort();

    // Build history - for each date, sum up active positions at that point in time
    const history: HistoricalDataPoint[] = [];
    const activeAtDate = new Map<string, DBPosition>();
    for (const date of dates) {
      const datePositions = positionsByDate.get(date)!;
      // Update active positions with this date's data
      for (const pos of datePositions) {
        if (pos.position_pct > 0) {
          activeAtDate.set(pos.holder_name, pos);
        } else {
          activeAtDate.delete(pos.holder_name);
        }
      }
      const activeList = Array.from(activeAtDate.values());
      const totalShortPct = activeList.reduce((sum, p) => sum + p.position_pct, 0);
      history.push({
        date,
        totalShortPct: Math.round(totalShortPct * 100) / 100,
        positions: activeList.map(p => ({
          holder: p.holder_name,
          pct: p.position_pct,
        })),
      });
    }

    // Latest date is the most recent position update
    const latestDate = dates[dates.length - 1];

    // Active positions are the latest position per holder
    const activePositions: ShortPosition[] = currentPositions.map(pos => ({
      positionHolder: pos.holder_name,
      isin: company.isin,
      issuerName: company.issuer_name,
      positionDate: pos.position_date,
      positionPct: pos.position_pct,
      positionShares: pos.position_shares,
      status: "active" as const,
    }));

    if (activePositions.length === 0) continue;

    totalPositionsCount += activePositions.length;

    // Calculate totals
    const totalShortPct = activePositions.reduce((sum, p) => sum + p.positionPct, 0);
    const totalShortShares = activePositions.reduce((sum, p) => sum + p.positionShares, 0);

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

    // Get ticker
    const ticker = getTicker(company.isin, company.issuer_name);

    // Build holder positions for this company
    for (const pos of activePositions) {
      // Get holder's history in this company
      const holderHistory = positions
        .filter(p => p.holder_name === pos.positionHolder)
        .map(p => ({
          date: p.position_date,
          pct: p.position_pct,
          shares: p.position_shares,
        }));

      const holderCompanyPos: HolderCompanyPosition = {
        isin: company.isin,
        issuerName: company.issuer_name,
        companySlug: company.slug,
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

    companyDataList.push({
      isin: company.isin,
      issuerName: company.issuer_name,
      slug: company.slug,
      ticker,
      totalShortPct,
      totalShortShares,
      previousShortPct,
      previousDate,
      change,
      positions: activePositions.sort((a, b) => b.positionPct - a.positionPct),
      latestDate,
      history,
      stockPrice: null,
      shortValue: null,
      regularMarketVolume: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
    });
  }

  // Sort companies by total short percentage
  companyDataList.sort((a, b) => b.totalShortPct - a.totalShortPct);

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

  // Sort holders by number of positions
  holders.sort((a, b) => b.totalPositions - a.totalPositions);

  // Fetch stock quotes (prices + additional metrics)
  const tickers = companyDataList
    .map(c => c.ticker)
    .filter((t): t is string => t !== null);

  if (tickers.length > 0) {
    const quotes = await fetchStockQuotes(tickers);

    for (const company of companyDataList) {
      if (company.ticker && quotes.has(company.ticker)) {
        const quote = quotes.get(company.ticker)!;
        company.stockPrice = quote.price;
        company.shortValue = company.totalShortShares * quote.price;
        company.regularMarketVolume = quote.regularMarketVolume;
        company.fiftyTwoWeekHigh = quote.fiftyTwoWeekHigh;
        company.fiftyTwoWeekLow = quote.fiftyTwoWeekLow;
      }
    }

    // Build ISIN to price map for holders
    const isinToPriceMap = new Map<string, number>();
    for (const company of companyDataList) {
      if (company.stockPrice) {
        isinToPriceMap.set(company.isin, company.stockPrice);
      }
    }

    for (const holder of holders) {
      for (const pos of holder.companies) {
        const stockPrice = isinToPriceMap.get(pos.isin);
        if (stockPrice) {
          pos.stockPrice = stockPrice;
          pos.positionValue = pos.currentShares * stockPrice;
        }
      }
    }
  }

  return {
    totalCompanies: companyDataList.length,
    totalPositions: totalPositionsCount,
    uniqueHolders: holders.length,
    lastUpdate: new Date().toISOString(),
    companies: companyDataList,
    holders,
  };
}

// Cached version - revalidates every 5 minutes
export const getCachedShortData = unstable_cache(
  getShortDataFromDB,
  ["short-data"],
  { revalidate: 300 }
);
