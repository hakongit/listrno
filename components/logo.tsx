export function LogoIcon({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Bar 1 (shortest) */}
      <rect x="2" y="20" width="7" height="8" rx="1" fill="#4ECDC4" />
      <rect x="2" y="18" width="7" height="4" rx="1" fill="#14505C" />
      {/* Bar 2 (medium) */}
      <rect x="12.5" y="13" width="7" height="15" rx="1" fill="#4ECDC4" />
      <rect x="12.5" y="11" width="7" height="4" rx="1" fill="#14505C" />
      {/* Bar 3 (tallest) */}
      <rect x="23" y="6" width="7" height="22" rx="1" fill="#4ECDC4" />
      <rect x="23" y="4" width="7" height="4" rx="1" fill="#14505C" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-1.5">
      <LogoIcon />
      <span className="text-lg font-bold tracking-tight">
        listr<span className="text-gray-400">.no</span>
      </span>
    </span>
  );
}
