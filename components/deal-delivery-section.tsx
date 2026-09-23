"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, MapPin, Package, Edit } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const supabase = createClient();

interface DealDeliverySectionProps {
  orderId: string;
  deliveryMethod: string | null;
  pickupLocation: string | null;
  shippingCompany: string | null;
  trackingNumber: string | null;
  expectedDeliveryDays: number | null;
  canEdit: boolean;
}

export function DealDeliverySection({
  orderId,
  deliveryMethod,
  pickupLocation,
  shippingCompany,
  trackingNumber,
  expectedDeliveryDays,
  canEdit,
}: DealDeliverySectionProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [method, setMethod] = useState(deliveryMethod || "pickup");
  const [location, setLocation] = useState(pickupLocation || "");
  const [company, setCompany] = useState(shippingCompany || "");
  const [tracking, setTracking] = useState(trackingNumber || "");
  const [days, setDays] = useState(expectedDeliveryDays?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();

  const handleSave = async () => {
    setIsSaving(true);

    await supabase
      .from("orders")
      .update({
        delivery_method: method,
        pickup_location: method === "pickup" ? location : null,
        shipping_company: method === "shipping" ? company : null,
        tracking_number: method === "shipping" ? tracking : null,
        expected_delivery_days: days ? parseInt(days) : null,
      })
      .eq("id", orderId);

    setShowDialog(false);
    setIsSaving(false);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            التسليم والاستلام
          </CardTitle>
          {canEdit && (
            <Button onClick={() => setShowDialog(true)} size="sm" variant="outline">
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!deliveryMethod && !canEdit ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            لم يتم تحديد طريقة التسليم بعد
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {deliveryMethod === "pickup" ? (
                <MapPin className="h-5 w-5 text-primary" />
              ) : (
                <Package className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="font-medium">
                  {deliveryMethod === "pickup" ? "استلام من المحل" : "شحن"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {deliveryMethod === "pickup" ? "يتم الاستلام مباشرة" : "سيتم الشحن للعنوان"}
                </p>
              </div>
            </div>

            {deliveryMethod === "pickup" && pickupLocation && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">موقع الاستلام:</p>
                <p className="text-sm">{pickupLocation}</p>
              </div>
            )}

            {deliveryMethod === "shipping" && (
              <div className="space-y-3">
                {shippingCompany && (
                  <div>
                    <p className="text-sm text-muted-foreground">شركة الشحن:</p>
                    <p className="font-medium">{shippingCompany}</p>
                  </div>
                )}
                {trackingNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">رقم التتبع:</p>
                    <p className="font-mono font-medium">{trackingNumber}</p>
                  </div>
                )}
              </div>
            )}

            {expectedDeliveryDays && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <Clock className="h-4 w-4 text-primary" />
                <p className="text-sm">
                  <span className="font-medium">{expectedDeliveryDays}</span> يوم مدة التوصيل المتوقعة
                </p>
              </div>
            )}
          </>
        )}

        {/* Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تحديث معلومات التسليم</DialogTitle>
              <DialogDescription>
                حدد طريقة التسليم وأدخل التفاصيل
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>طريقة التسليم</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">استلام من المحل</SelectItem>
                    <SelectItem value="shipping">شحن</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {method === "pickup" && (
                <div>
                  <Label>موقع الاستلام</Label>
                  <Textarea
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="أدخل عنوان الموقع..."
                    rows={3}
                  />
                </div>
              )}

              {method === "shipping" && (
                <>
                  <div>
                    <Label>شركة الشحن (اختياري)</Label>
                    <Input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="مثل: سمسا، aramex، ups"
                    />
                  </div>
                  <div>
                    <Label>رقم التتبع (اختياري)</Label>
                    <Input
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      placeholder="أدخل رقم التتبع"
                    />
                  </div>
                </>
              )}

              <div>
                <Label>مدة التوصيل المتوقعة (بالأيام)</Label>
                <Input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  placeholder="مثال: 3"
                  min="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
