import { getDb } from "./db";
import { InsiderTrade, InsiderTradeRow, InsiderDataSummary, InsiderTradeFilters, InsiderSummary } from "./insider-types";
import { getInsiderProfile, getTwitterAvatarUrl } from "./insider-profiles";
import { unstable_cache } from "next/cache";

function rowToTrade(row: InsiderTradeRow): InsiderTrade {
  return {
    messageId: row.message_id,
    isin: row.isin,
    issuerName: row.issuer_name,
    ticker: row.ticker,
    insiderName: row.insider_name,
    insiderSlug: row.insider_slug,
    insiderRole: row.insider_role,
    tradeType: row.trade_type as "buy" | "sell" | "other",
    shares: row.shares,
    price: row.price,
    totalValue: row.total_value,
    currency: row.currency,
    tradeDate: row.trade_date,
    publishedDate: row.published_date,
    sharesAfter: row.shares_after,
    relatedParty: row.related_party,
    sourceUrl: row.source_url,
    companySlug: row.company_slug,
  };
}

export async function getInsiderTradesFromDB(filters?: InsiderTradeFilters): Promise<InsiderTrade[]> {
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  let whereClause = "1=1";
  const args: (string | number)[] = [];

  if (filters?.tradeType) {
    whereClause += " AND trade_type = ?";
    args.push(filters.tradeType);
  }

  if (filters?.issuerName) {
    whereClause += " AND issuer_name LIKE ?";
    args.push(`%${filters.issuerName}%`);
  }

  if (filters?.insiderName) {
    whereClause += " AND insider_name LIKE ?";
    args.push(`%${filters.insiderName}%`);
  }

  if (filters?.fromDate) {
    whereClause += " AND trade_date >= ?";
    args.push(filters.fromDate);
  }

  if (filters?.toDate) {
    whereClause += " AND trade_date <= ?";
    args.push(filters.toDate);
  }

  args.push(limit, offset);

  const result = await getDb().execute({
    sql: `
      SELECT * FROM insider_trades
      WHERE ${whereClause}
      ORDER BY published_date DESC
      LIMIT ? OFFSET ?
    `,
    args,
  });

  return (result.rows as unknown as InsiderTradeRow[]).map(rowToTrade);
}

export async function getInsiderTradeCount(filters?: InsiderTradeFilters): Promise<number> {
  let whereClause = "1=1";
  const args: string[] = [];

  if (filters?.tradeType) {
    whereClause += " AND trade_type = ?";
    args.push(filters.tradeType);
  }

  if (filters?.issuerName) {
    whereClause += " AND issuer_name LIKE ?";
    args.push(`%${filters.issuerName}%`);
  }

  if (filters?.insiderName) {
    whereClause += " AND insider_name LIKE ?";
    args.push(`%${filters.insiderName}%`);
  }

  if (filters?.fromDate) {
    whereClause += " AND trade_date >= ?";
    args.push(filters.fromDate);
  }

  if (filters?.toDate) {
    whereClause += " AND trade_date <= ?";
    args.push(filters.toDate);
  }

  const result = await getDb().execute({
    sql: `SELECT COUNT(*) as count FROM insider_trades WHERE ${whereClause}`,
    args,
  });

  return Number(result.rows[0].count);
}

export async function getInsiderDataSummaryFromDB(): Promise<InsiderDataSummary> {
  const [countResult, recentTrades] = await Promise.all([
    getDb().execute("SELECT COUNT(*) as count FROM insider_trades"),
    getInsiderTradesFromDB({ limit: 20 }),
  ]);

  return {
    totalTrades: Number(countResult.rows[0].count),
    recentTrades,
    lastUpdate: new Date().toISOString(),
  };
}

export async function getInsiderTradesByCompanySlug(companySlug: string, limit: number = 20): Promise<InsiderTrade[]> {
  const result = await getDb().execute({
    sql: `
      SELECT * FROM insider_trades
      WHERE company_slug = ?
      ORDER BY published_date DESC
      LIMIT ?
    `,
    args: [companySlug, limit],
  });

  return (result.rows as unknown as InsiderTradeRow[]).map(rowToTrade);
}

export async function getInsiderTradesByInsiderSlug(insiderSlug: string, limit: number = 100): Promise<InsiderTrade[]> {
  const result = await getDb().execute({
    sql: `
      SELECT * FROM insider_trades
      WHERE insider_slug = ?
      ORDER BY published_date DESC
      LIMIT ?
    `,
    args: [insiderSlug, limit],
  });

  return (result.rows as unknown as InsiderTradeRow[]).map(rowToTrade);
}

export async function getInsiderBySlug(insiderSlug: string): Promise<InsiderSummary | null> {
  const result = await getDb().execute({
    sql: `
      SELECT
        insider_name,
        insider_slug,
        COUNT(*) as total_trades,
        SUM(CASE WHEN trade_type = 'buy' THEN 1 ELSE 0 END) as buy_count,
        SUM(CASE WHEN trade_type = 'sell' THEN 1 ELSE 0 END) as sell_count,
        MAX(trade_date) as latest_trade,
        GROUP_CONCAT(DISTINCT issuer_name) as companies
      FROM insider_trades
      WHERE insider_slug = ?
      GROUP BY insider_slug
    `,
    args: [insiderSlug],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const slug = String(row.insider_slug);
  const profile = getInsiderProfile(slug);

  return {
    name: String(row.insider_name),
    slug,
    totalTrades: Number(row.total_trades),
    buyCount: Number(row.buy_count),
    sellCount: Number(row.sell_count),
    companies: String(row.companies || "").split(",").filter(Boolean),
    latestTrade: String(row.latest_trade),
    twitterHandle: profile?.twitterHandle,
    twitterAvatarUrl: profile?.twitterHandle ? getTwitterAvatarUrl(profile.twitterHandle) : undefined,
    bio: profile?.bio,
  };
}

export async function getAllInsiders(limit: number = 100): Promise<InsiderSummary[]> {
  const result = await getDb().execute({
    sql: `
      SELECT
        insider_name,
        insider_slug,
        COUNT(*) as total_trades,
        SUM(CASE WHEN trade_type = 'buy' THEN 1 ELSE 0 END) as buy_count,
        SUM(CASE WHEN trade_type = 'sell' THEN 1 ELSE 0 END) as sell_count,
        MAX(trade_date) as latest_trade,
        GROUP_CONCAT(DISTINCT issuer_name) as companies
      FROM insider_trades
      GROUP BY insider_slug
      ORDER BY total_trades DESC
      LIMIT ?
    `,
    args: [limit],
  });

  return result.rows.map((row) => ({
    name: String(row.insider_name),
    slug: String(row.insider_slug),
    totalTrades: Number(row.total_trades),
    buyCount: Number(row.buy_count),
    sellCount: Number(row.sell_count),
    companies: String(row.companies || "").split(",").filter(Boolean),
    latestTrade: String(row.latest_trade),
  }));
}

export async function getTradeTypeBreakdown(): Promise<{ buy: number; sell: number; other: number }> {
  const result = await getDb().execute(`
    SELECT trade_type, COUNT(*) as count
    FROM insider_trades
    GROUP BY trade_type
  `);

  const breakdown = { buy: 0, sell: 0, other: 0 };
  for (const row of result.rows) {
    const type = row.trade_type as string;
    const count = Number(row.count);
    if (type === "buy") breakdown.buy = count;
    else if (type === "sell") breakdown.sell = count;
    else breakdown.other = count;
  }

  return breakdown;
}

// Cached versions
export const getCachedInsiderData = unstable_cache(
  getInsiderDataSummaryFromDB,
  ["insider-data"],
  { revalidate: 300 }
);

export const getCachedInsiderTrades = unstable_cache(
  async (filters?: InsiderTradeFilters) => getInsiderTradesFromDB(filters),
  ["insider-trades"],
  { revalidate: 300 }
);

export const getCachedInsiderTradesByCompany = unstable_cache(
  async (companySlug: string) => getInsiderTradesByCompanySlug(companySlug),
  ["insider-trades-company"],
  { revalidate: 300 }
);

export const getCachedInsiderBySlug = unstable_cache(
  async (slug: string) => getInsiderBySlug(slug),
  ["insider-by-slug"],
  { revalidate: 300 }
);
