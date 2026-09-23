"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Star, Upload, CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Singleton — prevents Multiple GoTrueClient warnings
const supabase = createClient();

interface DealActionsProps {
  orderId: string;
  currentStatus: string;
  userRole: "client" | "vendor";
  canRate: boolean;
  existingRating?: any;
}

export function DealActions({
  orderId,
  currentStatus,
  userRole,
  canRate,
  existingRating,
}: DealActionsProps) {
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const router = useRouter();

  const handleSubmitRating = async () => {
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("deal_ratings").insert({
      order_id: orderId,
      rated_by_id: user.id,
      rated_by_role: userRole,
      rating,
      review: review.trim() || null,
    });

    setShowRating(false);
    setIsSubmitting(false);
    // Soft refresh to show the rating — does not remount the full page
    router.refresh();
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) return;

    setIsSubmitting(true);

    // Database-first: write to DB, Realtime event drives all UI updates.
    // No router.refresh() — that would cause a full page remount and stale flicker.
    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    setShowStatusDialog(false);
    setNewStatus("");
    setIsSubmitting(false);
  };

  const canUpdateStatus = userRole === "vendor" && currentStatus !== "completed" && currentStatus !== "cancelled";

  return (
    <Card>
      <CardHeader>
        <CardTitle>الإجراءات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canUpdateStatus && (
          <Button
            onClick={() => setShowStatusDialog(true)}
            className="w-full"
            variant="outline"
          >
            <CheckCircle className="h-4 w-4 ml-2" />
            تحديث حالة الطلب
          </Button>
        )}

        {canRate && !existingRating && currentStatus === "delivered" && (
          <Button
            onClick={() => setShowRating(true)}
            className="w-full"
            variant="default"
          >
            <Star className="h-4 w-4 ml-2" />
            تقييم الصفقة
          </Button>
        )}

        {existingRating && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
              <span className="font-semibold">{existingRating.rating}/5</span>
            </div>
            {existingRating.review && (
              <p className="text-sm text-muted-foreground">
                {existingRating.review}
              </p>
            )}
          </div>
        )}

        {/* Status Update Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تحديث حالة الطلب</DialogTitle>
              <DialogDescription>
                اختر الحالة الجديدة للطلب
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الحالة الجديدة</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="shipped">تم الشحن</SelectItem>
                    <SelectItem value="delivered">تم التسليم</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowStatusDialog(false)}
              >
                إلغاء
              </Button>
              <Button onClick={handleUpdateStatus} disabled={isSubmitting || !newStatus}>
                تحديث
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rating Dialog */}
        <Dialog open={showRating} onOpenChange={setShowRating}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تقييم الصفقة</DialogTitle>
              <DialogDescription>
                شارك تجربتك مع هذه الصفقة
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>التقييم</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition-colors"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= rating
                            ? "fill-amber-500 text-amber-500"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>التعليق (اختياري)</Label>
                <Textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="اكتب تعليقك هنا..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRating(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSubmitRating} disabled={isSubmitting}>
                إرسال التقييم
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
