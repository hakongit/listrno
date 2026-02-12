import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/analystatwork", "/api/"],
      },
    ],
    sitemap: "https://listr.no/sitemap.xml",
  };
}
