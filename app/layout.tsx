import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const GA_MEASUREMENT_ID = "G-VH4R20P5L2";

export const metadata: Metadata = {
  title: "Listr - Shortposisjoner, innsidehandel og analyser",
  description:
    "Shortposisjoner, innsidehandel og analytikerrapporter for norske aksjer. Data fra Finanstilsynet og Euronext Oslo.",
  keywords: ["short", "shortposisjoner", "innsidehandel", "analytikerrapporter", "aksjer", "norge", "finanstilsynet", "børs"],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Listr - Shortposisjoner, innsidehandel og analyser",
    description: "Shortposisjoner, innsidehandel og analytikerrapporter for norske aksjer",
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
      <body className={`antialiased min-h-screen flex flex-col ${inter.variable} ${jetbrainsMono.variable}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:dark:bg-gray-900 focus:border focus:border-gray-300 focus:dark:border-gray-700 focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Hopp til hovedinnhold
        </a>
        <main id="main-content" className="flex-1">{children}</main>

        <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <p>
              Data fra offentlig tilgjengelige kilder
            </p>
            <p>
              Et prosjekt fra{" "}
              <a
                href="https://blueboxas.no"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700 dark:hover:text-gray-300"
              >
                Bluebox AS
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
