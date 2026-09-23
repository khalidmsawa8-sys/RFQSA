/**
 * Loading UI for the /admin segment — also serves as the implicit React
 * Suspense boundary that Next.js 16 requires for any client component using
 * useSearchParams() (or other dynamic hooks) inside this route segment.
 * Without this file the deploy fails with:
 *   "useSearchParams() should be wrapped in a suspense boundary."
 */
export default function AdminLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6" dir="rtl">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-9 w-9 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* KPI tiles skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
              <div className="h-7 w-7 bg-slate-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content blocks skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((__, j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100"
                >
                  <div className="h-9 w-9 rounded-lg bg-slate-100 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
