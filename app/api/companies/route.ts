import { getShortData } from "@/lib/data";
import { getCachedAnalystCompanies, initializeAnalystDatabase } from "@/lib/analyst-db";
import { getTicker, isinToTicker } from "@/lib/tickers";
import { slugify } from "@/lib/utils";
import { NextResponse } from "next/server";

export const revalidate = 3600;

// Strip parenthetical suffixes and trailing tags from analyst company names
// e.g. "Link Mobility Group (LINK NO)" → "Link Mobility Group"
// e.g. "2020 Bulkers (NO:TOM)" → "2020 Bulkers"
// e.g. "Aker BP ASA" → "Aker BP"
function cleanCompanyName(name: string): string {
  return name
    .replace(/\s*\([^)]+\)\s*$/i, "")   // Strip ANY trailing parenthetical
    .replace(/\s+(?:NO|ASA|LTD)$/i, "")  // Strip trailing NO, ASA, LTD
    .trim();
}

export async function GET() {
  const [shortData] = await Promise.all([
    getShortData(),
    initializeAnalystDatabase(),
  ]);
  const analystCompanies = await getCachedAnalystCompanies();

  const seenSlugs = new Set<string>();
  const seenTickers = new Set<string>();
  const companies: { name: string; slug: string; ticker: string | null; type: string }[] = [];

  // Short position companies (canonical source — added first)
  for (const c of shortData.companies) {
    const slug = c.slug;
    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      const ticker = c.ticker?.replace(".OL", "") ?? null;
      if (ticker) seenTickers.add(ticker);
      companies.push({
        name: c.issuerName,
        slug: `/${slug}`,
        ticker,
        type: "short",
      });
    }
  }

  // Analyst-only companies (skip if same slug or same ticker already exists)
  for (const c of analystCompanies) {
    const cleanName = cleanCompanyName(c.name);
    const slug = slugify(cleanName);
    // Resolve ticker from ISIN or name
    let ticker: string | null = null;
    if (c.isin) {
      ticker = isinToTicker[c.isin] ?? getTicker(c.isin, cleanName);
    }
    if (!ticker) {
      ticker = getTicker("", cleanName);
    }
    const tickerShort = ticker?.replace(".OL", "") ?? null;

    // Deduplicate by slug AND by ticker
    if (seenSlugs.has(slug) || (tickerShort && seenTickers.has(tickerShort))) continue;

    seenSlugs.add(slug);
    if (tickerShort) seenTickers.add(tickerShort);
    companies.push({
      name: cleanName,
      slug: `/${slug}`,
      ticker: tickerShort,
      type: "analyst",
    });
  }

  companies.sort((a, b) => a.name.localeCompare(b.name, "nb"));

  return NextResponse.json(companies, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
