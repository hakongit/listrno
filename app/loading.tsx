import { Logo } from "@/components/logo";

export default function DashboardLoading() {
  return (
    <div>
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <Logo />
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-8 text-center">
          <div className="h-9 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mx-auto mb-2" />
          <div className="h-5 w-80 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mx-auto" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
              <div className="h-7 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mx-auto mb-1" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>

        {/* Two-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1].map((col) => (
            <div key={col} className="space-y-4">
              <div className="h-7 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="flex items-center justify-between px-4 py-2.5">
                        <div className="h-4 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
