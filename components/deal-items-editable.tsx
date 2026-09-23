"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, CheckCircle, Clock, XCircle, Edit, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const supabase = createClient();

interface DealItem {
  id: string;
  part_name: string;
  part_number?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  notes?: string;
}

interface DealItemsEditableProps {
  orderId: string;
  items: DealItem[];
  totalAmount: number;
  canEdit: boolean;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-600" />,
  confirmed: <CheckCircle className="h-4 w-4 text-blue-600" />,
  ready: <CheckCircle className="h-4 w-4 text-green-600" />,
  shipped: <Package className="h-4 w-4 text-purple-600" />,
  delivered: <CheckCircle className="h-4 w-4 text-green-700" />,
  unavailable: <XCircle className="h-4 w-4 text-red-600" />,
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "تم التأكيد",
  ready: "جاهز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  unavailable: "غير متوفر",
};

export function DealItemsEditable({
  orderId,
  items: initialItems,
  totalAmount,
  canEdit,
}: DealItemsEditableProps) {
  const [items, setItems] = useState(initialItems);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DealItem | null>(null);
  const [formData, setFormData] = useState({
    part_name: "",
    part_number: "",
    quantity: 1,
    unit_price: 0,
    status: "pending",
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData({
      part_name: "",
      part_number: "",
      quantity: 1,
      unit_price: 0,
      status: "pending",
      notes: "",
    });
    setShowDialog(true);
  };

  const openEditDialog = (item: DealItem) => {
    setEditingItem(item);
    setFormData({
      part_name: item.part_name,
      part_number: item.part_number || "",
      quantity: item.quantity,
      unit_price: item.unit_price,
      status: item.status,
      notes: item.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const totalPrice = formData.quantity * formData.unit_price;

    if (editingItem) {
      // Update existing item
      await supabase
        .from("deal_items")
        .update({
          ...formData,
          part_number: formData.part_number || null,
          notes: formData.notes || null,
          total_price: totalPrice,
        })
        .eq("id", editingItem.id);
    } else {
      // Add new item
      await supabase.from("deal_items").insert({
        order_id: orderId,
        ...formData,
        part_number: formData.part_number || null,
        notes: formData.notes || null,
        total_price: totalPrice,
      });
    }

    setShowDialog(false);
    setIsSaving(false);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            تفاصيل القطع
          </CardTitle>
          {canEdit && (
            <Button onClick={openAddDialog} size="sm">
              <Plus className="h-4 w-4 ml-1" />
              إضافة قطعة
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">اسم القطعة</TableHead>
              <TableHead className="text-center">رقم القطعة</TableHead>
              <TableHead className="text-center">الكمية</TableHead>
              <TableHead className="text-center">سعر الوحدة</TableHead>
              <TableHead className="text-center">الإجمالي</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              {canEdit && <TableHead className="text-center">الإجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div>
                    {item.part_name}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {item.part_number ? (
                    <Badge variant="outline">{item.part_number}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-center">
                  {item.unit_price.toLocaleString()} ر.س
                </TableCell>
                <TableCell className="text-center font-medium">
                  {item.total_price.toLocaleString()} ر.س
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {statusIcons[item.status]}
                    <span className="text-sm">
                      {statusLabels[item.status] || item.status}
                    </span>
                  </div>
                </TableCell>
                {canEdit && (
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <span className="text-lg font-semibold">الإجمالي الكلي</span>
          <span className="text-2xl font-bold text-primary">
            {totalAmount.toLocaleString()} ر.س
          </span>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "تعديل قطعة" : "إضافة قطعة جديدة"}
              </DialogTitle>
              <DialogDescription>
                أدخل تفاصيل القطعة
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>اسم القطعة *</Label>
                  <Input
                    value={formData.part_name}
                    onChange={(e) =>
                      setFormData({ ...formData, part_name: e.target.value })
                    }
                    placeholder="مثال: فلتر زيت"
                  />
                </div>
                <div>
                  <Label>رقم القطعة</Label>
                  <Input
                    value={formData.part_number}
                    onChange={(e) =>
                      setFormData({ ...formData, part_number: e.target.value })
                    }
                    placeholder="اختياري"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>الكمية *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>سعر الوحدة (ر.س) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unit_price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>الحالة</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                />
              </div>

              <div className="p-3 bg-muted rounded">
                <span className="text-sm font-medium">الإجمالي: </span>
                <span className="text-lg font-bold">
                  {(formData.quantity * formData.unit_price).toLocaleString()}{" "}
                  ر.س
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  isSaving || !formData.part_name || formData.unit_price <= 0
                }
              >
                {isSaving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
