/**
 * Loading UI for /admin/users — also serves as the implicit React Suspense
 * boundary that Next.js requires for any client component using
 * useSearchParams() inside this route segment. Without this file the build
 * fails with: "useSearchParams() should be wrapped in a suspense boundary."
 */
export default function AdminUsersLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6" dir="rtl">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-9 w-9 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2"
          >
            <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
            <div className="h-7 w-12 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 h-10 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-10 w-56 bg-slate-100 rounded-xl animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-[1fr_1.4fr_0.7fr_0.9fr_0.8fr_0.9fr_auto] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-3 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1.4fr_0.7fr_0.9fr_0.8fr_0.9fr_auto] gap-4 px-5 py-4 border-b border-slate-50"
          >
            {Array.from({ length: 7 }).map((__, j) => (
              <div key={j} className="h-4 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
