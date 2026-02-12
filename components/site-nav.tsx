"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/shortoversikt", label: "Shortposisjoner" },
  { href: "/innsidehandel", label: "Innsidehandel" },
  { href: "/analyser", label: "Analyser" },
  { href: "/om", label: "Om" },
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
      <div className="max-w-[1120px] mx-auto px-6 h-12 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-[7px]"
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
            <rect x="2" y="14" width="4" height="8" rx="1" fill="#4a5568" />
            <rect x="8" y="9" width="4" height="13" rx="1" fill="#7a8599" />
            <rect x="14" y="5" width="4" height="17" rx="1" fill="#c9a84c" />
            <rect x="20" y="2" width="4" height="20" rx="1" fill="#e2e0db" />
          </svg>
          <span className="font-bold text-[15px] tracking-tight">
            listr
            <span style={{ color: "var(--an-text-secondary)" }}>.no</span>
          </span>
        </Link>
        <div className="flex gap-1.5">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link text-[13px] font-medium px-3 py-1.5 rounded-[5px] ${
                  isActive ? "active" : ""
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
