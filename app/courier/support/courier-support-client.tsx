"use client";

import { useState } from "react";
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
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewCourierSupportModal } from "@/components/support/new-courier-support-modal";

export interface CourierSupportRequest {
  id: string;
  client_id: string;
  order_id?: string | null;
  request_type: "client_location_issue" | "vendor_pickup_issue" | "courier_payout" | "other" | string;
  status: "pending" | "accepted" | "rejected" | "completed" | string;
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
}

interface Props {
  userId: string;
  initialRequests: CourierSupportRequest[];
  eligibleDeliveries: Array<{
    id: string;
    order_id: string;
    delivery_status: string;
    vendor_name: string;
    client_name: string;
    parts_summary: string;
  }>;
}

const STATUS_CONFIG = {
  pending: { label: "قيد المراجعة", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 ring-amber-600/20", icon: Clock },
  accepted: { label: "مقبول وجاري المعالجة", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: CheckCircle2 },
  rejected: { label: "مرفوض", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 ring-rose-600/20", icon: XCircle },
  completed: { label: "تم الحل والإكمال", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700 ring-sky-600/20", icon: CheckCircle2 },
};

const TYPE_CONFIG: Record<string, { label: string; badge: string; icon: any }> = {
  client_location_issue: { label: "موقع أو تواصل العميل", badge: "bg-rose-50 text-rose-800 ring-rose-600/20", icon: MapPin },
  vendor_pickup_issue: { label: "استلام من المورد", badge: "bg-amber-50 text-amber-800 ring-amber-600/20", icon: Package },
  courier_payout: { label: "سحب العمولات", badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", icon: Wallet },
  other: { label: "أخرى", badge: "bg-slate-100 text-slate-700 ring-slate-600/20", icon: FileQuestion },
};

function shortId(id: string) {
  return id.replace(/^ORD-/, "").replace(/^DEL-/, "").slice(0, 8).toUpperCase();
}

export function CourierSupportClient({ userId, initialRequests, eligibleDeliveries }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [requests, setRequests] = useState<CourierSupportRequest[]>(initialRequests);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  async function refreshRequests() {
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
      .eq("client_id", userId)
      .order("created_at", { ascending: false });

    if (data) setRequests(data as CourierSupportRequest[]);
  }

  const filtered = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchId = r.id.toLowerCase().includes(q);
      const matchReason = (r.reason || "").toLowerCase().includes(q);
      const matchOrder = r.order_id?.toLowerCase().includes(q);
      return matchId || matchReason || matchOrder;
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
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <LifeBuoy className="w-5 h-5 text-emerald-400" />
              </div>
              <h1 className="text-xl font-black text-slate-900">مركز الدعم وبلاغات العمليات للمندوبين</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              متابعة مشاكل استلام الشحنات، تعثر تواصل العملاء، طلبات سحب العمولات، والتواصل الفوري مع المشرفين
            </p>
          </div>

          <Button
            onClick={() => setModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl px-4 py-2 gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>إنشاء بلاغ / تذكرة جديدة</span>
          </Button>
        </div>
      </div>

      <div className="w-full space-y-6">
        {/* Quick Category Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => setModalOpen(true)}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-rose-300 hover:bg-rose-50/30 transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-slate-400">تواصل العميل</p>
              <p className="text-sm font-black text-slate-900 mt-1">موقع غير دقيق / عدم تجاوب</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setModalOpen(true)}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-slate-400">استلام المورد</p>
              <p className="text-sm font-black text-slate-900 mt-1">القطعة غير جاهزة / تلف</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setModalOpen(true)}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-slate-400">سحب الأرباح</p>
              <p className="text-sm font-black text-slate-900 mt-1">تحويل عمولات التوصيل</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="بحث في بلاغات وتذاكر الدعم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 h-10 text-xs rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
            {["all", "pending", "accepted", "rejected", "completed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === st
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {st === "all"
                  ? "جميع التذاكر"
                  : STATUS_CONFIG[st as keyof typeof STATUS_CONFIG]?.label || st}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center text-slate-400 border border-slate-200 space-y-3">
            <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">لا توجد بلاغات أو تذاكر دعم فني مسجلة</p>
            <p className="text-xs text-slate-400">يمكنك رفع بلاغ ميداني جديد في أي وقت ليتولى فريق العمليات حله فوراً</p>
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl px-5 py-2 mt-2"
            >
              إنشاء بلاغ جديد
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
                  onClick={() => router.push(`/courier/support/${req.id}`)}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer flex flex-col justify-between group space-y-4"
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
                        بلاغ #{shortId(req.id)}
                      </span>
                      <p className="text-xs font-bold text-slate-800 line-clamp-2 mt-1 leading-snug">
                        {req.reason}
                      </p>
                    </div>

                    {/* Associated Order */}
                    {req.order_id && (
                      <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-mono font-bold text-slate-900 text-[11px]">
                            #ORD-{shortId(req.order_id)}
                          </span>
                          {req.orders?.rfqs && (
                            <p className="text-[10px] text-slate-500 truncate">
                              {req.orders.rfqs.car_make} {req.orders.rfqs.car_model}
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
                    <div className="inline-flex items-center gap-1 text-slate-900 font-bold group-hover:-translate-x-1 transition-transform">
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
      <NewCourierSupportModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        userId={userId}
        eligibleDeliveries={eligibleDeliveries}
        onSuccess={refreshRequests}
      />
    </div>
  );
}
