import { getShortData } from "@/lib/data";
import { getCachedAnalystCompanies, initializeAnalystDatabase } from "@/lib/analyst-db";
import { slugify } from "@/lib/utils";
import { NextResponse } from "next/server";

export const revalidate = 3600;

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
    const slug = slugify(c.name);
    if (!seen.has(slug)) {
      seen.add(slug);
      companies.push({
        name: c.name,
        slug: `/${slug}`,
        ticker: null,
        type: "analyst",
      });
    }
  }

  companies.sort((a, b) => a.name.localeCompare(b.name, "nb"));

  return NextResponse.json(companies, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
