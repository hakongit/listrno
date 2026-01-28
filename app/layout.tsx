import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

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
      <body className="antialiased min-h-screen flex flex-col">
        <header className="border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Listr<span className="text-gray-400">.no</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Oversikt
              </Link>
              <Link
                href="/om"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Om
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-gray-500">
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
