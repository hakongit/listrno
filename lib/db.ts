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

    console.log(`[DB] URL length: ${url.length}, Token length: ${authToken.length}`);
    console.log(`[DB] URL starts with: ${url.substring(0, 40)}`);

    _db = createClient({ url: url.trim(), authToken: authToken.trim() });
  }
  return _db;
}

export async function resetDatabase() {
  await getDb().execute(`DROP TABLE IF EXISTS positions`);
  await getDb().execute(`DROP TABLE IF EXISTS stock_prices`);
  await getDb().execute(`DROP TABLE IF EXISTS companies`);
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
  await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_stock_prices_isin ON stock_prices(isin)`);
}
