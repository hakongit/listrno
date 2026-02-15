// Stock quote data from Yahoo Finance
export interface StockQuote {
  price: number;
  regularMarketVolume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketCap: number | null;
}

const FETCH_TIMEOUT_MS = 10_000; // 10 second timeout per request
const MAX_CONCURRENT = 10; // Limit concurrent Yahoo Finance requests

// Fetch stock quotes from Yahoo Finance using v8 chart API
export async function fetchStockQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
  const quotes = new Map<string, StockQuote>();

  if (tickers.length === 0) return quotes;

  // Process in batches to avoid overwhelming Yahoo Finance
  for (let i = 0; i < tickers.length; i += MAX_CONCURRENT) {
    const batch = tickers.slice(i, i + MAX_CONCURRENT);

    const fetchPromises = batch.map(async (ticker) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`;

        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json",
          },
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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
                marketCap: meta?.marketCap || null,
              } as StockQuote,
            };
          }
        }
      } catch {
        // Silently ignore individual ticker errors (timeout, network, etc.)
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);

    for (const result of results) {
      if (result) {
        quotes.set(result.ticker, result.quote);
      }
    }
  }

  return quotes;
}

// Search Yahoo Finance for a ticker matching the given ISIN or company name
// Returns the best .OL or .ST match, or null if none found
export async function searchTicker(query: string): Promise<string | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0&listsCount=0`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const quotes = data.quotes as Array<{ symbol: string; exchDisp?: string; quoteType?: string }> | undefined;
    if (!quotes || quotes.length === 0) return null;

    // Prefer Oslo (.OL) or Stockholm (.ST) listed equities
    const nordicMatch = quotes.find(
      (q) => q.quoteType === "EQUITY" && (q.symbol.endsWith(".OL") || q.symbol.endsWith(".ST"))
    );
    if (nordicMatch) return nordicMatch.symbol;

    // Fall back to first equity result
    const equityMatch = quotes.find((q) => q.quoteType === "EQUITY");
    if (equityMatch) return equityMatch.symbol;

    return null;
  } catch {
    return null;
  }
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
