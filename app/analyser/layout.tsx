import Link from "next/link";

function AnalyserLogo() {
  return (
    <span className="flex items-center gap-[7px]">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="opacity-90">
        <rect x="2" y="14" width="4" height="8" rx="1" fill="#4a5568" />
        <rect x="8" y="9" width="4" height="13" rx="1" fill="#7a8599" />
        <rect x="14" y="5" width="4" height="17" rx="1" fill="#c9a84c" />
        <rect x="20" y="2" width="4" height="20" rx="1" fill="#e2e0db" />
      </svg>
      <span className="font-bold text-[15px] tracking-tight text-[var(--an-text-primary)]">
        listr<span className="text-[var(--an-text-secondary)]">.no</span>
      </span>
    </span>
  );
}

export default function AnalyserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="analyser-theme min-h-screen flex flex-col">
      {/* Gold accent line */}
      <div className="an-top-accent" />

      {/* Sticky nav */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          borderColor: "var(--an-border)",
          background: "var(--an-bg-surface)",
        }}
      >
        <div className="max-w-[1120px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" aria-label="Listr.no - Til forsiden">
            <AnalyserLogo />
          </Link>
          <div className="flex gap-1.5">
            <Link
              href="/shortoversikt"
              className="text-[13px] font-medium px-3 py-1.5 rounded-[5px] transition-all"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Shortposisjoner
            </Link>
            <Link
              href="/innsidehandel"
              className="text-[13px] font-medium px-3 py-1.5 rounded-[5px] transition-all"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Innsidehandel
            </Link>
            <Link
              href="/analyser"
              className="text-[13px] font-medium px-3 py-1.5 rounded-[5px]"
              style={{
                color: "var(--an-text-primary)",
                background: "var(--an-bg-raised)",
              }}
            >
              Analyser
            </Link>
            <Link
              href="/om"
              className="text-[13px] font-medium px-3 py-1.5 rounded-[5px] transition-all"
              style={{ color: "var(--an-text-secondary)" }}
            >
              Om
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <div className="flex-1">{children}</div>

      {/* Themed footer */}
      <footer
        className="border-t mt-0 py-5"
        style={{ borderColor: "var(--an-border)" }}
      >
        <div className="max-w-[1120px] mx-auto px-6">
          <p
            className="text-[11px] text-center leading-relaxed"
            style={{ color: "var(--an-text-muted)" }}
          >
            Basert p&aring; tips fra brukere, nyhetsbrev fra meglerhus og
            offentlig tilgjengelige kilder. Ikke finansiell r&aring;dgivning.
            <br />
            Bluebox AS
          </p>
        </div>
      </footer>
    </div>
  );
}
