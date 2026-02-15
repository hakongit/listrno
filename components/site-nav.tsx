"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompanySearch } from "./company-search";

const navLinks = [
  { href: "/shortoversikt", label: "Short", labelFull: "Shortposisjoner" },
  { href: "/innsidehandel", label: "Innside", labelFull: "Innsidehandel" },
  { href: "/analyser", label: "Analyse", labelFull: "Analyser" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        borderColor: "var(--an-border)",
        background: "var(--an-bg-surface)",
      }}
    >
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="flex items-center gap-[7px] shrink-0"
          aria-label="Listr.no - Til forsiden"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="opacity-90"
          >
            <rect x="2" y="14" width="4" height="8" rx="1" fill="var(--an-text-muted)" />
            <rect x="8" y="9" width="4" height="13" rx="1" fill="var(--an-text-secondary)" />
            <rect x="14" y="5" width="4" height="17" rx="1" fill="var(--an-accent)" />
            <rect x="20" y="2" width="4" height="20" rx="1" fill="var(--an-text-primary)" />
          </svg>
          <span className="font-bold text-[15px] tracking-tight">
            listr
            <span style={{ color: "var(--an-text-secondary)" }}>.no</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link text-[13px] font-medium px-2.5 sm:px-3 py-1.5 rounded-[5px] whitespace-nowrap shrink-0 ${
                    isActive ? "active" : ""
                  }`}
                >
                  <span className="sm:hidden">{link.label}</span>
                  <span className="hidden sm:inline">{link.labelFull}</span>
                </Link>
              );
            })}
          </div>
          <CompanySearch />
        </div>
      </div>
    </nav>
  );
}
