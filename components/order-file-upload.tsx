"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadFromStorageUrl } from "@/lib/download-file";
import { Button } from "@/components/ui/button";

const supabase = createClient();
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, Loader2, Paperclip, Upload, X } from "lucide-react";

interface OrderFile {
  id: string;
  order_id: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
  profiles?: { full_name: string };
}

interface OrderFileUploadProps {
  orderId: string;
  currentUserId: string;
  canUpload: boolean;
}

const FILE_TYPE_LABELS: Record<string, string> = {
  quotation: "عرض سعر",
  invoice: "فاتورة",
  other: "أخرى",
};

export default function OrderFileUpload({ orderId, currentUserId, canUpload }: OrderFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<OrderFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState("quotation");

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("order_files")
      .select("*, profiles!order_files_uploaded_by_fkey(full_name)")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (data) {
      setFiles(data as OrderFile[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    const fileExt = selectedFile.name.split(".").pop();
    const filePath = `${orderId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("order-files")
      .upload(filePath, selectedFile);

    if (uploadError) {
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("order-files")
      .getPublicUrl(filePath);

    await supabase.from("order_files").insert({
      order_id: orderId,
      uploaded_by: currentUserId,
      file_name: selectedFile.name,
      file_url: urlData.publicUrl,
      file_type: fileType,
    });

    setSelectedFile(null);
    setFileType("quotation");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsUploading(false);
    await fetchFiles();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Paperclip className="w-5 h-5" />
          المرفقات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canUpload && (
          <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 ml-2" />
                اختر ملف
              </Button>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quotation">عرض سعر</SelectItem>
                  <SelectItem value="invoice">فاتورة</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedFile && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "رفع"
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">لا توجد مرفقات</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.file_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {FILE_TYPE_LABELS[file.file_type] || file.file_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {file.profiles?.full_name} - {new Date(file.created_at).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => downloadFromStorageUrl(file.file_url, file.file_name)}
                  title="تحميل الملف"
                >
                  <Download className="w-4 h-4" />
                  <span className="sr-only">تحميل الملف</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
