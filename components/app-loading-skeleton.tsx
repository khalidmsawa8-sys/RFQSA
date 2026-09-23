/**
 * Generic page skeleton used by route-level loading.tsx files across
 * /wallet, /invoices, /profile, /client, /vendor.
 *
 * Why this exists:
 *   Next.js 16's stricter static-prerender pass requires an implicit React
 *   Suspense boundary (via a loading.tsx) for any route that contains a
 *   client component reading dynamic state (cookies, params, etc.). When the
 *   boundary is missing the build fails with:
 *     "useSearchParams() should be wrapped in a suspense boundary. Please
 *      add a loading component to `app/<segment>/loading.tsx`"
 *
 * Visual goal: mirror the real authenticated page layout (header + KPI tiles
 * + content rows) using the same border / shadow tokens as the live pages so
 * the transition feels seamless.
 */
export function AppLoadingSkeleton() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#f8fafc]">
      {/* Header strip — matches the real auth header height */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
            <div className="hidden sm:block h-4 w-24 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Page body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero / title block */}
        <div className="h-32 rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6">
          <div className="h-5 w-48 rounded bg-slate-100 animate-pulse mb-3" />
          <div className="h-3 w-72 rounded bg-slate-100 animate-pulse" />
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5"
            >
              <div className="h-3 w-20 rounded bg-slate-100 animate-pulse mb-3" />
              <div className="h-6 w-24 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Content panel */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6">
          <div className="h-4 w-40 rounded bg-slate-100 animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl border border-slate-200/60 bg-slate-50/40 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
