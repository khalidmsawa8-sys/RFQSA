"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Star, MessageSquare, ArrowRight, User, Calendar,
  TrendingUp, Award, RefreshCw, ChevronLeft, ChevronRight,
} from "lucide-react";
import Link from "next/link";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

/* ── helpers ── */
function StarRating({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} className={`${sz} ${i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function RatingBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-14 shrink-0 text-left">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-6 text-left">{count}</span>
    </div>
  );
}

interface Review {
  id: string;
  deal_id: string;
  rater_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  rater_name: string;
  rater_role: string;
  car_info: string;
}

export default function ReviewsPage() {
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("client");

  /* filters */
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear, setSelYear]   = useState(now.getFullYear());

  const prevMonth = () => selMonth === 0 ? (setSelMonth(11), setSelYear(y => y - 1)) : setSelMonth(m => m - 1);
  const nextMonth = () => selMonth === 11 ? (setSelMonth(0), setSelYear(y => y + 1)) : setSelMonth(m => m + 1);
  const isCurrentMonth = selMonth === now.getMonth() && selYear === now.getFullYear();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    setUserRole(prof?.role || "client");

    // Get deals where user is client or vendor
    const { data: deals } = await supabase
      .from("deals")
      .select("id, client_id, vendor_id, order_id, orders(rfqs(car_make, car_model))")
      .or(`client_id.eq.${user.id},vendor_id.eq.${user.id}`);

    if (!deals || deals.length === 0) { setReviews([]); setLoading(false); return; }

    const dealIds = deals.map((d: any) => d.id);

    // Get reviews ON this user (reviews received)
    const { data: rawReviews } = await supabase
      .from("deal_reviews")
      .select("id, deal_id, rater_id, rating, comment, created_at")
      .in("deal_id", dealIds)
      .neq("rater_id", user.id)   // written BY others about this user
      .order("created_at", { ascending: false });

    if (!rawReviews || rawReviews.length === 0) { setReviews([]); setLoading(false); return; }

    // Get rater profiles
    const raterIds = [...new Set(rawReviews.map((r: any) => r.rater_id))];
    const { data: raterProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", raterIds);

    const profileMap: Record<string, { full_name: string; role: string }> = {};
    (raterProfiles || []).forEach((p: any) => { profileMap[p.id] = p; });

    const dealMap: Record<string, any> = {};
    deals.forEach((d: any) => { dealMap[d.id] = d; });

    const enriched: Review[] = rawReviews.map((r: any) => {
      const rater = profileMap[r.rater_id] || { full_name: "مجهول", role: "client" };
      const deal = dealMap[r.deal_id];
      const rfq = deal?.orders?.rfqs;
      const car = rfq ? `${rfq.car_make} ${rfq.car_model}` : "طلب قطع غيار";
      return {
        ...r,
        rater_name: rater.full_name || "مجهول",
        rater_role: rater.role || "client",
        car_info: car,
      };
    });

    setReviews(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  /* filtered by month + rating */
  const filtered = reviews.filter((r) => {
    const d = new Date(r.created_at);
    const matchMonth = d.getMonth() === selMonth && d.getFullYear() === selYear;
    const matchRating = filterRating === null || r.rating === filterRating;
    return matchMonth && matchRating;
  });

  /* stats */
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const dist = [5,4,3,2,1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const distColors = ["bg-emerald-500","bg-green-400","bg-amber-400","bg-orange-400","bg-red-400"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-900 w-full" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/profile"
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">المراجعات والتقييمات</h1>
          <p className="text-sm text-slate-500">التقييمات الواردة من {userRole === "vendor" ? "العملاء" : "الموردين"}</p>
        </div>
      </div>

      {/* ── Summary Card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-center">

          {/* Big rating number */}
          <div className="flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl px-10 py-6 shrink-0">
            <p className="text-6xl font-black text-amber-500 leading-none">{avgRating.toFixed(1)}</p>
            <StarRating value={avgRating} size="lg" />
            <p className="text-xs text-slate-400 mt-2">{reviews.length} تقييم إجمالي</p>
          </div>

          {/* Distribution bars */}
          <div className="flex-1 w-full space-y-2.5">
            <p className="text-xs font-semibold text-slate-500 mb-3">توزيع التقييمات</p>
            {dist.map(({ star, count }, idx) => (
              <RatingBar
                key={star}
                label={`${star} نجوم`}
                count={count}
                total={reviews.length}
                color={distColors[idx]}
              />
            ))}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-50">
          {[
            { icon: MessageSquare, label: "إجمالي المراجعات", val: reviews.length, color: "text-violet-600 bg-violet-50" },
            { icon: Award,         label: "التقييم الأعلى",   val: reviews.length ? Math.max(...reviews.map(r => r.rating)) : 0, color: "text-amber-600 bg-amber-50" },
            { icon: TrendingUp,    label: "هذا الشهر",        val: filtered.length, color: "text-blue-600 bg-blue-50" },
          ].map(({ icon: Icon, label, val, color }) => (
            <div key={label} className="text-center">
              <div className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center mb-1.5 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-slate-800">{val}</p>
              <p className="text-[11px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Month Nav + Rating Filter ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3 justify-between">

        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-700 min-w-[110px] text-center">
            {MONTHS_AR[selMonth]} {selYear}
          </span>
          <button onClick={prevMonth}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Star filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterRating(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterRating === null ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            الكل
          </button>
          {[5,4,3,2,1].map((s) => (
            <button
              key={s}
              onClick={() => setFilterRating(filterRating === s ? null : s)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterRating === s ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s} <Star className={`w-3 h-3 ${filterRating === s ? "fill-white text-white" : "fill-amber-400 text-amber-400"}`} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Reviews List ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">لا توجد مراجعات</p>
          <p className="text-sm text-slate-400 mt-1">
            لا توجد تقييمات في {MONTHS_AR[selMonth]} {selYear}
            {filterRating !== null ? ` بتقييم ${filterRating} نجوم` : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div key={review.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">

                {/* Avatar */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-base font-bold ${
                  review.rater_role === "vendor"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}>
                  {review.rater_name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{review.rater_name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {review.rater_role === "vendor" ? "مورد" : "عميل"} · {review.car_info}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StarRating value={review.rating} size="sm" />
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(review.created_at).toLocaleDateString("ar-SA", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Rating badge */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      review.rating >= 4 ? "bg-emerald-50 text-emerald-700"
                      : review.rating === 3 ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                    }`}>
                      <Star className={`w-3 h-3 ${
                        review.rating >= 4 ? "fill-emerald-500 text-emerald-500"
                        : review.rating === 3 ? "fill-amber-500 text-amber-500"
                        : "fill-red-500 text-red-500"
                      }`} />
                      {review.rating} / 5
                    </span>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <div className="mt-3 bg-slate-50 rounded-xl px-4 py-3 border-r-2 border-slate-200">
                      <p className="text-sm text-slate-700 leading-relaxed">{review.comment}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
