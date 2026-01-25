// Fetch stock prices from Yahoo Finance
export async function fetchStockPrices(tickers: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  if (tickers.length === 0) return prices;

  try {
    // Yahoo Finance API endpoint for quotes
    const symbols = tickers.join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      console.error("Failed to fetch stock prices:", res.status);
      return prices;
    }

    const data = await res.json();

    if (data.quoteResponse?.result) {
      for (const quote of data.quoteResponse.result) {
        // Use regularMarketPreviousClose for previous day's closing price
        const price = quote.regularMarketPreviousClose || quote.regularMarketPrice;
        if (price && quote.symbol) {
          prices.set(quote.symbol, price);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching stock prices:", error);
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
