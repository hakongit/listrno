import { getShortData } from "@/lib/data";
import { getCachedAnalystCompanies, initializeAnalystDatabase } from "@/lib/analyst-db";
import { getTicker, isinToTicker } from "@/lib/tickers";
import { slugify } from "@/lib/utils";
import { NextResponse } from "next/server";

export const revalidate = 3600;

// Strip parenthetical ticker suffixes from analyst company names
// e.g. "2020 Bulkers (NO:TOM)" → "2020 Bulkers"
// e.g. "2020 Bulkers NO" → "2020 Bulkers" (trailing 2-letter country code)
function cleanCompanyName(name: string): string {
  return name
    .replace(/\s*\((?:NO|OSE|XOSL|OB)[:\s]?\s*\w+\)\s*$/i, "")
    .replace(/\s+(?:NO|ASA)$/i, "")
    .trim();
}

export async function GET() {
  const [shortData] = await Promise.all([
    getShortData(),
    initializeAnalystDatabase(),
  ]);
  const analystCompanies = await getCachedAnalystCompanies();

  const seen = new Set<string>();
  const companies: { name: string; slug: string; ticker: string | null; type: string }[] = [];

  // Short position companies
  for (const c of shortData.companies) {
    const slug = c.slug;
    if (!seen.has(slug)) {
      seen.add(slug);
      companies.push({
        name: c.issuerName,
        slug: `/${slug}`,
        ticker: c.ticker?.replace(".OL", "") ?? null,
        type: "short",
      });
    }
  }

  // Analyst-only companies
  for (const c of analystCompanies) {
    const cleanName = cleanCompanyName(c.name);
    const slug = slugify(cleanName);
    if (!seen.has(slug)) {
      seen.add(slug);
      // Resolve ticker from ISIN or name
      let ticker: string | null = null;
      if (c.isin) {
        ticker = isinToTicker[c.isin] ?? getTicker(c.isin, cleanName);
      }
      if (!ticker) {
        ticker = getTicker("", cleanName);
      }
      companies.push({
        name: cleanName,
        slug: `/${slug}`,
        ticker: ticker?.replace(".OL", "") ?? null,
        type: "analyst",
      });
    }
  }

  companies.sort((a, b) => a.name.localeCompare(b.name, "nb"));

  return NextResponse.json(companies, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
