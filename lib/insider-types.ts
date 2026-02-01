export interface InsiderTrade {
  messageId: string;
  isin: string | null;
  issuerName: string;
  ticker: string | null;
  insiderName: string;
  insiderSlug: string;
  insiderRole: string | null;
  tradeType: "buy" | "sell" | "other";
  shares: number | null;
  price: number | null;
  totalValue: number | null;
  currency: string;
  tradeDate: string;
  publishedDate: string;
  sharesAfter: number | null;
  relatedParty: string | null;
  sourceUrl: string;
  companySlug: string | null;
}

export interface InsiderTradeRow {
  id: number;
  message_id: string;
  isin: string | null;
  issuer_name: string;
  ticker: string | null;
  insider_name: string;
  insider_slug: string;
  insider_role: string | null;
  trade_type: string;
  shares: number | null;
  price: number | null;
  total_value: number | null;
  currency: string;
  trade_date: string;
  published_date: string;
  shares_after: number | null;
  related_party: string | null;
  source_url: string;
  company_slug: string | null;
  created_at: string;
}

export interface InsiderSummary {
  name: string;
  slug: string;
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  companies: string[];
  latestTrade: string;
}

export interface InsiderDataSummary {
  totalTrades: number;
  recentTrades: InsiderTrade[];
  lastUpdate: string;
}

export interface InsiderTradeFilters {
  tradeType?: "buy" | "sell" | "other";
  issuerName?: string;
  insiderName?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}
