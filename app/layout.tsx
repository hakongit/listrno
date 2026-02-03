import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-VH4R20P5L2";

export const metadata: Metadata = {
  title: "Listr - Norske shortposisjoner",
  description:
    "Oversikt over alle shortposisjoner i norske aksjer. Data fra Finanstilsynet, oppdatert daglig.",
  keywords: ["short", "shortposisjoner", "aksjer", "norge", "finanstilsynet", "børs"],
  openGraph: {
    title: "Listr - Norske shortposisjoner",
    description: "Oversikt over alle shortposisjoner i norske aksjer",
    type: "website",
    locale: "nb_NO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>

        <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <p>
              Data fra{" "}
              <a
                href="https://www.finanstilsynet.no/en/publications/short-selling-/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700 dark:hover:text-gray-300"
              >
                Finanstilsynet
              </a>
            </p>
            <p>
              Et prosjekt fra{" "}
              <a
                href="https://bluecap.no"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700 dark:hover:text-gray-300"
              >
                Bluecap
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
