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

export interface CompanyShortData {
  isin: string;
  issuerName: string;
  slug: string;
  totalShortPct: number;
  positions: ShortPosition[];
  latestDate: string;
}

export interface ShortDataSummary {
  totalCompanies: number;
  totalPositions: number;
  uniqueHolders: number;
  lastUpdate: string;
  companies: CompanyShortData[];
}
