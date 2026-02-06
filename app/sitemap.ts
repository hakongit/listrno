import { MetadataRoute } from "next";
import { getDb } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://listr.no";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}/shortoversikt`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/innsidehandel`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/analyser`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/om`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Dynamic company pages
  let companyPages: MetadataRoute.Sitemap = [];
  try {
    const companiesResult = await getDb().execute(
      "SELECT slug FROM companies"
    );
    companyPages = (companiesResult.rows as unknown as { slug: string }[]).map((row) => ({
      url: `${baseUrl}/${row.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // DB might not be available during build
  }

  // Dynamic insider slugs from insider_trades
  let insiderPages: MetadataRoute.Sitemap = [];
  try {
    const insidersResult = await getDb().execute(
      "SELECT DISTINCT insider_slug FROM insider_trades WHERE insider_slug IS NOT NULL"
    );
    insiderPages = (insidersResult.rows as unknown as { insider_slug: string }[]).map(
      (row) => ({
        url: `${baseUrl}/innsidehandel/${row.insider_slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })
    );
  } catch {
    // DB might not be available during build
  }

  return [...staticPages, ...companyPages, ...insiderPages];
}
