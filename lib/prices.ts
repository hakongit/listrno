// Stock quote data from Yahoo Finance
export interface StockQuote {
  price: number;
  regularMarketVolume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

// Fetch stock quotes from Yahoo Finance using v8 chart API
export async function fetchStockQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
  const quotes = new Map<string, StockQuote>();

  if (tickers.length === 0) return quotes;

  // Fetch quotes in parallel for all tickers
  const fetchPromises = tickers.map(async (ticker) => {
    try {
      // Use v8 chart API which is more accessible
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      const result = data.chart?.result?.[0];

      if (result) {
        const meta = result.meta;
        const price = meta?.chartPreviousClose || meta?.previousClose || meta?.regularMarketPrice;

        if (price) {
          return {
            ticker,
            quote: {
              price,
              regularMarketVolume: meta?.regularMarketVolume || null,
              fiftyTwoWeekHigh: meta?.fiftyTwoWeekHigh || null,
              fiftyTwoWeekLow: meta?.fiftyTwoWeekLow || null,
            } as StockQuote,
          };
        }
      }
    } catch {
      // Silently ignore individual ticker errors
    }
    return null;
  });

  const results = await Promise.all(fetchPromises);

  for (const result of results) {
    if (result) {
      quotes.set(result.ticker, result.quote);
    }
  }

  return quotes;
}

// Legacy function for backwards compatibility
export async function fetchStockPrices(tickers: string[]): Promise<Map<string, number>> {
  const quotes = await fetchStockQuotes(tickers);
  const prices = new Map<string, number>();

  for (const [ticker, quote] of quotes) {
    prices.set(ticker, quote.price);
  }

  return prices;
}

export function formatMarketValue(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} mrd`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} mill`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)} k`;
  }
  return value.toFixed(0);
}
