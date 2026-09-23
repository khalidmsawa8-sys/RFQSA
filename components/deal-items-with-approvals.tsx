"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Package, Plus, Pencil, Trash2, Check, X, AlertCircle, Loader2, XCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface DealItem {
  id: string;
  order_id: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  availability_status: string;
  notes: string | null;
}

interface ItemChange {
  id: string;
  order_id: string;
  change_type: string;
  deal_item_id: string | null;
  part_name: string | null;
  part_number: string | null;
  quantity: number | null;
  unit_price: number | null;
  notes: string | null;
  requested_by: string;
  status: string;
  created_at: string;
  profiles?: { full_name: string } | null;
}

interface Props {
  orderId: string;
  items: DealItem[];
  totalAmount: number;
  userRole: "client" | "vendor";
}

const availabilityConfig: Record<string, { label: string; color: string }> = {
  available: { label: "متوفر", color: "bg-green-100 text-green-800" },
  ordered: { label: "تم الطلب", color: "bg-blue-100 text-blue-800" },
  not_available: { label: "غير متوفر", color: "bg-red-100 text-red-800" },
};

export function DealItemsWithApprovals({ orderId, items: initialItems, totalAmount, userRole }: Props) {
  const [items, setItems] = useState<DealItem[]>(initialItems);
  const [pendingChanges, setPendingChanges] = useState<ItemChange[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DealItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<DealItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ItemChange | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [formData, setFormData] = useState({
    part_name: "",
    part_number: "",
    quantity: 1,
    unit_price: 0,
  });

  useEffect(() => {
    loadPendingChanges();

    const channel = supabase
      .channel(`deal-items-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_items", filter: `order_id=eq.${orderId}` }, () => loadItems())
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_item_changes", filter: `order_id=eq.${orderId}` }, () => loadPendingChanges())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  async function loadItems() {
    const { data } = await supabase
      .from("deal_items")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (data) setItems(data);
  }

  async function loadPendingChanges() {
    const { data } = await supabase
      .from("deal_item_changes")
      .select("*, requested_by")
      .eq("order_id", orderId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (!data) return;

    // Enrich with requester name from profiles
    const ids = [...new Set(data.map((c: any) => c.requested_by))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, company_name")
      .in("id", ids);
    const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
    const enriched = data.map((c: any) => ({
      ...c,
      profiles: profileMap.get(c.requested_by) || null,
    }));
    setPendingChanges(enriched as ItemChange[]);
  }

  function resetForm() {
    setFormData({ part_name: "", part_number: "", quantity: 1, unit_price: 0 });
  }

  // --- Activity Log Helper ---
  async function logActivity(eventType: string, description: string, metadata: Record<string, unknown> = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("order_activity_log").insert({
      order_id: orderId,
      user_id: user.id,
      event_type: eventType,
      description,
      metadata,
    });
  }

  // --- Propose Add ---
  async function proposeAdd() {
    if (!formData.part_name || formData.unit_price <= 0) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: addError } = await supabase.from("deal_item_changes").insert({
        order_id: orderId,
        change_type: "add",
        deal_item_id: null,
        part_name: formData.part_name,
        part_number: formData.part_number || null,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        requested_by: user.id,
        status: "pending",
      });
      if (addError) { return; }

      // Send notification to other party
      const { data: order } = await supabase
        .from("orders")
        .select("client_id, vendor_id")
        .eq("id", orderId)
        .single();

      if (order) {
        const recipientId = userRole === "client" ? order.vendor_id : order.client_id;
        await supabase.from("notifications").insert({
          user_id: recipientId,
          type: "item_change_request",
          title: "طلب إضافة قطعة جديدة",
          message: `${userRole === "client" ? "العميل" : "المورد"} يطلب إضافة قطعة: ${formData.part_name}`,
          order_id: orderId,
          sent_at: new Date().toISOString(),
        });
      }

      setShowAddDialog(false);
      resetForm();
      loadPendingChanges();
    } finally {
      setIsSaving(false);
    }
  }

  // --- Propose Edit ---
  async function proposeEdit() {
    if (!editingItem || formData.unit_price <= 0) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: editError } = await supabase.from("deal_item_changes").insert({
        order_id: orderId,
        change_type: "edit",
        deal_item_id: editingItem.id,
        part_name: formData.part_name,
        part_number: formData.part_number || null,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        requested_by: user.id,
        status: "pending",
      });
      if (editError) { return; }

      // Send notification to other party
      const { data: order } = await supabase
        .from("orders")
        .select("client_id, vendor_id")
        .eq("id", orderId)
        .single();

      if (order) {
        const recipientId = userRole === "client" ? order.vendor_id : order.client_id;
        await supabase.from("notifications").insert({
          user_id: recipientId,
          type: "item_change_request",
          title: "طلب تعديل قطعة",
          message: `${userRole === "client" ? "العميل" : "المورد"} يطلب تعديل: ${formData.part_name}`,
          order_id: orderId,
          sent_at: new Date().toISOString(),
        });
      }

      setShowEditDialog(false);
      setEditingItem(null);
      resetForm();
      loadPendingChanges();
    } finally {
      setIsSaving(false);
    }
  }

  // --- Propose Delete ---
  async function proposeDelete() {
    if (!deleteItem) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: deleteError } = await supabase.from("deal_item_changes").insert({
        order_id: orderId,
        change_type: "delete",
        deal_item_id: deleteItem.id,
        part_name: deleteItem.part_name,
        unit_price: deleteItem.unit_price,
        quantity: deleteItem.quantity ?? null,
        requested_by: user.id,
        status: "pending",
      });
      if (deleteError) { console.error("[v0] proposeDelete error:", deleteError); return; }

      // Send notification to other party
      const { data: order } = await supabase
        .from("orders")
        .select("client_id, vendor_id")
        .eq("id", orderId)
        .single();

      if (order) {
        const recipientId = userRole === "client" ? order.vendor_id : order.client_id;
        await supabase.from("notifications").insert({
          user_id: recipientId,
          type: "item_change_request",
          title: "طلب حذف قطعة",
          message: `${userRole === "client" ? "العميل" : "المورد"} يطلب حذف: ${deleteItem.part_name}`,
          order_id: orderId,
          sent_at: new Date().toISOString(),
        });
      }

      setShowDeleteDialog(false);
      setDeleteItem(null);
      loadPendingChanges();
    } finally {
      setIsSaving(false);
    }
  }

  // --- Approve Change ---
  async function approveChange(change: ItemChange) {
    setIsSaving(true);
    try {
      if (change.change_type === "add") {
        await supabase.from("deal_items").insert({
          order_id: orderId,
          part_name: change.part_name,
          part_number: change.part_number || null,
          quantity: change.quantity,
          unit_price: change.unit_price,
          availability_status: "available",
        });
      } else if (change.change_type === "edit" && change.deal_item_id) {
        await supabase.from("deal_items").update({
          part_name: change.part_name,
          part_number: change.part_number || null,
          quantity: change.quantity,
          unit_price: change.unit_price,
        }).eq("id", change.deal_item_id);
      } else if (change.change_type === "delete" && change.deal_item_id) {
        await supabase.from("deal_items").delete().eq("id", change.deal_item_id);
      }

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("deal_item_changes")
        .update({ status: "approved", reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
        .eq("id", change.id);

      // Update order total
      const { data: updatedItems } = await supabase
        .from("deal_items")
        .select("line_total")
        .eq("order_id", orderId);

      if (updatedItems) {
        const newTotal = updatedItems.reduce((sum: number, item: any) => sum + (item.line_total || 0), 0);
        await supabase.from("orders").update({ total_price: newTotal }).eq("id", orderId);
      }

      // Send approval notification
      await supabase.from("notifications").insert({
        user_id: change.requested_by,
        type: "item_change_approved",
        title: "تمت الموافقة على التعديل",
        message: `تمت الموافقة على ${changeTypeLabel[change.change_type]} الخاصة بـ ${change.part_name}`,
        order_id: orderId,
        sent_at: new Date().toISOString(),
      });

      await logActivity("edit_approved", `تمت الموافقة على ${changeTypeLabel[change.change_type]}: ${change.part_name}`, { changeId: change.id, changeType: change.change_type });

      loadItems();
      loadPendingChanges();
      // Realtime handles Dashboard update; no router.refresh() to avoid remount
    } finally {
      setIsSaving(false);
    }
  }

  // --- Reject Change (opens reason dialog) ---
  function rejectChange(change: ItemChange) {
    setRejectTarget(change);
    setRejectionReason("");
  }

  // --- Confirm Reject Change ---
  async function confirmRejectChange() {
    if (!rejectTarget) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("deal_item_changes")
        .update({
          status: "rejected",
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null,
        })
        .eq("id", rejectTarget.id);

      await supabase.from("notifications").insert({
        user_id: rejectTarget.requested_by,
        type: "item_change_rejected",
        title: "تم رفض التعديل",
        message: `تم رفض ${changeTypeLabel[rejectTarget.change_type]} الخاصة بـ ${rejectTarget.part_name}${rejectionReason ? `\nالسبب: ${rejectionReason}` : ""}`,
        order_id: orderId,
        sent_at: new Date().toISOString(),
      });

      await logActivity("edit_rejected", `تم رفض ${changeTypeLabel[rejectTarget.change_type]}: ${rejectTarget.part_name}`, { changeId: rejectTarget.id, reason: rejectionReason });

      setRejectTarget(null);
      setRejectionReason("");
      loadPendingChanges();
    } finally {
      setIsSaving(false);
    }
  }

  function openEditDialog(item: DealItem) {
    setEditingItem(item);
    setFormData({
      part_name: item.part_name,
      part_number: item.part_number || "",
      quantity: item.quantity,
      unit_price: item.unit_price,
    });
    setShowEditDialog(true);
  }

  function openDeleteDialog(item: DealItem) {
    setDeleteItem(item);
    setShowDeleteDialog(true);
  }

  const calculatedTotal = items.reduce((sum, item) => sum + (item.line_total ?? item.quantity * item.unit_price), 0);

  const changeTypeLabel: Record<string, string> = {
    add: "إضافة قطعة",
    edit: "تعديل قطعة",
    delete: "حذف قطعة",
  };

  return (
    <div className="space-y-4">
      {/* Items Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">تفاصيل القطع</CardTitle>
                <CardDescription>
                  {items.length} قطعة - الإجمالي: {calculatedTotal.toLocaleString("ar-SA")} ر.س
                </CardDescription>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => { resetForm(); setShowAddDialog(true); }}>
              <Plus className="w-4 h-4 ml-1" />
              إضافة قطعة
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد قطع مسجلة</p>
              <p className="text-sm mt-1">يتم نسخ القطع تلقائياً من عرض السعر عند قبول الطلب</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-10">#</TableHead>
                    <TableHead className="text-right">اسم القطعة</TableHead>
                    <TableHead className="text-center">رقم القطعة</TableHead>
                    <TableHead className="text-center">الكمية</TableHead>
                    <TableHead className="text-center">سعر الوحدة</TableHead>
                    <TableHead className="text-center">الإجمالي</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center w-24">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const av = availabilityConfig[item.availability_status] || { label: item.availability_status, color: "bg-gray-100 text-gray-800" };
                    const lineTotal = item.line_total ?? item.quantity * item.unit_price;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{item.part_name}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.part_number || "-"}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">{Number(item.unit_price).toLocaleString("ar-SA")} ر.س</TableCell>
                        <TableCell className="text-center font-semibold">{Number(lineTotal).toLocaleString("ar-SA")} ر.س</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${av.color} border-0 text-xs`}>{av.label}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(item)} title="تعديل">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(item)} title="حذف">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Total Row */}
                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell colSpan={5} className="text-left text-base">الإجمالي الكلي</TableCell>
                    <TableCell className="text-center text-primary text-lg">{calculatedTotal.toLocaleString("ar-SA")} ر.س</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Changes */}
      {pendingChanges.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <CardTitle className="text-lg text-amber-900">
                تعديلات بانتظار الموافقة ({pendingChanges.length})
              </CardTitle>
            </div>
            <CardDescription>يجب موافقة الطرف الآخر قبل تطبيق أي تعديل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingChanges.map((change) => (
                <div key={change.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{changeTypeLabel[change.change_type] || change.change_type}</Badge>
                      <span className="text-xs text-muted-foreground">بواسطة: {change.profiles?.full_name || "مستخدم"}</span>
                    </div>
                    <p className="text-sm font-medium">
                      {change.change_type === "add" && `${change.part_name} - ${Number(change.unit_price).toLocaleString("ar-SA")} ر.س × ${change.quantity}`}
                      {change.change_type === "edit" && `${change.part_name} - السعر الجديد: ${Number(change.unit_price).toLocaleString("ar-SA")} ر.س × ${change.quantity}`}
                      {change.change_type === "delete" && `حذف: ${change.part_name}`}
                    </p>
                  </div>
                  <div className="flex gap-2 mr-3">
                    <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => approveChange(change)} disabled={isSaving}>
                      <Check className="w-3.5 h-3.5 ml-1" />
                      موافقة
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-red-300 hover:bg-red-50" onClick={() => rejectChange(change)} disabled={isSaving}>
                      <X className="w-3.5 h-3.5 ml-1" />
                      رفض
                    </Button>
                  </div>
                </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة قطعة جديدة</DialogTitle>
            <DialogDescription>سيتم إرسال الطلب للطرف الآخر للموافقة قبل الإضافة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>اسم القطعة *</Label>
              <Input value={formData.part_name} onChange={(e) => setFormData({ ...formData, part_name: e.target.value })} placeholder="مثال: فلتر زيت" />
            </div>
            <div className="space-y-2">
              <Label>رقم القطعة (اختياري)</Label>
              <Input value={formData.part_number} onChange={(e) => setFormData({ ...formData, part_number: e.target.value })} placeholder="مثال: OE-12345" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الكمية *</Label>
                <Input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 1 })} />
              </div>
              <div className="space-y-2">
                <Label>سعر الوحدة (ر.س) *</Label>
                <Input type="number" min="0" step="0.01" value={formData.unit_price || ""} onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })} placeholder="0.00" />
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm">الإجمالي: <span className="font-bold">{(formData.quantity * formData.unit_price).toLocaleString("ar-SA")} ر.س</span></p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>إلغاء</Button>
            <Button onClick={proposeAdd} disabled={!formData.part_name || formData.unit_price <= 0 || isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Plus className="w-4 h-4 ml-1" />}
              إرسال طلب الإضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditingItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل القطعة</DialogTitle>
            <DialogDescription>سيتم إرسال التعديل للطرف الآخر للموافقة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>اسم القطعة</Label>
              <Input value={formData.part_name} onChange={(e) => setFormData({ ...formData, part_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>رقم القطعة</Label>
              <Input value={formData.part_number} onChange={(e) => setFormData({ ...formData, part_number: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الكمية</Label>
                <Input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 1 })} />
              </div>
              <div className="space-y-2">
                <Label>سعر الوحدة الجديد (ر.س)</Label>
                <Input type="number" min="0" step="0.01" value={formData.unit_price || ""} onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })} />
              </div>
            </div>
            {editingItem && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="text-muted-foreground">السعر الحالي:</p>
                <p className="font-medium">{Number(editingItem.unit_price).toLocaleString("ar-SA")} ر.س × {editingItem.quantity} = {Number(editingItem.line_total ?? editingItem.quantity * editingItem.unit_price).toLocaleString("ar-SA")} ر.س</p>
                <p className="text-muted-foreground mt-2">السعر الجديد:</p>
                <p className="font-medium text-primary">{formData.unit_price.toLocaleString("ar-SA")} ر.س × {formData.quantity} = {(formData.quantity * formData.unit_price).toLocaleString("ar-SA")} ر.س</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>إلغاء</Button>
            <Button onClick={proposeEdit} disabled={formData.unit_price <= 0 || isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Pencil className="w-4 h-4 ml-1" />}
              إرسال طلب التعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectionReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب التعديل</DialogTitle>
            <DialogDescription>
              {rejectTarget && `${changeTypeLabel[rejectTarget.change_type]}: ${rejectTarget.part_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Label>سبب الرفض (اختياري)</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="أدخل سبب الرفض ليتم إرساله للطرف الآخر..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectionReason(""); }}>إلغاء</Button>
            <Button variant="destructive" onClick={confirmRejectChange} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <XCircle className="w-4 h-4 ml-1" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setDeleteItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طلب حذف قطعة</DialogTitle>
            <DialogDescription>سيتم إرسال طلب الحذف للطرف الآخر للموافقة</DialogDescription>
          </DialogHeader>
          {deleteItem && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium">{deleteItem.part_name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {deleteItem.part_number && <span>رقم القطعة: {deleteItem.part_number} - </span>}
                السعر: {Number(deleteItem.unit_price).toLocaleString("ar-SA")} ر.س × {deleteItem.quantity}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={proposeDelete} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Trash2 className="w-4 h-4 ml-1" />}
              إرسال طلب الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
