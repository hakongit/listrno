export default function CompanyLoading() {
  return (
    <div>
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="text-lg font-bold tracking-tight">
            Listr<span className="text-gray-400">.no</span>
          </div>
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="flex gap-4">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Stats skeleton */}
        <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>

        {/* Chart skeleton */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-4">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="p-3">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-6 w-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
            <div className="h-72 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
          </div>
        </div>

        {/* Positions table skeleton */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5">
                <div className="h-4 w-44 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-4 w-14 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
