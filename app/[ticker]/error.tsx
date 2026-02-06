"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-2">Kunne ikke laste selskapsdata</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Det oppstod en feil ved henting av data for dette selskapet.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Prøv igjen
          </button>
          <Link
            href="/"
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            Til forsiden
          </Link>
        </div>
      </div>
    </div>
  );
}
