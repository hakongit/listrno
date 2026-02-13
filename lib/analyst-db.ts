import { getDb } from "./db";
import {
  AnalystReport,
  AnalystReportRow,
  AnalystDomain,
  AnalystDomainRow,
  PublicAnalystReport,
  ExtractedReportData,
  Recommendation,
  RecommendationRow,
} from "./analyst-types";
import { unstable_cache } from "next/cache";

// Newspapers/newsletters that aggregate reports from actual banks — never show as a bank source
const AGGREGATOR_PREFIXES = [
  "finansavisen",
  "børsxtra",
  "borsxtra",
  "børsbjellen",
  "borsbjellen",
  "coinmarketcap",
];

export function isAggregatorSource(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return AGGREGATOR_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

// Initialize analyst reports schema
export async function initializeAnalystDatabase() {
  const db = getDb();

  // Analyst reports table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS analyst_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gmail_message_id TEXT UNIQUE NOT NULL,

      -- Email metadata
      from_email TEXT NOT NULL,
      from_domain TEXT NOT NULL,
      subject TEXT NOT NULL,
      received_date TEXT NOT NULL,

      -- Raw storage (Vercel Blob URLs - admin only)
      email_blob_url TEXT,
      attachments_blob_urls TEXT,

      -- Extracted data (public)
      investment_bank TEXT,
      analyst_names TEXT,
      company_name TEXT,
      company_isin TEXT,
      target_price REAL,
      target_currency TEXT DEFAULT 'NOK',
      recommendation TEXT,
      summary TEXT,

      -- Historical price at report time
      price_at_report REAL,
      price_at_report_date TEXT,

      -- Processing status
      extraction_status TEXT DEFAULT 'pending',
      extraction_error TEXT,

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Analyst domains whitelist table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS analyst_domains (
      domain TEXT PRIMARY KEY,
      bank_name TEXT NOT NULL,
      added_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Add new columns for source content (idempotent - SQLite lacks IF NOT EXISTS for columns)
  try {
    await db.execute(`ALTER TABLE analyst_reports ADD COLUMN email_body TEXT`);
  } catch {
    // Column already exists
  }
  try {
    await db.execute(`ALTER TABLE analyst_reports ADD COLUMN attachment_texts TEXT`);
  } catch {
    // Column already exists
  }

  // Extraction guidance (single-row table for persistent LLM instructions)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS extraction_guidance (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      guidance_prompt TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Analyst recommendations table (1:N with analyst_reports)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS analyst_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      company_name TEXT,
      company_isin TEXT,
      recommendation TEXT,
      target_price REAL,
      target_currency TEXT DEFAULT 'NOK',
      summary TEXT,
      price_at_report REAL,
      price_at_report_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migrate existing data: if analyst_recommendations is empty but analyst_reports has rows with target_price
  const recCount = await db.execute(`SELECT COUNT(*) as count FROM analyst_recommendations`);
  const hasRecs = Number(recCount.rows[0].count) > 0;
  if (!hasRecs) {
    const reportsWithData = await db.execute(
      `SELECT id, company_name, company_isin, recommendation, target_price, target_currency, summary, price_at_report, price_at_report_date
       FROM analyst_reports WHERE target_price IS NOT NULL`
    );
    for (const row of reportsWithData.rows) {
      await db.execute({
        sql: `INSERT INTO analyst_recommendations (report_id, company_name, company_isin, recommendation, target_price, target_currency, summary, price_at_report, price_at_report_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.id as number,
          row.company_name as string | null,
          row.company_isin as string | null,
          row.recommendation as string | null,
          row.target_price as number | null,
          row.target_currency as string | null ?? 'NOK',
          row.summary as string | null,
          row.price_at_report as number | null,
          row.price_at_report_date as string | null,
        ],
      });
    }
  }

  // Add new columns to analyst_recommendations (idempotent)
  for (const col of [
    'investment_bank TEXT',
    'previous_target_price REAL',
    'previous_recommendation TEXT',
  ]) {
    try {
      await db.execute(`ALTER TABLE analyst_recommendations ADD COLUMN ${col}`);
    } catch {
      // Column already exists
    }
  }

  // Sync state table (for IMAP sync checkpointing)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_reports_date ON analyst_reports(received_date)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_reports_company ON analyst_reports(company_name)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_reports_isin ON analyst_reports(company_isin)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_reports_status ON analyst_reports(extraction_status)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_reports_domain ON analyst_reports(from_domain)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_recommendations_report ON analyst_recommendations(report_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_recommendations_company_bank ON analyst_recommendations(company_name, investment_bank)`);
}

// Convert recommendation row to Recommendation
function rowToRecommendation(row: RecommendationRow): Recommendation {
  return {
    id: row.id,
    reportId: row.report_id,
    companyName: row.company_name ?? undefined,
    companyIsin: row.company_isin ?? undefined,
    recommendation: row.recommendation ?? undefined,
    targetPrice: row.target_price ?? undefined,
    targetCurrency: row.target_currency,
    summary: row.summary ?? undefined,
    priceAtReport: row.price_at_report ?? undefined,
    priceAtReportDate: row.price_at_report_date ?? undefined,
    investmentBank: row.investment_bank ?? undefined,
    previousTargetPrice: row.previous_target_price ?? undefined,
    previousRecommendation: row.previous_recommendation ?? undefined,
  };
}

// Convert database row to AnalystReport (without recommendations - attached separately)
function rowToReport(row: AnalystReportRow, recommendations: Recommendation[] = []): AnalystReport {
  return {
    id: row.id,
    gmailMessageId: row.gmail_message_id,
    fromEmail: row.from_email,
    fromDomain: row.from_domain,
    subject: row.subject,
    receivedDate: row.received_date,
    emailBlobUrl: row.email_blob_url ?? undefined,
    attachmentsBlobUrls: row.attachments_blob_urls
      ? JSON.parse(row.attachments_blob_urls)
      : undefined,
    investmentBank: row.investment_bank ?? undefined,
    analystNames: row.analyst_names ? JSON.parse(row.analyst_names) : undefined,
    recommendations,
    emailBody: row.email_body ?? undefined,
    attachmentTexts: row.attachment_texts ? JSON.parse(row.attachment_texts) : undefined,
    extractionStatus: row.extraction_status as AnalystReport['extractionStatus'],
    extractionError: row.extraction_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert domain row
function rowToDomain(row: AnalystDomainRow): AnalystDomain {
  return {
    domain: row.domain,
    bankName: row.bank_name,
    addedAt: row.added_at,
  };
}

// Fetch recommendations for a set of report IDs
async function getRecommendationsByReportIds(reportIds: number[]): Promise<Map<number, Recommendation[]>> {
  if (reportIds.length === 0) return new Map();
  const db = getDb();
  const placeholders = reportIds.map(() => '?').join(',');
  const result = await db.execute({
    sql: `SELECT * FROM analyst_recommendations WHERE report_id IN (${placeholders}) ORDER BY id`,
    args: reportIds,
  });
  const map = new Map<number, Recommendation[]>();
  for (const row of result.rows) {
    const rec = rowToRecommendation(row as unknown as RecommendationRow);
    const existing = map.get(rec.reportId) || [];
    existing.push(rec);
    map.set(rec.reportId, existing);
  }
  return map;
}

// CRUD Operations

export async function createAnalystReport(data: {
  gmailMessageId: string;
  fromEmail: string;
  fromDomain: string;
  subject: string;
  receivedDate: string;
  emailBlobUrl?: string;
  attachmentsBlobUrls?: string[];
  emailBody?: string;
  attachmentTexts?: string[];
}): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      INSERT INTO analyst_reports (
        gmail_message_id, from_email, from_domain, subject, received_date,
        email_blob_url, attachments_blob_urls, email_body, attachment_texts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      data.gmailMessageId,
      data.fromEmail,
      data.fromDomain,
      data.subject,
      data.receivedDate,
      data.emailBlobUrl ?? null,
      data.attachmentsBlobUrls ? JSON.stringify(data.attachmentsBlobUrls) : null,
      data.emailBody ?? null,
      data.attachmentTexts ? JSON.stringify(data.attachmentTexts) : null,
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function getAnalystReportById(id: number): Promise<AnalystReport | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM analyst_reports WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;

  const row = result.rows[0] as unknown as AnalystReportRow;
  const recsResult = await db.execute({
    sql: `SELECT * FROM analyst_recommendations WHERE report_id = ? ORDER BY id`,
    args: [id],
  });
  const recommendations = (recsResult.rows as unknown as RecommendationRow[]).map(rowToRecommendation);
  return rowToReport(row, recommendations);
}

export async function getAnalystReportByGmailId(gmailMessageId: string): Promise<AnalystReport | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM analyst_reports WHERE gmail_message_id = ?`,
    args: [gmailMessageId],
  });
  if (result.rows.length === 0) return null;

  const row = result.rows[0] as unknown as AnalystReportRow;
  const reportId = row.id;
  const recsResult = await db.execute({
    sql: `SELECT * FROM analyst_recommendations WHERE report_id = ? ORDER BY id`,
    args: [reportId],
  });
  const recommendations = (recsResult.rows as unknown as RecommendationRow[]).map(rowToRecommendation);
  return rowToReport(row, recommendations);
}

export async function updateAnalystReportExtraction(
  id: number,
  data: ExtractedReportData
): Promise<void> {
  const db = getDb();

  // Update report-level fields
  await db.execute({
    sql: `
      UPDATE analyst_reports SET
        investment_bank = ?,
        analyst_names = ?,
        extraction_status = 'processed',
        extraction_error = NULL,
        updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [
      data.investmentBank ?? null,
      data.analystNames ? JSON.stringify(data.analystNames) : null,
      id,
    ],
  });

  // Delete old recommendations for this report
  await db.execute({
    sql: `DELETE FROM analyst_recommendations WHERE report_id = ?`,
    args: [id],
  });

  // Insert new recommendations - only those with a targetPrice
  for (const rec of data.recommendations) {
    if (!rec.targetPrice) continue;
    await db.execute({
      sql: `INSERT INTO analyst_recommendations (report_id, company_name, company_isin, recommendation, target_price, target_currency, summary, investment_bank, previous_target_price, previous_recommendation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        rec.companyName ?? null,
        rec.companyIsin ?? null,
        rec.recommendation ?? null,
        rec.targetPrice,
        rec.targetCurrency ?? 'NOK',
        rec.summary ?? null,
        rec.investmentBank ?? null,
        rec.previousTargetPrice ?? null,
        rec.previousRecommendation ?? null,
      ],
    });
  }
}

export async function updateAnalystReportAttachmentTexts(id: number, attachmentTexts: string[]): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE analyst_reports SET attachment_texts = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [JSON.stringify(attachmentTexts), id],
  });
}

export async function markAnalystReportFailed(id: number, error: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `
      UPDATE analyst_reports SET
        extraction_status = 'failed',
        extraction_error = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [error, id],
  });
}

export async function deleteAnalystReport(id: number): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `DELETE FROM analyst_recommendations WHERE report_id = ?`,
    args: [id],
  });
  await db.execute({
    sql: `DELETE FROM analyst_reports WHERE id = ?`,
    args: [id],
  });
}

// Query functions

export async function getAllAnalystReports(options?: {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'processed' | 'failed';
}): Promise<AnalystReport[]> {
  const db = getDb();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let sql = `SELECT * FROM analyst_reports`;
  const args: (string | number)[] = [];

  if (options?.status) {
    sql += ` WHERE extraction_status = ?`;
    args.push(options.status);
  }

  sql += ` ORDER BY received_date DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const result = await db.execute({ sql, args });
  const rows = result.rows as unknown as AnalystReportRow[];

  // Batch fetch recommendations
  const reportIds = rows.map(r => r.id);
  const recsMap = await getRecommendationsByReportIds(reportIds);

  return rows.map(row => rowToReport(row, recsMap.get(row.id) || []));
}

export async function getPublicAnalystReports(options?: {
  limit?: number;
  offset?: number;
  companyIsin?: string;
  companyName?: string;
  investmentBank?: string;
}): Promise<PublicAnalystReport[]> {
  const db = getDb();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let whereClause = `ar.extraction_status = 'processed' AND rec.target_price IS NOT NULL`;
  const args: (string | number)[] = [];

  if (options?.companyIsin) {
    whereClause += ` AND rec.company_isin = ?`;
    args.push(options.companyIsin);
  }

  if (options?.companyName) {
    whereClause += ` AND rec.company_name = ?`;
    args.push(options.companyName);
  }

  if (options?.investmentBank) {
    whereClause += ` AND COALESCE(rec.investment_bank, ar.investment_bank) = ?`;
    args.push(options.investmentBank);
  }

  args.push(limit, offset);

  const result = await db.execute({
    sql: `
      SELECT
        rec.id as recommendation_id,
        ar.id as report_id,
        ar.investment_bank,
        ar.analyst_names,
        rec.company_name,
        rec.company_isin,
        rec.target_price,
        rec.target_currency,
        rec.recommendation,
        rec.summary,
        rec.price_at_report,
        ar.received_date,
        ar.created_at,
        rec.investment_bank as rec_investment_bank,
        rec.previous_target_price,
        rec.previous_recommendation
      FROM analyst_recommendations rec
      JOIN analyst_reports ar ON ar.id = rec.report_id
      WHERE ${whereClause}
      ORDER BY ar.received_date DESC
      LIMIT ? OFFSET ?
    `,
    args,
  });

  return result.rows.map((row) => ({
    recommendationId: Number(row.recommendation_id),
    reportId: Number(row.report_id),
    investmentBank: row.investment_bank ? String(row.investment_bank) : undefined,
    analystNames: row.analyst_names ? JSON.parse(String(row.analyst_names)) : undefined,
    companyName: row.company_name ? String(row.company_name) : undefined,
    companyIsin: row.company_isin ? String(row.company_isin) : undefined,
    targetPrice: row.target_price != null ? Number(row.target_price) : undefined,
    targetCurrency: String(row.target_currency || 'NOK'),
    recommendation: row.recommendation ? String(row.recommendation) : undefined,
    summary: row.summary ? String(row.summary) : undefined,
    priceAtReport: row.price_at_report != null ? Number(row.price_at_report) : undefined,
    receivedDate: String(row.received_date),
    createdAt: String(row.created_at),
    recInvestmentBank: row.rec_investment_bank ? String(row.rec_investment_bank) : undefined,
    previousTargetPrice: row.previous_target_price != null ? Number(row.previous_target_price) : undefined,
    previousRecommendation: row.previous_recommendation ? String(row.previous_recommendation) : undefined,
  }));
}

export async function getAnalystReportCount(status?: 'pending' | 'processed' | 'failed'): Promise<number> {
  const db = getDb();
  let sql = `SELECT COUNT(*) as count FROM analyst_reports`;
  const args: string[] = [];

  if (status) {
    sql += ` WHERE extraction_status = ?`;
    args.push(status);
  }

  const result = await db.execute({ sql, args });
  return Number(result.rows[0].count);
}

// Domain whitelist operations

export async function addAnalystDomain(domain: string, bankName: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT OR REPLACE INTO analyst_domains (domain, bank_name) VALUES (?, ?)`,
    args: [domain.toLowerCase(), bankName],
  });
}

export async function removeAnalystDomain(domain: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `DELETE FROM analyst_domains WHERE domain = ?`,
    args: [domain.toLowerCase()],
  });
}

export async function getAllAnalystDomains(): Promise<AnalystDomain[]> {
  const db = getDb();
  const result = await db.execute(`SELECT * FROM analyst_domains ORDER BY bank_name`);
  return (result.rows as unknown as AnalystDomainRow[]).map(rowToDomain);
}

export async function isWhitelistedDomain(domain: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT 1 FROM analyst_domains WHERE domain = ?`,
    args: [domain.toLowerCase()],
  });
  return result.rows.length > 0;
}

export async function getBankNameForDomain(domain: string): Promise<string | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT bank_name FROM analyst_domains WHERE domain = ?`,
    args: [domain.toLowerCase()],
  });
  if (result.rows.length === 0) return null;
  return String(result.rows[0].bank_name);
}

// Extraction guidance operations

export async function getExtractionGuidance(): Promise<string> {
  const db = getDb();
  const result = await db.execute(`SELECT guidance_prompt FROM extraction_guidance WHERE id = 1`);
  if (result.rows.length === 0) return "";
  return String(result.rows[0].guidance_prompt);
}

export async function updateExtractionGuidance(text: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO extraction_guidance (id, guidance_prompt, updated_at)
      VALUES (1, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        guidance_prompt = excluded.guidance_prompt,
        updated_at = excluded.updated_at
    `,
    args: [text],
  });
}

// Sync state operations (for IMAP sync checkpointing)

export async function getSyncState(key: string): Promise<string | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT value FROM sync_state WHERE key = ?`,
    args: [key],
  });
  if (result.rows.length === 0) return null;
  return String(result.rows[0].value);
}

export async function setSyncState(key: string, value: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO sync_state (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    args: [key, value],
  });
}

export async function getPreviousRecommendation(
  companyName: string,
  bank: string,
  beforeDate: string
): Promise<{ targetPrice?: number; recommendation?: string } | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT rec.target_price, rec.recommendation
      FROM analyst_recommendations rec
      JOIN analyst_reports ar ON ar.id = rec.report_id
      WHERE rec.company_name = ?
        AND COALESCE(rec.investment_bank, ar.investment_bank) = ?
        AND ar.received_date < ?
        AND rec.target_price IS NOT NULL
      ORDER BY ar.received_date DESC
      LIMIT 1
    `,
    args: [companyName, bank, beforeDate],
  });
  if (result.rows.length === 0) return null;
  return {
    targetPrice: result.rows[0].target_price != null ? Number(result.rows[0].target_price) : undefined,
    recommendation: result.rows[0].recommendation ? String(result.rows[0].recommendation) : undefined,
  };
}

// Cached versions for public pages
export const getCachedPublicAnalystReports = unstable_cache(
  async (options?: { limit?: number; companyIsin?: string }) =>
    getPublicAnalystReports(options),
  ["public-analyst-reports"],
  { revalidate: 300, tags: ["public-analyst-reports"] }
);

export const getCachedAnalystReportCount = unstable_cache(
  async () => getAnalystReportCount('processed'),
  ["analyst-report-count"],
  { revalidate: 300, tags: ["public-analyst-reports"] }
);

// Investment bank queries

export interface InvestmentBankSummary {
  name: string;
  reportCount: number;
}

export async function getInvestmentBanks(): Promise<InvestmentBankSummary[]> {
  const db = getDb();
  const likeConditions = AGGREGATOR_PREFIXES.map(() => "LOWER(TRIM(COALESCE(rec.investment_bank, ar.investment_bank))) NOT LIKE ?").join(' AND ');
  const likeArgs = AGGREGATOR_PREFIXES.map((p) => `${p}%`);
  const result = await db.execute({
    sql: `
      SELECT COALESCE(rec.investment_bank, ar.investment_bank) as name, COUNT(DISTINCT rec.id) as report_count
      FROM analyst_reports ar
      JOIN analyst_recommendations rec ON rec.report_id = ar.id
      WHERE ar.extraction_status = 'processed'
        AND COALESCE(rec.investment_bank, ar.investment_bank) IS NOT NULL
        AND rec.target_price IS NOT NULL
        AND ${likeConditions}
      GROUP BY COALESCE(rec.investment_bank, ar.investment_bank)
      ORDER BY report_count DESC
    `,
    args: likeArgs,
  });
  return result.rows.map((row) => ({
    name: String(row.name),
    reportCount: Number(row.report_count),
  }));
}

export const getCachedInvestmentBanks = unstable_cache(
  getInvestmentBanks,
  ["investment-banks"],
  { revalidate: 300, tags: ["public-analyst-reports"] }
);

export const getCachedPublicAnalystReportsByBank = unstable_cache(
  async (bankName: string) => getPublicAnalystReports({ limit: 200, investmentBank: bankName }),
  ["public-analyst-reports-by-bank"],
  { revalidate: 300, tags: ["public-analyst-reports"] }
);

export const getCachedPublicAnalystReportsByCompany = unstable_cache(
  async (companyName: string, companyIsin?: string) =>
    companyIsin
      ? getPublicAnalystReports({ limit: 500, companyIsin })
      : getPublicAnalystReports({ limit: 500, companyName }),
  ["public-analyst-reports-by-company"],
  { revalidate: 300, tags: ["public-analyst-reports"] }
);

export interface AnalystCompanySummary {
  name: string;
  isin: string | null;
  reportCount: number;
}

export async function getAnalystCompanies(): Promise<AnalystCompanySummary[]> {
  const db = getDb();
  const result = await db.execute(`
    SELECT
      MAX(rec.company_name) as name,
      rec.company_isin as isin,
      COUNT(DISTINCT rec.id) as report_count
    FROM analyst_recommendations rec
    JOIN analyst_reports ar ON ar.id = rec.report_id
    WHERE ar.extraction_status = 'processed'
      AND rec.company_name IS NOT NULL
      AND rec.target_price IS NOT NULL
    GROUP BY COALESCE(rec.company_isin, rec.company_name)
    ORDER BY report_count DESC
  `);
  return result.rows.map((row) => ({
    name: String(row.name),
    isin: row.isin ? String(row.isin) : null,
    reportCount: Number(row.report_count),
  }));
}

export const getCachedAnalystCompanies = unstable_cache(
  getAnalystCompanies,
  ["analyst-companies"],
  { revalidate: 300, tags: ["public-analyst-reports"] }
);
