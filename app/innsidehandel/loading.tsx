export default function InsiderTradesLoading() {
  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-1" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div className="h-5 w-28 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
                <div className="flex gap-4">
                  <div className="h-5 w-12 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse hidden lg:block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
