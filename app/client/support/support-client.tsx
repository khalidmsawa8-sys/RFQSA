"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LifeBuoy,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Car,
  ChevronLeft,
  Calendar,
  Wallet,
  FileQuestion,
  Headphones,
  Sparkles,
  RotateCcw,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewSupportRequestModal } from "@/components/support/new-support-request-modal";

export interface SupportRequest {
  id: string;
  client_id: string;
  order_id?: string | null;
  request_type: string;
  status: string;
  subject?: string;
  reason: string;
  rejection_reason?: string | null;
  refund_amount?: number | null;
  created_at: string;
  reviewed_at?: string | null;
  completed_at?: string | null;
  orders?: {
    id: string;
    total_price: number;
    rfqs?: {
      car_make: string;
      car_model: string;
      car_year: number;
      plate_number?: string;
    } | null;
  } | null;
  support_request_items?: Array<{
    id: string;
    part_name: string;
    part_number?: string | null;
    quantity: number;
    unit_price: number;
  }>;
}

interface EligibleOrder {
  id: string;
  status: string;
  created_at: string;
  total_price: number;
  rfqs?: { car_make: string; car_model: string; car_year: number; plate_number?: string } | null;
  deals?: Array<{ id: string; status: string }> | null;
}

interface Props {
  userId: string;
  initialRequests: SupportRequest[];
  eligibleOrders: EligibleOrder[];
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; ring: string; badge: string; icon: any }> = {
  open: { label: "مفتوح (جديد)", dot: "bg-blue-500", ring: "ring-blue-500/20", badge: "bg-blue-50 text-blue-700 ring-blue-600/20", icon: Clock },
  pending: { label: "قيد الانتظار", dot: "bg-amber-500", ring: "ring-amber-500/20", badge: "bg-amber-50 text-amber-700 ring-amber-600/20", icon: Clock },
  in_progress: { label: "قيد المعالجة", dot: "bg-purple-500", ring: "ring-purple-500/20", badge: "bg-purple-50 text-purple-700 ring-purple-600/20", icon: Clock },
  accepted: { label: "مقبول", dot: "bg-emerald-500", ring: "ring-emerald-500/20", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: CheckCircle2 },
  rejected: { label: "مرفوض", dot: "bg-rose-500", ring: "ring-rose-500/20", badge: "bg-rose-50 text-rose-700 ring-rose-600/20", icon: XCircle },
  completed: { label: "مكتمل", dot: "bg-sky-500", ring: "ring-sky-500/20", badge: "bg-sky-50 text-sky-700 ring-sky-600/20", icon: CheckCircle2 },
  closed: { label: "مغلق", dot: "bg-slate-500", ring: "ring-slate-500/20", badge: "bg-slate-50 text-slate-700 ring-slate-600/20", icon: CheckCircle2 },
};

const TYPE_CONFIG: Record<string, { label: string; badge: string; icon: any }> = {
  return_replacement: { label: "الاستبدال والاسترجاع", badge: "bg-purple-50 text-purple-700 ring-purple-600/20", icon: RotateCcw },
  return: { label: "استرجاع قطعة", badge: "bg-violet-50 text-violet-700 ring-violet-600/20", icon: RotateCcw },
  replacement: { label: "استبدال قطعة", badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/20", icon: RotateCcw },
  item_mismatch: { label: "الطلب غير مطابق", badge: "bg-amber-50 text-amber-700 ring-amber-600/20", icon: FileQuestion },
  delivery_delay: { label: "تأخر في التوصيل", badge: "bg-blue-50 text-blue-700 ring-blue-600/20", icon: Clock },
  pickup_delay: { label: "تأخر استلام الطلب", badge: "bg-amber-50 text-amber-800 ring-amber-600/20", icon: Clock },
  payout_withdrawal: { label: "سحب الرصيد", badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", icon: Wallet },
  suggestion: { label: "اقتراح وتطوير", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: Sparkles },
  inquiry: { label: "استفسار عام", badge: "bg-blue-50 text-blue-700 ring-blue-600/20", icon: Headphones },
  complaint: { label: "شكوى أو نزاع", badge: "bg-rose-50 text-rose-700 ring-rose-600/20", icon: HelpCircle },
  financial: { label: "مطالبة مالية", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: Wallet },
  other: { label: "طلب مساعدة عامة", badge: "bg-slate-100 text-slate-700 ring-slate-600/20", icon: LifeBuoy },
};

const FILTER_TABS = [
  { key: "all", label: "جميع التذاكر" },
  { key: "pending", label: "قيد الانتظار" },
  { key: "in_progress", label: "قيد المعالجة" },
  { key: "completed", label: "مكتمل" },
  { key: "rejected", label: "مرفوض" },
] as const;

function matchesStatus(ticketStatus: string, filter: string): boolean {
  if (!filter || filter === "all") return true;
  const s = (ticketStatus || "").toLowerCase();

  if (filter === "pending" || filter === "open") {
    return s === "pending" || s === "open";
  }
  if (filter === "in_progress" || filter === "accepted") {
    return s === "in_progress" || s === "accepted";
  }
  if (filter === "completed" || filter === "closed") {
    return s === "completed" || s === "closed" || s === "resolved";
  }
  if (filter === "rejected") {
    return s === "rejected";
  }
  return s === filter;
}

function shortId(id?: string | null) {
  if (!id) return "";
  return String(id).replace(/^ORD-/, "").slice(0, 8).toUpperCase();
}

export function SupportClient({ userId, initialRequests, eligibleOrders }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [requests, setRequests] = useState<SupportRequest[]>(initialRequests);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  async function refreshRequests() {
    try {
      const res = await fetch(`/api/v1/support?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.tickets)) {
          setRequests(json.tickets as SupportRequest[]);
          return;
        }
      }
    } catch (e) {
      console.warn("Direct client support api fetch failed, falling back to supabase:", e);
    }

    const { data } = await supabase
      .from("support_requests")
      .select(`
        *,
        support_request_items (*),
        orders (
          id,
          total_price,
          rfqs (
            car_make,
            car_model,
            car_year,
            plate_number
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (data) {
      const filteredData = (data as any[]).filter(
        (r) => r.client_id === userId || r.requester_id === userId
      );
      setRequests(filteredData as SupportRequest[]);
    }
  }

  useEffect(() => {
    refreshRequests();
    const interval = setInterval(refreshRequests, 8000);

    const channel = supabase
      .channel(`support-client-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_requests",
          filter: `client_id=eq.${userId}`,
        },
        () => {
          refreshRequests();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => matchesStatus(r.status, "pending")).length,
    in_progress: requests.filter((r) => matchesStatus(r.status, "in_progress")).length,
    completed: requests.filter((r) => matchesStatus(r.status, "completed")).length,
    rejected: requests.filter((r) => matchesStatus(r.status, "rejected")).length,
  };

  const filtered = requests.filter((r) => {
    if (!matchesStatus(r.status, statusFilter)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchId = r.id && r.id.toLowerCase().includes(q);
      const matchReason = (r.reason || "").toLowerCase().includes(q);
      const matchOrder = r.order_id && r.order_id.toLowerCase().includes(q);
      const matchSubject = ((r as any).subject || "").toLowerCase().includes(q);
      return matchId || matchReason || matchOrder || matchSubject;
    }
    return true;
  });

  return (
    <div dir="rtl" className="space-y-6 pb-16 font-sans w-full">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black text-slate-900">مركز الدعم والمساعدة للعملاء</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              متابعة طلبات الاسترجاع والاستبدال، بلاغات التأخير في التوصيل، والتواصل المباشر مع فريق الدعم الفني
            </p>
          </div>

          <Button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-4 py-2 gap-1.5 shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء تذكرة دعم جديدة</span>
          </Button>
        </div>
      </div>

      <div className="w-full space-y-6">
        {/* Quick Category Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => setModalOpen(true)}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-slate-400">الاستبدال والاسترجاع</p>
              <p className="text-sm font-black text-slate-900 mt-1">طلب فحص أو استبدال قطع</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setModalOpen(true)}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-slate-400">تأخر التوصيل</p>
              <p className="text-sm font-black text-slate-900 mt-1">متابعة شحنات الطلبات</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setModalOpen(true)}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-slate-400">استفسارات عامة</p>
              <p className="text-sm font-black text-slate-900 mt-1">الدعم الفني المباشر</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="بحث في تذاكر الدعم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 h-10 text-xs rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
            {FILTER_TABS.map((tab) => {
              const isActive = statusFilter === tab.key;
              const count = counts[tab.key as keyof typeof counts] ?? 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tickets Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center text-slate-400 border border-slate-200 space-y-3">
            <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">لا توجد تذاكر دعم فني مسجلة</p>
            <p className="text-xs text-slate-400">يمكنك إنشاء تذكرة دعم فني جديدة في أي وقت وسيتولى فريقنا الرد فوراً</p>
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-5 py-2 mt-2"
            >
              إنشاء تذكرة جديدة
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((req) => {
              const statusCfg = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
              const typeCfg = TYPE_CONFIG[req.request_type] ?? { label: req.request_type, badge: "bg-slate-100 text-slate-700", icon: LifeBuoy };
              const TypeIcon = typeCfg.icon;

              return (
                <div
                  key={req.id}
                  onClick={() => router.push(`/client/support/${req.id}`)}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ring-1 ring-inset ${typeCfg.badge}`}>
                        <TypeIcon className="w-3 h-3" />
                        <span>{typeCfg.label}</span>
                      </span>

                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ring-1 ring-inset ${statusCfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        <span>{statusCfg.label}</span>
                      </span>
                    </div>

                    {/* Ticket Summary */}
                    <div>
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        تذكرة #{shortId(req.id)}
                      </span>
                      <p className="text-xs font-bold text-slate-800 line-clamp-2 mt-1 leading-snug">
                        {req.subject && req.subject !== req.reason ? `${req.subject} - ` : ""}
                        {req.reason}
                      </p>
                    </div>

                    {/* Associated Order */}
                    {req.order_id && (
                      <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <Car className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-mono font-bold text-blue-700 text-[11px]">
                            #ORD-{shortId(req.order_id)}
                          </span>
                          {req.orders?.rfqs && (
                            <p className="text-[10px] text-slate-500 truncate">
                              {req.orders.rfqs.car_make} {req.orders.rfqs.car_model} {req.orders.rfqs.car_year || ""}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-[10px]">
                      {new Date(req.created_at).toLocaleDateString("ar-SA")}
                    </span>
                    <div className="inline-flex items-center gap-1 text-blue-700 font-bold group-hover:-translate-x-1 transition-transform">
                      <span>عرض المحادثة</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Support Modal */}
      <NewSupportRequestModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        userId={userId}
        eligibleOrders={eligibleOrders}
        onSuccess={refreshRequests}
      />
    </div>
  );
}
