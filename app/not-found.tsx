import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Denne siden finnes ikke.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors"
        style={{
          background: "var(--an-bg-raised)",
          color: "var(--an-text-primary)",
          border: "1px solid var(--an-border)",
        }}
      >
        Tilbake til forsiden
      </Link>
    </div>
  );
}
