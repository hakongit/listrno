import { getDb, initializeDatabase, resetDatabase } from "../lib/db";
import { slugify } from "../lib/utils";

const FINANSTILSYNET_API = "https://ssr.finanstilsynet.no/api/v2/instruments/export-json";

interface ActivePosition {
  date: string;
  shortPercent: number;
  shares: number;
  positionHolder: string;
}

interface Event {
  date: string;
  shortPercent: number;
  shares: number;
  activePositions: ActivePosition[];
}

interface Instrument {
  isin: string;
  issuerName: string;
  events: Event[];
}

async function fetchFromFinanstilsynet(): Promise<Instrument[]> {
  const response = await fetch(FINANSTILSYNET_API);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }
  const data = await response.json();
  return data;
}

async function syncData() {
  const shouldReset = process.argv.includes("--reset");

  if (shouldReset) {
    console.log("Resetting database...");
    await resetDatabase();
  }

  console.log("Initializing database...");
  await initializeDatabase();

  console.log("Fetching data from Finanstilsynet...");
  const instruments = await fetchFromFinanstilsynet();
  console.log(`Fetched ${instruments.length} instruments`);

  // Batch insert companies
  const companyStatements = instruments.map((instrument) => ({
    sql: `INSERT OR IGNORE INTO companies (isin, issuer_name, slug) VALUES (?, ?, ?)`,
    args: [instrument.isin, instrument.issuerName, slugify(instrument.issuerName)],
  }));

  await getDb().batch(companyStatements);
  console.log(`Processed ${instruments.length} companies`);

  // Collect all positions, including closings (0%) when holders exit
  const positionStatements: { sql: string; args: (string | number)[] }[] = [];

  for (const instrument of instruments) {
    // Sort events by date (oldest first) to track position changes
    const sortedEvents = [...instrument.events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Track active holders to detect closings
    const activeHolders = new Set<string>();

    for (const event of sortedEvents) {
      const currentHolders = new Set(event.activePositions.map((p) => p.positionHolder));

      // Insert positions for all holders in this event
      for (const position of event.activePositions) {
        positionStatements.push({
          sql: `INSERT OR REPLACE INTO positions (isin, holder_name, position_pct, position_shares, position_date)
                VALUES (?, ?, ?, ?, ?)`,
          args: [
            instrument.isin,
            position.positionHolder,
            position.shortPercent,
            position.shares,
            position.date,
          ],
        });
      }

      // Insert 0% closing records for holders who exited
      for (const holder of activeHolders) {
        if (!currentHolders.has(holder)) {
          positionStatements.push({
            sql: `INSERT OR REPLACE INTO positions (isin, holder_name, position_pct, position_shares, position_date)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [
              instrument.isin,
              holder,
              0, // Position closed
              0,
              event.date, // Use event date as closing date
            ],
          });
        }
      }

      // Update active holders for next iteration
      activeHolders.clear();
      for (const h of currentHolders) {
        activeHolders.add(h);
      }
    }
  }

  console.log(`Found ${positionStatements.length} position records`);

  // Batch insert positions in chunks of 100
  const BATCH_SIZE = 100;
  let positionsInserted = 0;

  for (let i = 0; i < positionStatements.length; i += BATCH_SIZE) {
    const batch = positionStatements.slice(i, i + BATCH_SIZE);
    await getDb().batch(batch);
    positionsInserted += batch.length;
    if (positionsInserted % 500 === 0 || positionsInserted === positionStatements.length) {
      console.log(`Inserted ${positionsInserted}/${positionStatements.length} positions...`);
    }
  }

  // Get stats
  const companyCount = await getDb().execute("SELECT COUNT(*) as count FROM companies");
  const positionCount = await getDb().execute("SELECT COUNT(*) as count FROM positions");
  const dateRange = await getDb().execute("SELECT MIN(position_date) as min_date, MAX(position_date) as max_date FROM positions");

  console.log("\nDatabase stats:");
  console.log(`- Companies: ${companyCount.rows[0].count}`);
  console.log(`- Positions: ${positionCount.rows[0].count}`);
  console.log(`- Date range: ${dateRange.rows[0].min_date} to ${dateRange.rows[0].max_date}`);
}

syncData()
  .then(() => {
    console.log("\nSync completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
