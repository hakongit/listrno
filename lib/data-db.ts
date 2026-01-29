import { getDb } from "./db";
import { ShortPosition, CompanyShortData, ShortDataSummary, HistoricalDataPoint, PositionHolder, HolderCompanyPosition } from "./types";
import { slugify } from "./utils";
import { getTicker } from "./tickers";
import { fetchStockPrices } from "./prices";

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
  const companiesResult = await getDb().execute("SELECT isin, issuer_name, slug FROM companies");
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

    // Group positions by date to create events
    const positionsByDate = new Map<string, DBPosition[]>();
    for (const pos of positions) {
      const existing = positionsByDate.get(pos.position_date) || [];
      existing.push(pos);
      positionsByDate.set(pos.position_date, existing);
    }

    // Sort dates chronologically
    const dates = Array.from(positionsByDate.keys()).sort();
    if (dates.length === 0) continue;

    // Build history
    const history: HistoricalDataPoint[] = dates.map(date => {
      const datePositions = positionsByDate.get(date)!;
      const totalShortPct = datePositions.reduce((sum, p) => sum + p.position_pct, 0);
      return {
        date,
        totalShortPct: Math.round(totalShortPct * 100) / 100,
        positions: datePositions.map(p => ({
          holder: p.holder_name,
          pct: p.position_pct,
        })),
      };
    });

    // Latest date and positions
    const latestDate = dates[dates.length - 1];
    const latestPositions = positionsByDate.get(latestDate)!;

    // Active positions
    const activePositions: ShortPosition[] = latestPositions.map(pos => ({
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

  // Fetch stock prices
  const tickers = companyDataList
    .map(c => c.ticker)
    .filter((t): t is string => t !== null);

  if (tickers.length > 0) {
    const prices = await fetchStockPrices(tickers);

    for (const company of companyDataList) {
      if (company.ticker && prices.has(company.ticker)) {
        company.stockPrice = prices.get(company.ticker) || null;
        if (company.stockPrice) {
          company.shortValue = company.totalShortShares * company.stockPrice;
        }
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
