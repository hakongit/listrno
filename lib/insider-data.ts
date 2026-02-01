import { InsiderTrade, InsiderDataSummary, InsiderTradeFilters, InsiderSummary } from "./insider-types";
import {
  getCachedInsiderData,
  getInsiderTradesFromDB,
  getInsiderTradeCount,
  getInsiderTradesByCompanySlug,
  getInsiderTradesByInsiderSlug,
  getInsiderBySlug,
  getAllInsiders,
  getTradeTypeBreakdown,
} from "./insider-data-db";

export async function getInsiderData(): Promise<InsiderDataSummary> {
  return getCachedInsiderData();
}

export async function getInsiderTrades(filters?: InsiderTradeFilters): Promise<InsiderTrade[]> {
  return getInsiderTradesFromDB(filters);
}

export async function getInsiderTradesCount(filters?: InsiderTradeFilters): Promise<number> {
  return getInsiderTradeCount(filters);
}

export async function getCompanyInsiderTrades(companySlug: string): Promise<InsiderTrade[]> {
  return getInsiderTradesByCompanySlug(companySlug);
}

export async function getInsiderTradesByPerson(insiderSlug: string): Promise<InsiderTrade[]> {
  return getInsiderTradesByInsiderSlug(insiderSlug);
}

export async function getInsiderPerson(insiderSlug: string): Promise<InsiderSummary | null> {
  return getInsiderBySlug(insiderSlug);
}

export async function getTopInsiders(limit: number = 50): Promise<InsiderSummary[]> {
  return getAllInsiders(limit);
}

export async function getInsiderStats(): Promise<{
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  otherCount: number;
}> {
  const breakdown = await getTradeTypeBreakdown();
  return {
    totalTrades: breakdown.buy + breakdown.sell + breakdown.other,
    buyCount: breakdown.buy,
    sellCount: breakdown.sell,
    otherCount: breakdown.other,
  };
}
