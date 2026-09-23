"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  FileText,
  CheckCircle2,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getEffectiveOrderStatus } from "@/lib/order-status-sync";

interface RFQ {
  id: string;
  car_make: string;
  car_model: string;
  car_year: number;
  parts_description: string;
  status: string;
  created_at: string;
  quotes?: { count: number }[];
}

interface Order {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  profiles?: { full_name: string; company_name?: string };
}

const STATUS_AR: Record<string, string> = {
  open: "جاري البحث",
  quoted: "جاهز للشحن",
  accepted: "تم الاستلام",
  confirmed: "تم التجهيز",
  preparing: "تم التجهيز",
  processing: "تم التجهيز",
  ready: "تم التجهيز",
  shipped: "تم الشحن",
  delivered: "جاري التسليم",
  completed: "تأكيد واستلام",
};

export function ClientDashboardClient({ rfqs, orders }: { rfqs: RFQ[]; orders: Order[] }) {
  const router = useRouter();

  // Statistics
  const activeRfqs = useMemo(() => rfqs.filter((r) => r.status !== "accepted").length, [rfqs]);
  const monthOrders = useMemo(() => {
    const now = new Date();
    const thisMonth = orders.filter((o) => {
      const d = new Date(o.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return thisMonth.length;
  }, [orders]);
  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "delivered").length,
    [orders]
  );
  const completedPercent = orders.length > 0 ? ((completedOrders / orders.length) * 100).toFixed(1) : "0";

  // Chart data - last 6 months
  const monthlyChart = useMemo(() => {
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"];
    const data = months.map((month, i) => {
      const count = Math.floor(Math.random() * 100) + 20; // Mock data
      return { month, count };
    });
    return data;
  }, []);

  // Latest order for tracking
  const latestOrder = useMemo(() => orders[0], [orders]);

  // Recent RFQs
  const recentRfqs = useMemo(() => rfqs.slice(0, 3), [rfqs]);

  return (
    <div className="space-y-6 text-slate-900 pb-16 font-sans w-full" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Velocity Spare Parts</h1>
            <p className="text-sm text-gray-500 mt-1">Precision Architect - Logistics Management</p>
          </div>
          <Link href="/client/new-rfq">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-md">
              <Plus className="w-4 h-4" />
              طلب جديد
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Orders */}
          <Card className="bg-white border-t-4 border-t-blue-600 shadow-sm hover:shadow-md transition-all p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-2">طلبات نشطة</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-gray-900">{activeRfqs}</p>
                  <span className="text-xs text-green-600 font-medium">+12%</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">قيدا على الاستلام أو في مرحلة</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          {/* Monthly Orders */}
          <Card className="bg-white border-t-4 border-t-green-500 shadow-sm hover:shadow-md transition-all p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-2">طلبات الشهر</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-gray-900">{monthOrders}</p>
                  <span className="text-xs text-gray-500">طلب</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">طلبات بانتظار في هذه الفترة</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          {/* Completed Orders */}
          <Card className="bg-white border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-all p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-2">طلبات منفذة</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-gray-900">{completedOrders}</p>
                  <span className="text-xs text-emerald-600 font-medium">{completedPercent}%</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">بمعدل الطلبات تاما اليوم</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart - Large */}
          <Card className="lg:col-span-2 bg-white shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">تحليل الإيداع اللوجيستي</h2>
              <select className="text-xs border rounded-lg px-3 py-1.5 text-gray-600">
                <option>آخر 30 يوم</option>
                <option>آخر 60 يوم</option>
                <option>آخر 90 يوم</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mb-4">توزيع الطلبات حسب الفترة الزمنية</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Order Tracking */}
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg p-6 text-white">
            <h2 className="text-lg font-bold mb-1">تتبع الطلب الأخير</h2>
            <p className="text-xs text-blue-100 mb-6">
              رقم الطلب: {latestOrder ? `#${latestOrder.id.slice(0, 8)}` : "—"}
            </p>

            {latestOrder ? (() => {
              const effStatus = getEffectiveOrderStatus(latestOrder.id, latestOrder.status);
              const stepIndex =
                effStatus === "preparing" || effStatus === "confirmed" ? 0 :
                effStatus === "ready" || effStatus === "shipped" ? 1 :
                effStatus === "delivered" || effStatus === "out_for_delivery" ? 2 :
                effStatus === "completed" ? 3 : 0;

              const stages = [
                { label: "تم التجهيز", desc: "تم تجهيز قطع الغيار المطلوبة" },
                { label: "تم الشحن", desc: "الشحنة بحوزة المندوب وجاهزة للنقل" },
                { label: "جاري التسليم", desc: "الشحنة في طريقها إلى موقعك" },
                { label: "تأكيد واستلام", desc: "استلام الطلب ومطابقة القطع والتقييم" },
              ];

              return (
                <div className="space-y-4 mb-8">
                  {stages.map((stage, idx) => {
                    const isDone = idx < stepIndex;
                    const isActive = idx === stepIndex;
                    return (
                      <div key={stage.label} className={`flex items-start gap-3 ${idx > stepIndex ? "opacity-40" : ""}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isDone
                            ? "bg-white text-blue-900"
                            : isActive
                            ? "bg-white text-blue-600 shadow-md ring-2 ring-white/50"
                            : "border-2 border-white/40"
                        }`}>
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isActive ? (
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                          ) : (
                            <span className="text-[10px] font-bold text-white/60">{idx + 1}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold">{stage.label}</p>
                          <p className="text-xs text-blue-100">{stage.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <p className="text-center text-blue-100 py-8 text-sm">لا توجد طلبات</p>
            )}

            <Button
              variant="outline"
              className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => router.push("/client/orders")}
            >
              عرض تفاصيل الشحنة
            </Button>
          </Card>
        </div>

        {/* Recent Activity Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active RFQs */}
          <Card className="bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <h3 className="font-bold text-gray-900">الطلبات النشطة</h3>
            </div>
            <div className="p-4 space-y-2">
              {recentRfqs.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">لا توجد طلبات</p>
              ) : (
                recentRfqs.map((rfq) => (
                  <Link
                    key={rfq.id}
                    href={`/client/rfq/${rfq.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {rfq.car_make} {rfq.car_model}
                      </p>
                      <p className="text-xs text-gray-500">{rfq.car_year}</p>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      {rfq.quotes?.[0]?.count || 0} عروض
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors mr-2" />
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Quote Requests */}
          <Card className="bg-white shadow-sm">
            <div className="border-b px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">طلبات التسعير</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600"
                onClick={() => router.push("/client/orders?tab=rfqs")}
              >
                عرض كل
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {rfqs.slice(0, 3).map((rfq) => (
                <div
                  key={rfq.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">RQ-{rfq.id.slice(0, 4).toUpperCase()}#</p>
                    <p className="text-xs text-gray-500">{new Date(rfq.created_at).toLocaleDateString("ar-SA")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">التاريخ</span>
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">
                      {STATUS_AR[rfq.status] || rfq.status}
                    </Badge>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </Card>

          {/* Monthly Orders */}
          <Card className="bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <h3 className="font-bold text-gray-900">طلبات الشهر</h3>
            </div>
            <div className="p-4 space-y-3">
              {orders.slice(0, 3).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">RQ-{order.id.slice(0, 4).toUpperCase()}#</p>
                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString("ar-SA")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">الإجراء</span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      {STATUS_AR[order.status] || order.status}
                    </Badge>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link href="/client/orders">
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              تسجيل المراجع
            </Button>
          </Link>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            الإعدادات
          </Button>
          <Button variant="ghost" className="gap-2 text-blue-600">
            تاريخ الشخصي
          </Button>
        </div>
      </div>
  );
}
