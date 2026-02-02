// Analyst report types

export interface AnalystReport {
  id: number;
  gmailMessageId: string;

  // Email metadata
  fromEmail: string;
  fromDomain: string;
  subject: string;
  receivedDate: string;

  // Raw storage (admin only)
  emailBlobUrl?: string;
  attachmentsBlobUrls?: string[];

  // Extracted data (public)
  investmentBank?: string;
  analystNames?: string[];
  companyName?: string;
  companyIsin?: string;
  targetPrice?: number;
  targetCurrency: string;
  recommendation?: string;
  summary?: string;

  // Historical price at report time
  priceAtReport?: number;
  priceAtReportDate?: string;

  // Processing status
  extractionStatus: 'pending' | 'processed' | 'failed';
  extractionError?: string;

  createdAt: string;
  updatedAt: string;
}

export interface AnalystReportRow {
  id: number;
  gmail_message_id: string;
  from_email: string;
  from_domain: string;
  subject: string;
  received_date: string;
  email_blob_url: string | null;
  attachments_blob_urls: string | null;
  investment_bank: string | null;
  analyst_names: string | null;
  company_name: string | null;
  company_isin: string | null;
  target_price: number | null;
  target_currency: string;
  recommendation: string | null;
  summary: string | null;
  price_at_report: number | null;
  price_at_report_date: string | null;
  extraction_status: string;
  extraction_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalystDomain {
  domain: string;
  bankName: string;
  addedAt: string;
}

export interface AnalystDomainRow {
  domain: string;
  bank_name: string;
  added_at: string;
}

export interface ExtractedReportData {
  investmentBank?: string;
  analystNames?: string[];
  companyName?: string;
  companyIsin?: string;
  targetPrice?: number;
  targetCurrency?: string;
  recommendation?: string;
  summary?: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: GmailMessagePart[];
  };
  internalDate: string;
}

export interface GmailMessagePart {
  mimeType: string;
  filename?: string;
  body?: {
    attachmentId?: string;
    data?: string;
    size: number;
  };
  parts?: GmailMessagePart[];
}

export interface PublicAnalystReport {
  id: number;
  investmentBank?: string;
  analystNames?: string[];
  companyName?: string;
  targetPrice?: number;
  targetCurrency: string;
  recommendation?: string;
  summary?: string;
  priceAtReport?: number;
  receivedDate: string;
  createdAt: string;
}
