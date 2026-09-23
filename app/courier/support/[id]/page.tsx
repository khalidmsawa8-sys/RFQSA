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
  Calendar,
  Hash,
  ChevronLeft,
  Sparkles,
  FileQuestion,
  Headphones,
  Truck,
  MapPin,
  Package,
  Wallet,
} from "lucide-react";
import { ClientTicketConversation } from "@/components/support/client-ticket-conversation";

const STATUS_CONFIG = {
  pending: { label: "قيد المراجعة والمتابعة", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 ring-amber-600/20", icon: Clock, ring: "ring-amber-500/20" },
  accepted: { label: "مقبول وجاري الحل", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: CheckCircle2, ring: "ring-emerald-500/20" },
  rejected: { label: "مرفوض", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 ring-rose-600/20", icon: XCircle, ring: "ring-rose-500/20" },
  completed: { label: "تم الحل والإغلاق", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700 ring-sky-600/20", icon: CheckCircle2, ring: "ring-sky-500/20" },
} as const;

const TYPE_CONFIG: Record<string, { label: string; icon: any; badge: string }> = {
  client_location_issue: { label: "مشكلة في موقع أو تواصل العميل", icon: MapPin, badge: "bg-rose-50 text-rose-800 ring-rose-600/20" },
  vendor_pickup_issue: { label: "مشكلة في استلام القطعة من المورد", icon: Package, badge: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  courier_payout: { label: "سحب أرباح وعمولات التوصيل", icon: Wallet, badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/20" },
  other: { label: "أخرى", icon: FileQuestion, badge: "bg-slate-100 text-slate-700 ring-slate-600/20" },
};

function shortId(id: string) {
  return id.replace(/^ORD-/, "").replace(/^DEL-/, "").slice(0, 8).toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

export default async function CourierSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/courier/login");

  const { data: req } = await supabase
    .from("support_requests")
    .select("*, support_request_items(*), orders(id, total_price, rfqs(car_make, car_model, car_year, plate_number))")
    .eq("id", id)
    .eq("client_id", user.id)
    .single();

  if (!req) notFound();

  const statusCfg = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const typeCfg = TYPE_CONFIG[req.request_type] ?? { label: req.request_type, icon: Headphones, badge: "bg-gray-100 text-gray-700" };
  const StatusIcon = statusCfg.icon;
  const TypeIcon = typeCfg.icon;

  // Build 3-stage timeline (Cancelled "تم التوجيه")
  const isStep1Done = true;
  const isStep2Done = ["in_progress", "accepted", "completed", "closed", "rejected"].includes(req.status);
  const isStep3Done = ["completed", "closed", "rejected"].includes(req.status);

  const timeline: Array<{ label: string; date: string | null; done: boolean; icon: any; active: boolean; color: string }> = [
    {
      label: "تم تسجيل البلاغ",
      date: req.created_at,
      done: isStep1Done,
      icon: Hash,
      active: req.status === "open" || req.status === "pending",
      color: "bg-emerald-500",
    },
    {
      label: "متابعة غرفة العمليات",
      date: isStep2Done ? (req.reviewed_at || req.created_at) : null,
      done: isStep2Done,
      icon: Clock,
      active: req.status === "in_progress" || req.status === "accepted",
      color: "bg-purple-500",
    },
    {
      label: req.status === "rejected" ? "تم الرفض" : req.status === "closed" ? "تم الإغلاق" : "تم الحل والإغلاق",
      date: isStep3Done ? (req.completed_at || req.closed_at || req.reviewed_at) : null,
      done: isStep3Done,
      icon: req.status === "rejected" ? XCircle : CheckCircle2,
      active: isStep3Done,
      color: req.status === "rejected" ? "bg-rose-500" : "bg-sky-500",
    },
  ];

  const progressPercent = isStep3Done ? "100%" : isStep2Done ? "50%" : "0%";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/courier/support" className="hover:text-slate-800 inline-flex items-center gap-1.5 transition-colors">
          <LifeBuoy className="w-3.5 h-3.5" />
          مركز دعم وبلاغات المندوبين
        </Link>
        <ChevronLeft className="w-3 h-3 text-slate-300" />
        <span className="font-mono font-semibold text-slate-900">بلاغ #{shortId(req.id)}</span>
      </nav>

      {/* Header */}
      <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-inset ${statusCfg.ring} bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-2xs`}>
            <TypeIcon className="w-6 h-6 text-slate-700" strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-black text-slate-900">
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
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="font-mono font-bold text-slate-700">#{shortId(req.id)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(req.created_at)} ({formatTime(req.created_at)})
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/courier/support"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-all self-start md:self-auto"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة للبلاغات</span>
        </Link>
      </header>

      {/* TIMELINE (3 STAGES ONLY) */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">مسار معالجة البلاغ الميداني</h2>
        </div>
        <div className="relative grid grid-cols-3 gap-3">
          {/* Background line */}
          <div className="absolute top-3 right-12 left-12 h-0.5 bg-slate-200" />
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
                  step.done ? step.color : "bg-slate-200"
                }`}>
                  {step.done ? (
                    <Icon className="w-3 h-3 text-white" strokeWidth={3} />
                  ) : (
                    <Icon className="w-3 h-3 text-slate-400" strokeWidth={2.5} />
                  )}
                  {step.active && (
                    <div className="absolute inset-0 rounded-full bg-current opacity-30 animate-ping" />
                  )}
                </div>
                <p className={`text-[11px] font-bold mt-2 ${step.done ? "text-slate-900" : "text-slate-400"}`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
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
        <section className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900 mb-1">سبب تعذر قبول البلاغ:</p>
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
            viewerRole="courier"
            currentUserName={user.user_metadata?.full_name || req.requester_name || "مندوب التوصيل"}
            ticketStatus={req.status}
          />
        </div>

        {/* Right Sidebar: Details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>بيانات البلاغ</span>
            </h3>

            {req.order_id && (
              <div className="flex items-center justify-between text-slate-600">
                <span>الطلب والشحنة المرتبطة:</span>
                <Link
                  href={`/courier/orders/${req.order_id}`}
                  className="font-mono font-bold text-blue-600 hover:underline"
                >
                  #ORD-{shortId(req.order_id)}
                </Link>
              </div>
            )}

            {req.orders?.rfqs && (
              <div className="flex items-center justify-between text-slate-600">
                <span>بيانات المركبة:</span>
                <span className="font-bold text-slate-800">
                  {req.orders.rfqs.car_make} {req.orders.rfqs.car_model} {req.orders.rfqs.car_year}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-600">
              <span>تاريخ تسجيل البلاغ:</span>
              <span>{formatDate(req.created_at)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-2 text-xs">
            <h3 className="font-bold text-slate-900">شرح وتفاصيل البلاغ الميداني:</h3>
            <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {req.reason || "لا يوجد شرح إضافي"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
