import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Om Listr - Norske shortposisjoner",
  description: "Listr gjør det enkelt å følge med på shortposisjoner i norske aksjer.",
};

export default function AboutPage() {
  return (
    <div>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Oversikt
            </Link>
            <Link href="/om" className="text-gray-900 dark:text-gray-100 font-medium">
              Om
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Om Listr</h1>

      <div className="prose dark:prose-invert max-w-none">
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Listr gjør det enkelt å følge med på shortposisjoner i norske aksjer.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Hva er shorting?</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Shortsalg (eller &quot;shorting&quot;) er en investeringsstrategi hvor en investor
          låner aksjer og selger dem med forventning om at kursen skal falle. Hvis
          kursen faller, kan investoren kjøpe aksjene tilbake til en lavere pris,
          returnere dem til utlåner, og beholde differansen som gevinst.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Hvorfor er dette offentlig?</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          I Norge må shortposisjoner på 0,5% eller mer av et selskaps utstedte aksjer
          rapporteres til Finanstilsynet. Dette er for å sikre markedstransparens og
          gjøre det mulig å overvåke markedsaktivitet.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Datakilden</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          All data på Listr hentes direkte fra{" "}
          <a
            href="https://www.finanstilsynet.no/en/publications/short-selling-/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 inline-flex items-center gap-1"
          >
            Finanstilsynets offentlige register
            <ExternalLink className="w-3 h-3" />
          </a>
          . Data oppdateres automatisk hver time.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Ansvarsfraskrivelse</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Informasjonen på dette nettstedet er kun ment for informasjonsformål og
          utgjør ikke investeringsråd. Vi anbefaler at du gjør din egen research og
          konsulterer med en finansrådgiver før du tar investeringsbeslutninger.
        </p>

        <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-500">
            Listr er et prosjekt fra{" "}
            <a
              href="https://bluecap.no"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Bluecap
            </a>
            .
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
