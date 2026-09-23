"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OrderStatusTracker from "@/components/order-status-tracker";
import OrderMessages from "@/components/order-messages";
import OrderFileUpload from "@/components/order-file-upload";
import { ArrowRight, Car, Calendar, ChevronLeft, CreditCard, Loader2, User, Clock } from "lucide-react";
import { syncOrderStatusUpdate, getEffectiveOrderStatus } from "@/lib/order-status-sync";

// Singleton — prevents Multiple GoTrueClient warnings
const supabase = createClient();

interface Order {
  id: string;
  rfq_id: string;
  quote_id: string;
  client_id: string;
  vendor_id: string;
  status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
}

interface RFQ {
  car_make: string;
  car_model: string;
  car_year: number;
  parts_description: string;
}

interface Quote {
  delivery_days: number;
  notes: string | null;
}

interface Profile {
  full_name: string;
  company_name: string | null;
  phone: string | null;
}

const STATUS_MAP: Record<string, string> = {
  confirmed: "تم التجهيز",
  preparing: "تم التجهيز",
  processing: "تم التجهيز",
  ready: "تم التجهيز",
  shipped: "تم الشحن",
  delivered: "جاري التسليم",
  completed: "تأكيد واستلام",
  cancelled: "ملغي",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-amber-100 text-amber-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const NEXT_STATUS: Record<string, string> = {
  confirmed: "processing",
  processing: "shipped",
  shipped: "delivered",
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  confirmed: "بدء التجهيز",
  processing: "تم الشحن",
  shipped: "تم التوصيل",
};

export default function VendorOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [client, setClient] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (!orderData) { router.push("/vendor"); return; }
      setOrder(orderData as Order);

      const [rfqRes, quoteRes, clientRes] = await Promise.all([
        supabase.from("rfqs").select("car_make, car_model, car_year, parts_description").eq("id", orderData.rfq_id).single(),
        supabase.from("quotes").select("delivery_days, notes").eq("id", orderData.quote_id).single(),
        supabase.from("profiles").select("full_name, company_name, phone").eq("id", orderData.client_id).single(),
      ]);

      setRfq(rfqRes.data as RFQ);
      setQuote(quoteRes.data as Quote);
      setClient(clientRes.data as Profile);
      setIsLoading(false);
    }
    load();
  }, [orderId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-${orderId}-status`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload: any) => { setOrder(payload.new as Order); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async () => {
    if (!order || !NEXT_STATUS[order.status]) return;
    const next = NEXT_STATUS[order.status];
    setIsUpdating(true);

    await syncOrderStatusUpdate({
      orderId: order.id,
      newStatus: next,
      actorRole: "vendor",
    });

    setOrder((prev) => prev ? { ...prev, status: next } : prev);
    setIsUpdating(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order || !rfq) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/vendor">
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">تفاصيل الطلب</h2>
          <p className="text-muted-foreground">طلب #{order.id.slice(0, 8)}</p>
        </div>
        <Badge className={`${STATUS_COLORS[order.status]} border-0 text-sm px-3 py-1`}>
          {STATUS_MAP[order.status]}
        </Badge>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <OrderStatusTracker status={order.status} />
          </div>
          {NEXT_STATUS[order.status] && (
            <Button onClick={updateStatus} disabled={isUpdating} className="shrink-0">
              {isUpdating ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <ChevronLeft className="w-4 h-4 ml-2" />
              )}
              {NEXT_STATUS_LABEL[order.status]}
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="w-5 h-5" />
              تفاصيل السيارة والقطع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">السيارة</span>
              <span className="font-medium">{rfq.car_make} {rfq.car_model} {rfq.car_year}</span>
            </div>
            <div className="border-t pt-3">
              <span className="text-muted-foreground text-sm">القطع المطلوبة:</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {rfq.parts_description.split("\n").map((part, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{part}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              معلومات العميل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الاسم</span>
              <span className="font-medium">{client?.full_name}</span>
            </div>
            {client?.phone && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الهاتف</span>
                <span className="font-medium" dir="ltr">{client.phone}</span>
              </div>
            )}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard className="w-4 h-4" /> السعر الإجمالي</span>
                <span className="font-bold text-lg text-primary">{order.total_price} ر.س</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-4 h-4" /> مدة التوصيل</span>
                <span className="font-medium">{quote?.delivery_days} أيام</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-4 h-4" /> تاريخ الطلب</span>
                <span className="font-medium">{new Date(order.created_at).toLocaleDateString("ar-SA")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <OrderMessages orderId={orderId} currentUserId={userId} />
        <OrderFileUpload orderId={orderId} currentUserId={userId} canUpload={true} />
      </div>
    </div>
  );
}
