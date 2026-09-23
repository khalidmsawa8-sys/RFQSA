export default function AdminOrdersLoading() {
  return (
    <div className="space-y-5 animate-pulse" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-3 w-32 bg-slate-100 rounded mb-2" />
          <div className="h-7 w-44 bg-slate-200 rounded" />
          <div className="h-3 w-56 bg-slate-100 rounded mt-2" />
        </div>
        <div className="h-9 w-28 bg-slate-100 rounded-xl" />
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="h-4 w-40 bg-slate-200 rounded" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 bg-slate-200 rounded" />
                <div className="h-3 w-2/3 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-full shrink-0" />
              <div className="h-4 w-16 bg-slate-100 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
