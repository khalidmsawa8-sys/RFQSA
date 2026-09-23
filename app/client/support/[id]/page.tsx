"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  LifeBuoy,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Receipt,
  Calendar,
  Hash,
  RotateCcw,
  RefreshCw as RefreshIcon,
  ChevronLeft,
  Sparkles,
  FileQuestion,
  Headphones,
  Car,
} from "lucide-react";
import { ClientTicketConversation } from "@/components/support/client-ticket-conversation";

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string; icon: any; ring: string }> = {
  open: { label: "مفتوح (جديد)", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 ring-blue-600/20", icon: Clock, ring: "ring-blue-500/20" },
  pending: { label: "قيد الانتظار", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 ring-amber-600/20", icon: Clock, ring: "ring-amber-500/20" },
  in_progress: { label: "قيد المعالجة", dot: "bg-purple-500", badge: "bg-purple-50 text-purple-700 ring-purple-600/20", icon: Clock, ring: "ring-purple-500/20" },
  accepted: { label: "مقبول", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: CheckCircle2, ring: "ring-emerald-500/20" },
  rejected: { label: "مرفوض", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 ring-rose-600/20", icon: XCircle, ring: "ring-rose-500/20" },
  completed: { label: "مكتمل", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700 ring-sky-600/20", icon: CheckCircle2, ring: "ring-sky-500/20" },
  closed: { label: "مغلق", dot: "bg-slate-500", badge: "bg-slate-50 text-slate-700 ring-slate-600/20", icon: CheckCircle2, ring: "ring-slate-500/20" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: any; badge: string }> = {
  return_replacement: { label: "الاستبدال والاسترجاع", icon: RotateCcw, badge: "bg-purple-50 text-purple-700 ring-purple-600/20" },
  item_mismatch: { label: "الطلب غير مطابق", icon: AlertTriangle, badge: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  delivery_delay: { label: "التأخر في استلام الطلب", icon: Clock, badge: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  suggestion: { label: "اقتراح للتطوير", icon: Sparkles, badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  other: { label: "أخرى", icon: FileQuestion, badge: "bg-slate-100 text-slate-700 ring-slate-600/20" },
  return: { label: "استرجاع", icon: RotateCcw, badge: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  replacement: { label: "استبدال", icon: RefreshIcon, badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
  inquiry: { label: "استفسار عام", icon: Headphones, badge: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  complaint: { label: "شكوى أو نزاع", icon: AlertTriangle, badge: "bg-rose-50 text-rose-700 ring-rose-600/20" },
};

function shortId(id?: string | null) {
  if (!id) return "";
  return String(id).replace(/^ORD-/, "").slice(0, 8).toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

export default async function SupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: req } = await supabase
    .from("support_requests")
    .select("*, support_request_items(*), orders(id, rfqs(car_make, car_model, car_year, plate_number))")
    .eq("id", id)
    .maybeSingle();

  if (!req) notFound();

  const isAuthorized =
    req.client_id === user.id ||
    req.vendor_id === user.id ||
    (req as any).requester_id === user.id ||
    user.user_metadata?.role === "admin";

  if (!isAuthorized) notFound();

  const statusCfg = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const typeCfg = TYPE_CONFIG[req.request_type] ?? { label: req.request_type, icon: Headphones, badge: "bg-gray-100 text-gray-700" };
  const StatusIcon = statusCfg.icon;
  const TypeIcon = typeCfg.icon;
  const items = req.support_request_items ?? [];
  const totalAmount = items.reduce((s: number, it: any) => s + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0), 0);

  // Build 3-stage timeline (Cancelled "تم القبول")
  const isStep1Done = true;
  const isStep2Done = ["in_progress", "accepted", "completed", "closed", "rejected"].includes(req.status);
  const isStep3Done = ["completed", "closed", "rejected"].includes(req.status);

  const timeline: Array<{ label: string; date: string | null; done: boolean; icon: any; active: boolean; color: string }> = [
    {
      label: "تم إنشاء الطلب",
      date: req.created_at,
      done: isStep1Done,
      icon: Hash,
      active: req.status === "open" || req.status === "pending",
      color: "bg-emerald-500",
    },
    {
      label: "قيد المعالجة",
      date: isStep2Done ? (req.reviewed_at || req.created_at) : null,
      done: isStep2Done,
      icon: Clock,
      active: req.status === "in_progress" || req.status === "accepted",
      color: "bg-purple-500",
    },
    {
      label: req.status === "rejected" ? "تم الرفض" : req.status === "closed" ? "تم الإغلاق" : "تم الإكمال",
      date: isStep3Done ? (req.completed_at || req.closed_at || req.reviewed_at) : null,
      done: isStep3Done,
      icon: req.status === "rejected" ? XCircle : CheckCircle2,
      active: isStep3Done,
      color: req.status === "rejected" ? "bg-rose-500" : "bg-sky-500",
    },
  ];

  const progressPercent = isStep3Done ? "100%" : isStep2Done ? "50%" : "0%";

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-900 w-full" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link href="/client/support" className="hover:text-gray-800 inline-flex items-center gap-1.5 transition-colors">
          <LifeBuoy className="w-3.5 h-3.5" />
          مركز الدعم والمساعدة
        </Link>
        <ChevronLeft className="w-3 h-3 text-gray-300" />
        <span className="font-mono font-semibold text-gray-900">تذكرة #{shortId(req.id)}</span>
      </nav>

      {/* Header */}
      <header className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-inset ${statusCfg.ring} bg-gradient-to-br from-white to-gray-50 border border-gray-200/80 shadow-xs`}>
            <TypeIcon className="w-6 h-6 text-gray-700" strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-black text-gray-900">
                {typeCfg.label}
              </h1>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${typeCfg.badge}`}>
                {typeCfg.label}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.badge}`}>
                <StatusIcon className="w-3 h-3" strokeWidth={2.5} />
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="font-mono font-bold text-gray-700">#{shortId(req.id)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(req.created_at)} ({formatTime(req.created_at)})
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/client/support"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200 transition-all self-start md:self-auto"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة للتذاكر</span>
        </Link>
      </header>

      {/* TIMELINE (3 STAGES ONLY) */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-emerald-800" />
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">مسار معالجة التذكرة</h2>
        </div>
        <div className="relative grid grid-cols-3 gap-3">
          {/* Background line */}
          <div className="absolute top-3 right-12 left-12 h-0.5 bg-gray-200" />
          {/* Active progress line */}
          <div
            className="absolute top-3 right-12 h-0.5 bg-gradient-to-l from-emerald-500 via-purple-500 to-sky-500 transition-all duration-300"
            style={{
              width: `calc(${progressPercent} - 3rem)`,
            }}
          />
          {timeline.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="relative flex flex-col items-center text-center">
                <div className={`relative w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white transition-all ${
                  step.done ? step.color : "bg-gray-200"
                }`}>
                  {step.done ? (
                    <Icon className="w-3 h-3 text-white" strokeWidth={3} />
                  ) : (
                    <Icon className="w-3 h-3 text-gray-400" strokeWidth={2.5} />
                  )}
                  {step.active && (
                    <div className="absolute inset-0 rounded-full bg-current opacity-30 animate-ping" />
                  )}
                </div>
                <p className={`text-[11px] font-bold mt-2 ${step.done ? "text-gray-900" : "text-gray-400"}`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                    {formatDate(step.date)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Rejection Alert */}
      {req.status === "rejected" && req.rejection_reason && (
        <section className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900 mb-1">سبب تعذر قبول التذكرة:</p>
              <p className="text-xs text-rose-700 leading-relaxed">{req.rejection_reason}</p>
            </div>
          </div>
        </section>
      )}

      {/* Main Grid: Live Conversation + Details Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main: Live Chat Conversation */}
        <div className="lg:col-span-7">
          <ClientTicketConversation
            ticketId={req.id}
            currentUserId={user.id}
            viewerRole="client"
            currentUserName={req.client?.company_name || req.client?.full_name || req.requester_name || user.user_metadata?.full_name || "العميل"}
            ticketStatus={req.status}
          />
        </div>

        {/* Right Sidebar: Details & Items */}
        <div className="lg:col-span-5 space-y-4">
          {/* Details Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-3 text-xs">
            <h3 className="font-bold text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-100">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <span>بيانات التذكرة</span>
            </h3>

            {req.order_id && (
              <div className="flex items-center justify-between text-gray-600">
                <span>الطلب المرتبط:</span>
                <Link
                  href={`/deal/${req.order_id}`}
                  className="font-mono font-bold text-blue-600 hover:underline"
                >
                  #{shortId(req.order_id)}
                </Link>
              </div>
            )}

            {req.orders?.rfqs && (
              <div className="flex items-center justify-between text-gray-600">
                <span>بيانات المركبة:</span>
                <span className="font-bold text-gray-800">
                  {req.orders.rfqs.car_make} {req.orders.rfqs.car_model} {req.orders.rfqs.car_year}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-gray-600">
              <span>تاريخ التقديم:</span>
              <span>{formatDate(req.created_at)}</span>
            </div>

            {req.refund_amount && (
              <div className="flex items-center justify-between text-emerald-800 font-bold pt-2 border-t border-gray-100">
                <span>المبلغ المطلوب:</span>
                <span className="font-mono">{Number(req.refund_amount).toLocaleString("en-SA")} ر.س</span>
              </div>
            )}
          </div>

          {/* Reason / Initial Note */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-2 text-xs">
            <h3 className="font-bold text-gray-900">شرح وتفاصيل المشكلة المسجلة:</h3>
            <p className="text-gray-700 leading-relaxed bg-gray-50/70 p-3 rounded-xl border border-gray-100">
              {req.reason || "لا يوجد شرح إضافي"}
            </p>
          </div>

          {/* Affected Items Table if any */}
          {items.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900">القطع المتأثرة</span>
                <span className="text-gray-400 font-mono">{items.length} قطعة</span>
              </div>

              <div className="space-y-1.5 divide-y divide-gray-50">
                {items.map((it: any) => (
                  <div key={it.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{it.part_name}</p>
                      {it.part_number && (
                        <p className="text-[10px] text-gray-400 font-mono">{it.part_number}</p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-gray-700">x{it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
