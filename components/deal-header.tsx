"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, TrendingUp, AlertCircle } from "lucide-react";

interface DealHeaderProps {
  order: {
    id: string;
    status: string;
    total_price: number;
    expected_delivery_days?: number;
    created_at: string;
  };
  rfq: {
    car_make: string;
    car_model: string;
    car_year: number;
    parts_description: string;
  };
  vendor: {
    full_name: string;
    company_name?: string;
  };
}

const statusColors: Record<string, string> = {
  confirmed: "bg-blue-500/10 text-blue-700 border-blue-300",
  in_progress: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
  shipped: "bg-purple-500/10 text-purple-700 border-purple-300",
  delivered: "bg-green-500/10 text-green-700 border-green-300",
  completed: "bg-green-600/10 text-green-800 border-green-400",
  cancelled: "bg-red-500/10 text-red-700 border-red-300",
};

const statusLabels: Record<string, string> = {
  confirmed: "تم التجهيز",
  preparing: "تم التجهيز",
  in_progress: "تم التجهيز",
  ready: "تم التجهيز",
  shipped: "تم الشحن",
  delivered: "جاري التسليم",
  completed: "تأكيد واستلام",
  cancelled: "ملغي",
};

export function DealHeader({ order, rfq, vendor }: DealHeaderProps) {
  const deliveryDate = order.expected_delivery_days
    ? new Date(
        new Date(order.created_at).getTime() +
          order.expected_delivery_days * 24 * 60 * 60 * 1000
      )
    : null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Package className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">
                صفقة #{order.id.slice(0, 8)}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {rfq.car_make} {rfq.car_model} {rfq.car_year}
            </p>
          </div>
          <Badge
            className={`${
              statusColors[order.status] || "bg-secondary"
            } text-sm px-4 py-2`}
          >
            {statusLabels[order.status] || order.status}
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">قيمة الصفقة</p>
              <p className="font-bold">{order.total_price.toLocaleString()} ر.س</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المورد</p>
              <p className="font-bold">
                {vendor.company_name || vendor.full_name}
              </p>
            </div>
          </div>

          {deliveryDate && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">التسليم المتوقع</p>
                <p className="font-bold">
                  {deliveryDate.toLocaleDateString("ar-SA")}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
