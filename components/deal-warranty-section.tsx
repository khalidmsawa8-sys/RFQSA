"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Edit } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const supabase = createClient();

interface DealWarrantySectionProps {
  orderId: string;
  warrantyTerms: string | null;
  warrantyDuration: string | null;
  returnPolicy: string | null;
  canEdit: boolean;
}

export function DealWarrantySection({
  orderId,
  warrantyTerms,
  warrantyDuration,
  returnPolicy,
  canEdit,
}: DealWarrantySectionProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [terms, setTerms] = useState(warrantyTerms || "");
  const [duration, setDuration] = useState(warrantyDuration || "");
  const [policy, setPolicy] = useState(returnPolicy || "");
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();

  const handleSave = async () => {
    setIsSaving(true);

    await supabase
      .from("orders")
      .update({
        warranty_terms: terms.trim() || null,
        warranty_duration: duration.trim() || null,
        return_policy: policy.trim() || null,
      })
      .eq("id", orderId);

    setShowDialog(false);
    setIsSaving(false);
    router.refresh();
  };

  const hasInfo = warrantyTerms || warrantyDuration || returnPolicy;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            الضمان والإرجاع
          </CardTitle>
          {canEdit && (
            <Button onClick={() => setShowDialog(true)} size="sm" variant="outline">
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasInfo && !canEdit ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            لم يتم تحديد معلومات الضمان بعد
          </p>
        ) : hasInfo ? (
          <>
            {warrantyDuration && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  مدة الضمان:
                </p>
                <p className="font-medium">{warrantyDuration}</p>
              </div>
            )}

            {warrantyTerms && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  شروط الضمان:
                </p>
                <p className="text-sm whitespace-pre-wrap">{warrantyTerms}</p>
              </div>
            )}

            {returnPolicy && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  سياسة الإرجاع:
                </p>
                <p className="text-sm whitespace-pre-wrap">{returnPolicy}</p>
              </div>
            )}
          </>
        ) : (
          canEdit && (
            <p className="text-sm text-muted-foreground text-center py-4">
              انقر على زر التعديل لإضافة معلومات الضمان
            </p>
          )
        )}

        {/* Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>معلومات الضمان والإرجاع</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل الضمان وسياسة الإرجاع
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>مدة الضمان</Label>
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="مثال: سنة واحدة، 6 أشهر، 90 يوم"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  حدد المدة بوضوح (شهر، سنة، إلخ)
                </p>
              </div>

              <div>
                <Label>شروط الضمان</Label>
                <Textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="اكتب شروط الضمان بالتفصيل..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  مثال: يغطي عيوب الصناعة فقط، لا يشمل التلف بسبب سوء الاستخدام
                </p>
              </div>

              <div>
                <Label>سياسة الإرجاع</Label>
                <Textarea
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                  placeholder="اكتب سياسة الإرجاع..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  مثال: يمكن الإرجاع خلال 14 يوم بشرط عدم الاستخدام
                </p>
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
