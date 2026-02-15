import { createClient, Client } from "@libsql/client/web";

let _db: Client | null = null;

export function getDb(): Client {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error("TURSO_DATABASE_URL is not set");
    }
    if (!authToken) {
      throw new Error("TURSO_AUTH_TOKEN is not set");
    }

    _db = createClient({ url: url.trim(), authToken: authToken.trim() });
  }
  return _db;
}

export async function resetDatabase() {
  await getDb().execute(`DROP TABLE IF EXISTS positions`);
  await getDb().execute(`DROP TABLE IF EXISTS stock_prices`);
  await getDb().execute(`DROP TABLE IF EXISTS companies`);
}

export async function resetInsiderDatabase() {
  await getDb().execute(`DROP TABLE IF EXISTS insider_trades`);
}

export async function initializeDatabase() {
  // Companies table
  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS companies (
      isin TEXT PRIMARY KEY,
      issuer_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Short positions table (historical data)
  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isin TEXT NOT NULL,
      holder_name TEXT NOT NULL,
      position_pct REAL NOT NULL,
      position_shares INTEGER,
      position_date TEXT NOT NULL,
      recorded_at TEXT DEFAULT (datetime('now')),
      UNIQUE(isin, holder_name, position_date)
    )
  `);

  // Stock prices table (for calculating market values)
  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS stock_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isin TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'NOK',
      recorded_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes for common queries
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_positions_isin ON positions(isin)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_positions_holder ON positions(holder_name)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_positions_date ON positions(position_date)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_positions_isin_date ON positions(isin, position_date)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_positions_holder_date ON positions(holder_name, position_date)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_stock_prices_isin ON stock_prices(isin)`);
}

export async function initializeTickerMappings() {
  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS ticker_mappings (
      isin TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      company_name TEXT,
      source TEXT DEFAULT 'hardcoded',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

export async function bootstrapTickerMappings(
  mappings: Array<{ isin: string; ticker: string; companyName?: string }>
) {
  const db = getDb();
  for (const m of mappings) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO ticker_mappings (isin, ticker, company_name, source) VALUES (?, ?, ?, 'hardcoded')`,
      args: [m.isin, m.ticker, m.companyName ?? null],
    });
  }
}

export async function getTickerFromDb(isin: string): Promise<string | null> {
  const result = await getDb().execute({
    sql: `SELECT ticker FROM ticker_mappings WHERE isin = ?`,
    args: [isin],
  });
  if (result.rows.length > 0) {
    return String(result.rows[0].ticker);
  }
  return null;
}

export async function saveTickerMapping(
  isin: string,
  ticker: string,
  companyName: string | null,
  source: string
): Promise<void> {
  await getDb().execute({
    sql: `INSERT OR REPLACE INTO ticker_mappings (isin, ticker, company_name, source, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
    args: [isin, ticker, companyName, source],
  });
}

export async function initializeInsiderDatabase() {
  // Insider trades table
  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS insider_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE NOT NULL,
      isin TEXT,
      issuer_name TEXT NOT NULL,
      ticker TEXT,
      insider_name TEXT NOT NULL,
      insider_slug TEXT,
      insider_role TEXT,
      trade_type TEXT NOT NULL,
      shares INTEGER,
      price REAL,
      total_value REAL,
      currency TEXT DEFAULT 'NOK',
      trade_date TEXT NOT NULL,
      published_date TEXT NOT NULL,
      shares_after INTEGER,
      related_party TEXT,
      source_url TEXT NOT NULL,
      company_slug TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes for common queries
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_insider_trades_isin ON insider_trades(isin)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_insider_trades_date ON insider_trades(trade_date)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_insider_trades_published ON insider_trades(published_date)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_insider_trades_insider ON insider_trades(insider_name)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_insider_trades_insider_slug ON insider_trades(insider_slug)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_insider_trades_issuer ON insider_trades(issuer_name)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_insider_trades_company_slug ON insider_trades(company_slug)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_insider_trades_type ON insider_trades(trade_type)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_insider_trades_company_date ON insider_trades(company_slug, trade_date)`);
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_insider_trades_slug_date ON insider_trades(insider_slug, trade_date)`);
}
