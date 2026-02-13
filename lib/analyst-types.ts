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

  // Extracted data (report-level)
  investmentBank?: string;
  analystNames?: string[];

  // Recommendations (company-level extracted data)
  recommendations: Recommendation[];

  // Source content (admin only, for re-processing)
  emailBody?: string;
  attachmentTexts?: string[];

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
  email_body: string | null;
  attachment_texts: string | null;
  extraction_status: string;
  extraction_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: number;
  reportId: number;
  companyName?: string;
  companyIsin?: string;
  recommendation?: string;
  targetPrice?: number;
  targetCurrency: string;
  summary?: string;
  priceAtReport?: number;
  priceAtReportDate?: string;
  investmentBank?: string;
  previousTargetPrice?: number;
  previousRecommendation?: string;
}

export interface RecommendationRow {
  id: number;
  report_id: number;
  company_name: string | null;
  company_isin: string | null;
  recommendation: string | null;
  target_price: number | null;
  target_currency: string;
  summary: string | null;
  price_at_report: number | null;
  price_at_report_date: string | null;
  investment_bank: string | null;
  previous_target_price: number | null;
  previous_recommendation: string | null;
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

export interface ExtractedRecommendation {
  companyName?: string;
  companyIsin?: string;
  targetPrice?: number;
  targetCurrency?: string;
  recommendation?: string;
  summary?: string;
  investmentBank?: string;
  previousTargetPrice?: number;
  previousRecommendation?: string;
}

export interface ExtractedReportData {
  investmentBank?: string;
  analystNames?: string[];
  recommendations: ExtractedRecommendation[];
}

export interface PublicAnalystReport {
  recommendationId: number;
  reportId: number;
  investmentBank?: string;
  analystNames?: string[];
  companyName?: string;
  companyIsin?: string;
  targetPrice?: number;
  targetCurrency: string;
  recommendation?: string;
  summary?: string;
  priceAtReport?: number;
  receivedDate: string;
  createdAt: string;
  recInvestmentBank?: string;
  previousTargetPrice?: number;
  previousRecommendation?: string;
}
