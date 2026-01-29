import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function resetDatabase() {
  await db.execute(`DROP TABLE IF EXISTS positions`);
  await db.execute(`DROP TABLE IF EXISTS stock_prices`);
  await db.execute(`DROP TABLE IF EXISTS companies`);
}

export async function initializeDatabase() {
  // Companies table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS companies (
      isin TEXT PRIMARY KEY,
      issuer_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Short positions table (historical data)
  await db.execute(`
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
  await db.execute(`
    CREATE TABLE IF NOT EXISTS stock_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isin TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'NOK',
      recorded_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes for common queries
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_positions_isin ON positions(isin)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_positions_holder ON positions(holder_name)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_positions_date ON positions(position_date)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_stock_prices_isin ON stock_prices(isin)`);
}
