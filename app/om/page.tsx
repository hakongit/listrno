import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Om Listr - Shortposisjoner, innsidehandel og analyser",
  description: "Listr samler shortposisjoner, innsidehandel og analytikerrapporter for norske aksjer på ett sted.",
};

export default function AboutPage() {
  return (
    <div>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" aria-label="Listr.no - Til forsiden">
            <Logo />
          </Link>
          <nav className="flex items-center gap-4 text-sm" aria-label="Hovednavigasjon">
            <Link href="/shortoversikt" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Shortposisjoner
            </Link>
            <Link href="/innsidehandel" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Innsidehandel
            </Link>
            <Link href="/analyser" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              Analyser
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
          Listr samler shortposisjoner, innsidehandel og analytikerrapporter for norske aksjer p&aring; ett sted.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Shortposisjoner</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Shortsalg (eller &quot;shorting&quot;) er en investeringsstrategi hvor en investor
          l&aring;ner aksjer og selger dem med forventning om at kursen skal falle. I Norge m&aring;
          shortposisjoner p&aring; 0,5% eller mer av et selskaps utstedte aksjer rapporteres til
          Finanstilsynet. Listr henter disse dataene direkte fra{" "}
          <a
            href="https://www.finanstilsynet.no/en/publications/short-selling-/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 inline-flex items-center gap-1"
          >
            Finanstilsynets offentlige register
            <ExternalLink className="w-3 h-3" />
          </a>
          {" "}og oppdaterer automatisk daglig.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Innsidehandel</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Prim&aelig;rinnsidere m&aring; rapportere sine handler til b&oslash;rsen. Listr samler
          innsidehandler fra{" "}
          <a
            href="https://live.euronext.com/nb/markets/oslo/insider-disclosure"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 inline-flex items-center gap-1"
          >
            Euronext Oslo
            <ExternalLink className="w-3 h-3" />
          </a>
          {" "}slik at du enkelt kan f&oslash;lge kj&oslash;p og salg fra personer med innsideinformasjon.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Analytikerrapporter</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Listr samler ogs&aring; kursm&aring;l og anbefalinger fra analytikere i ledende
          investeringsbanker, basert p&aring; tips fra brukere, nyhetsbrev fra meglerhus
          og offentlig tilgjengelige kilder.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Ansvarsfraskrivelse</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Informasjonen p&aring; dette nettstedet er kun ment for informasjonsform&aring;l og
          utgj&oslash;r ikke investeringsr&aring;d. Vi anbefaler at du gj&oslash;r din egen research og
          konsulterer med en finansr&aring;dgiver f&oslash;r du tar investeringsbeslutninger.
        </p>

        <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-500">
            Listr er et prosjekt fra{" "}
            <a
              href="https://blueboxas.no"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Bluebox AS
            </a>
            .
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
