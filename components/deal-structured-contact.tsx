"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, CheckCircle2, Upload, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const supabase = createClient();

interface Communication {
  id: string;
  communication_type: string;
  message: string;
  response: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

interface DealStructuredContactProps {
  orderId: string;
  userRole: "client" | "vendor";
  initialCommunications: Communication[];
}

const communicationTypes = {
  status_request: "طلب تحديث الحالة",
  quantity_change: "طلب تعديل الكمية",
  delivery_inquiry: "استفسار عن التسليم",
  invoice_request: "طلب فاتورة",
  ready_notification: "إشعار الجاهزية",
  other: "استفسار آخر",
};

export function DealStructuredContact({
  orderId,
  userRole,
  initialCommunications,
}: DealStructuredContactProps) {
  const [communications, setCommunications] = useState(initialCommunications);
  const [showDialog, setShowDialog] = useState(false);
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSend = async () => {
    if (!type || !message.trim()) return;

    setIsSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase.from("deal_communications").insert({
      order_id: orderId,
      sender_id: user.id,
      communication_type: type,
      message: message.trim(),
    });

    if (!error) {
      setType("");
      setMessage("");
      setShowDialog(false);
      router.refresh();
    }

    setIsSending(false);
  };

  const handleRespond = async () => {
    if (!respondingTo || !response.trim()) return;

    setIsSending(true);

    let attachmentUrl = null;
    let attachmentName = null;

    // Upload file if provided
    if (file) {
      setIsUploading(true);
      const fileName = `${orderId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("order-files")
        .upload(fileName, file);

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from("order-files")
          .getPublicUrl(fileName);
        
        attachmentUrl = publicUrl;
        attachmentName = file.name;

        // Also add to order_files table
        await supabase.from("order_files").insert({
          order_id: orderId,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
        });
      }
      setIsUploading(false);
    }

    await supabase
      .from("deal_communications")
      .update({
        response: response.trim(),
        status: "responded",
        responded_at: new Date().toISOString(),
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
      })
      .eq("id", respondingTo);

    setRespondingTo(null);
    setResponse("");
    setFile(null);
    setIsSending(false);
    router.refresh();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "border-amber-500 text-amber-700 bg-amber-50";
      case "responded":
        return "border-blue-500 text-blue-700 bg-blue-50";
      case "resolved":
        return "border-green-500 text-green-700 bg-green-50";
      default:
        return "border-gray-300";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            التواصل المنظم
          </CardTitle>
          <Button onClick={() => setShowDialog(true)} size="sm">
            طلب جديد
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {communications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              لا توجد طلبات بعد
            </p>
          ) : (
            communications.map((comm) => (
              <div
                key={comm.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {communicationTypes[comm.communication_type as keyof typeof communicationTypes]}
                    </Badge>
                    <p className="text-sm">{comm.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comm.created_at).toLocaleString("ar-SA")}
                    </p>
                  </div>
                  <Badge className={getStatusColor(comm.status)}>
                    {comm.status === "pending" && <Clock className="h-3 w-3 ml-1" />}
                    {comm.status === "responded" && <CheckCircle2 className="h-3 w-3 ml-1" />}
                    {comm.status === "resolved" && <CheckCircle2 className="h-3 w-3 ml-1" />}
                    {comm.status === "pending" 
                      ? (userRole === "vendor" ? "قيد الانتظار - يحتاج رد" : "قيد الانتظار") 
                      : comm.status === "responded" 
                      ? (userRole === "vendor" ? "تم الرد للعميل" : "تم الرد من المحل") 
                      : "مكتمل"}
                  </Badge>
                </div>

                {comm.response && (
                  <div className="bg-muted p-3 rounded">
                    <p className="text-sm font-medium mb-1">الرد:</p>
                    <p className="text-sm">{comm.response}</p>
                    {comm.attachment_url && (
                      <a
                        href={comm.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline mt-2"
                      >
                        <FileText className="h-4 w-4" />
                        {comm.attachment_name}
                      </a>
                    )}
                    {comm.responded_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(comm.responded_at).toLocaleString("ar-SA")}
                      </p>
                    )}
                  </div>
                )}

                {comm.status === "pending" && userRole === "vendor" && (
                  <Button
                    onClick={() => setRespondingTo(comm.id)}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    الرد على الطلب
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Send Request Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إرسال طلب</DialogTitle>
              <DialogDescription>
                اختر نوع الطلب واكتب التفاصيل
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>نوع الطلب</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الطلب" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(communicationTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>التفاصيل</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب تفاصيل طلبك..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSend} disabled={isSending || !type || !message.trim()}>
                إرسال
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Respond Dialog */}
        <Dialog open={!!respondingTo} onOpenChange={(open) => !open && setRespondingTo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>الرد على الطلب</DialogTitle>
              <DialogDescription>
                اكتب ردك على الطلب وارفق ملف إن لزم الأمر
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الرد</Label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="اكتب ردك..."
                  rows={4}
                />
              </div>

              <div>
                <Label>إرفاق ملف (فاتورة، صور، إلخ)</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                {file && (
                  <p className="text-sm text-muted-foreground mt-1">
                    تم اختيار: {file.name}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRespondingTo(null)}>
                إلغاء
              </Button>
              <Button onClick={handleRespond} disabled={isSending || isUploading || !response.trim()}>
                {isUploading ? "جاري الرفع..." : "إرسال الرد"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
