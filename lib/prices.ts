// Fetch stock prices from Yahoo Finance using v8 chart API
export async function fetchStockPrices(tickers: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  if (tickers.length === 0) return prices;

  // Fetch prices in parallel for all tickers
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
        // Get the previous close or latest price
        const meta = result.meta;
        const price = meta?.chartPreviousClose || meta?.previousClose || meta?.regularMarketPrice;

        if (price) {
          return { ticker, price };
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
      prices.set(result.ticker, result.price);
    }
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
