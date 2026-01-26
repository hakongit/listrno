export interface RawPosition {
  positionHolder: string;
  shortPercent: string;
  shares: string;
}

export interface RawEvent {
  date: string;
  activePositions: RawPosition[];
  closedPositions?: RawPosition[];
}

export interface RawInstrument {
  isin: string;
  issuerName: string;
  events: RawEvent[];
}

export interface ShortPosition {
  positionHolder: string;
  isin: string;
  issuerName: string;
  positionDate: string;
  positionPct: number;
  positionShares: number;
  status: "active" | "closed";
}

export interface HistoricalDataPoint {
  date: string;
  totalShortPct: number;
  positions: {
    holder: string;
    pct: number;
  }[];
}

export interface CompanyShortData {
  isin: string;
  issuerName: string;
  slug: string;
  ticker: string | null;
  totalShortPct: number;
  totalShortShares: number;
  previousShortPct: number | null;
  previousDate: string | null;
  change: number;
  positions: ShortPosition[];
  latestDate: string;
  history: HistoricalDataPoint[];
  stockPrice: number | null;
  shortValue: number | null;
}

export interface HolderPositionHistory {
  date: string;
  pct: number;
  shares: number;
}

export interface HolderCompanyPosition {
  isin: string;
  issuerName: string;
  companySlug: string;
  currentPct: number;
  currentShares: number;
  latestDate: string;
  history: HolderPositionHistory[];
  stockPrice: number | null;
  positionValue: number | null;
}

export interface PositionHolder {
  name: string;
  slug: string;
  totalPositions: number;
  totalShortPct: number;
  companies: HolderCompanyPosition[];
}

export interface ShortDataSummary {
  totalCompanies: number;
  totalPositions: number;
  uniqueHolders: number;
  lastUpdate: string;
  companies: CompanyShortData[];
  holders: PositionHolder[];
}
