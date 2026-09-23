"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Truck,
  Package,
  MapPin,
  Clock,
  Phone,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Sparkles,
  ShieldCheck,
  Search,
  Filter,
  Loader2,
  RotateCw,
} from "lucide-react";
import { DeliveryRecord } from "@/lib/courier-service";
import { DELIVERY_STATUS_META } from "@/lib/delivery-state-machine";

export default function CourierDashboardPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDeliveries = async () => {
    try {
      const res = await fetch("/api/v1/courier/deliveries", {
        headers: { "x-courier-id": "courier-demo-id" },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.deliveries)) {
        setDeliveries(data.deliveries);
      }
    } catch (err) {
      console.error("Failed to load deliveries:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 15000); // 15s poll
    const handleSync = () => fetchDeliveries();
    if (typeof window !== "undefined") {
      window.addEventListener("rfq_data_changed", handleSync);
      window.addEventListener("storage", handleSync);
    }
    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("rfq_data_changed", handleSync);
        window.removeEventListener("storage", handleSync);
      }
    };
  }, []);

  const activeDeliveries = useMemo(() => {
    return deliveries.filter((d) => d.delivery_status !== "DELIVERED" && d.delivery_status !== "CANCELLED");
  }, [deliveries]);

  const completedDeliveries = useMemo(() => {
    return deliveries.filter((d) => d.delivery_status === "DELIVERED");
  }, [deliveries]);

  const filteredList = useMemo(() => {
    const target = activeTab === "active" ? activeDeliveries : completedDeliveries;
    if (!searchQuery.trim()) return target;
    const q = searchQuery.toLowerCase();
    return target.filter(
      (d) =>
        d.order_id.toLowerCase().includes(q) ||
        d.client_name.toLowerCase().includes(q) ||
        d.vendor_name.toLowerCase().includes(q) ||
        d.dropoff_district?.toLowerCase().includes(q) ||
        d.parts_summary.toLowerCase().includes(q)
    );
  }, [activeTab, activeDeliveries, completedDeliveries, searchQuery]);

  // Today's total earned commission
  const todayEarnings = useMemo(() => {
    return completedDeliveries.reduce((sum, d) => sum + (d.delivery_fee_earned || 35), 0);
  }, [completedDeliveries]);

  return (
    <div className="space-y-3.5">
      {/* ── Quick Stats Metric Strip ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-2xs text-center">
          <span className="text-[10px] text-slate-500 font-bold block">المهام الجارية</span>
          <span className="text-xl font-black text-blue-900 font-mono mt-0.5 block">
            {activeDeliveries.length}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-2xs text-center">
          <span className="text-[10px] text-slate-500 font-bold block">المكتملة اليوم</span>
          <span className="text-xl font-black text-emerald-800 font-mono mt-0.5 block">
            {completedDeliveries.length}
          </span>
        </div>

        <div className="bg-gradient-to-br from-[#1B4D3E] to-[#12362C] rounded-2xl p-2.5 text-white shadow-xs text-center">
          <span className="text-[10px] text-emerald-200 font-bold block">عمولات اليوم</span>
          <span className="text-xl font-black text-white font-mono mt-0.5 block">
            {todayEarnings.toFixed(0)} <span className="text-xs font-normal text-emerald-200">ر.س</span>
          </span>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الطلب، اسم العميل، الحي..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pr-10 pl-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            fetchDeliveries();
          }}
          title="تحديث قائمة الشحنات"
          className="p-2.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl text-slate-600 hover:text-emerald-700 shadow-2xs transition-all active:scale-95 shrink-0"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
        </button>
      </div>

      {/* ── Main Tab Navigation ── */}
      <div className="flex bg-slate-200/70 p-1 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "active"
              ? "bg-white text-slate-900 shadow-xs font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          المهام الجارية ({activeDeliveries.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "completed"
              ? "bg-white text-slate-900 shadow-xs font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          المكتملة ({completedDeliveries.length})
        </button>
      </div>

      {/* ── Deliveries List ── */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-xs font-bold">جاري تحميل المهام...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">لا توجد مهام في هذا التبويب</h3>
            <p className="text-xs text-slate-400 mt-0.5">ستظهر الشحنات فور إسنادها وتجهيزها من المورد</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((delivery) => {
            const meta = DELIVERY_STATUS_META[delivery.delivery_status] || DELIVERY_STATUS_META.ASSIGNED;
            const isDelivered = delivery.delivery_status === "DELIVERED";

            return (
              <Link
                key={delivery.id}
                href={`/courier/orders/${delivery.id}`}
                className="group block bg-white rounded-3xl p-4 border border-slate-200/90 hover:border-emerald-500 shadow-2xs hover:shadow-md transition-all active:scale-[0.99] relative overflow-hidden"
              >
                {/* Status Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">
                      #{delivery.order_id}
                    </span>
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${meta.badgeBg} ${meta.badgeText}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
                      {meta.labelAr}
                    </span>
                  </div>

                  <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                    +{delivery.delivery_fee_earned || 35} ر.س
                  </span>
                </div>

                {/* 2-Leg Journey Details */}
                <div className="space-y-2 text-xs">
                  {/* Leg 1: Supplier Pickup */}
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">
                      1
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold">الاستلام من المورد:</span>
                        <span className="text-[10px] text-amber-800 font-bold">{delivery.vendor_name}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                        {delivery.pickup_address}
                      </p>
                    </div>
                  </div>

                  {/* Leg 2: Customer Dropoff */}
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">
                      2
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold">التسليم للعميل:</span>
                        <span className="text-[10px] text-emerald-800 font-bold">{delivery.client_name}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                        {delivery.dropoff_address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parts Summary Bar */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                    <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-[11px] font-medium text-slate-700">
                      {delivery.parts_summary}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-emerald-800 font-black text-xs shrink-0 group-hover:translate-x-[-3px] transition-transform">
                    <span>{isDelivered ? "عرض التفاصيل" : "بدء الرحلة"}</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
