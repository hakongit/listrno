import { getDb } from "./db";
import {
  AnalystReport,
  AnalystReportRow,
  AnalystDomain,
  AnalystDomainRow,
  PublicAnalystReport,
  ExtractedReportData,
} from "./analyst-types";
import { unstable_cache } from "next/cache";

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

  // Create indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_reports_date ON analyst_reports(received_date)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_reports_company ON analyst_reports(company_name)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_reports_isin ON analyst_reports(company_isin)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_reports_status ON analyst_reports(extraction_status)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analyst_reports_domain ON analyst_reports(from_domain)`);
}

// Convert database row to AnalystReport
function rowToReport(row: AnalystReportRow): AnalystReport {
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
    companyName: row.company_name ?? undefined,
    companyIsin: row.company_isin ?? undefined,
    targetPrice: row.target_price ?? undefined,
    targetCurrency: row.target_currency,
    recommendation: row.recommendation ?? undefined,
    summary: row.summary ?? undefined,
    priceAtReport: row.price_at_report ?? undefined,
    priceAtReportDate: row.price_at_report_date ?? undefined,
    emailBody: row.email_body ?? undefined,
    attachmentTexts: row.attachment_texts ? JSON.parse(row.attachment_texts) : undefined,
    extractionStatus: row.extraction_status as AnalystReport['extractionStatus'],
    extractionError: row.extraction_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert database row to public report (no sensitive data)
function rowToPublicReport(row: AnalystReportRow): PublicAnalystReport {
  return {
    id: row.id,
    investmentBank: row.investment_bank ?? undefined,
    analystNames: row.analyst_names ? JSON.parse(row.analyst_names) : undefined,
    companyName: row.company_name ?? undefined,
    targetPrice: row.target_price ?? undefined,
    targetCurrency: row.target_currency,
    recommendation: row.recommendation ?? undefined,
    summary: row.summary ?? undefined,
    priceAtReport: row.price_at_report ?? undefined,
    receivedDate: row.received_date,
    createdAt: row.created_at,
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
  return rowToReport(result.rows[0] as unknown as AnalystReportRow);
}

export async function getAnalystReportByGmailId(gmailMessageId: string): Promise<AnalystReport | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM analyst_reports WHERE gmail_message_id = ?`,
    args: [gmailMessageId],
  });
  if (result.rows.length === 0) return null;
  return rowToReport(result.rows[0] as unknown as AnalystReportRow);
}

export async function updateAnalystReportExtraction(
  id: number,
  data: ExtractedReportData & {
    priceAtReport?: number;
    priceAtReportDate?: string;
  }
): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `
      UPDATE analyst_reports SET
        investment_bank = ?,
        analyst_names = ?,
        company_name = ?,
        company_isin = ?,
        target_price = ?,
        target_currency = ?,
        recommendation = ?,
        summary = ?,
        price_at_report = ?,
        price_at_report_date = ?,
        extraction_status = 'processed',
        extraction_error = NULL,
        updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [
      data.investmentBank ?? null,
      data.analystNames ? JSON.stringify(data.analystNames) : null,
      data.companyName ?? null,
      data.companyIsin ?? null,
      data.targetPrice ?? null,
      data.targetCurrency ?? 'NOK',
      data.recommendation ?? null,
      data.summary ?? null,
      data.priceAtReport ?? null,
      data.priceAtReportDate ?? null,
      id,
    ],
  });
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
  return (result.rows as unknown as AnalystReportRow[]).map(rowToReport);
}

export async function getPublicAnalystReports(options?: {
  limit?: number;
  offset?: number;
  companyIsin?: string;
  companyName?: string;
}): Promise<PublicAnalystReport[]> {
  const db = getDb();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let whereClause = `extraction_status = 'processed'`;
  const args: (string | number)[] = [];

  if (options?.companyIsin) {
    whereClause += ` AND company_isin = ?`;
    args.push(options.companyIsin);
  }

  if (options?.companyName) {
    whereClause += ` AND company_name LIKE ?`;
    args.push(`%${options.companyName}%`);
  }

  args.push(limit, offset);

  const result = await db.execute({
    sql: `
      SELECT * FROM analyst_reports
      WHERE ${whereClause}
      ORDER BY received_date DESC
      LIMIT ? OFFSET ?
    `,
    args,
  });

  return (result.rows as unknown as AnalystReportRow[]).map(rowToPublicReport);
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
