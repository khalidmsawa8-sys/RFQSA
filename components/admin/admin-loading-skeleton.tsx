/**
 * Shared skeleton used by every `app/admin/<segment>/loading.tsx`.
 *
 * Each admin sub-route needs an explicit Suspense boundary
 * (i.e. a `loading.tsx`) so that Next.js 16's static-prerender pass
 * doesn't bail with:
 *
 *   "useSearchParams() should be wrapped in a suspense boundary.
 *    Please add a loading component to `app/admin/<segment>/loading.tsx`"
 *
 * Centralizing the skeleton keeps every admin page's loading state
 * visually consistent with the destination UI and avoids drift.
 */
export function AdminLoadingSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          {title ? (
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          ) : (
            <div className="h-7 w-40 bg-slate-200 rounded-md animate-pulse" />
          )}
          <div className="h-4 w-64 bg-slate-100 rounded-md animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-slate-100 rounded-xl animate-pulse" />
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
              <div className="w-7 h-7 bg-slate-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
